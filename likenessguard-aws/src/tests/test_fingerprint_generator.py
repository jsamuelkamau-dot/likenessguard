"""
Unit tests for fingerprint generation module.

Tests cover:
- L2 normalization correctness
- Fingerprint determinism (same input -> same output)
- Fingerprint format validation
- Cosine similarity calculation
- Edge cases (empty embeddings, zero vectors, etc.)

Requirements: 4.1, 4.3, 8.3
"""

import pytest
import numpy as np
from src.shared.services.fingerprint_generator import (
    generate_fingerprint,
    normalize_embedding,
    calculate_cosine_similarity,
    FingerprintError,
    InvalidEmbeddingError
)


class TestNormalizeEmbedding:
    """Test L2 normalization of embeddings."""
    
    def test_normalize_simple_vector(self):
        """Test normalization of a simple vector."""
        embedding = [3.0, 4.0]  # Length = 5
        normalized = normalize_embedding(embedding)
        
        # Check L2 norm is 1.0
        assert np.isclose(np.linalg.norm(normalized), 1.0)
        
        # Check values are correct
        assert np.isclose(normalized[0], 0.6)  # 3/5
        assert np.isclose(normalized[1], 0.8)  # 4/5
    
    def test_normalize_unit_vector(self):
        """Test that unit vectors remain unchanged."""
        embedding = [1.0, 0.0, 0.0]
        normalized = normalize_embedding(embedding)
        
        assert np.isclose(np.linalg.norm(normalized), 1.0)
        assert np.allclose(normalized, [1.0, 0.0, 0.0])
    
    def test_normalize_512_dim_vector(self):
        """Test normalization of 512-dimensional vector (typical face embedding)."""
        # Create random 512-dim vector
        embedding = np.random.randn(512).tolist()
        normalized = normalize_embedding(embedding)
        
        # Check L2 norm is 1.0
        assert np.isclose(np.linalg.norm(normalized), 1.0)
        assert len(normalized) == 512
    
    def test_normalize_empty_embedding_raises_error(self):
        """Test that empty embedding raises InvalidEmbeddingError."""
        with pytest.raises(InvalidEmbeddingError, match="cannot be empty"):
            normalize_embedding([])
    
    def test_normalize_zero_vector_raises_error(self):
        """Test that zero vector raises InvalidEmbeddingError."""
        embedding = [0.0, 0.0, 0.0]
        with pytest.raises(InvalidEmbeddingError, match="zero magnitude"):
            normalize_embedding(embedding)
    
    def test_normalize_negative_values(self):
        """Test normalization works with negative values."""
        embedding = [-3.0, 4.0]
        normalized = normalize_embedding(embedding)
        
        assert np.isclose(np.linalg.norm(normalized), 1.0)
        assert np.isclose(normalized[0], -0.6)
        assert np.isclose(normalized[1], 0.8)


class TestGenerateFingerprint:
    """Test fingerprint generation."""
    
    def test_fingerprint_is_deterministic(self):
        """Test that same embedding produces same fingerprint (Requirement 4.1)."""
        embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
        
        fingerprint1 = generate_fingerprint(embedding)
        fingerprint2 = generate_fingerprint(embedding)
        
        assert fingerprint1 == fingerprint2
    
    def test_fingerprint_format(self):
        """Test that fingerprint is a valid SHA-256 hex string."""
        embedding = [0.1, 0.2, 0.3]
        fingerprint = generate_fingerprint(embedding)
        
        # SHA-256 produces 64 hex characters
        assert len(fingerprint) == 64
        assert all(c in '0123456789abcdef' for c in fingerprint)
    
    def test_different_embeddings_produce_different_fingerprints(self):
        """Test that different embeddings produce different fingerprints."""
        embedding1 = [0.1, 0.2, 0.3]
        embedding2 = [0.4, 0.5, 0.6]
        
        fingerprint1 = generate_fingerprint(embedding1)
        fingerprint2 = generate_fingerprint(embedding2)
        
        assert fingerprint1 != fingerprint2
    
    def test_fingerprint_with_512_dim_embedding(self):
        """Test fingerprint generation with typical 512-dim face embedding."""
        embedding = np.random.randn(512).tolist()
        fingerprint = generate_fingerprint(embedding)
        
        assert len(fingerprint) == 64
        assert isinstance(fingerprint, str)
    
    def test_fingerprint_is_non_reversible(self):
        """Test that fingerprint cannot be used to reconstruct embedding."""
        embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
        fingerprint = generate_fingerprint(embedding)
        
        # Fingerprint is just a hash - no way to get embedding back
        # This is a conceptual test - we verify it's a hash, not the embedding
        assert fingerprint != str(embedding)
        assert len(fingerprint) == 64  # SHA-256 hash length
    
    def test_fingerprint_with_empty_embedding_raises_error(self):
        """Test that empty embedding raises error."""
        with pytest.raises(InvalidEmbeddingError):
            generate_fingerprint([])
    
    def test_fingerprint_with_zero_vector_raises_error(self):
        """Test that zero vector raises error."""
        with pytest.raises(InvalidEmbeddingError):
            generate_fingerprint([0.0, 0.0, 0.0])
    
    def test_fingerprint_consistency_after_normalization(self):
        """Test that scaled versions of same vector produce same fingerprint."""
        # These are the same direction, just different magnitudes
        embedding1 = [1.0, 2.0, 3.0]
        embedding2 = [2.0, 4.0, 6.0]  # 2x scaled
        
        fingerprint1 = generate_fingerprint(embedding1)
        fingerprint2 = generate_fingerprint(embedding2)
        
        # After L2 normalization, these should produce the same fingerprint
        assert fingerprint1 == fingerprint2


class TestCalculateCosineSimilarity:
    """Test cosine similarity calculation."""
    
    def test_identical_embeddings_have_similarity_one(self):
        """Test that identical embeddings have similarity = 1.0."""
        embedding = [0.1, 0.2, 0.3]
        similarity = calculate_cosine_similarity(embedding, embedding)
        
        assert np.isclose(similarity, 1.0)
    
    def test_orthogonal_embeddings_have_similarity_zero(self):
        """Test that orthogonal embeddings have similarity ≈ 0."""
        embedding1 = [1.0, 0.0, 0.0]
        embedding2 = [0.0, 1.0, 0.0]
        
        similarity = calculate_cosine_similarity(embedding1, embedding2)
        assert np.isclose(similarity, 0.0)
    
    def test_opposite_embeddings_have_negative_similarity(self):
        """Test that opposite embeddings have similarity = -1.0."""
        embedding1 = [1.0, 0.0, 0.0]
        embedding2 = [-1.0, 0.0, 0.0]
        
        similarity = calculate_cosine_similarity(embedding1, embedding2)
        assert np.isclose(similarity, -1.0)
    
    def test_similar_embeddings_have_high_similarity(self):
        """Test that similar embeddings have high similarity score."""
        embedding1 = [0.1, 0.2, 0.3]
        embedding2 = [0.11, 0.21, 0.31]  # Slightly different
        
        similarity = calculate_cosine_similarity(embedding1, embedding2)
        assert similarity > 0.99  # Very similar
    
    def test_similarity_is_symmetric(self):
        """Test that similarity(A, B) = similarity(B, A)."""
        embedding1 = [0.1, 0.2, 0.3]
        embedding2 = [0.4, 0.5, 0.6]
        
        sim1 = calculate_cosine_similarity(embedding1, embedding2)
        sim2 = calculate_cosine_similarity(embedding2, embedding1)
        
        assert np.isclose(sim1, sim2)
    
    def test_similarity_with_512_dim_embeddings(self):
        """Test similarity calculation with 512-dim embeddings."""
        embedding1 = np.random.randn(512).tolist()
        embedding2 = np.random.randn(512).tolist()
        
        similarity = calculate_cosine_similarity(embedding1, embedding2)
        
        # Similarity should be in valid range
        assert -1.0 <= similarity <= 1.0
    
    def test_similarity_with_different_lengths_raises_error(self):
        """Test that embeddings of different lengths raise error."""
        embedding1 = [0.1, 0.2, 0.3]
        embedding2 = [0.4, 0.5]
        
        with pytest.raises(InvalidEmbeddingError, match="same length"):
            calculate_cosine_similarity(embedding1, embedding2)
    
    def test_similarity_range_is_bounded(self):
        """Test that similarity is always in [-1, 1] range."""
        # Test with random embeddings
        for _ in range(10):
            embedding1 = np.random.randn(100).tolist()
            embedding2 = np.random.randn(100).tolist()
            
            similarity = calculate_cosine_similarity(embedding1, embedding2)
            assert -1.0 <= similarity <= 1.0


class TestFingerprintConsistency:
    """Test fingerprint consistency between registration and query (Requirement 8.3)."""
    
    def test_same_face_produces_same_fingerprint(self):
        """Test that processing same face twice produces same fingerprint."""
        # Simulate same face detected twice
        face_embedding = np.random.randn(512).tolist()
        
        # Registration fingerprint
        registration_fp = generate_fingerprint(face_embedding)
        
        # Query fingerprint (same embedding)
        query_fp = generate_fingerprint(face_embedding)
        
        assert registration_fp == query_fp
    
    def test_similar_faces_produce_different_fingerprints(self):
        """Test that similar but different faces produce different fingerprints."""
        # Two similar but not identical embeddings
        base_embedding = np.random.randn(512)
        embedding1 = base_embedding.tolist()
        embedding2 = (base_embedding + np.random.randn(512) * 0.1).tolist()
        
        fingerprint1 = generate_fingerprint(embedding1)
        fingerprint2 = generate_fingerprint(embedding2)
        
        # Different embeddings should produce different fingerprints
        assert fingerprint1 != fingerprint2
        
        # But they should still have high similarity
        similarity = calculate_cosine_similarity(embedding1, embedding2)
        assert similarity > 0.8  # Still similar faces


class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def test_very_small_values(self):
        """Test fingerprint generation with very small values."""
        embedding = [1e-10, 2e-10, 3e-10]
        fingerprint = generate_fingerprint(embedding)
        
        assert len(fingerprint) == 64
        assert isinstance(fingerprint, str)
    
    def test_very_large_values(self):
        """Test fingerprint generation with very large values."""
        embedding = [1e10, 2e10, 3e10]
        fingerprint = generate_fingerprint(embedding)
        
        assert len(fingerprint) == 64
        assert isinstance(fingerprint, str)
    
    def test_mixed_positive_negative_values(self):
        """Test with mixed positive and negative values."""
        embedding = [-1.0, 2.0, -3.0, 4.0, -5.0]
        fingerprint = generate_fingerprint(embedding)
        
        assert len(fingerprint) == 64
        assert isinstance(fingerprint, str)
    
    def test_single_element_embedding(self):
        """Test with single-element embedding."""
        embedding = [1.0]
        fingerprint = generate_fingerprint(embedding)
        
        assert len(fingerprint) == 64
    
    def test_fingerprint_with_nan_raises_error(self):
        """Test that NaN values are handled appropriately."""
        embedding = [1.0, float('nan'), 3.0]
        
        # This should raise an error during normalization
        with pytest.raises((InvalidEmbeddingError, ValueError)):
            generate_fingerprint(embedding)
    
    def test_fingerprint_with_inf_raises_error(self):
        """Test that infinity values are handled appropriately."""
        embedding = [1.0, float('inf'), 3.0]
        
        # This should raise an error during normalization
        with pytest.raises((InvalidEmbeddingError, ValueError)):
            generate_fingerprint(embedding)
