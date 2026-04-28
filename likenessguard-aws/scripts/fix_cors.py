"""Fix CORS OPTIONS integrations for v2 API Gateway routes."""
import boto3, json

client = boto3.client('apigateway', region_name='us-east-1')
API_ID = 'ol35n8kn4f'

CORS_HEADERS = {
    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Api-Key'",
    'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
    'method.response.header.Access-Control-Allow-Origin': "'*'"
}

# Resources that need OPTIONS integration
resources_needing_fix = [
    ('wta3kl', '/v2/consent/check'),
    ('qbhbq1', '/v2/policy/nl-to-json'),
    ('6il3kt', '/v2/proof/verify'),
    ('badjqp', '/v2/metrics/live'),
    ('zr99ki', '/v2/edge/status'),
    ('4nprjm', '/v2/optout'),
]

for resource_id, path in resources_needing_fix:
    try:
        # Add MOCK integration
        client.put_integration(
            restApiId=API_ID, resourceId=resource_id, httpMethod='OPTIONS',
            type='MOCK', requestTemplates={'application/json': '{"statusCode":200}'}
        )
        # Add method response
        try:
            client.put_method_response(
                restApiId=API_ID, resourceId=resource_id, httpMethod='OPTIONS',
                statusCode='200',
                responseParameters={k: False for k in CORS_HEADERS}
            )
        except Exception:
            pass
        # Add integration response
        client.put_integration_response(
            restApiId=API_ID, resourceId=resource_id, httpMethod='OPTIONS',
            statusCode='200', responseParameters=CORS_HEADERS,
            responseTemplates={'application/json': ''}
        )
        print(f'Fixed CORS for {path}')
    except Exception as e:
        print(f'Error for {path}: {e}')

# Deploy
try:
    resp = client.create_deployment(restApiId=API_ID, stageName='v1', description='CORS fix')
    print(f'Deployed: {resp["id"]}')
except Exception as e:
    print(f'Deploy error: {e}')
