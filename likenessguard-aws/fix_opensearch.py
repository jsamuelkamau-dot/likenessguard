import boto3, json, requests
from requests_aws4auth import AWS4Auth

endpoint = "https://nxd3bg25jojtumlkpbdk.us-east-1.aoss.amazonaws.com"
region = "us-east-1"
service = "aoss"

session = boto3.Session()
creds = session.get_credentials().get_frozen_credentials()
auth = AWS4Auth(creds.access_key, creds.secret_key, region, service, session_token=creds.token)

# Delete old index
r = requests.delete(f"{endpoint}/likenessguard-vectors", auth=auth)
print(f"DELETE: {r.status_code} {r.text[:200]}")

# Create new index with 1024 dims
mapping = {
    "settings": {"index": {"knn": True, "knn.algo_param.ef_search": 512}},
    "mappings": {"properties": {
        "subject_id": {"type": "keyword"},
        "vector": {
            "type": "knn_vector",
            "dimension": 1024,
            "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib", "parameters": {"ef_construction": 512, "m": 16}}
        },
        "photo_hash": {"type": "keyword"},
        "registered_at": {"type": "date"},
        "policy_version": {"type": "integer"},
        "is_provisional": {"type": "boolean"}
    }}
}
r2 = requests.put(f"{endpoint}/likenessguard-vectors", auth=auth, json=mapping, headers={"Content-Type": "application/json"})
print(f"CREATE: {r2.status_code} {r2.text[:300]}")
