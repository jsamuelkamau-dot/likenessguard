"""
Property-based test for fingerprint determinism.

This test verifies that fingerprint generation is deterministic - the same
face embedding always produces the same fingerprint, regardless of when or
how many times it is generated.

Feature: likenessguard-aws-prototype
Property 13: Fingerprint generation is deterministic
Validates: Requirements 4.1
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from src.shared.services.fingerprint_generator import generate_fingerprint


# Strategy for generating face embeddings (512-dimensional vectors)
@st.composite
def face_embedding_strategy(draw):
    """
    Generate arbitrary face embeddings for property testing.
    
    Face embeddings from AWS Rekognition are typically 512-dimensional
    vectors with float values. This strategy generates realistic embeddings
    with values in a reasonable range.
    """
    # Generate 512-dimensional vector with float values
    # Use reasonable range for face embeddings (-10 to 10)
    embedding = draw(
        st.lists(
            st.floats(
                min_value=-10.0,
                max_value=10.0,
                allow_nan=False,
                allow_infinity=False
            ),
            min_size=512,
            max_size=512
        )
    )
    
    # Ensure not all zeros (which would fail normalization)
    # If all zeros, replace first element with 1.0
    if all(abs(x) < 1e-10 for x in embedding):
        embedding[0] = 1.0
    
    return embedding


class TestFingerprintDeterminismProperty:
    """Property-based test for fingerprint determinism."""
    
    @given(face_embedding_strategy())
    @settings(
        max_examples=20,
        suppress_health_check=[HealthCheck.large_base_example]
    )
    def test_property_13_fingerprint_generation_is_deterministic(self, embedding):
        """
        **Validates: Requirements 4.1**
        
        Property 13: Fingerprint generation is deterministic
        
        For any face embedding, generating the fingerprint multiple times
        should produce the same result. This ensures:
        
        1. Same face at registration produces same fingerprint as at query time
        2. Fingerprint can be reliably used for matching
        3. No randomness or time-dependent factors affect fingerprint
        4. System behavior is predictable and testable
        
        This property is critical for the consent check system to work correctly.
        If fingerprints were non-deterministic, the same face could produce
        different fingerprints at registration vs query time, breaking the
        matching system.
        """
        # Generate fingerprint multiple times from same embedding
        fingerprint1 = generate_fingerprint(embedding)
        fingerprint2 = generate_fingerprint(embedding)
        fingerprint3 = generate_fingerprint(embedding)
        
        # All fingerprints should be identical
        assert fingerprint1 == fingerprint2, \
            "First and second fingerprint generation produced different results"
        
        assert fingerprint2 == fingerprint3, \
            "Second and third fingerprint generation produced different results"
        
        assert fingerprint1 == fingerprint3, \
            "First and third fingerprint generation produced different results"
        
        # Verify fingerprint format is consistent (SHA-256 hex string)
        assert len(fingerprint1) == 64, \
            f"Fingerprint should be 64 characters (SHA-256), got {len(fingerprint1)}"
        
        assert all(c in '0123456789abcdef' for c in fingerprint1), \
            "Fingerprint should only contain hex characters"
    
    @given(face_embedding_strategy())
    @settings(
        max_examples=20,
        suppress_health_check=[HealthCheck.large_base_example, HealthCheck.too_slow]
    )
    def test_determinism_across_list_copies(self, embedding):
        """
        Verify determinism even when embedding is copied.
        
        This ensures that fingerprint generation doesn't depend on object
        identity, only on the values in the embedding.
        """
        # Create a copy of the embedding
        embedding_copy = embedding.copy()
        
        # Generate fingerprints from original and copy
        fingerprint_original = generate_fingerprint(embedding)
        fingerprint_copy = generate_fingerprint(embedding_copy)
        
        # Should produce identical fingerprints
        assert fingerprint_original == fingerprint_copy, \
            "Fingerprint should be same for copied embedding with identical values"
    
    @given(
        st.lists(
            st.floats(
                min_value=-1.0,
                max_value=1.0,
                allow_nan=False,
                allow_infinity=False
            ),
            min_size=1,
            max_size=1024
        ).filter(lambda x: any(abs(v) > 1e-10 for v in x))
    )
    @settings(max_examples=10)
    def test_determinism_with_various_dimensions(self, embedding):
        """
        Verify determinism works for embeddings of various dimensions.
        
        While production uses 512-dim embeddings, this tests the property
        holds for any valid embedding size.
        """
        fingerprint1 = generate_fingerprint(embedding)
        fingerprint2 = generate_fingerprint(embedding)
        
        assert fingerprint1 == fingerprint2, \
            f"Determinism failed for {len(embedding)}-dimensional embedding"
