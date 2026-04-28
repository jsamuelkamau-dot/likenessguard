import boto3
client = boto3.client('apigateway', region_name='us-east-1')
resources = client.get_resources(restApiId='YOUR_API_ID', limit=100)
for r in resources['items']:
    methods = r.get('resourceMethods', {})
    for method in methods:
        try:
            client.get_integration(restApiId='YOUR_API_ID', resourceId=r['id'], httpMethod=method)
        except Exception:
            print(f"NO INTEGRATION: {r['path']} {method} id={r['id']}")
print("Done")

