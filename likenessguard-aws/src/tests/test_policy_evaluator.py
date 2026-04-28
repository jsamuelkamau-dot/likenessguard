"""
Unit tests for policy evaluator.

Tests specific policy evaluation scenarios including self-edits,
third-party edits, face swaps, and various policy combinations.

Requirements:
- 5.1: All policy options are supported
- 10.3: Permitted usage returns ALLOW
- 10.4: Prohibited usage returns DENY
"""

import pytest
from src.shared.models.data_models import ConsentPolicy, UsageType, Decision, ReasonCode
from src.shared.services.policy_evaluator import evaluate_consent


class TestSelfEditScenarios:
    """Test self-edit scenarios where requester == user."""
    
    def test_self_edit_allowed_when_policy_permits(self):
        """Test that self-edits are allowed when policy permits."""
        policy = ConsentPolicy(allow_self_edits=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id="user123",
            user_id="user123"
        )
        
        assert decision == Decision.ALLOW
        assert reason == ReasonCode.ALLOW_SELF_EDIT
    
    def test_self_edit_denied_when_policy_denies(self):
        """Test that self-edits are denied when policy denies."""
        policy = ConsentPolicy(allow_self_edits=False)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id="user123",
            user_id="user123"
        )
        
        assert decision == Decision.DENY
        assert reason == ReasonCode.DENY_POLICY_VIOLATION
    
    def test_self_edit_requires_matching_ids(self):
        """Test that self-edit only applies when requester == user."""
        policy = ConsentPolicy(allow_self_edits=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id="user123",
            user_id="user456"  # Different user
        )
        
        # Should not be treated as self-edit
        assert decision == Decision.DENY


class TestThirdPartyEditScenarios:
    """Test third-party edit scenarios."""
    
    def test_third_party_edit_denied_by_default(self):
        """Test that third-party edits are denied when policy denies."""
        policy = ConsentPolicy(deny_third_party_edits=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.THIRD_PARTY_EDIT,
            requester_id="platform123",
            user_id="user456"
        )
        
        assert decision == Decision.DENY
        assert reason == ReasonCode.DENY_THIRD_PARTY
    
    def test_third_party_edit_allowed_when_policy_permits(self):
        """Test that third-party edits are allowed when policy permits."""
        policy = ConsentPolicy(deny_third_party_edits=False)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.THIRD_PARTY_EDIT,
            requester_id="platform123",
            user_id="user456"
        )
        
        assert decision == Decision.ALLOW
        assert reason == ReasonCode.ALLOW_POLICY_PERMITS


class TestFaceSwapScenarios:
    """Test face swap scenarios."""
    
    def test_face_swap_denied_by_default(self):
        """Test that face swaps are denied when policy denies."""
        policy = ConsentPolicy(deny_face_swaps=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.FACE_SWAP,
            requester_id="platform123",
            user_id="user456"
        )
        
        assert decision == Decision.DENY
        assert reason == ReasonCode.DENY_FACE_SWAP
    
    def test_face_swap_allowed_when_policy_permits(self):
        """Test that face swaps are allowed when policy permits."""
        policy = ConsentPolicy(deny_face_swaps=False)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.FACE_SWAP,
            requester_id="platform123",
            user_id="user456"
        )
        
        assert decision == Decision.ALLOW
        assert reason == ReasonCode.ALLOW_POLICY_PERMITS


class TestGeneralGenerationScenarios:
    """Test general generation scenarios."""
    
    def test_general_generation_denied_when_third_party_denied(self):
        """Test that general generation is denied when third-party edits are denied."""
        policy = ConsentPolicy(deny_third_party_edits=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.GENERAL_GENERATION,
            requester_id="platform123",
            user_id="user456"
        )
        
        assert decision == Decision.DENY
        assert reason == ReasonCode.DENY_THIRD_PARTY
    
    def test_general_generation_allowed_when_third_party_allowed(self):
        """Test that general generation is allowed when third-party edits are allowed."""
        policy = ConsentPolicy(deny_third_party_edits=False)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.GENERAL_GENERATION,
            requester_id="platform123",
            user_id="user456"
        )
        
        assert decision == Decision.ALLOW
        assert reason == ReasonCode.ALLOW_POLICY_PERMITS


class TestMixedPolicyScenarios:
    """Test various policy combinations."""
    
    def test_permissive_policy(self):
        """Test a permissive policy that allows most usage."""
        policy = ConsentPolicy(
            allow_self_edits=True,
            deny_third_party_edits=False,
            deny_face_swaps=False,
            deny_sexualized_content=True,
            deny_impersonation=True,
            deny_political_use=True
        )
        
        # Self-edit should be allowed
        decision, reason = evaluate_consent(
            policy, UsageType.SELF_EDIT, "user123", "user123"
        )
        assert decision == Decision.ALLOW
        
        # Third-party edit should be allowed
        decision, reason = evaluate_consent(
            policy, UsageType.THIRD_PARTY_EDIT, "platform", "user123"
        )
        assert decision == Decision.ALLOW
        
        # Face swap should be allowed
        decision, reason = evaluate_consent(
            policy, UsageType.FACE_SWAP, "platform", "user123"
        )
        assert decision == Decision.ALLOW
    
    def test_restrictive_policy(self):
        """Test a restrictive policy that denies most usage."""
        policy = ConsentPolicy(
            allow_self_edits=False,
            deny_third_party_edits=True,
            deny_face_swaps=True,
            deny_sexualized_content=True,
            deny_impersonation=True,
            deny_political_use=True
        )
        
        # Self-edit should be denied
        decision, reason = evaluate_consent(
            policy, UsageType.SELF_EDIT, "user123", "user123"
        )
        assert decision == Decision.DENY
        
        # Third-party edit should be denied
        decision, reason = evaluate_consent(
            policy, UsageType.THIRD_PARTY_EDIT, "platform", "user123"
        )
        assert decision == Decision.DENY
        
        # Face swap should be denied
        decision, reason = evaluate_consent(
            policy, UsageType.FACE_SWAP, "platform", "user123"
        )
        assert decision == Decision.DENY
    
    def test_deny_all_policy(self):
        """Test a complete deny-all policy (revoked consent)."""
        policy = ConsentPolicy()  # Default is deny-all
        
        assert policy.is_deny_all()
        
        # All usage types should be denied
        for usage_type in [UsageType.SELF_EDIT, UsageType.THIRD_PARTY_EDIT, 
                          UsageType.FACE_SWAP, UsageType.GENERAL_GENERATION]:
            decision, reason = evaluate_consent(
                policy, usage_type, "requester", "user123"
            )
            assert decision == Decision.DENY


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_empty_requester_id(self):
        """Test behavior with empty requester ID."""
        policy = ConsentPolicy(allow_self_edits=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id="",
            user_id=""
        )
        
        # Empty strings match, so this is a self-edit
        assert decision == Decision.ALLOW
        assert reason == ReasonCode.ALLOW_SELF_EDIT
    
    def test_case_sensitive_id_matching(self):
        """Test that ID matching is case-sensitive."""
        policy = ConsentPolicy(allow_self_edits=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id="User123",
            user_id="user123"
        )
        
        # IDs don't match (case-sensitive), so not a self-edit
        assert decision == Decision.DENY
    
    def test_whitespace_in_ids(self):
        """Test behavior with whitespace in IDs."""
        policy = ConsentPolicy(allow_self_edits=True)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id="user123 ",
            user_id="user123"
        )
        
        # IDs don't match (whitespace), so not a self-edit
        assert decision == Decision.DENY


class TestReasonCodes:
    """Test that appropriate reason codes are returned."""
    
    def test_all_allow_reason_codes(self):
        """Test that all ALLOW reason codes can be returned."""
        # ALLOW_SELF_EDIT
        policy = ConsentPolicy(allow_self_edits=True)
        _, reason = evaluate_consent(
            policy, UsageType.SELF_EDIT, "user", "user"
        )
        assert reason == ReasonCode.ALLOW_SELF_EDIT
        
        # ALLOW_POLICY_PERMITS
        policy = ConsentPolicy(deny_third_party_edits=False)
        _, reason = evaluate_consent(
            policy, UsageType.THIRD_PARTY_EDIT, "platform", "user"
        )
        assert reason == ReasonCode.ALLOW_POLICY_PERMITS
    
    def test_all_deny_reason_codes(self):
        """Test that all DENY reason codes can be returned."""
        # DENY_POLICY_VIOLATION
        policy = ConsentPolicy(allow_self_edits=False)
        _, reason = evaluate_consent(
            policy, UsageType.SELF_EDIT, "user", "user"
        )
        assert reason == ReasonCode.DENY_POLICY_VIOLATION
        
        # DENY_THIRD_PARTY
        policy = ConsentPolicy(deny_third_party_edits=True)
        _, reason = evaluate_consent(
            policy, UsageType.THIRD_PARTY_EDIT, "platform", "user"
        )
        assert reason == ReasonCode.DENY_THIRD_PARTY
        
        # DENY_FACE_SWAP
        policy = ConsentPolicy(deny_face_swaps=True)
        _, reason = evaluate_consent(
            policy, UsageType.FACE_SWAP, "platform", "user"
        )
        assert reason == ReasonCode.DENY_FACE_SWAP
