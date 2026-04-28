import boto3, json, requests
from requests_aws4auth import AWS4Auth
from boto3.dynamodb.types import TypeDeserializer

endpoint = "https://nxd3bg25jojtumlkpbdk.us-east-1.aoss.amazonaws.com"
region = "us-east-1"
session = boto3.Session()
creds = session.get_credentials().get_frozen_credentials()
auth = AWS4Auth(creds.access_key, creds.secret_key, region, "aoss", session_token=creds.token)
ddb = boto3.client("dynamodb", region_name=region)
deser = TypeDeserializer()

migrated = 0
skipped = 0

paginator = ddb.get_paginator("scan")
for page in paginator.paginate(TableName="LikenessGuard-ConsentRegistry"):
    for raw_item in page.get("Items", []):
        item = {k: deser.deserialize(v) for k, v in raw_item.items()}
        subject_id = item.get("LikenessID", "")
        if not subject_id:
            skipped += 1
            continue
        
        embedding = item.get("FingerprintEmbedding", [])
        if not embedding or len(embedding) == 0:
            skipped += 1
            continue
        
        # Truncate/pad to 256 dims
        vector = [float(x) for x in embedding[:256]]
        if len(vector) < 256:
            vector = vector + [0.0] * (256 - len(vector))
        
        photo_hash = item.get("FingerprintHash", subject_id)
        policy_version = int(item.get("PolicyVersion", 1) or 1)
        
        doc = {
            "subject_id": subject_id,
            "vector": vector,
            "photo_hash": photo_hash,
            "registered_at": "2026-01-01T00:00:00",
            "policy_version": policy_version,
            "is_provisional": False
        }
        # Use POST to auto-generate ID (OpenSearch Serverless compatible)
        r = requests.post(
            f"{endpoint}/likenessguard-vectors/_doc",
            auth=auth, json=doc,
            headers={"Content-Type": "application/json"}
        )
        if r.status_code in (200, 201):
            migrated += 1
        else:
            print(f"Failed {subject_id}: {r.status_code} {r.text[:100]}")
            skipped += 1

print(f"Migration complete: migrated={migrated}, skipped={skipped}")
