#!/usr/bin/env python3
"""
Publish JWKS endpoint for Proof-of-Face KMS key.

Fetches the KMS public key, converts to JWK format (EC P-256),
and uploads to the JWKS S3 bucket.

Usage:
    python publish_jwks.py --key-arn <arn> --bucket <bucket-name> --region us-east-1

Requirements: 3.10, 3.2
"""
import argparse
import base64
import json
import struct
import sys
import boto3


def der_to_jwk(der_bytes: bytes, key_id: str) -> dict:
    """
    Convert DER-encoded EC P-256 public key to JWK format.
    AWS KMS returns SubjectPublicKeyInfo (SPKI) DER format.
    The uncompressed EC point (0x04 + 32 bytes x + 32 bytes y) is the last 65 bytes.
    """
    # The uncompressed point is always the last 65 bytes of the SPKI structure
    if len(der_bytes) < 65:
        raise ValueError(f"DER key too short: {len(der_bytes)} bytes")

    # Find 0x04 marker (uncompressed point) - search from the end
    for i in range(len(der_bytes) - 65, -1, -1):
        if der_bytes[i] == 0x04 and i + 65 <= len(der_bytes):
            point = der_bytes[i:i + 65]
            x_bytes = point[1:33]
            y_bytes = point[33:65]
            x_b64 = base64.urlsafe_b64encode(x_bytes).rstrip(b'=').decode('utf-8')
            y_b64 = base64.urlsafe_b64encode(y_bytes).rstrip(b'=').decode('utf-8')
            return {
                "kty": "EC", "crv": "P-256", "use": "sig", "alg": "ES256",
                "kid": key_id, "x": x_b64, "y": y_b64
            }

    raise ValueError(f"Could not find EC uncompressed point in DER key ({len(der_bytes)} bytes)")


def main():
    parser = argparse.ArgumentParser(description='Publish LikenessGuard JWKS endpoint')
    parser.add_argument('--key-arn', required=True, help='KMS key ARN for Proof-of-Face signing')
    parser.add_argument('--bucket', required=True, help='S3 bucket name for JWKS')
    parser.add_argument('--region', default='us-east-1', help='AWS region')
    args = parser.parse_args()

    kms = boto3.client('kms', region_name=args.region)
    s3 = boto3.client('s3', region_name=args.region)

    print(f"Fetching public key from KMS: {args.key_arn}")
    response = kms.get_public_key(KeyId=args.key_arn)
    der_bytes = response['PublicKey']

    # Use key alias version as kid
    key_metadata = kms.describe_key(KeyId=args.key_arn)
    key_id = key_metadata['KeyMetadata']['KeyId'][:8]

    jwk = der_to_jwk(der_bytes, key_id)
    jwks = {"keys": [jwk]}

    jwks_json = json.dumps(jwks, indent=2)
    print(f"Generated JWK:\n{jwks_json}")

    # Upload to S3
    s3.put_object(
        Bucket=args.bucket,
        Key='.well-known/jwks.json',
        Body=jwks_json.encode('utf-8'),
        ContentType='application/json',
        CacheControl='max-age=3600'
    )
    print(f"JWKS published to s3://{args.bucket}/.well-known/jwks.json")
    return 0


if __name__ == '__main__':
    sys.exit(main())
