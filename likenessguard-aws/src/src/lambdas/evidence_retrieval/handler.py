"""
Evidence Retrieval Lambda — v2 compatible replacement.

Reads directly from LikenessGuard-AuditLog DynamoDB table.
Handles both legacy (snake_case) and v2 (PascalCase) attribute schemas.
Returns records sorted newest-first.
"""
import json
import logging
import os
import time
import boto3
from boto3.dynamodb.types import TypeDeserializer

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

AUDIT_LOG_TABLE = os.environ.get('AUDIT_LOG_TABLE', 'LikenessGuard-AuditLog')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
DEFAULT_LIMIT = 100

_deserializer = TypeDeserializer()


def _deser(item: dict) -> dict:
    """Deserialize a DynamoDB item from low-level format to plain Python dict."""
    return {k: _deserializer.deserialize(v) for k, v in item.items()}


def _normalize(raw: dict) -> dict:
    """
    Normalize a DynamoDB record to a consistent evidence record shape.
    Handles both v1 (snake_case) and v2 (PascalCase) attribute names.
    """
    # PascalCase (v2 supervisor) takes priority, fall back to snake_case (v1)
    query_id = raw.get('QueryID') or raw.get('query_id') or raw.get('id', '')
    timestamp = raw.get('Timestamp') or raw.get('timestamp') or int(time.time())
    decision = raw.get('Decision') or raw.get('decision') or 'UNKNOWN'
    reason_code = raw.get('ReasonCode') or raw.get('reason_code') or ''
    likeness_id = raw.get('LikenessID') or raw.get('likeness_id') or 'UNKNOWN'
    requester_id = raw.get('RequesterID') or raw.get('requester_id') or ''
    usage_type = raw.get('UsageType') or raw.get('usage_type') or ''
    manifest_hash = raw.get('ManifestHash') or raw.get('manifest_hash')

    # SimilarityScore may be Decimal from DynamoDB deserializer
    sim_raw = raw.get('SimilarityScore') or raw.get('similarity_score') or 0
    try:
        similarity_score = float(sim_raw)
    except (TypeError, ValueError):
        similarity_score = 0.0

    # Convert timestamp to int (may be Decimal)
    try:
        timestamp = int(timestamp)
    except (TypeError, ValueError):
        timestamp = int(time.time())

    return {
        'query_id': str(query_id),
        'timestamp': timestamp,
        'decision': str(decision),
        'reason_code': str(reason_code),
        'likeness_id': str(likeness_id),
        'requester_id': str(requester_id),
        'usage_type': str(usage_type),
        'similarity_score': similarity_score,
        'has_proof': bool(manifest_hash),
        'manifest_hash': str(manifest_hash) if manifest_hash else None,
    }


def lambda_handler(event, context):
    try:
        query_params = event.get('queryStringParameters') or {}
        likeness_id = query_params.get('likeness_id') or query_params.get('likenessId')
        try:
            limit = int(query_params.get('limit', DEFAULT_LIMIT))
            limit = max(1, min(limit, 500))
        except (TypeError, ValueError):
            limit = DEFAULT_LIMIT

        ddb = boto3.client('dynamodb', region_name=AWS_REGION)
        records = []

        if likeness_id:
            # Scan with filter — GSI not guaranteed, use scan with filter
            paginator = ddb.get_paginator('scan')
            pages = paginator.paginate(
                TableName=AUDIT_LOG_TABLE,
                FilterExpression='LikenessID = :lid OR likeness_id = :lid',
                ExpressionAttributeValues={':lid': {'S': likeness_id}},
                PaginationConfig={'MaxItems': limit * 3}  # over-fetch to account for filter
            )
            for page in pages:
                for item in page.get('Items', []):
                    records.append(_normalize(_deser(item)))
                if len(records) >= limit:
                    break
        else:
            # Full scan — get all records
            paginator = ddb.get_paginator('scan')
            pages = paginator.paginate(
                TableName=AUDIT_LOG_TABLE,
                PaginationConfig={'MaxItems': limit}
            )
            for page in pages:
                for item in page.get('Items', []):
                    records.append(_normalize(_deser(item)))

        # Sort newest-first
        records.sort(key=lambda r: r['timestamp'], reverse=True)
        records = records[:limit]

        logger.info(f"Returning {len(records)} evidence records (likeness_id={likeness_id})")

        body = {
            'likeness_id': likeness_id or 'ALL',
            'evidence_records': records,
            'count': len(records),
            'last_evaluated_key': None,
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            'body': json.dumps(body),
        }

    except Exception as e:
        logger.error(f"Evidence retrieval error: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}}),
        }
