"""
Property-based tests for policy evaluation logic.

These tests use Hypothesis to verify universal properties of the policy
evaluation system, ensuring correct ALLOW/DENY decisions across all valid
policy and usage type combinations.

Feature: likenessguard-aws-prototype
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from src.shared.models.data_models import ConsentPolicy, UsageType, Decision, ReasonCode
from src.shared.services.policy_evaluator import evaluate_consent


# Strategy for generating valid consent policy combinations
@st.composite
def consent_policy_strategy(draw):
    """
    Generate arbitrary valid consent policy combinations.
    
    This strategy generates all possible combinations of the six boolean
    policy options, ensuring comprehensive coverage of the policy space.
    """
    return ConsentPolicy(
        allow_self_edits=draw(st.booleans()),
        deny_third_party_edits=draw(st.booleans()),
        deny_face_swaps=draw(st.booleans()),
        deny_sexualized_content=draw(st.booleans()),
        deny_impersonation=draw(st.booleans()),
        deny_political_use=draw(st.booleans())
    )


# Strategy for generating user IDs
user_id_strategy = st.text(min_size=1, max_size=50, alphabet=st.characters(
    whitelist_categories=('Lu', 'Ll', 'Nd'),
    whitelist_characters='-_'
))


# Strategy for generating usage types
usage_type_strategy = st.sampled_from([
    UsageType.SELF_EDIT,
    UsageType.THIRD_PARTY_EDIT,
    UsageType.FACE_SWAP,
    UsageType.GENERAL_GENERATION
])


class TestPermittedUsageProperties:
    """Property-based tests for permitted usage scenarios (Property 36)."""
    
    @given(
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_36_self_edit_allowed_when_policy_permits(
        self,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.3**
        
        Property 36: Permitted usage returns ALLOW
        
        For any consent check where the policy permits the requested usage type,
        the system should return ALLOW.
        
        This test specifically verifies self-edit scenarios:
        - When allow_self_edits is True
        - When requester_id == user_id
        - When usage_type is SELF_EDIT
        - Then decision should be ALLOW with reason ALLOW_SELF_EDIT
        """
        # Create a policy that allows self-edits
        policy = ConsentPolicy(allow_self_edits=True)
        
        # Evaluate consent for self-edit (requester == user)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id=user_id,
            user_id=user_id
        )
        
        # Verify ALLOW decision is returned
        assert decision == Decision.ALLOW, \
            f"Expected ALLOW for self-edit with allow_self_edits=True, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.ALLOW_SELF_EDIT, \
            f"Expected ALLOW_SELF_EDIT reason code, got {reason}"
    
    @given(
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_36_third_party_edit_allowed_when_policy_permits(
        self,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.3**
        
        Property 36: Permitted usage returns ALLOW
        
        For third-party edit scenarios:
        - When deny_third_party_edits is False
        - When usage_type is THIRD_PARTY_EDIT
        - Then decision should be ALLOW with reason ALLOW_POLICY_PERMITS
        """
        # Ensure requester is different from user (third-party scenario)
        assume(requester_id != user_id)
        
        # Create a policy that allows third-party edits
        policy = ConsentPolicy(deny_third_party_edits=False)
        
        # Evaluate consent for third-party edit
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.THIRD_PARTY_EDIT,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Verify ALLOW decision is returned
        assert decision == Decision.ALLOW, \
            f"Expected ALLOW for third-party edit with deny_third_party_edits=False, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.ALLOW_POLICY_PERMITS, \
            f"Expected ALLOW_POLICY_PERMITS reason code, got {reason}"
    
    @given(
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_36_face_swap_allowed_when_policy_permits(
        self,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.3**
        
        Property 36: Permitted usage returns ALLOW
        
        For face swap scenarios:
        - When deny_face_swaps is False
        - When usage_type is FACE_SWAP
        - Then decision should be ALLOW with reason ALLOW_POLICY_PERMITS
        """
        # Ensure requester is different from user
        assume(requester_id != user_id)
        
        # Create a policy that allows face swaps
        policy = ConsentPolicy(deny_face_swaps=False)
        
        # Evaluate consent for face swap
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.FACE_SWAP,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Verify ALLOW decision is returned
        assert decision == Decision.ALLOW, \
            f"Expected ALLOW for face swap with deny_face_swaps=False, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.ALLOW_POLICY_PERMITS, \
            f"Expected ALLOW_POLICY_PERMITS reason code, got {reason}"
    
    @given(
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_36_general_generation_allowed_when_policy_permits(
        self,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.3**
        
        Property 36: Permitted usage returns ALLOW
        
        For general generation scenarios:
        - When deny_third_party_edits is False
        - When usage_type is GENERAL_GENERATION
        - Then decision should be ALLOW with reason ALLOW_POLICY_PERMITS
        """
        # Ensure requester is different from user
        assume(requester_id != user_id)
        
        # Create a policy that allows general generation (via third-party edits)
        policy = ConsentPolicy(deny_third_party_edits=False)
        
        # Evaluate consent for general generation
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.GENERAL_GENERATION,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Verify ALLOW decision is returned
        assert decision == Decision.ALLOW, \
            f"Expected ALLOW for general generation with deny_third_party_edits=False, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.ALLOW_POLICY_PERMITS, \
            f"Expected ALLOW_POLICY_PERMITS reason code, got {reason}"


class TestProhibitedUsageProperties:
    """Property-based tests for prohibited usage scenarios (Property 37)."""
    
    @given(
        user_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_37_self_edit_denied_when_policy_prohibits(
        self,
        user_id: str
    ):
        """
        **Validates: Requirements 10.4**
        
        Property 37: Prohibited usage returns DENY
        
        For any consent check where the policy prohibits the requested usage type,
        the system should return DENY.
        
        This test specifically verifies self-edit denial:
        - When allow_self_edits is False
        - When requester_id == user_id
        - When usage_type is SELF_EDIT
        - Then decision should be DENY with reason DENY_POLICY_VIOLATION
        """
        # Create a policy that denies self-edits
        policy = ConsentPolicy(allow_self_edits=False)
        
        # Evaluate consent for self-edit (requester == user)
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.SELF_EDIT,
            requester_id=user_id,
            user_id=user_id
        )
        
        # Verify DENY decision is returned
        assert decision == Decision.DENY, \
            f"Expected DENY for self-edit with allow_self_edits=False, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.DENY_POLICY_VIOLATION, \
            f"Expected DENY_POLICY_VIOLATION reason code, got {reason}"
    
    @given(
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_37_third_party_edit_denied_when_policy_prohibits(
        self,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.4**
        
        Property 37: Prohibited usage returns DENY
        
        For third-party edit scenarios:
        - When deny_third_party_edits is True
        - When usage_type is THIRD_PARTY_EDIT
        - Then decision should be DENY with reason DENY_THIRD_PARTY
        """
        # Ensure requester is different from user (third-party scenario)
        assume(requester_id != user_id)
        
        # Create a policy that denies third-party edits
        policy = ConsentPolicy(deny_third_party_edits=True)
        
        # Evaluate consent for third-party edit
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.THIRD_PARTY_EDIT,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Verify DENY decision is returned
        assert decision == Decision.DENY, \
            f"Expected DENY for third-party edit with deny_third_party_edits=True, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.DENY_THIRD_PARTY, \
            f"Expected DENY_THIRD_PARTY reason code, got {reason}"
    
    @given(
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_37_face_swap_denied_when_policy_prohibits(
        self,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.4**
        
        Property 37: Prohibited usage returns DENY
        
        For face swap scenarios:
        - When deny_face_swaps is True
        - When usage_type is FACE_SWAP
        - Then decision should be DENY with reason DENY_FACE_SWAP
        """
        # Ensure requester is different from user
        assume(requester_id != user_id)
        
        # Create a policy that denies face swaps
        policy = ConsentPolicy(deny_face_swaps=True)
        
        # Evaluate consent for face swap
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.FACE_SWAP,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Verify DENY decision is returned
        assert decision == Decision.DENY, \
            f"Expected DENY for face swap with deny_face_swaps=True, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.DENY_FACE_SWAP, \
            f"Expected DENY_FACE_SWAP reason code, got {reason}"
    
    @given(
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_37_general_generation_denied_when_policy_prohibits(
        self,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.4**
        
        Property 37: Prohibited usage returns DENY
        
        For general generation scenarios:
        - When deny_third_party_edits is True
        - When usage_type is GENERAL_GENERATION
        - Then decision should be DENY with reason DENY_THIRD_PARTY
        """
        # Ensure requester is different from user
        assume(requester_id != user_id)
        
        # Create a policy that denies general generation (via third-party edits)
        policy = ConsentPolicy(deny_third_party_edits=True)
        
        # Evaluate consent for general generation
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=UsageType.GENERAL_GENERATION,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Verify DENY decision is returned
        assert decision == Decision.DENY, \
            f"Expected DENY for general generation with deny_third_party_edits=True, got {decision}"
        
        # Verify correct reason code
        assert reason == ReasonCode.DENY_THIRD_PARTY, \
            f"Expected DENY_THIRD_PARTY reason code, got {reason}"
    
    @given(
        usage_type=usage_type_strategy,
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_property_37_deny_all_policy_denies_everything(
        self,
        usage_type: UsageType,
        user_id: str,
        requester_id: str
    ):
        """
        **Validates: Requirements 10.4**
        
        Property 37: Prohibited usage returns DENY
        
        For a deny-all policy (revoked consent):
        - All usage types should be denied
        - Regardless of requester or user IDs
        """
        # Create a deny-all policy (default ConsentPolicy)
        policy = ConsentPolicy()
        assert policy.is_deny_all(), "Default policy should be deny-all"
        
        # Evaluate consent for any usage type
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=usage_type,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Verify DENY decision is returned for all usage types
        assert decision == Decision.DENY, \
            f"Expected DENY for deny-all policy with {usage_type}, got {decision}"
        
        # Verify reason code is a DENY reason
        assert reason.value.startswith('DENY_'), \
            f"Expected DENY reason code, got {reason}"


class TestPolicyEvaluationInvariants:
    """Test invariants that should hold for all policy evaluations."""
    
    @given(
        policy=consent_policy_strategy(),
        usage_type=usage_type_strategy,
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_decision_is_always_allow_or_deny(
        self,
        policy: ConsentPolicy,
        usage_type: UsageType,
        user_id: str,
        requester_id: str
    ):
        """
        Verify that policy evaluation always returns either ALLOW or DENY.
        
        UNKNOWN should only be returned by the consent check API when no
        matching likeness is found, not by the policy evaluator itself.
        """
        decision, reason = evaluate_consent(
            policy=policy,
            usage_type=usage_type,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Decision should be ALLOW or DENY, never UNKNOWN
        assert decision in [Decision.ALLOW, Decision.DENY], \
            f"Policy evaluator returned unexpected decision: {decision}"
        
        # Reason code should match decision type
        if decision == Decision.ALLOW:
            assert reason.value.startswith('ALLOW_'), \
                f"ALLOW decision should have ALLOW reason code, got {reason}"
        elif decision == Decision.DENY:
            assert reason.value.startswith('DENY_'), \
                f"DENY decision should have DENY reason code, got {reason}"
    
    @given(
        policy=consent_policy_strategy(),
        usage_type=usage_type_strategy,
        user_id=user_id_strategy,
        requester_id=user_id_strategy
    )
    @settings(max_examples=20)
    def test_evaluation_is_deterministic(
        self,
        policy: ConsentPolicy,
        usage_type: UsageType,
        user_id: str,
        requester_id: str
    ):
        """
        Verify that policy evaluation is deterministic.
        
        Evaluating the same policy with the same inputs should always
        produce the same result.
        """
        # Evaluate consent twice with identical inputs
        decision1, reason1 = evaluate_consent(
            policy=policy,
            usage_type=usage_type,
            requester_id=requester_id,
            user_id=user_id
        )
        
        decision2, reason2 = evaluate_consent(
            policy=policy,
            usage_type=usage_type,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Results should be identical
        assert decision1 == decision2, \
            f"Policy evaluation is non-deterministic: {decision1} != {decision2}"
        assert reason1 == reason2, \
            f"Policy evaluation reason is non-deterministic: {reason1} != {reason2}"
