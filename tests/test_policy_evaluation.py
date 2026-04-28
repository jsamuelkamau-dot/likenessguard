"""
Unit tests for consent policy evaluation logic.
Tests the core decision rules without requiring AWS services.
"""
import pytest


# ── Policy evaluation rules (extracted from consent_orchestrator) ─────────────

def evaluate_policy(policy: dict, usage_type: str, similarity_score: float,
                    anomaly_cleared: bool = True, is_provisional: bool = False,
                    threshold: float = 0.85) -> dict:
    """Pure function implementing consent decision logic."""
    if not anomaly_cleared:
        return {"decision": "DENY", "reason_code": "ANOMALY_BLOCKED"}
    if similarity_score < threshold:
        return {"decision": "DENY", "reason_code": "SIMILARITY_BELOW_THRESHOLD"}
    if is_provisional:
        return {"decision": "DENY", "reason_code": "PROVISIONAL_ENTRY"}
    if usage_type == "FACE_SWAP" and policy.get("deny_face_swaps", True):
        return {"decision": "DENY", "reason_code": "DENY_FACE_SWAP"}
    if usage_type == "THIRD_PARTY_EDIT" and policy.get("deny_third_party_edits", True):
        return {"decision": "DENY", "reason_code": "DENY_THIRD_PARTY"}
    if usage_type == "GENERAL_GENERATION" and policy.get("deny_impersonation", True):
        return {"decision": "DENY", "reason_code": "DENY_IMPERSONATION"}
    if usage_type == "SELF_EDIT" and policy.get("allow_self_edits", False):
        return {"decision": "ALLOW", "reason_code": "ALLOW_SELF_EDIT"}
    if not policy.get("deny_impersonation", True) and not policy.get("deny_face_swaps", True):
        return {"decision": "ALLOW", "reason_code": "ALLOW_POLICY_PERMITS"}
    return {"decision": "DENY", "reason_code": "DENY_DEFAULT"}


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestDefaultDeny:
    """All error paths must return DENY."""

    def test_anomaly_blocked(self):
        result = evaluate_policy({}, "GENERAL_GENERATION", 0.95, anomaly_cleared=False)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "ANOMALY_BLOCKED"

    def test_low_similarity(self):
        result = evaluate_policy({}, "GENERAL_GENERATION", 0.50)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "SIMILARITY_BELOW_THRESHOLD"

    def test_provisional_entry(self):
        result = evaluate_policy({}, "GENERAL_GENERATION", 0.95, is_provisional=True)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "PROVISIONAL_ENTRY"

    def test_empty_policy_denies(self):
        """Empty policy should default to DENY (most restrictive)."""
        result = evaluate_policy({}, "GENERAL_GENERATION", 0.95)
        assert result["decision"] == "DENY"


class TestPolicyRules:
    """Policy-specific deny rules."""

    def test_deny_face_swap(self):
        policy = {"deny_face_swaps": True}
        result = evaluate_policy(policy, "FACE_SWAP", 0.95)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "DENY_FACE_SWAP"

    def test_deny_third_party(self):
        policy = {"deny_third_party_edits": True}
        result = evaluate_policy(policy, "THIRD_PARTY_EDIT", 0.95)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "DENY_THIRD_PARTY"

    def test_deny_impersonation(self):
        policy = {"deny_impersonation": True}
        result = evaluate_policy(policy, "GENERAL_GENERATION", 0.95)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "DENY_IMPERSONATION"

    def test_allow_self_edit(self):
        policy = {"allow_self_edits": True}
        result = evaluate_policy(policy, "SELF_EDIT", 0.95)
        assert result["decision"] == "ALLOW"
        assert result["reason_code"] == "ALLOW_SELF_EDIT"

    def test_permissive_policy_allows(self):
        policy = {"deny_impersonation": False, "deny_face_swaps": False}
        result = evaluate_policy(policy, "GENERAL_GENERATION", 0.95)
        assert result["decision"] == "ALLOW"


class TestSimilarityThreshold:
    """Threshold boundary tests."""

    def test_exactly_at_threshold(self):
        result = evaluate_policy({"deny_impersonation": False, "deny_face_swaps": False},
                                 "GENERAL_GENERATION", 0.85)
        assert result["decision"] == "ALLOW"

    def test_just_below_threshold(self):
        result = evaluate_policy({}, "GENERAL_GENERATION", 0.849)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "SIMILARITY_BELOW_THRESHOLD"

    def test_zero_similarity(self):
        result = evaluate_policy({}, "GENERAL_GENERATION", 0.0)
        assert result["decision"] == "DENY"


class TestDecisionPriority:
    """Anomaly check takes priority over everything else."""

    def test_anomaly_overrides_high_similarity(self):
        result = evaluate_policy({"deny_impersonation": False}, "SELF_EDIT", 0.99,
                                 anomaly_cleared=False)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "ANOMALY_BLOCKED"

    def test_similarity_checked_before_policy(self):
        result = evaluate_policy({"allow_self_edits": True}, "SELF_EDIT", 0.50)
        assert result["decision"] == "DENY"
        assert result["reason_code"] == "SIMILARITY_BELOW_THRESHOLD"
