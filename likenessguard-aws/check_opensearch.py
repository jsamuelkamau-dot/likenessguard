import boto3, requests
from requests_aws4auth import AWS4Auth

endpoint = "https://nxd3bg25jojtumlkpbdk.us-east-1.aoss.amazonaws.com"
region = "us-east-1"
session = boto3.Session()
creds = session.get_credentials().get_frozen_credentials()
auth = AWS4Auth(creds.access_key, creds.secret_key, region, "aoss", session_token=creds.token)

# Count docs and check vector dims
r = requests.get(f"{endpoint}/likenessguard-vectors/_count", auth=auth)
print(f"OpenSearch doc count: {r.json()}")

# Get a sample doc to check vector dims
r2 = requests.post(f"{endpoint}/likenessguard-vectors/_search",
    auth=auth,
    json={"size": 1, "_source": ["subject_id", "vector"]},
    headers={"Content-Type": "application/json"})
hits = r2.json().get("hits", {}).get("hits", [])
if hits:
    vec = hits[0]["_source"].get("vector", [])
    print(f"Sample doc subject_id: {hits[0]['_source'].get('subject_id', 'N/A')}")
    print(f"Vector dims: {len(vec)}")
    print(f"First 5 values: {vec[:5]}")
