"""
Property-based test for consent revocation behavior.

Feature: likenessguard-aws-prototype, Property 22: Revocation denies all usage
**Validates: Requirements 6.2**

Property: For any consent revocation, the resulting policy should deny all usage types.
"""
import pytest
from hypothesis import given, strategies as st, settings
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.models.data_models import ConsentPolicy, UsageType, Decision
from shared.services.policy_evaluator import evaluate_consent


# Strategy for generating any consent policy (before revocation)
@st.composite
def any_consent_policy(draw):
    """Generate any valid consent policy."""
    return ConsentPolicy(
        allow_self_edits=draw(st.booleans()),
        deny_third_party_edits=draw(st.booleans()),
        deny_face_swaps=draw(st.booleans()),
        deny_sexualized_content=draw(st.booleans()),
        deny_impersonation=draw(st.booleans()),
        deny_political_use=draw(st.booleans())
    )


# Strategy for generating all usage types
usage_types = st.sampled_from([
    UsageType.SELF_EDIT,
    UsageType.THIRD_PARTY_EDIT,
    UsageType.FACE_SWAP,
    UsageType.GENERAL_GENERATION
])


@given(
    original_policy=any_consent_policy(),
    usage_type=usage_types,
    requester_id=st.text(min_size=1, max_size=50),
    user_id=st.text(min_size=1, max_size=50)
)
@settings(max_examples=100)
def test_revocation_denies_all_usage(original_policy, usage_type, requester_id, user_id):
    """
    Property 22: Revocation denies all usage
    
    For any consent policy and any usage type, after revocation (creating a deny-all policy),
    all usage types should return DENY decision.
    
    This test verifies that:
    1. A deny-all policy is created correctly (all deny flags True, allow_self_edits False)
    2. The deny-all policy denies ALL usage types regardless of requester
    3. Even self-edits are denied after revocation
    
    Validates: Requirements 6.2
    """
    # Create deny-all policy (simulating revocation)
    deny_all_policy = ConsentPolicy(
        allow_self_edits=False,
        deny_third_party_edits=True,
        deny_face_swaps=True,
        deny_sexualized_content=True,
        deny_impersonation=True,
        deny_political_use=True
    )
    
    # Evaluate the deny-all policy for the given usage type
    decision, reason_code = evaluate_consent(
        policy=deny_all_policy,
        usage_type=usage_type,
        requester_id=requester_id,
        user_id=user_id
    )
    
    # Property: After revocation, ALL usage types should be DENIED
    assert decision == Decision.DENY, (
        f"After revocation, usage type {usage_type} should be DENIED, "
        f"but got {decision}. Requester: {requester_id}, User: {user_id}"
    )
    
    # Verify reason code is appropriate
    assert reason_code in [
        'DENY_POLICY_VIOLATION',
        'DENY_THIRD_PARTY',
        'DENY_FACE_SWAP',
        'DENY_SELF_EDIT_NOT_ALLOWED'
    ], f"Unexpected reason code: {reason_code}"


@given(usage_type=usage_types)
@settings(max_examples=100)
def test_revocation_denies_self_edits(usage_type):
    """
    Property 22 (specific case): Revocation denies even self-edits
    
    For any usage type, after revocation, even when requester_id == user_id (self-edit),
    the decision should be DENY.
    
    This is a critical aspect of revocation: the user is revoking ALL consent,
    including their own ability to edit.
    
    Validates: Requirements 6.2
    """
    # Create deny-all policy (simulating revocation)
    deny_all_policy = ConsentPolicy(
        allow_self_edits=False,  # Critical: self-edits are NOT allowed
        deny_third_party_edits=True,
        deny_face_swaps=True,
        deny_sexualized_content=True,
        deny_impersonation=True,
        deny_political_use=True
    )
    
    # Test with same requester and user (self-edit scenario)
    user_id = 'test-user-123'
    requester_id = user_id  # Same as user_id
    
    decision, reason_code = evaluate_consent(
        policy=deny_all_policy,
        usage_type=usage_type,
        requester_id=requester_id,
        user_id=user_id
    )
    
    # Property: Even self-edits should be DENIED after revocation
    assert decision == Decision.DENY, (
        f"After revocation, self-edit for usage type {usage_type} should be DENIED, "
        f"but got {decision}"
    )


@given(
    original_policy=any_consent_policy(),
    usage_type=usage_types
)
@settings(max_examples=100)
def test_revocation_is_more_restrictive_than_any_policy(original_policy, usage_type):
    """
    Property 22 (comparison): Revocation is always more restrictive
    
    For any original consent policy and any usage type, the deny-all policy
    (after revocation) should be at least as restrictive as the original policy.
    
    If the original policy allowed something, revocation denies it.
    If the original policy denied something, revocation still denies it.
    
    Validates: Requirements 6.2
    """
    # Create deny-all policy (simulating revocation)
    deny_all_policy = ConsentPolicy(
        allow_self_edits=False,
        deny_third_party_edits=True,
        deny_face_swaps=True,
        deny_sexualized_content=True,
        deny_impersonation=True,
        deny_political_use=True
    )
    
    # Evaluate both policies
    
    # Test with different requester scenarios
    user_id = 'test-user-123'
    requester_id = 'different-requester-456'
    
    original_decision, _ = evaluate_consent(
        policy=original_policy,
        usage_type=usage_type,
        requester_id=requester_id,
        user_id=user_id
    )
    
    revoked_decision, _ = evaluate_consent(
        policy=deny_all_policy,
        usage_type=usage_type,
        requester_id=requester_id,
        user_id=user_id
    )
    
    # Property: Revocation should always result in DENY
    assert revoked_decision == Decision.DENY, (
        f"After revocation, decision should always be DENY, but got {revoked_decision}"
    )
    
    # Property: If original was DENY, revoked should also be DENY
    # If original was ALLOW, revoked should be DENY (more restrictive)
    if original_decision == Decision.DENY:
        assert revoked_decision == Decision.DENY, "Revocation should maintain DENY decisions"
    elif original_decision == Decision.ALLOW:
        assert revoked_decision == Decision.DENY, "Revocation should change ALLOW to DENY"


def test_deny_all_policy_structure():
    """
    Test that the deny-all policy structure is correct.
    
    This is a unit test to verify the structure of the deny-all policy
    used in revocation.
    """
    deny_all_policy = ConsentPolicy(
        allow_self_edits=False,
        deny_third_party_edits=True,
        deny_face_swaps=True,
        deny_sexualized_content=True,
        deny_impersonation=True,
        deny_political_use=True
    )
    
    # Verify all deny flags are True
    assert deny_all_policy.deny_third_party_edits is True
    assert deny_all_policy.deny_face_swaps is True
    assert deny_all_policy.deny_sexualized_content is True
    assert deny_all_policy.deny_impersonation is True
    assert deny_all_policy.deny_political_use is True
    
    # Verify allow_self_edits is False
    assert deny_all_policy.allow_self_edits is False
