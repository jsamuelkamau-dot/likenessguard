"""
Consent Orchestrator Agent Lambda

The primary decision-making agent. Receives a pre-screened consent check request
(anomaly cleared, facial match found) and produces a final ALLOW/DENY decision
with full reasoning trace.

Model: amazon.nova-pro-v1:0 (primary) with fallback to claude-3-5-sonnet
Target latency: <80ms budget within the 300ms P95 total

Requirements: 2.3, 2.4, 2.5, 2.6
"""
import json
import logging
import os
import time
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
NOVA_PRO_MODEL = 'amazon.nova-pro-v1:0'
SONNET_FALLBACK = 'anthropic.claude-sonnet-4-20250514-v1:0'
SIMILARITY_THRESHOLD = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))

SYSTEM_PROMPT = """You are the LikenessGuard Consent Orchestrator — an AI agent that makes final consent decisions for AI image generation requests.

Your role:
1. Evaluate whether a consent check request should be ALLOWED or DENIED based on the subject's consent policy
2. Apply the most-restrictive interpretation when policy clauses are ambiguous
3. Consider the similarity score, usage type, and requester context
4. Produce a clear, auditable reasoning trace

Decision rules (apply in order):
- If anomaly_cleared is false → DENY with ANOMALY_BLOCKED
- If similarity_score < threshold → DENY with SIMILARITY_BELOW_THRESHOLD
- If is_provisional is true → DENY with PROVISIONAL_ENTRY
- If usage_type is FACE_SWAP and policy.deny_face_swaps is true → DENY with DENY_FACE_SWAP
- If usage_type is THIRD_PARTY_EDIT and policy.deny_third_party_edits is true → DENY with DENY_THIRD_PARTY
- If usage_type is GENERAL_GENERATION and policy.deny_impersonation is true → DENY with DENY_IMPERSONATION
- If requester_id is in policy.platform_blocklist → DENY with DENY_PLATFORM_BLOCKED
- If policy.platform_allowlist is non-empty and requester_id not in allowlist → DENY with DENY_NOT_IN_ALLOWLIST
- If policy.commercial_use_allowed is false and usage indicates commercial → DENY with DENY_COMMERCIAL
- If all checks pass → ALLOW with ALLOW_POLICY_PERMITS

Always respond with ONLY valid JSON in this exact format:
{
  "decision": "ALLOW" or "DENY",
  "reason_code": "one of the codes above",
  "confidence": 0.0-1.0,
  "reasoning_trace": "2-3 sentence explanation of the decision"
}"""


def lambda_handler(event, context):
    """
    Consent Orchestrator entry point.

    Input event:
    {
        "subject_id": str,
        "policy": dict,
        "similarity_score": float,
        "usage_type": str,
        "requester_id": str,
        "anomaly_cleared": bool,
        "top_candidates": list[dict],
        "policy_version": int,
        "is_provisional": bool
    }

    Returns:
    {
        "decision": str,
        "reason_code": str,
        "confidence": float,
        "reasoning_trace": str,
        "latency_ms": int,
        "policy_reasoner_invoked": bool
    }
    """
    start_ms = int(time.time() * 1000)

    subject_id = event.get('subject_id', '')
    policy = event.get('policy', {})
    similarity_score = float(event.get('similarity_score', 0.0))
    usage_type = event.get('usage_type', 'GENERAL_GENERATION')
    requester_id = event.get('requester_id', '')
    anomaly_cleared = event.get('anomaly_cleared', False)
    is_provisional = event.get('is_provisional', False)
    policy_version = event.get('policy_version', 1)

    # Fast-path rule evaluation (no LLM needed for clear-cut cases)
    cross_embedding_match = event.get('cross_embedding_match', False)
    fast_result = _fast_path_evaluate(
        anomaly_cleared, similarity_score, is_provisional,
        policy, usage_type, requester_id, cross_embedding_match
    )

    if fast_result:
        fast_result['latency_ms'] = int(time.time() * 1000) - start_ms
        fast_result['policy_reasoner_invoked'] = False
        logger.info(f"Fast-path decision for {subject_id}: {fast_result['decision']} ({fast_result['reason_code']})")
        return fast_result

    # LLM path — for complex/ambiguous policy evaluation
    llm_result = _llm_evaluate(event)
    llm_result['latency_ms'] = int(time.time() * 1000) - start_ms
    llm_result['policy_reasoner_invoked'] = False
    logger.info(f"LLM decision for {subject_id}: {llm_result['decision']} ({llm_result['reason_code']})")
    return llm_result


def _fast_path_evaluate(anomaly_cleared, similarity_score, is_provisional,
                         policy, usage_type, requester_id, cross_embedding_match=False) -> dict | None:
    """Apply deterministic rules. Returns result dict or None if LLM needed."""

    if not anomaly_cleared:
        return _decision('DENY', 'ANOMALY_BLOCKED', 1.0,
                         'Request blocked by anomaly detection before policy evaluation.')

    # SELF_EDIT special case: if policy allows self edits, bypass similarity threshold
    if usage_type == 'SELF_EDIT' and policy.get('allow_self_edits', False):
        return _decision('ALLOW', 'ALLOW_SELF_EDIT', 0.97,
                         'Self-edit is permitted by the subject\'s consent policy. Similarity threshold bypassed for self-edits.')

    # Cross-embedding-space match: use lower threshold (0.3) since Titan vs Rekognition
    # embeddings are incompatible spaces — cosine similarity will be lower even for same person.
    effective_threshold = 0.3 if cross_embedding_match else SIMILARITY_THRESHOLD

    if similarity_score < effective_threshold:
        return _decision('DENY', 'SIMILARITY_BELOW_THRESHOLD', 1.0,
                         f'Similarity score {similarity_score:.3f} is below threshold {effective_threshold:.2f}.'
                         + (' (cross-embedding-space match — re-register for better accuracy)' if cross_embedding_match else ''))

    if is_provisional:
        return _decision('DENY', 'PROVISIONAL_ENTRY', 1.0,
                         'Subject has a provisional registry entry. Consent not yet confirmed.')

    if usage_type == 'FACE_SWAP' and policy.get('deny_face_swaps', True):
        return _decision('DENY', 'DENY_FACE_SWAP', 1.0,
                         'Subject policy explicitly denies face swap usage.')

    if usage_type == 'THIRD_PARTY_EDIT' and policy.get('deny_third_party_edits', True):
        return _decision('DENY', 'DENY_THIRD_PARTY', 1.0,
                         'Subject policy denies third-party editing of their likeness.')

    blocklist = policy.get('platform_blocklist', [])
    if requester_id in blocklist:
        return _decision('DENY', 'DENY_PLATFORM_BLOCKED', 1.0,
                         f'Requester {requester_id} is on the subject\'s platform blocklist.')

    allowlist = policy.get('platform_allowlist', [])
    if allowlist and requester_id not in allowlist:
        return _decision('DENY', 'DENY_NOT_IN_ALLOWLIST', 1.0,
                         f'Requester {requester_id} is not in the subject\'s platform allowlist.')

    # GENERAL_GENERATION: deny if policy has deny_impersonation or deny_general_generation
    # Default: DENY unless policy explicitly permits general generation
    if usage_type == 'GENERAL_GENERATION':
        if policy.get('deny_impersonation', True):
            return _decision('DENY', 'DENY_IMPERSONATION', 1.0,
                             'Subject policy denies impersonation/general generation of their likeness.')
        if policy.get('deny_general_generation', False):
            return _decision('DENY', 'DENY_GENERAL_GENERATION', 1.0,
                             'Subject policy explicitly denies general AI generation using their likeness.')
        # Only allow if policy explicitly permits it
        if not policy.get('allow_general_generation', False):
            return _decision('DENY', 'DENY_NOT_PERMITTED', 1.0,
                             'General generation is not explicitly permitted by the subject\'s consent policy. Default-deny applied.')

    # SELF_EDIT final check (similarity already passed above)
    if usage_type == 'SELF_EDIT' and not policy.get('allow_self_edits', False):
        return _decision('DENY', 'DENY_SELF_EDIT_NOT_PERMITTED', 1.0,
                         'Self-edit is not permitted by the subject\'s consent policy.')

    # All checks passed — ALLOW
    return _decision('ALLOW', 'ALLOW_POLICY_PERMITS', 0.97,
                     f'All policy checks passed. Similarity {similarity_score:.3f} >= threshold. Usage type {usage_type} is permitted.')


def _llm_evaluate(event: dict) -> dict:
    """Invoke Nova Pro for complex policy evaluation."""
    user_message = f"""Evaluate this consent check request:

Subject ID: {event.get('subject_id')}
Usage Type: {event.get('usage_type')}
Requester ID: {event.get('requester_id')}
Similarity Score: {event.get('similarity_score')}
Policy: {json.dumps(event.get('policy', {}), indent=2)}
Anomaly Cleared: {event.get('anomaly_cleared')}
Is Provisional: {event.get('is_provisional', False)}

Apply the decision rules and return your decision as JSON."""

    for model_id in [NOVA_PRO_MODEL, SONNET_FALLBACK]:
        try:
            bedrock = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)

            if 'nova' in model_id:
                body = json.dumps({
                    "system": [{"text": SYSTEM_PROMPT}],
                    "messages": [{"role": "user", "content": [{"text": user_message}]}],
                    "inferenceConfig": {"maxTokens": 512, "temperature": 0.0}
                })
            else:
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "system": SYSTEM_PROMPT,
                    "max_tokens": 512,
                    "temperature": 0.0,
                    "messages": [{"role": "user", "content": user_message}]
                })

            response = bedrock.invoke_model(
                modelId=model_id,
                body=body,
                contentType='application/json',
                accept='application/json'
            )
            result_body = json.loads(response['body'].read())

            if 'nova' in model_id:
                text = result_body['output']['message']['content'][0]['text']
            else:
                text = result_body['content'][0]['text']

            clean = text.strip()
            if clean.startswith('```'):
                clean = clean.split('```')[1]
                if clean.startswith('json'):
                    clean = clean[4:]

            parsed = json.loads(clean.strip())
            return {
                "decision": parsed.get('decision', 'DENY'),
                "reason_code": parsed.get('reason_code', 'UNKNOWN'),
                "confidence": float(parsed.get('confidence', 0.8)),
                "reasoning_trace": parsed.get('reasoning_trace', ''),
                "policy_reasoner_invoked": False
            }

        except Exception as e:
            logger.warning(f"Model {model_id} failed: {e}, trying fallback")
            continue

    # Both models failed — safe default deny
    return _decision('DENY', 'ORCHESTRATOR_ERROR', 0.0,
                     'Consent Orchestrator encountered an error. Defaulting to DENY for safety.')


def _decision(decision: str, reason_code: str, confidence: float, reasoning: str) -> dict:
    return {
        "decision": decision,
        "reason_code": reason_code,
        "confidence": confidence,
        "reasoning_trace": reasoning
    }
