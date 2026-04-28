"""
Bedrock Titan Embeddings v2 — Facial Vector Generation

Generates 512-dimensional facial embeddings using Amazon Bedrock Titan Embed Image v1.
Replaces SHA-256 fingerprint matching with true vector similarity search.

Requirements: 1.1, 1.2, 1.5, 1.6
"""
import json
import base64
import logging
import math
import os
from typing import Optional
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
TITAN_MODEL_ID = 'amazon.titan-embed-image-v1'

_bedrock_client: Optional[object] = None


def _get_bedrock_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
    return _bedrock_client


class FaceNotDetectedError(Exception):
    pass


class EmbeddingGenerationError(Exception):
    pass


def generate_facial_vector(image_bytes: bytes) -> list[float]:
    """
    Generate a 512-dimensional facial embedding vector from image bytes.

    Pipeline:
    1. Validate image has a detectable face (via Rekognition)
    2. Encode image as base64
    3. Call Bedrock Titan Embed Image v1
    4. L2-normalise the returned vector
    5. Return normalised 512-dim float list

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, or WebP)

    Returns:
        List of 512 floats representing the L2-normalised facial embedding

    Raises:
        FaceNotDetectedError: If no face is detected in the image
        EmbeddingGenerationError: If Bedrock call fails
    """
    # Step 1: Validate face presence via Rekognition
    _validate_face_present(image_bytes)

    # Step 2: Encode image
    image_b64 = base64.b64encode(image_bytes).decode('utf-8')

    # Step 3: Call Titan Embed Image
    try:
        client = _get_bedrock_client()
        body = json.dumps({
            "inputImage": image_b64,
            "embeddingConfig": {
                "outputEmbeddingLength": 256
            }
        })
        response = client.invoke_model(
            modelId=TITAN_MODEL_ID,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        result = json.loads(response['body'].read())
        raw_vector = result['embedding']
    except ClientError as e:
        logger.error(f"Bedrock Titan embedding failed: {e}")
        raise EmbeddingGenerationError(f"Titan embedding failed: {e.response['Error']['Code']}")
    except (KeyError, json.JSONDecodeError) as e:
        raise EmbeddingGenerationError(f"Unexpected Titan response format: {e}")

    # Step 4: L2 normalise
    return l2_normalize(raw_vector)


def l2_normalize(vector: list[float]) -> list[float]:
    """L2-normalise a vector so cosine similarity == dot product."""
    magnitude = math.sqrt(sum(x * x for x in vector))
    if magnitude == 0:
        return vector
    return [x / magnitude for x in vector]


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Compute cosine similarity between two L2-normalised vectors."""
    return sum(a * b for a, b in zip(v1, v2))


def _validate_face_present(image_bytes: bytes) -> None:
    """Use Rekognition to confirm at least one face is present. Lenient on small/compressed images."""
    rekognition = boto3.client('rekognition', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
    try:
        response = rekognition.detect_faces(
            Image={'Bytes': image_bytes},
            Attributes=['DEFAULT']
        )
        faces = response.get('FaceDetails', [])
        if len(faces) == 0:
            raise FaceNotDetectedError("No face detected in the reference image")
        # Log confidence for monitoring
        confidence = faces[0].get('Confidence', 0)
        logger.info(f"Face detected with confidence: {confidence:.1f}%")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        # InvalidImageException means image format issue — treat as no face rather than hard error
        if error_code in ('InvalidImageException', 'InvalidParameterException'):
            logger.warning(f"Rekognition could not process image ({error_code}) — treating as no face")
            raise FaceNotDetectedError(f"Image could not be processed for face detection: {error_code}")
        logger.error(f"Rekognition face detection failed: {e}")
        raise EmbeddingGenerationError(f"Face detection failed: {error_code}")
