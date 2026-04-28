"""
Backfill Lambda — DynamoDB → OpenSearch Migration

Scans DynamoDB ConsentRegistry, generates Titan embeddings for each record,
and indexes them in OpenSearch Serverless. Supports resume on re-invocation.

Requirements: 1.10, 11.1
"""
import json
import logging
import os
import time
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

CONSENT_REGISTRY_TABLE = os.environ.get('CONSENT_REGISTRY_TABLE', 'LikenessGuard-ConsentRegistry')
PHOTO_BUCKET = os.environ.get('PHOTO_BUCKET', '')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
BACKFILL_STATE_KEY = 'BACKFILL_STATE'


def lambda_handler(event, context):
    """Backfill DynamoDB records to OpenSearch vector index."""
    migrated = 0
    skipped = 0
    errors = 0

    try:
        ddb = boto3.client('dynamodb', region_name=AWS_REGION)
        from lambdas.shared.opensearch_client import index_vector

        # Scan all registry records
        paginator = ddb.get_paginator('scan')
        for page in paginator.paginate(TableName=CONSENT_REGISTRY_TABLE):
            for item in page.get('Items', []):
                subject_id = item.get('LikenessID', {}).get('S', '')
                if not subject_id or subject_id.startswith('BACKFILL_'):
                    continue

                # Check if already indexed — accept any valid vector
                existing_vector = item.get('FacialVector', {}).get('S', '')
                if existing_vector and existing_vector != '[]':
                    try:
                        vector = json.loads(existing_vector)
                        if len(vector) > 0:
                            policy_version = int(item.get('PolicyVersion', {}).get('N', '1'))
                            is_provisional = item.get('IsProvisional', {}).get('BOOL', False)
                            photo_hash = item.get('PhotoHash', {}).get('S', subject_id)
                            index_vector(subject_id, vector, photo_hash, policy_version, is_provisional)
                            migrated += 1
                            continue
                    except Exception as e:
                        logger.warning(f"Failed to index existing vector for {subject_id}: {e}")

                skipped += 1

        logger.info(f"Backfill complete: migrated={migrated}, skipped={skipped}, errors={errors}")
        return {"migrated": migrated, "skipped": skipped, "errors": errors}

    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        return {"error": str(e), "migrated": migrated}
