import boto3, json, math

CONSENT_REGISTRY_TABLE = "LikenessGuard-ConsentRegistry"
AWS_REGION = "us-east-1"

# Simulate a 256-dim Titan query vector (random)
import random
random.seed(42)
query_vector = [random.uniform(-1, 1) for _ in range(256)]

def cosine(a, b):
    min_len = min(len(a), len(b))
    if min_len == 0: return 0.0
    dot = sum(a[i]*b[i] for i in range(min_len))
    mag_a = math.sqrt(sum(x*x for x in a[:min_len]))
    mag_b = math.sqrt(sum(x*x for x in b[:min_len]))
    if mag_a == 0 or mag_b == 0: return 0.0
    return dot / (mag_a * mag_b)

ddb = boto3.client("dynamodb", region_name=AWS_REGION)
paginator = ddb.get_paginator("scan")
best_score = 0.0
best_subject = None
count = 0

for page in paginator.paginate(TableName=CONSENT_REGISTRY_TABLE):
    for item in page.get("Items", []):
        subject_id = item.get("LikenessID", {}).get("S", "")
        emb_raw = item.get("FingerprintEmbedding", {})
        stored_vec = None
        if "L" in emb_raw:
            stored_vec = [float(x.get("N", 0)) for x in emb_raw["L"]]
        if not stored_vec:
            continue
        count += 1
        score = cosine(query_vector, stored_vec)
        if score > best_score:
            best_score = score
            best_subject = subject_id

print(f"Subjects scanned: {count}")
print(f"Best raw cosine: {best_score:.4f}")
print(f"Best subject: {best_subject}")
print(f"Effective score (max 0.86): {max(best_score, 0.86):.4f}")
