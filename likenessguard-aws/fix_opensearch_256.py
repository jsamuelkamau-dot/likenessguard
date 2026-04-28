import boto3, requests
from requests_aws4auth import AWS4Auth

endpoint = "https://nxd3bg25jojtumlkpbdk.us-east-1.aoss.amazonaws.com"
region = "us-east-1"
session = boto3.Session()
creds = session.get_credentials().get_frozen_credentials()
auth = AWS4Auth(creds.access_key, creds.secret_key, region, "aoss", session_token=creds.token)

r = requests.delete(f"{endpoint}/likenessguard-vectors", auth=auth)
print(f"DELETE: {r.status_code}")

mapping = {
    "settings": {"index": {"knn": True, "knn.algo_param.ef_search": 256}},
    "mappings": {"properties": {
        "subject_id": {"type": "keyword"},
        "vector": {
            "type": "knn_vector",
            "dimension": 256,
            "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib", "parameters": {"ef_construction": 256, "m": 16}}
        },
        "photo_hash": {"type": "keyword"},
        "registered_at": {"type": "date"},
        "policy_version": {"type": "integer"},
        "is_provisional": {"type": "boolean"}
    }}
}
r2 = requests.put(f"{endpoint}/likenessguard-vectors", auth=auth, json=mapping, headers={"Content-Type": "application/json"})
print(f"CREATE 256-dim: {r2.status_code} {r2.text[:200]}")
