"""
Proof Verification Lambda — POST /v2/proof/verify

Verifies a Proof-of-Face signed manifest using KMS ECDSA verification.
Returns VALID/INVALID within 200ms.

Requirements: 3.4, 3.9
"""
import json
import logging
import os
import time
import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def lambda_handler(event, context):
    start_ms = int(time.time() * 1000)
    try:
        body = _parse_body(event)
        manifest = body.get('manifest')
        if not manifest:
            return _api_response(400, {"error": "manifest field is required"})

        from lambdas.shared.kms_signing import verify_manifest
        result = verify_manifest(manifest)

        return _api_response(200, {
            "valid": result['valid'],
            "reason": result['reason'],
            "manifest_id": manifest.get('manifest_id'),
            "subject_id": manifest.get('subject', {}).get('id'),
            "decision": manifest.get('decision', {}).get('outcome'),
            "latency_ms": int(time.time() * 1000) - start_ms
        })
    except Exception as e:
        logger.error(f"Proof verification error: {e}")
        return _api_response(500, {"error": "Verification failed", "valid": False})


def _parse_body(event):
    body = event.get('body', event)
    if isinstance(body, str):
        return json.loads(body)
    return body or {}


def _api_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body)
    }
