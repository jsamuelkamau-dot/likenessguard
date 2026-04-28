"""
Index existing DynamoDB likenesses into OpenSearch.
Uses existing FingerprintEmbedding (128-dim Rekognition) padded to 512-dim,
or generates new Titan embeddings if possible.
"""
import boto3, json, math, sys
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

REGION = 'us-east-1'
TABLE = 'LikenessGuard-ConsentRegistry'
OS_HOST = 'nxd3bg25jojtumlkpbdk.us-east-1.aoss.amazonaws.com'
INDEX = 'likenessguard-vectors'


def l2_normalize(v):
    mag = math.sqrt(sum(x*x for x in v))
    return [x/mag for x in v] if mag > 0 else v


def pad_to_512(v):
    """Pad or truncate vector to 512 dimensions."""
    if len(v) >= 512:
        return v[:512]
    # Repeat the vector to fill 512 dims
    result = []
    while len(result) < 512:
        result.extend(v)
    return l2_normalize(result[:512])


def get_opensearch_client():
    credentials = boto3.Session().get_credentials()
    auth = AWSV4SignerAuth(credentials, REGION, 'aoss')
    return OpenSearch(
        hosts=[{'host': OS_HOST, 'port': 443}],
        http_auth=auth, use_ssl=True, verify_certs=True,
        connection_class=RequestsHttpConnection
    )


def deserialize_policy(policy_map):
    """Convert DynamoDB Map to plain dict."""
    result = {}
    for k, v in policy_map.items():
        if 'BOOL' in v:
            result[k] = v['BOOL']
        elif 'S' in v:
            result[k] = v['S']
        elif 'N' in v:
            result[k] = float(v['N'])
    return result


def main():
    ddb = boto3.client('dynamodb', region_name=REGION)
    os_client = get_opensearch_client()

    indexed = 0
    skipped = 0
    errors = 0

    paginator = ddb.get_paginator('scan')
    for page in paginator.paginate(TableName=TABLE):
        for item in page.get('Items', []):
            subject_id = item.get('LikenessID', {}).get('S', '')
            if not subject_id:
                continue

            # Get embedding from DynamoDB List format
            embed_list = item.get('FingerprintEmbedding', {}).get('L', [])
            if not embed_list:
                print(f'  Skipping {subject_id[:20]}: no embedding')
                skipped += 1
                continue

            # Convert DynamoDB Number list to float list
            raw_vector = [float(e.get('N', 0)) for e in embed_list]
            non_zero = [x for x in raw_vector if x != 0]

            if len(non_zero) < 10:
                print(f'  Skipping {subject_id[:20]}: embedding too sparse ({len(non_zero)} non-zero)')
                skipped += 1
                continue

            # Pad/normalize to 512 dims
            vector_512 = pad_to_512(non_zero if len(non_zero) >= 8 else raw_vector)

            # Get policy version
            policy_version = 1

            # Get provisional status
            is_provisional = item.get('IsProvisional', {}).get('BOOL', False)

            # Get photo hash from fingerprint hash
            fp_hash = item.get('FingerprintHash', {}).get('S', subject_id[:16])

            try:
                doc = {
                    'subject_id': subject_id,
                    'vector': vector_512,
                    'photo_hash': fp_hash[:32],
                    'registered_at': '2026-01-01T00:00:00Z',
                    'policy_version': policy_version,
                    'is_provisional': is_provisional
                }
                doc_id = f"{subject_id}_{fp_hash[:16]}"
                os_client.index(index=INDEX, body=doc)
                print(f'  Indexed: {subject_id[:20]}... (dim={len(vector_512)})')
                indexed += 1
            except Exception as e:
                print(f'  Error indexing {subject_id[:20]}: {e}')
                errors += 1

    print(f'\nDone: indexed={indexed}, skipped={skipped}, errors={errors}')
    return 0 if errors == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
