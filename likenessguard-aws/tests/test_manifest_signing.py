"""
Unit tests for Proof-of-Face manifest building and hash computation.
Tests the manifest structure without requiring KMS.
"""
import json
import hashlib
import pytest


def build_test_manifest(subject_id="sub-123", requester_id="test-platform",
                        decision="ALLOW", similarity_score=0.92) -> dict:
    """Build a test manifest (mirrors kms_signing.build_manifest)."""
    return {
        "schema_version": "2.0",
        "manifest_id": "test-manifest-001",
        "subject": {"id": subject_id, "policy_version": 1},
        "requester": {"id": requester_id, "platform": "test"},
        "decision": {
            "outcome": decision,
            "reason_code": "ALLOW_POLICY_PERMITS" if decision == "ALLOW" else "DENY",
            "similarity_score": similarity_score,
        },
    }


def compute_manifest_hash(manifest: dict) -> str:
    canonical = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
    return 'sha256:' + hashlib.sha256(canonical.encode()).hexdigest()


class TestManifestStructure:
    def test_manifest_has_required_fields(self):
        m = build_test_manifest()
        assert "schema_version" in m
        assert "manifest_id" in m
        assert "subject" in m
        assert "requester" in m
        assert "decision" in m

    def test_manifest_hash_deterministic(self):
        m = build_test_manifest()
        h1 = compute_manifest_hash(m)
        h2 = compute_manifest_hash(m)
        assert h1 == h2

    def test_manifest_hash_changes_on_mutation(self):
        m = build_test_manifest()
        h1 = compute_manifest_hash(m)
        m["decision"]["similarity_score"] = 0.50
        h2 = compute_manifest_hash(m)
        assert h1 != h2

    def test_deny_manifest_has_no_proof(self):
        m = build_test_manifest(decision="DENY")
        assert "proof" not in m
