"""
Anomaly & Threat Agent Lambda

Screens consent check requests for adversarial inputs, jailbreak attempts,
prompt injections, and suspicious requester patterns before the request
reaches the Consent Orchestrator.

Model: anthropic.claude-3-haiku-20240307-v1:0 (fast, cost-effective)
Target latency: <50ms (fast-path via DynamoDB suspension check)

Requirements: 2.1, 2.2, 12.1, 12.2, 12.4
"""
import json
import logging
import os
import re
import time
import hashlib
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
SUSPENSION_TABLE = os.environ.get('SUSPENSION_TABLE', 'LikenessGuard-Suspensions')
HAIKU_MODEL_ID = 'anthropic.claude-haiku-4-5-20251001-v1:0'

# Regex patterns for fast-path injection detection
INJECTION_PATTERNS = [
    re.compile(r'ignore\s+(previous|all|above)\s+instructions', re.IGNORECASE),
    re.compile(r'system\s*prompt', re.IGNORECASE),
    re.compile(r'jailbreak', re.IGNORECASE),
    re.compile(r'bypass\s+(consent|policy|check)', re.IGNORECASE),
    re.compile(r'<\s*script', re.IGNORECASE),
    re.compile(r'eval\s*\(', re.IGNORECASE),
    re.compile(r'__import__', re.IGNORECASE),
]


def lambda_handler(event, context):
    """
    Anomaly Agent entry point.

    Input event:
    {
        "requester_id": str,
        "usage_type": str,
        "request_payload_hash": str,
        "image_metadata": dict,
        "request_count_1h": int,
        "anomaly_count_1h": int
    }

    Returns:
    {
        "cleared": bool,
        "threat_type": str|null,
        "confidence": float,
        "latency_ms": int,
        "reasoning": str
    }
    """
    start_ms = int(time.time() * 1000)

    requester_id = event.get('requester_id', '')
    usage_type = event.get('usage_type', '')
    request_count_1h = event.get('request_count_1h', 0)
    anomaly_count_1h = event.get('anomaly_count_1h', 0)

    # Fast path 1: Check suspension list
    if _is_suspended(requester_id):
        return _deny_response('SUSPICIOUS_REQUESTER', 1.0,
                              f"Requester {requester_id} is suspended",
                              start_ms)

    # Fast path 2: Rate abuse check
    if request_count_1h > 100:
        return _deny_response('RATE_ABUSE', 1.0,
                              f"Rate limit exceeded: {request_count_1h} requests in 1h",
                              start_ms)

    # Fast path 3: Anomaly accumulation check
    if anomaly_count_1h >= 10:
        _suspend_requester(requester_id)
        return _deny_response('SUSPICIOUS_REQUESTER', 0.95,
                              f"Requester suspended after {anomaly_count_1h} anomalies in 1h",
                              start_ms)

    # Fast path 4: Regex injection scan on usage_type and requester_id
    scan_text = f"{requester_id} {usage_type}"
    for pattern in INJECTION_PATTERNS:
        if pattern.search(scan_text):
            return _deny_response('PROMPT_INJECTION', 0.9,
                                  f"Injection pattern detected in request fields",
                                  start_ms)

    # Fast path 5: Image metadata anomaly check
    image_metadata = event.get('image_metadata', {})
    if _has_adversarial_markers(image_metadata):
        return _deny_response('ADVERSARIAL_IMAGE', 0.85,
                              "Adversarial image markers detected in metadata",
                              start_ms)

    # LLM path: Only invoke Claude for borderline cases
    # (saves cost — most requests clear via fast paths)
    if _needs_llm_screening(event):
        llm_result = _llm_screen(event)
        if not llm_result['cleared']:
            return {**llm_result, 'latency_ms': int(time.time() * 1000) - start_ms}

    return {
        "cleared": True,
        "threat_type": None,
        "confidence": 1.0,
        "latency_ms": int(time.time() * 1000) - start_ms,
        "reasoning": "All anomaly checks passed"
    }


def _is_suspended(requester_id: str) -> bool:
    """Check DynamoDB suspension table."""
    try:
        ddb = boto3.client('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        response = ddb.get_item(
            TableName=SUSPENSION_TABLE,
            Key={'RequesterID': {'S': requester_id}}
        )
        return 'Item' in response
    except ClientError:
        return False


def _suspend_requester(requester_id: str) -> None:
    """Add requester to suspension table with 1-hour TTL."""
    import time as t
    try:
        ddb = boto3.client('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        ddb.put_item(
            TableName=SUSPENSION_TABLE,
            Item={
                'RequesterID': {'S': requester_id},
                'TTL': {'N': str(int(t.time()) + 3600)},
                'Reason': {'S': 'Anomaly threshold exceeded'}
            }
        )
        logger.warning(f"Suspended requester {requester_id} for 1 hour")
    except ClientError as e:
        logger.error(f"Failed to suspend requester: {e}")


def _has_adversarial_markers(image_metadata: dict) -> bool:
    """Check image metadata for known adversarial markers."""
    suspicious_keys = ['adversarial', 'perturbation', 'attack', 'bypass']
    metadata_str = json.dumps(image_metadata).lower()
    return any(key in metadata_str for key in suspicious_keys)


def _needs_llm_screening(event: dict) -> bool:
    """Determine if LLM screening is needed (borderline cases only)."""
    # Only invoke LLM if there are unusual patterns worth deeper analysis
    requester_id = event.get('requester_id', '')
    return len(requester_id) > 200 or '\n' in requester_id or '\r' in requester_id


def _llm_screen(event: dict) -> dict:
    """Invoke Claude Haiku for deep threat analysis."""
    try:
        bedrock = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
        prompt = f"""Analyse this consent check request for security threats.
Requester ID: {event.get('requester_id', '')}
Usage Type: {event.get('usage_type', '')}

Classify as one of: SAFE, PROMPT_INJECTION, JAILBREAK_PATTERN, SUSPICIOUS_REQUESTER
Respond with JSON only: {{"classification": "...", "confidence": 0.0-1.0, "reasoning": "..."}}"""

        response = bedrock.invoke_model(
            modelId=HAIKU_MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 200,
                "messages": [{"role": "user", "content": prompt}]
            }),
            contentType='application/json',
            accept='application/json'
        )
        result = json.loads(json.loads(response['body'].read())['content'][0]['text'])
        classification = result.get('classification', 'SAFE')
        confidence = float(result.get('confidence', 0.5))
        reasoning = result.get('reasoning', '')

        if classification != 'SAFE':
            return {"cleared": False, "threat_type": classification,
                    "confidence": confidence, "reasoning": reasoning}
        return {"cleared": True, "threat_type": None, "confidence": confidence, "reasoning": reasoning}
    except Exception as e:
        logger.warning(f"LLM screening failed, defaulting to cleared: {e}")
        return {"cleared": True, "threat_type": None, "confidence": 0.7, "reasoning": "LLM screening unavailable"}


def _deny_response(threat_type: str, confidence: float, reasoning: str, start_ms: int) -> dict:
    logger.warning(f"Anomaly detected: {threat_type} (confidence={confidence})")
    return {
        "cleared": False,
        "threat_type": threat_type,
        "confidence": confidence,
        "latency_ms": int(time.time() * 1000) - start_ms,
        "reasoning": reasoning
    }
