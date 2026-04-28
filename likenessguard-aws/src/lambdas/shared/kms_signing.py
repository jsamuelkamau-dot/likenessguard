"""
KMS Signing Service — Proof-of-Face Cryptographic MVP

Implements C2PA-compatible signed manifest generation and verification
using AWS KMS ECDSA P-256 signing.

Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9, 3.10
"""
import base64
import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import boto3
from botocore.exceptions import ClientError
import urllib.request

logger = logging.getLogger(__name__)

KMS_KEY_ARN = os.environ.get('KMS_SIGNING_KEY_ARN', '')
JWKS_URL = os.environ.get('JWKS_URL', 'https://d3no707zeqahj6.cloudfront.net/.well-known/jwks.json')
MANIFEST_VALIDITY_HOURS = int(os.environ.get('MANIFEST_VALIDITY_HOURS', '24'))
SCHEMA_VERSION = '2.0'


class SigningError(Exception):
    pass


class VerificationError(Exception):
    pass


def build_manifest(
    subject_id: str,
    requester_id: str,
    decision: str,
    reason_code: str,
    similarity_score: float,
    usage_type: str,
    agent_confidence: float,
    reference_image_hash: str,
    rekognition_confidence: float,
    policy_version: int,
    audit_id: str,
    platform: str = 'other'
) -> dict:
    """
    Build a C2PA-compatible consent manifest (unsigned).
    All fields are included before signing.
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=MANIFEST_VALIDITY_HOURS)

    return {
        "schema_version": SCHEMA_VERSION,
        "manifest_id": str(uuid.uuid4()),
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "subject": {
            "id": subject_id,
            "policy_version": policy_version
        },
        "requester": {
            "id": requester_id,
            "platform": platform
        },
        "decision": {
            "outcome": decision,
            "reason_code": reason_code,
            "similarity_score": round(similarity_score, 4),
            "usage_type": usage_type,
            "agent_confidence": round(agent_confidence, 4)
        },
        "image": {
            "reference_hash": reference_image_hash,
            "rekognition_confidence": round(rekognition_confidence, 2)
        },
        "proof": {
            "kms_key_id": KMS_KEY_ARN,
            "kms_key_version": "1",
            "algorithm": "ECDSA_SHA_256",
            "signature": "",  # filled by sign_manifest
            "jwks_url": JWKS_URL
        },
        "soft_binding": {
            "manifest_hash": "",  # filled by sign_manifest
            "verify_url": JWKS_URL.replace('/.well-known/jwks.json', '/v2/proof/verify'),
            "embed_snippet": ""  # filled by sign_manifest
        },
        "compliance": {
            "eu_ai_act": "Article 13 - Transparency",
            "c2pa_version": "1.3",
            "audit_id": audit_id
        }
    }


def sign_manifest(manifest: dict) -> dict:
    """
    Sign a consent manifest using KMS ECDSA P-256.

    Steps:
    1. Canonicalise manifest (sort keys, no whitespace)
    2. SHA-256 hash the canonical form
    3. KMS ECDSA sign the hash
    4. Embed base64-encoded DER signature
    5. Compute and embed manifest hash for soft-binding

    Returns the manifest with proof.signature populated.
    Raises SigningError if KMS call fails (never returns unsigned ALLOW).
    """
    if not KMS_KEY_ARN:
        raise SigningError("KMS_SIGNING_KEY_ARN not configured")

    # Remove signature field before canonicalising
    manifest_to_sign = {k: v for k, v in manifest.items() if k != 'proof'}
    manifest_to_sign['proof'] = {k: v for k, v in manifest['proof'].items() if k != 'signature'}

    canonical = json.dumps(manifest_to_sign, sort_keys=True, separators=(',', ':'))
    message_hash = hashlib.sha256(canonical.encode('utf-8')).digest()

    try:
        kms = boto3.client('kms', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        response = kms.sign(
            KeyId=KMS_KEY_ARN,
            Message=message_hash,
            MessageType='DIGEST',
            SigningAlgorithm='ECDSA_SHA_256'
        )
        signature_b64 = base64.b64encode(response['Signature']).decode('utf-8')
    except ClientError as e:
        logger.error(f"KMS signing failed: {e}")
        raise SigningError(f"KMS signing failed: {e.response['Error']['Code']}")

    # Embed signature
    manifest['proof']['signature'] = signature_b64

    # Compute manifest hash for soft-binding
    full_canonical = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
    manifest_hash = 'sha256:' + hashlib.sha256(full_canonical.encode('utf-8')).hexdigest()
    manifest['soft_binding']['manifest_hash'] = manifest_hash
    verify_url = manifest['soft_binding']['verify_url']
    manifest['soft_binding']['embed_snippet'] = json.dumps({
        "lg_proof": manifest_hash,
        "lg_verify": verify_url,
        "lg_manifest_id": manifest['manifest_id']
    })

    logger.info(f"Signed manifest {manifest['manifest_id']} with KMS key")
    return manifest


def verify_manifest(manifest: dict) -> dict:
    """
    Verify a Proof-of-Face signed manifest.

    Returns dict with keys: valid (bool), reason (str)
    """
    try:
        # Check expiry
        expires_at = datetime.fromisoformat(manifest['expires_at'])
        if datetime.now(timezone.utc) > expires_at:
            return {"valid": False, "reason": "MANIFEST_EXPIRED"}

        # Reconstruct the signed payload
        manifest_to_verify = {k: v for k, v in manifest.items() if k != 'proof'}
        manifest_to_verify['proof'] = {
            k: v for k, v in manifest['proof'].items() if k != 'signature'
        }
        canonical = json.dumps(manifest_to_verify, sort_keys=True, separators=(',', ':'))
        message_hash = hashlib.sha256(canonical.encode('utf-8')).digest()

        # Decode signature
        signature_bytes = base64.b64decode(manifest['proof']['signature'])

        # Verify via KMS
        kms = boto3.client('kms', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        response = kms.verify(
            KeyId=KMS_KEY_ARN,
            Message=message_hash,
            MessageType='DIGEST',
            Signature=signature_bytes,
            SigningAlgorithm='ECDSA_SHA_256'
        )
        if response.get('SignatureValid'):
            return {"valid": True, "reason": "SIGNATURE_VALID"}
        else:
            return {"valid": False, "reason": "SIGNATURE_INVALID"}

    except ClientError as e:
        logger.error(f"KMS verification failed: {e}")
        return {"valid": False, "reason": f"KMS_ERROR: {e.response['Error']['Code']}"}
    except (KeyError, ValueError) as e:
        return {"valid": False, "reason": f"MALFORMED_MANIFEST: {e}"}


def get_manifest_hash(manifest: dict) -> str:
    """Compute SHA-256 hash of a manifest for audit log storage."""
    canonical = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
    return 'sha256:' + hashlib.sha256(canonical.encode('utf-8')).hexdigest()
