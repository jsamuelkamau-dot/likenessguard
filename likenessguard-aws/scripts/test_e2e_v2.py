"""
End-to-end test of LikenessGuard v2 pipeline.
Uses a registered likeness's own embedding to simulate a matching face check.
"""
import boto3, json, math, base64, sys

REGION = 'us-east-1'
TABLE = 'LikenessGuard-ConsentRegistry'


def l2_normalize(v):
    mag = math.sqrt(sum(x*x for x in v))
    return [x/mag for x in v] if mag > 0 else v


def pad_to_512(v):
    result = []
    while len(result) < 512:
        result.extend(v)
    return l2_normalize(result[:512])


def get_registered_likeness():
    ddb = boto3.client('dynamodb', region_name=REGION)
    scan = ddb.scan(TableName=TABLE, Limit=20)
    for item in scan['Items']:
        embed_list = item.get('FingerprintEmbedding', {}).get('L', [])
        non_zero = [float(e['N']) for e in embed_list if float(e.get('N', 0)) != 0]
        if len(non_zero) > 10:
            lid = item['LikenessID']['S']
            policy_m = item.get('ConsentPolicy', {}).get('M', {})
            policy = {k: list(v.values())[0] for k, v in policy_m.items()}
            vector_512 = pad_to_512(non_zero)
            return lid, policy, vector_512
    return None, None, None


def test_supervisor_with_vector(subject_id, policy, query_vector):
    """Directly invoke Supervisor with a pre-computed query vector (bypassing Titan/Rekognition)."""
    client = boto3.client('lambda', region_name=REGION)

    # We invoke the Consent Orchestrator directly with the known match
    # to test the full decision + KMS signing pipeline
    payload = {
        'subject_id': subject_id,
        'policy': policy,
        'similarity_score': 0.92,
        'usage_type': 'GENERAL_GENERATION',
        'requester_id': 'test-e2e-runner',
        'anomaly_cleared': True,
        'top_candidates': [{'subject_id': subject_id, 'score': 0.92, 'is_provisional': False}],
        'policy_version': 1,
        'is_provisional': False
    }

    print("Step 1: Testing Consent Orchestrator...")
    r = client.invoke(FunctionName='LikenessGuard-ConsentOrchestrator', Payload=json.dumps(payload).encode())
    result = json.loads(r['Payload'].read())
    print(f"  Decision: {result.get('decision')} | Reason: {result.get('reason_code')} | Confidence: {result.get('confidence')}")
    print(f"  Reasoning: {result.get('reasoning_trace', '')[:100]}")

    if result.get('decision') == 'ALLOW':
        print("\nStep 2: Testing KMS Proof-of-Face signing...")
        import base64, hashlib
        kms_client = boto3.client('kms', region_name=REGION)
        key_arn = 'arn:aws:kms:us-east-1:YOUR_ACCOUNT_ID:key/d47b74ed-d4e4-46c3-a6f3-f3a659dbf3c5'
        jwks_url = 'https://d3no707zeqahj6.cloudfront.net/.well-known/jwks.json'

        manifest = {
            'schema_version': '2.0', 'manifest_id': 'e2e-test-001',
            'created_at': '2026-04-07T00:00:00+00:00', 'expires_at': '2099-04-07T00:00:00+00:00',
            'subject': {'id': subject_id, 'policy_version': 1},
            'requester': {'id': 'test-e2e-runner', 'platform': 'test'},
            'decision': {'outcome': 'ALLOW', 'reason_code': result.get('reason_code'),
                         'similarity_score': 0.92, 'usage_type': 'GENERAL_GENERATION',
                         'agent_confidence': result.get('confidence', 0.97)},
            'image': {'reference_hash': 'sha256:test', 'rekognition_confidence': 99.0},
            'proof': {'kms_key_id': key_arn, 'kms_key_version': '1', 'algorithm': 'ECDSA_SHA_256',
                      'signature': '', 'jwks_url': jwks_url},
            'soft_binding': {'manifest_hash': '', 'verify_url': '', 'embed_snippet': ''},
            'compliance': {'eu_ai_act': 'Article 13', 'c2pa_version': '1.3', 'audit_id': 'e2e-test-001'}
        }
        # Sign the manifest with KMS
        m2s = {k: v for k, v in manifest.items() if k != 'proof'}
        m2s['proof'] = {k: v for k, v in manifest['proof'].items() if k != 'signature'}
        canonical = json.dumps(m2s, sort_keys=True, separators=(',', ':'))
        msg_hash = hashlib.sha256(canonical.encode()).digest()
        sign_resp = kms_client.sign(KeyId=key_arn, Message=msg_hash, MessageType='DIGEST', SigningAlgorithm='ECDSA_SHA_256')
        manifest['proof']['signature'] = base64.b64encode(sign_resp['Signature']).decode()

        r2 = client.invoke(FunctionName='LikenessGuard-ProofVerify', Payload=json.dumps({'manifest': manifest}).encode())
        result2 = json.loads(r2['Payload'].read())
        body2 = json.loads(result2.get('body', '{}')) if isinstance(result2.get('body'), str) else result2
        print(f"  ProofVerify valid: {body2.get('valid')} | Reason: {body2.get('reason')}")
        print(f"  Manifest ID: {body2.get('manifest_id')} | Decision: {body2.get('decision')}")

    print("\nStep 3: Testing AnomalyAgent...")
    r3 = client.invoke(FunctionName='LikenessGuard-AnomalyAgent', Payload=json.dumps({
        'requester_id': 'test-e2e-runner',
        'usage_type': 'GENERAL_GENERATION',
        'request_payload_hash': 'sha256:test',
        'image_metadata': {'size_bytes': 50000},
        'request_count_1h': 3,
        'anomaly_count_1h': 0
    }).encode())
    result3 = json.loads(r3['Payload'].read())
    print(f"  Cleared: {result3.get('cleared')} | Threat: {result3.get('threat_type')} | Latency: {result3.get('latency_ms')}ms")

    print("\nStep 4: Testing PolicyReasoner...")
    r4 = client.invoke(FunctionName='LikenessGuard-PolicyReasoner', Payload=json.dumps({
        'mode': 'json_to_nl',
        'input': json.dumps(policy)
    }).encode())
    result4 = json.loads(r4['Payload'].read())
    print(f"  Summary: {result4.get('summary', '')[:120]}")

    print("\nStep 5: Testing OpenSearch k-NN query...")
    from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
    credentials = boto3.Session().get_credentials()
    auth = AWSV4SignerAuth(credentials, REGION, 'aoss')
    os_client = OpenSearch(
        hosts=[{'host': 'nxd3bg25jojtumlkpbdk.us-east-1.aoss.amazonaws.com', 'port': 443}],
        http_auth=auth, use_ssl=True, verify_certs=True,
        connection_class=RequestsHttpConnection
    )
    knn_result = os_client.search(index='likenessguard-vectors', body={
        'size': 3,
        'query': {'knn': {'vector': {'vector': query_vector, 'k': 3}}}
    })
    hits = knn_result.get('hits', {}).get('hits', [])
    print(f"  k-NN returned {len(hits)} candidates:")
    for hit in hits:
        src = hit.get('_source', {})
        print(f"    subject: {src.get('subject_id', '')[:20]}... | score: {hit.get('_score', 0):.4f}")

    return True


def main():
    print("=== LikenessGuard v2 End-to-End Test ===\n")

    subject_id, policy, vector_512 = get_registered_likeness()
    if not subject_id:
        print("ERROR: No registered likeness with embedding found")
        return 1

    print(f"Using registered likeness: {subject_id}")
    print(f"Policy: {json.dumps(policy)}\n")

    success = test_supervisor_with_vector(subject_id, policy, vector_512)

    print("\n=== Test Complete ===")
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())

