"""
AWS service wrappers and business logic services.
"""

from .rekognition_client import (
    RekognitionClient,
    FaceDetection,
    RekognitionError,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    RekognitionServiceError
)

from .fingerprint_generator import (
    generate_fingerprint,
    normalize_embedding,
    calculate_cosine_similarity,
    FingerprintError,
    InvalidEmbeddingError
)

from .dynamodb_client import DynamoDBClient

from .policy_evaluator import evaluate_consent

from .similarity_matcher import SimilarityMatcher, Match

__all__ = [
    'RekognitionClient',
    'FaceDetection',
    'RekognitionError',
    'NoFaceDetectedError',
    'MultipleFacesDetectedError',
    'RekognitionServiceError',
    'generate_fingerprint',
    'normalize_embedding',
    'calculate_cosine_similarity',
    'FingerprintError',
    'InvalidEmbeddingError',
    'DynamoDBClient',
    'evaluate_consent',
    'SimilarityMatcher',
    'Match'
]
