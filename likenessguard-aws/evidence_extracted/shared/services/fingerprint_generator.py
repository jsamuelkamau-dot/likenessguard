"""
Fingerprint generation module for privacy-preserving likeness identification.

This module provides functions to:
- Normalize face embeddings using L2 normalization
- Generate non-reversible fingerprints using SHA-256 hashing
- Ensure deterministic output for same input

The fingerprint generation process:
1. L2 normalize the embedding vector for consistent similarity calculation
2. Convert normalized embedding to bytes
3. Apply SHA-256 hash to create non-reversible fingerprint
4. Return hex digest as fingerprint string

Requirements:
- 4.1: Non-reversible embedding generation using one-way transformation
- 4.3: Embeddings suitable for similarity comparison
- 8.3: Consistent fingerprint generation between registration and query
"""

import hashlib
import logging
import math
import struct
from typing import List

logger = logging.getLogger(__name__)


class FingerprintError(Exception):
    """Base exception for fingerprint generation errors."""
    pass


class InvalidEmbeddingError(FingerprintError):
    """Raised when embedding is invalid (empty, wrong dimensions, etc.)."""
    pass


def normalize_embedding(embedding: List[float]) -> List[float]:
    """
    Normalize embedding vector using L2 normalization.
    
    L2 normalization ensures that all embeddings have unit length,
    which makes cosine similarity calculations more consistent and
    allows for reliable similarity comparison.
    
    Formula: normalized_vector = vector / ||vector||_2
    where ||vector||_2 is the L2 norm (Euclidean length)
    
    Args:
        embedding: List of floats representing face embedding
        
    Returns:
        Normalized list with L2 norm = 1.0
        
    Raises:
        InvalidEmbeddingError: If embedding is empty, all zeros, contains NaN or Inf
        
    Requirements: 4.3
    """
    if not embedding:
        raise InvalidEmbeddingError("Embedding cannot be empty")
    
    # Check for NaN or Inf values
    for val in embedding:
        if math.isnan(val):
            raise InvalidEmbeddingError("Embedding contains NaN values")
        if math.isinf(val):
            raise InvalidEmbeddingError("Embedding contains infinite values")
    
    # Calculate L2 norm (Euclidean length)
    l2_norm = math.sqrt(sum(x * x for x in embedding))
    
    if l2_norm == 0.0:
        raise InvalidEmbeddingError("Embedding has zero magnitude (all zeros)")
    
    # Normalize: divide by L2 norm
    normalized = [x / l2_norm for x in embedding]
    
    logger.debug(f"Normalized embedding: L2 norm = {math.sqrt(sum(x * x for x in normalized)):.6f}")
    
    return normalized


def generate_fingerprint(embedding: List[float]) -> str:
    """
    Generate a non-reversible fingerprint from a face embedding.
    
    This function creates a privacy-preserving fingerprint by:
    1. L2 normalizing the embedding for consistent similarity
    2. Converting to bytes with deterministic precision
    3. Applying SHA-256 hash (one-way function)
    4. Returning hex digest as fingerprint string
    
    The fingerprint is:
    - Non-reversible: Cannot reconstruct embedding from hash
    - Deterministic: Same embedding always produces same fingerprint
    - Privacy-preserving: No biometric data can be recovered
    
    Args:
        embedding: List of floats representing face embedding (typically 512-dim)
        
    Returns:
        64-character hex string (SHA-256 hash)
        
    Raises:
        InvalidEmbeddingError: If embedding is invalid
        
    Requirements: 4.1, 4.3, 8.3
    
    Example:
        >>> embedding = [0.1, 0.2, 0.3, ...]  # 512 dimensions
        >>> fingerprint = generate_fingerprint(embedding)
        >>> print(fingerprint)
        'a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0'
    """
    logger.info(f"Generating fingerprint for embedding with {len(embedding)} dimensions")
    
    try:
        # Step 1: L2 normalize the embedding
        normalized = normalize_embedding(embedding)
        
        # Step 2: Convert to bytes with deterministic precision
        # Round to 8 decimal places to avoid floating point precision issues
        rounded = [round(x, 8) for x in normalized]
        # Pack as doubles (8 bytes each)
        embedding_bytes = struct.pack(f'{len(rounded)}d', *rounded)
        
        # Step 3: Apply SHA-256 hash (one-way function)
        hash_obj = hashlib.sha256()
        hash_obj.update(embedding_bytes)
        
        # Step 4: Get hex digest as fingerprint
        fingerprint = hash_obj.hexdigest()
        
        logger.info(f"Generated fingerprint: {fingerprint[:16]}... (truncated)")
        
        return fingerprint
        
    except InvalidEmbeddingError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating fingerprint: {e}")
        raise FingerprintError(f"Failed to generate fingerprint: {e}") from e


def calculate_cosine_similarity(
    embedding1: List[float],
    embedding2: List[float]
) -> float:
    """
    Calculate cosine similarity between two embeddings.
    
    Cosine similarity measures the cosine of the angle between two vectors,
    ranging from -1 (opposite) to 1 (identical). For L2-normalized vectors,
    this is equivalent to their dot product.
    
    Formula: similarity = (A · B) / (||A|| * ||B||)
    For normalized vectors: similarity = A · B
    
    Args:
        embedding1: First embedding vector
        embedding2: Second embedding vector
        
    Returns:
        Float between -1 and 1 (typically 0 to 1 for face embeddings)
        Higher values indicate greater similarity
        
    Raises:
        InvalidEmbeddingError: If embeddings are invalid or different lengths
        
    Requirements: 4.3, 9.2
    
    Example:
        >>> emb1 = [0.1, 0.2, 0.3]
        >>> emb2 = [0.1, 0.2, 0.3]
        >>> similarity = calculate_cosine_similarity(emb1, emb2)
        >>> print(similarity)
        1.0  # Identical embeddings
    """
    if len(embedding1) != len(embedding2):
        raise InvalidEmbeddingError(
            f"Embeddings must have same length: {len(embedding1)} vs {len(embedding2)}"
        )
    
    # Normalize both embeddings
    norm1 = normalize_embedding(embedding1)
    norm2 = normalize_embedding(embedding2)
    
    # Calculate dot product (cosine similarity for normalized vectors)
    similarity = sum(a * b for a, b in zip(norm1, norm2))
    
    # Clip to [-1, 1] range to handle floating point errors
    similarity = max(-1.0, min(1.0, similarity))
    
    logger.debug(f"Cosine similarity: {similarity:.6f}")
    
    return float(similarity)
