"""
Policy Update Lambda — v2 direct DynamoDB write.
POST /v2/policy/update
Body: { "likeness_id": str, "policy": { ... } }
"""
import json, logging, os, time, boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

CONSENT_REGISTRY_TABLE = os.environ.get('CONSENT_REGISTRY_TABLE', 'LikenessGuard-ConsentRegistry')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'}


def lambda_handler(event, context):
    try:
        body = event.get('body', event)
        if isinstance(body, str):
            body = json.loads(body)

        likeness_id = body.get('likeness_id', '').strip()
        policy = body.get('policy', {})

        if not likeness_id:
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'likeness_id is required'})}
        if not policy:
            return {'statusCode': 400, 'headers': CORS,
                    'body': json.dumps({'error': 'policy is required'})}

        ddb = boto3.client('dynamodb', region_name=AWS_REGION)

        # Check subject exists
        resp = ddb.get_item(TableName=CONSENT_REGISTRY_TABLE,
                            Key={'LikenessID': {'S': likeness_id}})
        if 'Item' not in resp:
            return {'statusCode': 404, 'headers': CORS,
                    'body': json.dumps({'error': f'Likeness {likeness_id} not found'})}

        # Build DynamoDB Map from policy dict
        policy_map = {}
        for k, v in policy.items():
            if isinstance(v, bool):
                policy_map[k] = {'BOOL': v}
            elif isinstance(v, str):
                policy_map[k] = {'S': v}
            elif isinstance(v, (int, float)):
                policy_map[k] = {'N': str(v)}
            elif isinstance(v, list):
                policy_map[k] = {'L': [{'S': str(x)} for x in v]}
            elif v is None:
                policy_map[k] = {'NULL': True}

        ddb.update_item(
            TableName=CONSENT_REGISTRY_TABLE,
            Key={'LikenessID': {'S': likeness_id}},
            UpdateExpression='SET ConsentPolicy = :p, ModifiedAt = :t',
            ExpressionAttributeValues={
                ':p': {'M': policy_map},
                ':t': {'N': str(int(time.time()))},
            }
        )

        logger.info(f"Policy updated for {likeness_id}: {list(policy.keys())}")
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'success': True, 'likeness_id': likeness_id,
                                    'updated_at': int(time.time())})}

    except Exception as e:
        logger.error(f"Policy update error: {e}", exc_info=True)
        return {'statusCode': 500, 'headers': CORS,
                'body': json.dumps({'error': str(e)})}
