"""
Property-based tests for consent policy validation.

These tests use Hypothesis to verify universal properties across all valid
consent policy combinations, ensuring the system correctly handles any
valid policy configuration.

Feature: likenessguard-aws-prototype
"""

import pytest
from hypothesis import given, strategies as st, settings
from src.shared.models import ConsentPolicy


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


class TestConsentPolicyProperties:
    """Property-based tests for consent policy validation."""
    
    @given(consent_policy_strategy())
    @settings(max_examples=20)
    def test_property_17_all_policy_options_supported(self, policy: ConsentPolicy):
        """
        **Validates: Requirements 5.1**
        
        Property 17: All policy options are supported
        
        For any valid combination of consent policy options (allowSelfEdits,
        denyThirdPartyEdits, denyFaceSwaps, denySexualizedContent,
        denyImpersonation, denyPoliticalUse), the system should accept and
        store the policy.
        
        This test verifies that:
        1. Any valid policy combination can be created
        2. The policy can be serialized to dictionary format
        3. The policy can be deserialized from dictionary format
        4. Round-trip serialization preserves all policy values
        """
        # Verify policy object was created successfully
        assert isinstance(policy, ConsentPolicy)
        
        # Verify all policy fields are boolean values
        assert isinstance(policy.allow_self_edits, bool)
        assert isinstance(policy.deny_third_party_edits, bool)
        assert isinstance(policy.deny_face_swaps, bool)
        assert isinstance(policy.deny_sexualized_content, bool)
        assert isinstance(policy.deny_impersonation, bool)
        assert isinstance(policy.deny_political_use, bool)
        
        # Verify policy can be serialized to dictionary (for DynamoDB storage)
        policy_dict = policy.to_dict()
        assert isinstance(policy_dict, dict)
        assert 'allow_self_edits' in policy_dict
        assert 'deny_third_party_edits' in policy_dict
        assert 'deny_face_swaps' in policy_dict
        assert 'deny_sexualized_content' in policy_dict
        assert 'deny_impersonation' in policy_dict
        assert 'deny_political_use' in policy_dict
        
        # Verify policy can be deserialized from dictionary
        restored_policy = ConsentPolicy.from_dict(policy_dict)
        assert isinstance(restored_policy, ConsentPolicy)
        
        # Verify round-trip serialization preserves all values
        assert restored_policy.allow_self_edits == policy.allow_self_edits
        assert restored_policy.deny_third_party_edits == policy.deny_third_party_edits
        assert restored_policy.deny_face_swaps == policy.deny_face_swaps
        assert restored_policy.deny_sexualized_content == policy.deny_sexualized_content
        assert restored_policy.deny_impersonation == policy.deny_impersonation
        assert restored_policy.deny_political_use == policy.deny_political_use
    
    @given(consent_policy_strategy())
    @settings(max_examples=20)
    def test_policy_serialization_produces_valid_json_structure(self, policy: ConsentPolicy):
        """
        Verify that serialized policies produce valid JSON-compatible structures.
        
        This ensures policies can be stored in DynamoDB and transmitted via API.
        """
        policy_dict = policy.to_dict()
        
        # All keys should be strings
        assert all(isinstance(key, str) for key in policy_dict.keys())
        
        # All values should be booleans
        assert all(isinstance(value, bool) for value in policy_dict.values())
        
        # Should have exactly 6 fields
        assert len(policy_dict) == 6
    
    @given(consent_policy_strategy())
    @settings(max_examples=20)
    def test_policy_is_deny_all_detection(self, policy: ConsentPolicy):
        """
        Verify that is_deny_all() correctly identifies deny-all policies.
        
        A deny-all policy is one where:
        - allow_self_edits is False
        - All deny_* fields are True
        """
        is_deny_all = policy.is_deny_all()
        
        expected_deny_all = (
            not policy.allow_self_edits and
            policy.deny_third_party_edits and
            policy.deny_face_swaps and
            policy.deny_sexualized_content and
            policy.deny_impersonation and
            policy.deny_political_use
        )
        
        assert is_deny_all == expected_deny_all
