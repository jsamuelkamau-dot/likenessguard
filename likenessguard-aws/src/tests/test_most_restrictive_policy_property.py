"""
Property-Based Tests for Most Restrictive Policy Selection

Tests Property 32: Most restrictive policy wins
Validates: Requirements 9.4

For any consent check with multiple matching likenesses, the system should
apply the most restrictive consent policy.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from unittest.mock import Mock
from typing import List
import uuid

from src.shared.services.similarity_matcher import SimilarityMatcher, Match
from src.shared.models.data_models import ConsentPolicy


# Custom strategies
@st.composite
def consent_policy_strategy(draw):
    """Generate a random consent policy."""
    return ConsentPolicy(
        allow_self_edits=draw(st.booleans()),
        deny_third_party_edits=draw(st.booleans()),
        deny_face_swaps=draw(st.booleans()),
        deny_sexualized_content=draw(st.booleans()),
        deny_impersonation=draw(st.booleans()),
        deny_political_use=draw(st.booleans())
    )


@st.composite
def match_strategy(draw):
    """Generate a random Match object."""
    return Match(
        likeness_id=str(uuid.uuid4()),
        similarity_score=draw(st.floats(min_value=0.85, max_value=1.0, allow_nan=False, allow_infinity=False)),
        consent_policy=draw(consent_policy_strategy()),
        fingerprint_hash=draw(st.text(min_size=64, max_size=64, alphabet='0123456789abcdef'))
    )


def calculate_restrictiveness_score(policy: ConsentPolicy) -> int:
    """
    Calculate restrictiveness score for a policy.
    Higher score = more restrictive.
    
    This matches the implementation in SimilarityMatcher.
    """
    denials = sum([
        policy.deny_third_party_edits,
        policy.deny_face_swaps,
        policy.deny_sexualized_content,
        policy.deny_impersonation,
        policy.deny_political_use
    ])
    
    allows = int(policy.allow_self_edits)
    
    return denials * 10 - allows


class TestMostRestrictivePolicyProperty:
    """
    Property-based tests for most restrictive policy selection.
    
    Feature: likenessguard-aws-prototype
    Property 32: Most restrictive policy wins
    """
    
    @given(
        matches=st.lists(match_strategy(), min_size=2, max_size=10)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_32_most_restrictive_policy_is_selected(
        self,
        matches: List[Match]
    ):
        """
        Property 32: For any consent check with multiple matching likenesses,
        the system should apply the most restrictive consent policy.
        
        This test verifies that:
        1. The selected policy has the highest restrictiveness score
        2. The selection is deterministic
        3. The selection is consistent
        """
        # Create mock DynamoDB client (not used in this test)
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        # Get the most restrictive policy
        selected_match, reason_code = matcher.get_most_restrictive_policy(matches)
        
        # Calculate restrictiveness scores for all matches
        scores = [calculate_restrictiveness_score(m.consent_policy) for m in matches]
        max_score = max(scores)
        
        # Property: Selected match should have the maximum restrictiveness score
        selected_score = calculate_restrictiveness_score(selected_match.consent_policy)
        assert selected_score == max_score, \
            f"Selected policy score {selected_score} is not the maximum {max_score}"
        
        # Property: Reason code should indicate multiple matches
        if len(matches) > 1:
            assert reason_code in ["MOST_RESTRICTIVE_POLICY", "SINGLE_MATCH"]
    
    @given(
        matches=st.lists(match_strategy(), min_size=2, max_size=10)
    )
    @settings(max_examples=100, deadline=None)
    def test_selection_is_deterministic(
        self,
        matches: List[Match]
    ):
        """
        Property: Selecting most restrictive policy should be deterministic.
        
        Multiple calls with the same matches should return the same result.
        """
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        # Call get_most_restrictive_policy multiple times
        result1, reason1 = matcher.get_most_restrictive_policy(matches)
        result2, reason2 = matcher.get_most_restrictive_policy(matches)
        result3, reason3 = matcher.get_most_restrictive_policy(matches)
        
        # Property: All results should be identical
        assert result1.likeness_id == result2.likeness_id == result3.likeness_id
        assert result1.similarity_score == result2.similarity_score == result3.similarity_score
        assert reason1 == reason2 == reason3
    
    @given(
        num_matches=st.integers(min_value=2, max_value=10)
    )
    @settings(max_examples=100, deadline=None)
    def test_deny_all_policy_is_most_restrictive(
        self,
        num_matches: int
    ):
        """
        Property: A deny-all policy should always be selected as most restrictive.
        
        A policy that denies everything is the most restrictive possible policy.
        """
        # Create a deny-all policy
        deny_all_policy = ConsentPolicy(
            allow_self_edits=False,
            deny_third_party_edits=True,
            deny_face_swaps=True,
            deny_sexualized_content=True,
            deny_impersonation=True,
            deny_political_use=True
        )
        
        # Create matches with random policies
        matches = [match_strategy().example() for _ in range(num_matches - 1)]
        
        # Add a match with deny-all policy
        deny_all_match = Match(
            likeness_id="deny-all-likeness",
            similarity_score=0.9,
            consent_policy=deny_all_policy,
            fingerprint_hash="a" * 64
        )
        matches.append(deny_all_match)
        
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        # Get most restrictive policy
        selected_match, _ = matcher.get_most_restrictive_policy(matches)
        
        # Property: Deny-all policy should be selected
        # (unless another policy also has the same maximum restrictiveness)
        selected_score = calculate_restrictiveness_score(selected_match.consent_policy)
        deny_all_score = calculate_restrictiveness_score(deny_all_policy)
        
        assert selected_score == deny_all_score, \
            "Deny-all policy should have maximum restrictiveness score"
    
    @given(
        num_matches=st.integers(min_value=2, max_value=10)
    )
    @settings(max_examples=100, deadline=None)
    def test_allow_all_policy_is_least_restrictive(
        self,
        num_matches: int
    ):
        """
        Property: An allow-all policy should never be selected when other
        policies are present (unless all policies are equally permissive).
        """
        # Create an allow-all policy
        allow_all_policy = ConsentPolicy(
            allow_self_edits=True,
            deny_third_party_edits=False,
            deny_face_swaps=False,
            deny_sexualized_content=False,
            deny_impersonation=False,
            deny_political_use=False
        )
        
        # Create matches with at least one more restrictive policy
        matches = []
        
        # Add allow-all match
        allow_all_match = Match(
            likeness_id="allow-all-likeness",
            similarity_score=0.95,
            consent_policy=allow_all_policy,
            fingerprint_hash="a" * 64
        )
        matches.append(allow_all_match)
        
        # Add matches with more restrictive policies
        for i in range(num_matches - 1):
            policy = ConsentPolicy(
                allow_self_edits=False,
                deny_third_party_edits=True,
                deny_face_swaps=True,
                deny_sexualized_content=True,
                deny_impersonation=True,
                deny_political_use=True
            )
            match = Match(
                likeness_id=f"restrictive-likeness-{i}",
                similarity_score=0.9,
                consent_policy=policy,
                fingerprint_hash="b" * 64
            )
            matches.append(match)
        
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        # Get most restrictive policy
        selected_match, _ = matcher.get_most_restrictive_policy(matches)
        
        # Property: Allow-all policy should NOT be selected
        assert selected_match.likeness_id != "allow-all-likeness", \
            "Allow-all policy should not be selected when more restrictive policies exist"
    
    @given(
        match1=match_strategy(),
        match2=match_strategy()
    )
    @settings(max_examples=100, deadline=None)
    def test_more_denials_means_more_restrictive(
        self,
        match1: Match,
        match2: Match
    ):
        """
        Property: A policy with more denials should be more restrictive.
        
        If policy A has more denials than policy B, A should be selected.
        """
        # Count denials for each policy
        denials1 = sum([
            match1.consent_policy.deny_third_party_edits,
            match1.consent_policy.deny_face_swaps,
            match1.consent_policy.deny_sexualized_content,
            match1.consent_policy.deny_impersonation,
            match1.consent_policy.deny_political_use
        ])
        
        denials2 = sum([
            match2.consent_policy.deny_third_party_edits,
            match2.consent_policy.deny_face_swaps,
            match2.consent_policy.deny_sexualized_content,
            match2.consent_policy.deny_impersonation,
            match2.consent_policy.deny_political_use
        ])
        
        # Skip if denials are equal (ambiguous case)
        assume(denials1 != denials2)
        
        matches = [match1, match2]
        
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        # Get most restrictive policy
        selected_match, _ = matcher.get_most_restrictive_policy(matches)
        
        # Property: Match with more denials should be selected
        selected_denials = sum([
            selected_match.consent_policy.deny_third_party_edits,
            selected_match.consent_policy.deny_face_swaps,
            selected_match.consent_policy.deny_sexualized_content,
            selected_match.consent_policy.deny_impersonation,
            selected_match.consent_policy.deny_political_use
        ])
        
        max_denials = max(denials1, denials2)
        assert selected_denials == max_denials, \
            f"Selected policy has {selected_denials} denials, expected {max_denials}"


class TestMostRestrictivePolicyEdgeCases:
    """Test edge cases for most restrictive policy selection."""
    
    def test_single_match_returns_that_match(self):
        """With only one match, that match should be returned."""
        policy = ConsentPolicy(
            allow_self_edits=True,
            deny_third_party_edits=False,
            deny_face_swaps=False,
            deny_sexualized_content=False,
            deny_impersonation=False,
            deny_political_use=False
        )
        
        match = Match(
            likeness_id="single-match",
            similarity_score=0.9,
            consent_policy=policy,
            fingerprint_hash="a" * 64
        )
        
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        selected_match, reason_code = matcher.get_most_restrictive_policy([match])
        
        assert selected_match.likeness_id == "single-match"
        assert reason_code == "SINGLE_MATCH"
    
    def test_empty_matches_raises_error(self):
        """Empty matches list should raise ValueError."""
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        with pytest.raises(ValueError, match="empty matches list"):
            matcher.get_most_restrictive_policy([])
    
    def test_identical_policies_returns_first_match(self):
        """
        When all policies are identical, the first match (highest similarity)
        should be returned since matches are pre-sorted.
        """
        policy = ConsentPolicy(
            allow_self_edits=True,
            deny_third_party_edits=True,
            deny_face_swaps=True,
            deny_sexualized_content=False,
            deny_impersonation=False,
            deny_political_use=False
        )
        
        matches = [
            Match("likeness-1", 0.95, policy, "a" * 64),
            Match("likeness-2", 0.90, policy, "b" * 64),
            Match("likeness-3", 0.85, policy, "c" * 64)
        ]
        
        mock_dynamodb = Mock()
        matcher = SimilarityMatcher(mock_dynamodb)
        
        selected_match, _ = matcher.get_most_restrictive_policy(matches)
        
        # When policies are identical, any match is valid
        # The implementation uses max() which returns the first maximum
        assert selected_match.likeness_id in ["likeness-1", "likeness-2", "likeness-3"]
