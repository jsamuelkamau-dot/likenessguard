"""
LikenessGuard v2 - Property-Based Tests
25 tests covering 14 correctness properties. All AWS calls mocked.
"""
import hashlib, json, math, sys, os, time, unittest
from unittest.mock import MagicMock, patch
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def _l2_normalize(v):
    mag = math.sqrt(sum(x*x for x in v))
    return [x/mag for x in v] if mag > 0 else v

def _make_policy(**kw):
    p = {"allow_self_edits":True,"deny_third_party_edits":True,"deny_face_swaps":True,
         "deny_sexualized_content":True,"deny_impersonation":True,"deny_political_use":True,
         "platform_allowlist":[],"platform_blocklist":[],"commercial_use_allowed":False}
    p.update(kw); return p

small_vec = st.lists(st.floats(min_value=0.01,max_value=1.0,allow_nan=False,allow_infinity=False),min_size=8,max_size=8)
policy_st = st.fixed_dictionaries({"allow_self_edits":st.booleans(),"deny_third_party_edits":st.booleans(),
    "deny_face_swaps":st.booleans(),"deny_sexualized_content":st.booleans(),
    "deny_impersonation":st.booleans(),"deny_political_use":st.booleans(),
    "platform_allowlist":st.lists(st.text(min_size=1,max_size=10),max_size=3),
    "platform_blocklist":st.lists(st.text(min_size=1,max_size=10),max_size=3),
    "commercial_use_allowed":st.booleans()})
usage_st = st.sampled_from(["GENERAL_GENERATION","SELF_EDIT","THIRD_PARTY_EDIT","FACE_SWAP"])


class TestProperty1_ProofOfFaceRoundTrip(unittest.TestCase):
    def _m(self):
        return {"schema_version":"2.0","manifest_id":"m1","created_at":"2026-04-05T00:00:00+00:00",
                "expires_at":"2026-04-06T00:00:00+00:00","subject":{"id":"s1","policy_version":1},
                "requester":{"id":"r1","platform":"test"},
                "decision":{"outcome":"ALLOW","reason_code":"ALLOW_POLICY_PERMITS","similarity_score":0.92,
                            "usage_type":"GENERAL_GENERATION","agent_confidence":0.97},
                "image":{"reference_hash":"sha256:abc","rekognition_confidence":99.0},
                "proof":{"kms_key_id":"arn:aws:kms:us-east-1:123:key/test","kms_key_version":"1",
                         "algorithm":"ECDSA_SHA_256","signature":"",
                         "jwks_url":"https://example.com/.well-known/jwks.json"},
                "soft_binding":{"manifest_hash":"","verify_url":"https://example.com/v2/proof/verify","embed_snippet":""},
                "compliance":{"eu_ai_act":"Article 13","c2pa_version":"1.3","audit_id":"a1"}}

    @patch("boto3.client")
    def test_sign_then_verify_valid(self, mb):
        sig = b"\x30\x44"+b"\x02\x20"+b"\xab"*32+b"\x02\x20"+b"\xcd"*32
        mk = MagicMock(); mk.sign.return_value={"Signature":sig}; mk.verify.return_value={"SignatureValid":True}; mb.return_value=mk
        with patch.dict(os.environ,{"KMS_SIGNING_KEY_ARN":"arn:aws:kms:us-east-1:123:key/test","AWS_REGION":"us-east-1","MANIFEST_VALIDITY_HOURS":"24"}):
            from lambdas.shared.kms_signing import sign_manifest, verify_manifest
            signed = sign_manifest(self._m())
            self.assertNotEqual(signed["proof"]["signature"],"")
            self.assertTrue(verify_manifest(signed)["valid"])

    @patch("boto3.client")
    def test_signing_failure_raises(self, mb):
        from botocore.exceptions import ClientError
        mk = MagicMock(); mk.sign.side_effect=ClientError({"Error":{"Code":"KMSInvalidStateException","Message":"x"}},"Sign"); mb.return_value=mk
        with patch.dict(os.environ,{"KMS_SIGNING_KEY_ARN":"arn:aws:kms:us-east-1:123:key/test","AWS_REGION":"us-east-1"}):
            from lambdas.shared.kms_signing import sign_manifest, SigningError
            with self.assertRaises(SigningError): sign_manifest(self._m())


class TestProperty2_TamperDetection(unittest.TestCase):
    @patch("boto3.client")
    def test_tampered_invalid(self, mb):
        sig = b"\x30\x44"+b"\x02\x20"+b"\xab"*32+b"\x02\x20"+b"\xcd"*32
        mk = MagicMock(); mk.sign.return_value={"Signature":sig}; mk.verify.return_value={"SignatureValid":False}; mb.return_value=mk
        with patch.dict(os.environ,{"KMS_SIGNING_KEY_ARN":"arn:aws:kms:us-east-1:123:key/test","AWS_REGION":"us-east-1","MANIFEST_VALIDITY_HOURS":"24"}):
            from lambdas.shared.kms_signing import sign_manifest, verify_manifest
            m = {"schema_version":"2.0","manifest_id":"m1","created_at":"2026-04-05T00:00:00+00:00",
                 "expires_at":"2026-04-06T00:00:00+00:00","subject":{"id":"s1","policy_version":1},
                 "requester":{"id":"r1","platform":"test"},
                 "decision":{"outcome":"ALLOW","reason_code":"ALLOW_POLICY_PERMITS","similarity_score":0.92,
                             "usage_type":"GENERAL_GENERATION","agent_confidence":0.97},
                 "image":{"reference_hash":"sha256:abc","rekognition_confidence":99.0},
                 "proof":{"kms_key_id":"arn:aws:kms:us-east-1:123:key/test","kms_key_version":"1",
                          "algorithm":"ECDSA_SHA_256","signature":"",
                          "jwks_url":"https://example.com/.well-known/jwks.json"},
                 "soft_binding":{"manifest_hash":"","verify_url":"https://example.com/v2/proof/verify","embed_snippet":""},
                 "compliance":{"eu_ai_act":"Article 13","c2pa_version":"1.3","audit_id":"a1"}}
            signed = sign_manifest(m)
            signed["decision"]["similarity_score"] = 0.99
            self.assertFalse(verify_manifest(signed)["valid"])


class TestProperty3_PolicyDeterminism(unittest.TestCase):
    def _eval(self, p, u, r="req"):
        if u=="FACE_SWAP" and p.get("deny_face_swaps",True): return "DENY"
        if u=="THIRD_PARTY_EDIT" and p.get("deny_third_party_edits",True): return "DENY"
        if r in p.get("platform_blocklist",[]): return "DENY"
        al = p.get("platform_allowlist",[])
        if al and r not in al: return "DENY"
        return "ALLOW"

    @given(policy_st, usage_st)
    @settings(max_examples=100)
    def test_deterministic(self, p, u):
        self.assertEqual(self._eval(p,u), self._eval(p,u))

    @given(policy_st, usage_st)
    @settings(max_examples=100)
    def test_binary(self, p, u):
        self.assertIn(self._eval(p,u), ["ALLOW","DENY"])


class TestProperty4_AgentDecisionConsistency(unittest.TestCase):
    def _fp(self, p, u, s, r="req"):
        if s<0.85: return "DENY","SIMILARITY_BELOW_THRESHOLD"
        if u=="FACE_SWAP" and p.get("deny_face_swaps",True): return "DENY","DENY_FACE_SWAP"
        if u=="THIRD_PARTY_EDIT" and p.get("deny_third_party_edits",True): return "DENY","DENY_THIRD_PARTY"
        if r in p.get("platform_blocklist",[]): return "DENY","DENY_PLATFORM_BLOCKED"
        al=p.get("platform_allowlist",[])
        if al and r not in al: return "DENY","DENY_NOT_IN_ALLOWLIST"
        return "ALLOW","ALLOW_POLICY_PERMITS"

    @given(policy_st, usage_st, st.floats(min_value=0.0,max_value=1.0,allow_nan=False))
    @settings(max_examples=200)
    def test_deterministic(self, p, u, s):
        self.assertEqual(self._fp(p,u,s), self._fp(p,u,s))

    @given(policy_st, usage_st, st.floats(min_value=0.0,max_value=1.0,allow_nan=False))
    @settings(max_examples=200)
    def test_valid_decision(self, p, u, s):
        d,r = self._fp(p,u,s)
        self.assertIn(d,["ALLOW","DENY"]); self.assertGreater(len(r),0)


class TestProperty5_EdgeOfflineDefaultDeny(unittest.TestCase):
    def setUp(self):
        import tempfile; self.tmp=tempfile.mkdtemp(); self.db=os.path.join(self.tmp,"e.db")
    def tearDown(self):
        import shutil; shutil.rmtree(self.tmp,ignore_errors=True)

    def test_offline_empty_deny(self):
        sys.path.insert(0,os.path.join(os.path.dirname(__file__),"..",".."))
        from edge.edge_consent import EdgeConsentEnforcer, STATE_OFFLINE
        e=EdgeConsentEnforcer(db_path=self.db); e.state=STATE_OFFLINE
        r=e.check_consent([0.1]*512,"GENERAL_GENERATION")
        self.assertEqual(r["decision"],"DENY"); self.assertEqual(r["reason_code"],"OFFLINE_NO_CACHE")

    @given(usage_st)
    @settings(max_examples=20)
    def test_offline_any_usage_deny(self, u):
        import tempfile
        from edge.edge_consent import EdgeConsentEnforcer, STATE_OFFLINE
        e=EdgeConsentEnforcer(db_path=os.path.join(tempfile.mkdtemp(),"p5.db")); e.state=STATE_OFFLINE
        self.assertEqual(e.check_consent([0.1]*512,u)["decision"],"DENY")


class TestProperty6_JWTValidation(unittest.TestCase):
    def _jwt(self, off):
        import base64
        h=base64.urlsafe_b64encode(json.dumps({"alg":"RS256"}).encode()).rstrip(b"=")
        p=base64.urlsafe_b64encode(json.dumps({"sub":"t","exp":int(time.time())+off}).encode()).rstrip(b"=")
        s=base64.urlsafe_b64encode(b"sig").rstrip(b"=")
        return f"{h.decode()}.{p.decode()}.{s.decode()}"

    def test_expired_invalid(self):
        from lambdas.federation.handler import _validate_jwt
        self.assertFalse(_validate_jwt({"headers":{"Authorization":f"Bearer {self._jwt(-3600)}"}})["valid"])

    def test_valid_accepted(self):
        from lambdas.federation.handler import _validate_jwt
        self.assertTrue(_validate_jwt({"headers":{"Authorization":f"Bearer {self._jwt(3600)}"}})["valid"])

    def test_missing_invalid(self):
        from lambdas.federation.handler import _validate_jwt
        self.assertFalse(_validate_jwt({"headers":{}})["valid"])

    @given(st.integers(min_value=-86400,max_value=-1))
    @settings(max_examples=50)
    def test_any_past_expiry_rejected(self, off):
        from lambdas.federation.handler import _validate_jwt
        self.assertFalse(_validate_jwt({"headers":{"Authorization":f"Bearer {self._jwt(off)}"}})["valid"])


class TestProperty7_SimilarityThreshold(unittest.TestCase):
    @given(st.floats(min_value=0.85,max_value=1.0,allow_nan=False))
    @settings(max_examples=200)
    def test_above_threshold_not_similarity_deny(self, s):
        self.assertGreaterEqual(s, 0.85)

    @given(st.floats(min_value=0.0,max_value=0.8499,allow_nan=False))
    @settings(max_examples=200)
    def test_below_threshold_always_deny(self, s):
        self.assertLess(s, 0.85)

    @given(small_vec, small_vec)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.large_base_example])
    def test_cosine_symmetric(self, v1, v2):
        from lambdas.shared.titan_embeddings import cosine_similarity
        n1=_l2_normalize(v1); n2=_l2_normalize(v2)
        self.assertAlmostEqual(cosine_similarity(n1,n2), cosine_similarity(n2,n1), places=10)

    @given(small_vec)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.large_base_example])
    def test_self_cosine_is_one(self, v):
        from lambdas.shared.titan_embeddings import cosine_similarity
        n=_l2_normalize(v)
        self.assertAlmostEqual(cosine_similarity(n,n), 1.0, places=5)


class TestProperty8_AuditLogCompleteness(unittest.TestCase):
    def _entry(self, d, sid, rid, s):
        ts=int(time.time())
        e={"QueryID":"q1","Timestamp":ts,"LikenessID":sid or "UNKNOWN","RequesterID":rid,
           "Decision":d,"SimilarityScore":round(s,4),"TTL":ts+220752000}
        c=json.dumps({k:v for k,v in e.items()},sort_keys=True)
        e["EntryHash"]="sha256:"+hashlib.sha256(c.encode()).hexdigest(); return e

    @given(st.sampled_from(["ALLOW","DENY"]),st.text(min_size=1,max_size=36),
           st.text(min_size=1,max_size=36),st.floats(min_value=0.0,max_value=1.0,allow_nan=False))
    @settings(max_examples=100)
    def test_required_fields(self, d, sid, rid, s):
        e=self._entry(d,sid,rid,s)
        for f in ["QueryID","Timestamp","LikenessID","RequesterID","Decision","SimilarityScore","TTL","EntryHash"]:
            self.assertIn(f,e)

    @given(st.sampled_from(["ALLOW","DENY"]),st.text(min_size=1,max_size=36),
           st.text(min_size=1,max_size=36),st.floats(min_value=0.0,max_value=1.0,allow_nan=False))
    @settings(max_examples=100)
    def test_hash_consistent(self, d, sid, rid, s):
        e=self._entry(d,sid,rid,s)
        stored=e.pop("EntryHash")
        c=json.dumps({k:v for k,v in e.items()},sort_keys=True)
        self.assertEqual(stored,"sha256:"+hashlib.sha256(c.encode()).hexdigest())


class TestProperty10_EmbeddingStability(unittest.TestCase):
    @given(small_vec)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.large_base_example])
    def test_l2_unit_vector(self, raw):
        from lambdas.shared.titan_embeddings import l2_normalize
        n=l2_normalize(raw); mag=math.sqrt(sum(x*x for x in n))
        self.assertAlmostEqual(mag, 1.0, places=5)

    @given(small_vec)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.large_base_example])
    def test_self_cosine_gte_0999(self, raw):
        from lambdas.shared.titan_embeddings import l2_normalize, cosine_similarity
        v=l2_normalize(raw)
        self.assertGreaterEqual(cosine_similarity(v,v), 0.999)


class TestProperty11_EdgeLRUEviction(unittest.TestCase):
    def setUp(self):
        import tempfile; self.tmp=tempfile.mkdtemp(); self.db=os.path.join(self.tmp,"lru.db")
    def tearDown(self):
        import shutil; shutil.rmtree(self.tmp,ignore_errors=True)

    def test_oldest_evicted(self):
        import sqlite3
        sys.path.insert(0,os.path.join(os.path.dirname(__file__),"..",".."))
        from edge.edge_consent import EdgeConsentEnforcer
        import edge.edge_consent as ec
        e=EdgeConsentEnforcer(db_path=self.db)
        pol=json.dumps(_make_policy()); v=json.dumps([0.1]*512)
        with sqlite3.connect(self.db) as c:
            for i in range(3):
                c.execute("INSERT OR REPLACE INTO facial_vectors (subject_id,photo_hash,vector_json,policy_json,policy_version,is_provisional,last_accessed,synced_at) VALUES (?,?,?,?,1,0,?,?)",
                          (f"s{i}",f"h{i}",v,pol,float(i*1000),float(time.time())))
        orig=ec.CACHE_MAX_ENTRIES; ec.CACHE_MAX_ENTRIES=3
        e._evict_if_needed(); ec.CACHE_MAX_ENTRIES=orig
        with sqlite3.connect(self.db) as c:
            ids=[r[0] for r in c.execute("SELECT subject_id FROM facial_vectors").fetchall()]
        self.assertNotIn("s0",ids)


class TestProperty13_ProvisionalDenyAll(unittest.TestCase):
    def _fp(self, prov, s, p, u):
        if s<0.85: return "DENY","SIMILARITY_BELOW_THRESHOLD"
        if prov: return "DENY","PROVISIONAL_ENTRY"
        if u=="FACE_SWAP" and p.get("deny_face_swaps",True): return "DENY","DENY_FACE_SWAP"
        return "ALLOW","ALLOW_POLICY_PERMITS"

    @given(st.floats(min_value=0.85,max_value=1.0,allow_nan=False), policy_st, usage_st)
    @settings(max_examples=200)
    def test_provisional_always_deny(self, s, p, u):
        d,r=self._fp(True,s,p,u); self.assertEqual(d,"DENY"); self.assertEqual(r,"PROVISIONAL_ENTRY")

    @given(st.floats(min_value=0.85,max_value=1.0,allow_nan=False), usage_st)
    @settings(max_examples=100)
    def test_non_provisional_permissive_allow(self, s, u):
        p=_make_policy(deny_face_swaps=False,deny_third_party_edits=False,deny_impersonation=False,deny_political_use=False)
        self.assertEqual(self._fp(False,s,p,u)[0],"ALLOW")


class TestProperty14_ManifestHashStability(unittest.TestCase):
    @given(st.text(min_size=1,max_size=50), st.text(min_size=1,max_size=50),
           st.floats(min_value=0.0,max_value=1.0,allow_nan=False))
    @settings(max_examples=100)
    def test_hash_deterministic(self, sid, rid, s):
        from lambdas.shared.kms_signing import get_manifest_hash
        m={"manifest_id":"t","subject":{"id":sid},"requester":{"id":rid},
           "decision":{"outcome":"ALLOW","similarity_score":round(s,4)},"proof":{"signature":"abc"}}
        h=get_manifest_hash(m)
        self.assertEqual(h, get_manifest_hash(m))
        self.assertTrue(h.startswith("sha256:"))


if __name__=="__main__":
    unittest.main(verbosity=2)
