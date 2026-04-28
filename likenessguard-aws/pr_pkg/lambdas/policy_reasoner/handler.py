"""
Policy Reasoner Agent Lambda - Nova Lite NL to JSON policy conversion
"""
import json, logging, os, time, boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
NOVA_LITE_MODEL = "amazon.nova-lite-v1:0"

DEFAULT_POLICY = {
    "allow_self_edits": False,
    "allow_general_generation": False,
    "deny_general_generation": True,
    "deny_third_party_edits": True,
    "deny_face_swaps": True,
    "deny_sexualized_content": True,
    "deny_impersonation": True,
    "deny_political_use": True,
    "platform_allowlist": [],
    "platform_blocklist": [],
    "commercial_use_allowed": False,
    "geographic_restrictions": [],
    "age_rating_max": "PG",
    "time_restrictions": None,
    "policy_version": 1
}

NL_TO_JSON_PROMPT = """Convert this natural language consent statement to a JSON policy object.
The default is DENY EVERYTHING unless explicitly stated otherwise.
Include ALL fields:
- allow_self_edits (bool): true only if person explicitly allows editing their own photos
- allow_general_generation (bool): true only if person explicitly allows general AI generation
- deny_general_generation (bool): true if general AI generation should be blocked (default: true)
- deny_third_party_edits (bool): true to block third parties from editing their likeness
- deny_face_swaps (bool): true to block face swaps
- deny_sexualized_content (bool): true to block sexual content
- deny_impersonation (bool): true to block impersonation
- deny_political_use (bool): true to block political use
- platform_allowlist (list): empty unless specific platforms named
- platform_blocklist (list): empty unless specific platforms blocked
- commercial_use_allowed (bool): false unless explicitly allowed
- geographic_restrictions (list): empty unless specific regions mentioned
- age_rating_max (string): "PG" default
- time_restrictions: null unless time limits specified

Input: {input}
Respond with ONLY valid JSON. When in doubt, default to DENY (true for deny_* fields, false for allow_* fields)."""

JSON_TO_NL_PROMPT = """Explain this consent policy in 2-3 plain English sentences. Start with what IS allowed.
Policy: {input}
Plain English only."""

CORS = {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}


def _wrap(result):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(result)}


def lambda_handler(event, context):
    start_ms = int(time.time() * 1000)
    # Handle both direct invocation and API Gateway proxy
    body = event.get("body", event)
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = event
    mode = body.get("mode", "nl_to_json")
    input_text = body.get("input", "")
    existing_policy = body.get("existing_policy")
    if not input_text:
        return _wrap({"policy": None, "summary": "Input text is required", "conflicts": [], "resolution": "", "latency_ms": 0})
    try:
        if mode == "nl_to_json":
            return _wrap(_nl_to_json(input_text, start_ms))
        elif mode == "json_to_nl":
            return _wrap(_json_to_nl(input_text, start_ms))
        elif mode == "conflict_check":
            return _wrap(_conflict_check(input_text, existing_policy, start_ms))
        else:
            return _wrap({"policy": None, "summary": f"Unknown mode: {mode}", "conflicts": [], "resolution": "", "latency_ms": 0})
    except Exception as e:
        logger.error(f"Policy Reasoner error: {e}")
        return _wrap({"policy": None, "summary": f"Error: {e}", "conflicts": [], "resolution": "", "latency_ms": int(time.time()*1000)-start_ms})


def _nl_to_json(input_text, start_ms):
    prompt = NL_TO_JSON_PROMPT.format(input=input_text)
    raw = _invoke_nova(prompt)
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"): clean = clean[4:]
        policy = json.loads(clean.strip())
        merged = {**DEFAULT_POLICY, **policy}
        merged["policy_version"] = 1
        summary = _invoke_nova(JSON_TO_NL_PROMPT.format(input=json.dumps(merged)))
        return {"policy": merged, "summary": summary.strip(), "conflicts": [], "resolution": "", "latency_ms": int(time.time()*1000)-start_ms}
    except json.JSONDecodeError as e:
        return {"policy": None, "summary": f"Failed to parse policy: {e}", "conflicts": [], "resolution": "", "latency_ms": int(time.time()*1000)-start_ms}


def _json_to_nl(input_text, start_ms):
    summary = _invoke_nova(JSON_TO_NL_PROMPT.format(input=input_text))
    return {"policy": None, "summary": summary.strip(), "conflicts": [], "resolution": "", "latency_ms": int(time.time()*1000)-start_ms}


def _conflict_check(new_input, existing_policy, start_ms):
    if not existing_policy:
        return _nl_to_json(new_input, start_ms)
    prompt = f"""Check for conflicts between this existing policy and new statement.
Existing: {json.dumps(existing_policy)}
New: {new_input}
Respond JSON: {{"has_conflicts": bool, "conflicts": [], "resolution": "", "merged_policy": {{}}}}"""
    raw = _invoke_nova(prompt)
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"): clean = clean[4:]
        result = json.loads(clean.strip())
        return {"policy": result.get("merged_policy"), "summary": "Conflict check complete.",
                "conflicts": result.get("conflicts", []), "resolution": result.get("resolution", ""),
                "latency_ms": int(time.time()*1000)-start_ms}
    except Exception as e:
        return {"policy": None, "summary": f"Conflict check error: {e}", "conflicts": [], "resolution": "", "latency_ms": int(time.time()*1000)-start_ms}


def _invoke_nova(prompt):
    bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)
    response = bedrock.invoke_model(
        modelId=NOVA_LITE_MODEL,
        body=json.dumps({"messages": [{"role": "user", "content": [{"text": prompt}]}],
                         "inferenceConfig": {"maxTokens": 1024, "temperature": 0.1}}),
        contentType="application/json", accept="application/json"
    )
    result = json.loads(response["body"].read())
    return result["output"]["message"]["content"][0]["text"]