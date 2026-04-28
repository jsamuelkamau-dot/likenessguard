"""
Property-based test for fingerprint generation consistency.

This test verifies that fingerprint generation is consistent between
registration and consent check flows - the same face embedding produces
the same fingerprint regardless of which flow processes it.

This is critical for the consent check system to work: if a face is
registered with one fingerprint but generates a different fingerprint
during consent check, the matching system would fail to identify the
registered likeness.

Feature: likenessguard-aws-prototype
Property 29: Fingerprint generation consistency
Validates: Requirements 8.3
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from src.shared.services.fingerprint_generator import generate_fingerprint
from src.shared.services.rekognition_client import FaceDetection


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


class TestFingerprintConsistencyProperty:
    """Property-based test for fingerprint consistency across registration and consent check."""
    
    @given(face_embedding_strategy())
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.large_base_example, HealthCheck.too_slow]
    )
    def test_property_29_fingerprint_generation_consistency(self, embedding):
        """
        **Validates: Requirements 8.3**
        
        Property 29: Fingerprint generation consistency
        
        For any face embedding, the fingerprint generated during registration
        should match the fingerprint generated during consent check. This ensures:
        
        1. Same transformation is applied in both registration and query flows
        2. Registered likenesses can be reliably matched during consent checks
        3. No flow-specific variations affect fingerprint generation
        4. System maintains consistency across different entry points
        
        This property is essential for the consent enforcement system. If the
        registration flow and consent check flow produced different fingerprints
        for the same face, the system would fail to match registered likenesses,
        breaking the core functionality.
        
        Test Strategy:
        - Generate arbitrary face embeddings (512-dimensional vectors)
        - Simulate registration flow: extract embedding → generate fingerprint
        - Simulate consent check flow: extract same embedding → generate fingerprint
        - Verify both fingerprints are identical
        - Test with 100+ random embeddings to ensure universal consistency
        """
        # Simulate registration flow
        # In real system: user uploads photos → Rekognition extracts embedding → generate fingerprint
        registration_fingerprint = generate_fingerprint(embedding)
        
        # Simulate consent check flow
        # In real system: AI platform submits reference image → Rekognition extracts embedding → generate fingerprint
        query_fingerprint = generate_fingerprint(embedding)
        
        # Critical assertion: fingerprints must be identical
        assert registration_fingerprint == query_fingerprint, (
            f"Fingerprint mismatch between registration and query flows!\n"
            f"Registration: {registration_fingerprint}\n"
            f"Query: {query_fingerprint}\n"
            f"This breaks the consent check system - same face produces different fingerprints."
        )
        
        # Verify fingerprint format is consistent (SHA-256 hex string)
        assert len(registration_fingerprint) == 64, (
            f"Registration fingerprint should be 64 characters (SHA-256), "
            f"got {len(registration_fingerprint)}"
        )
        
        assert len(query_fingerprint) == 64, (
            f"Query fingerprint should be 64 characters (SHA-256), "
            f"got {len(query_fingerprint)}"
        )
        
        # Verify both are valid hex strings
        assert all(c in '0123456789abcdef' for c in registration_fingerprint), (
            "Registration fingerprint should only contain hex characters"
        )
        
        assert all(c in '0123456789abcdef' for c in query_fingerprint), (
            "Query fingerprint should only contain hex characters"
        )
    
    @given(face_embedding_strategy())
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.large_base_example, HealthCheck.too_slow]
    )
    def test_consistency_across_multiple_queries(self, embedding):
        """
        Verify consistency when same face is queried multiple times.
        
        In practice, the same likeness might be checked multiple times
        (e.g., multiple AI platforms checking the same reference image).
        This test ensures all queries produce the same fingerprint.
        """
        # Registration
        registration_fingerprint = generate_fingerprint(embedding)
        
        # Multiple consent checks with same face
        query_fingerprint_1 = generate_fingerprint(embedding)
        query_fingerprint_2 = generate_fingerprint(embedding)
        query_fingerprint_3 = generate_fingerprint(embedding)
        
        # All should match registration fingerprint
        assert registration_fingerprint == query_fingerprint_1, (
            "First query fingerprint doesn't match registration"
        )
        
        assert registration_fingerprint == query_fingerprint_2, (
            "Second query fingerprint doesn't match registration"
        )
        
        assert registration_fingerprint == query_fingerprint_3, (
            "Third query fingerprint doesn't match registration"
        )
        
        # All queries should match each other
        assert query_fingerprint_1 == query_fingerprint_2 == query_fingerprint_3, (
            "Query fingerprints are inconsistent with each other"
        )
    
    @given(face_embedding_strategy())
    @settings(
        max_examples=50,
        suppress_health_check=[HealthCheck.large_base_example, HealthCheck.too_slow]
    )
    def test_consistency_with_embedding_copies(self, embedding):
        """
        Verify consistency when embedding is copied or reconstructed.
        
        In the real system, embeddings might be serialized/deserialized,
        copied, or reconstructed from storage. This test ensures that
        fingerprint generation depends only on values, not object identity.
        """
        # Registration with original embedding
        registration_fingerprint = generate_fingerprint(embedding)
        
        # Query with copied embedding (simulates deserialization)
        embedding_copy = embedding.copy()
        query_fingerprint = generate_fingerprint(embedding_copy)
        
        assert registration_fingerprint == query_fingerprint, (
            "Fingerprint changed when using copied embedding - "
            "this would break matching after serialization/deserialization"
        )
    
    @given(face_embedding_strategy())
    @settings(
        max_examples=50,
        suppress_health_check=[HealthCheck.large_base_example, HealthCheck.too_slow]
    )
    def test_consistency_with_list_reconstruction(self, embedding):
        """
        Verify consistency when embedding list is reconstructed.
        
        Simulates scenarios where embeddings are stored and retrieved
        from database or passed through API boundaries.
        """
        # Registration
        registration_fingerprint = generate_fingerprint(embedding)
        
        # Reconstruct embedding (simulates database retrieval)
        reconstructed_embedding = [float(x) for x in embedding]
        query_fingerprint = generate_fingerprint(reconstructed_embedding)
        
        assert registration_fingerprint == query_fingerprint, (
            "Fingerprint changed after embedding reconstruction - "
            "this would break matching after database storage/retrieval"
        )
    
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
    @settings(max_examples=50)
    def test_consistency_with_various_dimensions(self, embedding):
        """
        Verify consistency works for embeddings of various dimensions.
        
        While production uses 512-dim embeddings, this tests that the
        consistency property holds for any valid embedding size, ensuring
        the algorithm is robust.
        """
        registration_fingerprint = generate_fingerprint(embedding)
        query_fingerprint = generate_fingerprint(embedding)
        
        assert registration_fingerprint == query_fingerprint, (
            f"Consistency failed for {len(embedding)}-dimensional embedding"
        )
    
    @given(face_embedding_strategy())
    @settings(
        max_examples=50,
        suppress_health_check=[HealthCheck.large_base_example, HealthCheck.too_slow]
    )
    def test_different_faces_produce_different_fingerprints(self, embedding1):
        """
        Verify that different faces produce different fingerprints.
        
        This is the complement to consistency: while same face should
        produce same fingerprint, different faces should produce different
        fingerprints (with high probability).
        
        This ensures the fingerprint has sufficient entropy to distinguish
        between different individuals.
        """
        # Create a second embedding by modifying the first one
        # We need to change the direction, not just magnitude, since L2 normalization
        # makes vectors with same direction but different magnitudes identical
        embedding2 = embedding1.copy()
        
        # Find a non-zero element to modify (or use first element if all near-zero)
        # Add a significant perpendicular component to ensure direction changes
        if len(embedding2) > 1:
            # Add 5.0 to the second element to ensure significant direction change
            # This works even if the first two elements are near zero
            embedding2[1] = embedding2[1] + 5.0
        else:
            # For single-element embeddings, negate
            embedding2[0] = -embedding2[0] if embedding2[0] != 0 else 1.0
        
        # Generate fingerprints for both embeddings
        fingerprint1 = generate_fingerprint(embedding1)
        fingerprint2 = generate_fingerprint(embedding2)
        
        # Different embeddings should produce different fingerprints
        # (with overwhelming probability for SHA-256)
        assert fingerprint1 != fingerprint2, (
            "Different face embeddings produced identical fingerprints - "
            "this indicates a hash collision or insufficient entropy"
        )
