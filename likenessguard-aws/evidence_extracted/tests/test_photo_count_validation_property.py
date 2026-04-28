"""
Property-based tests for photo count validation.

These tests use Hypothesis to verify that the registration system correctly
validates photo count requirements (5-10 photos).

Feature: likenessguard-aws-prototype
Task: 6.4 Write property test for photo count validation
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from src.shared.models import RegistrationRequest, ConsentPolicy


# ============================================================================
# Custom Strategies
# ============================================================================

@st.composite
def consent_policy_strategy(draw):
    """Generate arbitrary valid consent policy combinations."""
    return ConsentPolicy(
        allow_self_edits=draw(st.booleans()),
        deny_third_party_edits=draw(st.booleans()),
        deny_face_swaps=draw(st.booleans()),
        deny_sexualized_content=draw(st.booleans()),
        deny_impersonation=draw(st.booleans()),
        deny_political_use=draw(st.booleans())
    )


@st.composite
def valid_photo_count_strategy(draw):
    """Generate valid photo counts (5-10 inclusive)."""
    return draw(st.integers(min_value=5, max_value=10))


@st.composite
def invalid_photo_count_strategy(draw):
    """Generate invalid photo counts (< 5 or > 10)."""
    # Generate either too few (0-4) or too many (11-20)
    return draw(st.one_of(
        st.integers(min_value=0, max_value=4),
        st.integers(min_value=11, max_value=20)
    ))


@st.composite
def registration_request_dict_strategy(draw, photo_count):
    """
    Generate registration request dictionary with specified photo count.
    
    Args:
        photo_count: Number of photos to include
        
    Returns:
        Dictionary representing a registration request
    """
    return {
        'user_id': draw(st.text(min_size=1, max_size=100)),
        'photo_keys': [
            f"photos/user/{draw(st.text(min_size=1, max_size=20))}/photo{i}.jpg"
            for i in range(photo_count)
        ],
        'consent_policy': draw(consent_policy_strategy()).to_dict(),
        'email': draw(st.one_of(st.none(), st.emails()))
    }


# ============================================================================
# Property Tests
# ============================================================================

class TestPhotoCountValidationProperty:
    """
    **Validates: Requirements 2.1**
    
    Property 5: Photo count validation
    
    For any photo upload request, the system should accept uploads with 5-10
    images and reject uploads outside this range.
    """
    
    @given(valid_photo_count_strategy())
    @settings(max_examples=20)
    def test_property_5_valid_photo_count_accepted(self, photo_count: int):
        """
        Test that registration requests with 5-10 photos are accepted.
        
        **Validates: Requirements 2.1**
        
        Property: For any photo count in the range [5, 10], the system should
        accept the registration request and successfully create a
        RegistrationRequest object.
        
        This test verifies that:
        1. Photo counts from 5 to 10 (inclusive) are accepted
        2. RegistrationRequest.from_dict() succeeds for valid counts
        3. The created request contains the correct number of photos
        """
        # Generate a registration request with valid photo count
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': [f'photos/test/photo{i}.jpg' for i in range(photo_count)],
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            },
            'email': 'test@example.com'
        }
        
        # Should not raise an exception
        request = RegistrationRequest.from_dict(request_dict)
        
        # Verify the request was created successfully
        assert isinstance(request, RegistrationRequest)
        assert len(request.photo_keys) == photo_count
        assert 5 <= len(request.photo_keys) <= 10
        assert request.user_id == 'test_user'
        assert request.email == 'test@example.com'
    
    @given(invalid_photo_count_strategy())
    @settings(max_examples=20)
    def test_property_5_invalid_photo_count_rejected(self, photo_count: int):
        """
        Test that registration requests with < 5 or > 10 photos are rejected.
        
        **Validates: Requirements 2.1**
        
        Property: For any photo count outside the range [5, 10], the system
        should reject the registration request with a ValueError.
        
        This test verifies that:
        1. Photo counts less than 5 are rejected
        2. Photo counts greater than 10 are rejected
        3. RegistrationRequest.from_dict() raises ValueError for invalid counts
        4. The error message clearly indicates the photo count requirement
        """
        # Generate a registration request with invalid photo count
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': [f'photos/test/photo{i}.jpg' for i in range(photo_count)],
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            },
            'email': 'test@example.com'
        }
        
        # Should raise ValueError
        with pytest.raises(ValueError) as exc_info:
            RegistrationRequest.from_dict(request_dict)
        
        # Verify the error message mentions photo count requirement
        error_message = str(exc_info.value)
        assert 'photo_keys must contain 5-10 items' in error_message
        assert str(photo_count) in error_message
    
    @given(
        st.integers(min_value=0, max_value=20),
        consent_policy_strategy()
    )
    @settings(max_examples=20)
    def test_property_5_photo_count_boundary_behavior(
        self,
        photo_count: int,
        consent_policy: ConsentPolicy
    ):
        """
        Test boundary behavior for all photo counts (0-20).
        
        **Validates: Requirements 2.1**
        
        Property: For any photo count, the system should:
        - Accept if count is in [5, 10]
        - Reject if count is outside [5, 10]
        
        This test verifies the complete boundary behavior across the entire
        range of possible photo counts.
        """
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': [f'photos/test/photo{i}.jpg' for i in range(photo_count)],
            'consent_policy': consent_policy.to_dict(),
            'email': 'test@example.com'
        }
        
        if 5 <= photo_count <= 10:
            # Should succeed
            request = RegistrationRequest.from_dict(request_dict)
            assert isinstance(request, RegistrationRequest)
            assert len(request.photo_keys) == photo_count
        else:
            # Should fail
            with pytest.raises(ValueError) as exc_info:
                RegistrationRequest.from_dict(request_dict)
            assert 'photo_keys must contain 5-10 items' in str(exc_info.value)
    
    @given(valid_photo_count_strategy())
    @settings(max_examples=20)
    def test_photo_count_validation_preserves_photo_keys(self, photo_count: int):
        """
        Test that photo count validation preserves the actual photo keys.
        
        Verifies that:
        1. The photo keys are not modified during validation
        2. The order of photo keys is preserved
        3. All photo keys are accessible after validation
        """
        # Generate unique photo keys
        photo_keys = [f'photos/user/unique_photo_{i}_{photo_count}.jpg' for i in range(photo_count)]
        
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': photo_keys,
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            }
        }
        
        request = RegistrationRequest.from_dict(request_dict)
        
        # Verify photo keys are preserved
        assert request.photo_keys == photo_keys
        assert len(request.photo_keys) == photo_count
        
        # Verify order is preserved
        for i, key in enumerate(request.photo_keys):
            assert key == photo_keys[i]
    
    @given(st.integers(min_value=5, max_value=10))
    @settings(max_examples=20)
    def test_exact_boundary_values(self, photo_count: int):
        """
        Test exact boundary values (5 and 10) are accepted.
        
        **Validates: Requirements 2.1**
        
        Property: The boundary values 5 and 10 should be accepted (inclusive bounds).
        
        This test specifically verifies that:
        1. Exactly 5 photos is valid (lower boundary)
        2. Exactly 10 photos is valid (upper boundary)
        3. All values between 5 and 10 are valid
        """
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': [f'photos/test/photo{i}.jpg' for i in range(photo_count)],
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            }
        }
        
        # Should not raise an exception
        request = RegistrationRequest.from_dict(request_dict)
        
        # Verify the request was created successfully
        assert isinstance(request, RegistrationRequest)
        assert len(request.photo_keys) == photo_count
        
        # Verify boundaries are inclusive
        if photo_count == 5:
            assert len(request.photo_keys) == 5  # Lower boundary
        elif photo_count == 10:
            assert len(request.photo_keys) == 10  # Upper boundary
    
    def test_edge_case_exactly_4_photos_rejected(self):
        """
        Test that exactly 4 photos (just below minimum) is rejected.
        
        **Validates: Requirements 2.1**
        
        Edge case: 4 photos is just below the minimum of 5.
        """
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            }
        }
        
        with pytest.raises(ValueError) as exc_info:
            RegistrationRequest.from_dict(request_dict)
        
        assert 'photo_keys must contain 5-10 items' in str(exc_info.value)
        assert '4' in str(exc_info.value)
    
    def test_edge_case_exactly_11_photos_rejected(self):
        """
        Test that exactly 11 photos (just above maximum) is rejected.
        
        **Validates: Requirements 2.1**
        
        Edge case: 11 photos is just above the maximum of 10.
        """
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': [f'photo{i}.jpg' for i in range(11)],
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            }
        }
        
        with pytest.raises(ValueError) as exc_info:
            RegistrationRequest.from_dict(request_dict)
        
        assert 'photo_keys must contain 5-10 items' in str(exc_info.value)
        assert '11' in str(exc_info.value)
    
    def test_edge_case_zero_photos_rejected(self):
        """
        Test that zero photos is rejected.
        
        **Validates: Requirements 2.1**
        
        Edge case: Empty photo list should be rejected.
        """
        request_dict = {
            'user_id': 'test_user',
            'photo_keys': [],
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            }
        }
        
        with pytest.raises(ValueError) as exc_info:
            RegistrationRequest.from_dict(request_dict)
        
        assert 'photo_keys must contain 5-10 items' in str(exc_info.value)
        assert '0' in str(exc_info.value)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
