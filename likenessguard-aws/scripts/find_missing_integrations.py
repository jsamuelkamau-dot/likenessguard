import boto3
client = boto3.client('apigateway', region_name='us-east-1')
resources = client.get_resources(restApiId='ol35n8kn4f', limit=100)
for r in resources['items']:
    methods = r.get('resourceMethods', {})
    for method in methods:
        try:
            client.get_integration(restApiId='ol35n8kn4f', resourceId=r['id'], httpMethod=method)
        except Exception:
            print(f"NO INTEGRATION: {r['path']} {method} id={r['id']}")
print("Done")
