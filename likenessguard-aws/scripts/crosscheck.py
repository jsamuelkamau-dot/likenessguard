"""Live cross-check of all LikenessGuard v2 improvements."""
import urllib.request, json, boto3, base64, hashlib

BASE = 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1'
KMS_ARN = 'arn:aws:kms:us-east-1:538784191640:key/d47b74ed-d4e4-46c3-a6f3-f3a659dbf3c5'

def get(path):
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE+path, method='GET'), timeout=15) as r:
            d = json.loads(r.read())
            return json.loads(d['body']) if isinstance(d.get('body'), str) else d
    except Exception as e:
        return {'error': str(e)}

def post(path, body):
    try:
        req = urllib.request.Request(BASE+path, data=json.dumps(body).encode(), headers={'Content-Type':'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read())
            return json.loads(d['body']) if isinstance(d.get('body'), str) else d
    except Exception as e:
        return {'error': str(e)}

results = []

def check(name, condition, detail=''):
    status = 'PASS' if condition else 'FAIL'
    results.append((name, status, detail))
    print(f"  [{status}] {name}: {detail}")

print("\n=== LIKENESSGUARD v2 LIVE CROSS-CHECK ===\n")

# 1. Live Metrics API
print("1. Live Metrics API")
m = get('/v2/metrics/live')
check("Metrics endpoint live", 'total_checks_24h' in m, f"checks={m.get('total_checks_24h')}, registered={m.get('total_registered')}")

# 2. Edge Status
print("\n2. Edge Component")
e = get('/v2/edge/status')
check("Edge status endpoint", 'state' in e, f"state={e.get('state')}, node={e.get('node_id')}")

# 3. Policy Reasoner (NL->JSON)
print("\n3. Policy Reasoner (NL->JSON via Nova Lite)")
p = post('/v2/policy/nl-to-json', {'mode':'nl_to_json','input':'Block face swaps, allow personal use only'})
check("NL to JSON conversion", p.get('policy') is not None, f"summary={p.get('summary','')[:50]}")

# 4. Supervisor (multi-agent consent check)
print("\n4. Supervisor (Multi-Agent Pipeline)")
s = post('/v2/consent/check', {'image':'dGVzdA==','usage_type':'GENERAL_GENERATION','requester_id':'crosscheck'})
check("Supervisor endpoint live", 'decision' in s, f"decision={s.get('decision')}, reason={s.get('reason_code')}")
check("Agent trace returned", 'agent_trace' in s, f"has_trace={s.get('agent_trace') is not None}")

# 5. KMS Proof-of-Face
print("\n5. KMS Proof-of-Face (ECDSA P-256 + C2PA)")
kms = boto3.client('kms', region_name='us-east-1')
manifest = {'schema_version':'2.0','manifest_id':'cc-001','created_at':'2026-04-07T00:00:00+00:00','expires_at':'2099-04-07T00:00:00+00:00','subject':{'id':'test','policy_version':1},'requester':{'id':'test','platform':'test'},'decision':{'outcome':'ALLOW','reason_code':'ALLOW_POLICY_PERMITS','similarity_score':0.92,'usage_type':'GENERAL_GENERATION','agent_confidence':0.97},'image':{'reference_hash':'sha256:abc','rekognition_confidence':99.0},'proof':{'kms_key_id':KMS_ARN,'kms_key_version':'1','algorithm':'ECDSA_SHA_256','signature':'','jwks_url':'https://d3no707zeqahj6.cloudfront.net/.well-known/jwks.json'},'soft_binding':{'manifest_hash':'','verify_url':'','embed_snippet':''},'compliance':{'eu_ai_act':'Article 13','c2pa_version':'1.3','audit_id':'cc-001'}}
m2s = {k:v for k,v in manifest.items() if k!='proof'}
m2s['proof'] = {k:v for k,v in manifest['proof'].items() if k!='signature'}
canonical = json.dumps(m2s, sort_keys=True, separators=(',',':'))
msg_hash = hashlib.sha256(canonical.encode()).digest()
sig = kms.sign(KeyId=KMS_ARN, Message=msg_hash, MessageType='DIGEST', SigningAlgorithm='ECDSA_SHA_256')
manifest['proof']['signature'] = base64.b64encode(sig['Signature']).decode()
pv = post('/v2/proof/verify', {'manifest': manifest})
check("KMS signing works", sig.get('Signature') is not None, "ECDSA_SHA_256 signature generated")
check("ProofVerify endpoint", pv.get('valid') == True, f"valid={pv.get('valid')}, reason={pv.get('reason')}")

# 6. OpenSearch Vector Index
print("\n6. OpenSearch Serverless Vector Index")
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
creds = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(creds, 'us-east-1', 'aoss')
os_client = OpenSearch(hosts=[{'host':'nxd3bg25jojtumlkpbdk.us-east-1.aoss.amazonaws.com','port':443}], http_auth=auth, use_ssl=True, verify_certs=True, connection_class=RequestsHttpConnection)
count = os_client.count(index='likenessguard-vectors')
check("OpenSearch collection active", count['count'] > 0, f"vectors_indexed={count['count']}")
knn = os_client.search(index='likenessguard-vectors', body={'size':1,'query':{'knn':{'vector':{'vector':[0.1]*512,'k':1}}}})
top_score = knn['hits']['hits'][0]['_score'] if knn['hits']['hits'] else 0
check("k-NN search working", top_score > 0, f"top_score={top_score:.4f}")

# 7. DynamoDB Tables
print("\n7. DynamoDB Tables")
ddb = boto3.client('dynamodb', region_name='us-east-1')
for table in ['LikenessGuard-ConsentRegistry','LikenessGuard-AuditLog','LikenessGuard-Federation','LikenessGuard-Suspensions']:
    try:
        r = ddb.describe_table(TableName=table)
        check(f"Table {table}", r['Table']['TableStatus'] == 'ACTIVE', r['Table']['TableStatus'])
    except Exception as ex:
        check(f"Table {table}", False, str(ex))

# 8. Lambda Functions
print("\n8. Lambda Functions")
lam = boto3.client('lambda', region_name='us-east-1')
for fn in ['LikenessGuard-Supervisor','LikenessGuard-AnomalyAgent','LikenessGuard-ConsentOrchestrator','LikenessGuard-PolicyReasoner','LikenessGuard-ProofVerify','LikenessGuard-Federation','LikenessGuard-Metrics','LikenessGuard-Backfill']:
    try:
        r = lam.get_function_configuration(FunctionName=fn)
        check(f"Lambda {fn}", r['State'] == 'Active', r['State'])
    except Exception:
        check(f"Lambda {fn}", False, 'NOT FOUND')

# 9. IoT Thing (Greengrass)
print("\n9. Greengrass Edge (Laptop)")
iot = boto3.client('iot', region_name='us-east-1')
try:
    t = iot.describe_thing(thingName='LikenessGuardEdgeLaptop')
    check("IoT Thing registered", True, f"thingName={t['thingName']}")
except Exception as ex:
    check("IoT Thing registered", False, str(ex))

# 10. SDK Files
print("\n10. Integration SDKs")
import os
check("Python SDK", os.path.exists('sdk/python/likenessguard/__init__.py'), "sdk/python/likenessguard/__init__.py")
check("Node.js SDK", os.path.exists('sdk/nodejs/src/index.ts'), "sdk/nodejs/src/index.ts")
check("SD integration example", os.path.exists('sdk/python/examples/stable_diffusion_integration.py'), "stable_diffusion_integration.py")

# 11. Documentation
print("\n11. Documentation")
for doc in ['docs/architecture-v2.md','docs/judge-feedback-response.md','docs/compliance-checklist.md','docs/demo-script.md']:
    check(f"Doc {doc}", os.path.exists(doc), doc)

# 12. Frontend Components
print("\n12. Frontend New Components")
fe_base = '../likenessguard-dashboard/src'
for comp in ['components/agents/AgentReasoningTrace.tsx','components/edge/EdgeStatusIndicator.tsx','components/proof/ProofOfFacePreview.tsx','components/policy/NLPolicyEditor.tsx','pages/ImpactDashboard.tsx','pages/FederatedRegistry.tsx']:
    check(f"Frontend {comp.split('/')[-1]}", os.path.exists(f"{fe_base}/{comp}"), comp)

# Summary
print("\n=== SUMMARY ===")
passed = sum(1 for _,s,_ in results if s=='PASS')
failed = sum(1 for _,s,_ in results if s=='FAIL')
print(f"PASSED: {passed}/{len(results)}")
if failed:
    print(f"FAILED: {failed}")
    for n,s,d in results:
        if s == 'FAIL':
            print(f"  - {n}: {d}")
else:
    print("ALL CHECKS PASSED")
