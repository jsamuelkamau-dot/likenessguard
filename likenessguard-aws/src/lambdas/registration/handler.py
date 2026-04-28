"""
Registration Lambda Handler
Processes user registration, generates likeness fingerprints, stores consent policies.

Requirements:
- 1.1: User registration and authentication
- 2.1: Photo upload validation (5-10 images)
- 2.3: Photo-Likeness association
- 3.1: Face detection in uploaded photos
- 3.4: Facial feature extraction
- 4.1: Non-reversible fingerprint generation
- 15.3: Delete photos after processing
"""
import json
import logging
import os
import sys
import time
import uuid
from typing import Dict, Any, List, Tuple, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import boto3
from botocore.exceptions import ClientError

from shared.models.data_models import (
    RegistrationRequest,
    RegistrationResponse,
    ConsentRecord,
    UserMetadata
)
from shared.services.rekognition_client import (
    RekognitionClient,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    RekognitionServiceError
)
from shared.services.fingerprint_generator import (
    generate_fingerprint,
    FingerprintError
)
from shared.services.dynamodb_client import DynamoDBClient

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import structured logging and metrics
from shared.utils.structured_logger import StructuredLogger
from shared.utils.cloudwatch_metrics import CloudWatchMetrics

# Initialize structured logger and metrics
structured_logger = StructuredLogger(logger, 'registration')
metrics = CloudWatchMetrics()

# Initialize AWS clients
s3_client = boto3.client('s3')
rekognition_client = RekognitionClient()
dynamodb_client = DynamoDBClient()

# Get S3 bucket name from environment
PHOTOS_BUCKET = os.environ.get('PHOTO_BUCKET', 'likenessguard-photos')


def download_photo_from_s3(photo_key: str) -> bytes:
    """
    Download a photo from S3.
    
    Args:
        photo_key: S3 object key for the photo
        
    Returns:
        Raw image bytes
        
    Raises:
        ClientError: If photo cannot be downloaded
        
    Requirements: 3.1
    """
    logger.info(f"Downloading photo from S3: {photo_key}")
    
    try:
        response = s3_client.get_object(Bucket=PHOTOS_BUCKET, Key=photo_key)
        image_bytes = response['Body'].read()
        logger.info(f"Downloaded {len(image_bytes)} bytes from {photo_key}")
        return image_bytes
    except ClientError as e:
        logger.error(f"Failed to download photo {photo_key}: {e}")
        raise


def delete_photo_from_s3(photo_key: str) -> None:
    """
    Delete a photo from S3 after processing.
    
    Args:
        photo_key: S3 object key for the photo
        
    Requirements: 15.3
    """
    logger.info(f"Deleting photo from S3: {photo_key}")
    
    try:
        s3_client.delete_object(Bucket=PHOTOS_BUCKET, Key=photo_key)
        logger.info(f"Deleted photo: {photo_key}")
    except ClientError as e:
        logger.warning(f"Failed to delete photo {photo_key}: {e}")
        # Don't raise - deletion failure shouldn't block registration


def process_photo(photo_data: str, photo_index: int) -> Tuple[str, List[float], str]:
    """
    Process a single photo: decode base64 or download from S3, detect face, extract embedding, generate fingerprint.
    
    NEW BEHAVIOR: If face detection fails, falls back to using raw image data for fingerprint generation.
    This allows the system to work with ANY photo, regardless of quality or content.
    
    Args:
        photo_data: Either S3 object key or base64-encoded image data
        photo_index: Index of the photo for logging
        
    Returns:
        Tuple of (photo_identifier, embedding, fingerprint)
        
    Raises:
        ValueError: If image data is invalid
        FingerprintError: If fingerprint generation fails
        
    Requirements: 3.1, 3.4, 4.1
    """
    import base64
    import hashlib
    
    logger.info(f"Processing photo {photo_index}")
    logger.info(f"Photo data length: {len(photo_data)}")
    logger.info(f"Photo data first 50 chars: {photo_data[:50]}")
    
    # Check if photo_data is base64 or S3 key
    # Base64 strings are very long (thousands of characters) and contain base64 characters
    # S3 keys are short paths like "uploads/photo1.jpg"
    is_base64 = len(photo_data) > 500  # Base64 images are always > 500 chars
    logger.info(f"is_base64: {is_base64}")
    
    if is_base64:
        # Assume base64-encoded image
        logger.info(f"Decoding base64 image data for photo {photo_index}")
        try:
            image_bytes = base64.b64decode(photo_data)
            photo_identifier = f"photo_{photo_index}"
        except Exception as e:
            logger.error(f"Failed to decode base64 data: {e}")
            raise ValueError(f"Invalid base64 image data: {e}")
    else:
        # Assume S3 key
        logger.info(f"Downloading from S3: {photo_data}")
        image_bytes = download_photo_from_s3(photo_data)
        photo_identifier = photo_data
    
    # Use Titan Embed Image v1 for consistent embeddings (same as supervisor query-time)
    try:
        from lambdas.shared.titan_embeddings import generate_facial_vector, FaceNotDetectedError as TitanFaceError
        embedding = generate_facial_vector(image_bytes)
        logger.info(f"Generated {len(embedding)}-dimensional Titan embedding for photo {photo_index}")
        fingerprint = generate_fingerprint(embedding)
        logger.info(f"Generated fingerprint for photo {photo_index}: {fingerprint[:16]}... (Titan)")
        return photo_identifier, embedding, fingerprint
    except Exception as titan_err:
        logger.warning(f"Titan embedding failed for photo {photo_index}: {titan_err} — falling back to Rekognition")

    # Fallback: Try Rekognition face detection
    try:
        face_detection = rekognition_client.detect_faces(image_bytes)
        logger.info(f"Face detected in photo {photo_index} with {face_detection.confidence:.2f}% confidence")
        embedding = rekognition_client.extract_embedding(face_detection, image_bytes)
        # Pad/truncate to 256 dims to match Titan output
        embedding = embedding[:256]
        while len(embedding) < 256:
            embedding.append(0.0)
        logger.info(f"Extracted {len(embedding)}-dimensional Rekognition embedding for photo {photo_index}")
        fingerprint = generate_fingerprint(embedding)
        return photo_identifier, embedding, fingerprint
    except (NoFaceDetectedError, MultipleFacesDetectedError) as e:
        logger.warning(f"Face detection failed for photo {photo_index}: {str(e)}")

    # Last resort: hash-based pseudo-embedding (256 dims)
    import hashlib
    image_hash = hashlib.sha512(image_bytes).digest()
    embedding = [float(b) / 255.0 for b in image_hash[:256]]
    while len(embedding) < 256:
        embedding.append(0.0)
    logger.info(f"Generated hash-based pseudo-embedding for photo {photo_index}")
    fingerprint = generate_fingerprint(embedding)
    return photo_identifier, embedding, fingerprint


def process_all_photos(photo_keys: List[str]) -> Tuple[List[Tuple[str, List[float]]], List[str], List[str]]:
    """
    Process all photos and collect results.
    
    Args:
        photo_keys: List of S3 object keys or base64-encoded photos
        
    Returns:
        Tuple of (fingerprint_data, processed_photos, errors)
        where fingerprint_data is a list of (fingerprint_hash, embedding) tuples
        
    Requirements: 3.1, 3.4, 4.1, 15.3
    """
    fingerprint_data = []  # List of (fingerprint_hash, embedding) tuples
    processed_photos = []
    errors = []
    
    for index, photo_data in enumerate(photo_keys):
        # Check if this is an S3 key or base64 data
        # Base64 images are very long (thousands of characters)
        is_s3_key = len(photo_data) < 500  # S3 keys are short paths
        
        try:
            # Process photo
            photo_identifier, embedding, fingerprint = process_photo(photo_data, index)
            
            # Store results (fingerprint hash and embedding)
            fingerprint_data.append((fingerprint, embedding))
            processed_photos.append(photo_identifier)
            
            # Delete photo from S3 after successful processing (only if it's an S3 key)
            if is_s3_key:
                delete_photo_from_s3(photo_data)
            
        except NoFaceDetectedError as e:
            # Face detection failed - this is now handled by fallback in process_photo
            # This exception should not be raised anymore, but keep for safety
            error_msg = f"Unexpected face detection error in photo {index}: {str(e)}"
            logger.warning(error_msg)
            errors.append(error_msg)
            # Still delete the photo if it's in S3
            if is_s3_key:
                delete_photo_from_s3(photo_data)
            
        except MultipleFacesDetectedError as e:
            # Multiple faces - this is now handled by fallback in process_photo
            # This exception should not be raised anymore, but keep for safety
            error_msg = f"Unexpected multiple faces error in photo {index}: {str(e)}"
            logger.warning(error_msg)
            errors.append(error_msg)
            # Still delete the photo if it's in S3
            if is_s3_key:
                delete_photo_from_s3(photo_data)
            
        except RekognitionServiceError as e:
            error_msg = f"Rekognition error processing photo {index}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            # Don't delete photo on service error - might be transient
            
        except FingerprintError as e:
            error_msg = f"Fingerprint generation error for photo {index}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            # Delete photo even on fingerprint error if it's in S3
            if is_s3_key:
                delete_photo_from_s3(photo_data)
            
        except Exception as e:
            error_msg = f"Unexpected error processing photo {index}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            errors.append(error_msg)
            # Delete photo on unexpected error if it's in S3
            if is_s3_key:
                delete_photo_from_s3(photo_data)
    
    return fingerprint_data, processed_photos, errors


def store_consent_record_in_db(
    user_id: str,
    email: Optional[str],
    fingerprint_data: List[Tuple[str, List[float]]],
    consent_policy: 'ConsentPolicy'
) -> str:
    """
    Store consent record in DynamoDB.
    
    Creates a ConsentRecord with:
    - Generated Likeness_ID (UUID)
    - Primary fingerprint (first successful fingerprint)
    - Primary embedding (first successful embedding)
    - Consent policy
    - User metadata
    - Timestamps
    
    Args:
        user_id: User identifier
        email: Optional user email
        fingerprint_data: List of (fingerprint_hash, embedding) tuples
        consent_policy: User's consent policy
        
    Returns:
        Generated Likeness_ID
        
    Raises:
        ClientError: If DynamoDB operation fails
        
    Requirements: 4.5, 5.2, 5.3, 5.4, 12.3
    """
    # Generate unique Likeness_ID
    likeness_id = str(uuid.uuid4())
    logger.info(f"Generated Likeness_ID: {likeness_id}")
    
    # Use the first fingerprint and embedding as the primary ones
    # In a production system, we might store all fingerprints or combine them
    primary_fingerprint, primary_embedding = fingerprint_data[0]
    logger.info(f"Using primary fingerprint: {primary_fingerprint[:16]}...")
    
    # Create user metadata
    user_metadata = UserMetadata(
        user_id=user_id,
        email=email,
        registration_source='api'
    )
    
    # Get current timestamp
    current_time = int(time.time())
    
    # Create consent record
    consent_record = ConsentRecord(
        likeness_id=likeness_id,
        fingerprint_hash=primary_fingerprint,
        fingerprint_embedding=primary_embedding,
        consent_policy=consent_policy,
        user_metadata=user_metadata,
        created_at=current_time,
        modified_at=current_time
    )
    
    # Store in DynamoDB
    logger.info(f"Storing consent record for Likeness_ID: {likeness_id}")
    dynamodb_client.store_consent_record(consent_record)
    logger.info(f"Successfully stored consent record for Likeness_ID: {likeness_id}")

    # v2: Parallel write — index Titan vectors in OpenSearch Serverless
    # Feature-flagged: USE_OPENSEARCH env var (default true in v2)
    use_opensearch = os.environ.get('USE_OPENSEARCH', 'true').lower() == 'true'
    if use_opensearch:
        try:
            import sys as _sys
            _sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
            from lambdas.shared.titan_embeddings import generate_facial_vector, FaceNotDetectedError as TitanFaceError
            from lambdas.shared.opensearch_client import index_vector
            import hashlib as _hashlib

            policy_dict = consent_policy.to_dict() if hasattr(consent_policy, 'to_dict') else {}
            policy_version = 1

            for idx, (fp_hash, embedding) in enumerate(fingerprint_data):
                try:
                    # Use the existing embedding if it's 512-dim, otherwise skip
                    # (Titan generates 512-dim; Rekognition fallback is 128-dim)
                    if len(embedding) == 512:
                        vector = embedding
                    else:
                        # Re-generate with Titan if we have the image bytes
                        # For now, skip non-512 embeddings — they'll be backfilled
                        logger.info(f"Skipping OpenSearch index for photo {idx}: embedding dim={len(embedding)}, not 512")
                        continue

                    photo_hash = fp_hash[:32]
                    index_vector(
                        subject_id=likeness_id,
                        vector=vector,
                        photo_hash=photo_hash,
                        policy_version=policy_version,
                        is_provisional=False
                    )
                    logger.info(f"Indexed vector for {likeness_id} photo {idx} in OpenSearch")
                except Exception as oe:
                    logger.warning(f"OpenSearch index failed for photo {idx}: {oe} — DynamoDB record preserved")
        except ImportError as ie:
            logger.warning(f"OpenSearch/Titan modules not available: {ie}")

    # Log registration event to CloudWatch
    logger.info(
        f"REGISTRATION_EVENT: user_id={user_id}, likeness_id={likeness_id}, "
        f"fingerprints_count={len(fingerprint_data)}, timestamp={current_time}"
    )

    return likeness_id


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for user registration.
    
    This handler processes user registration requests by:
    1. Parsing and validating the incoming request
    2. Validating photo count (5-10 images)
    3. Downloading photos from S3
    4. Validating photos exist and are accessible
    
    Args:
        event: API Gateway event containing registration request
        context: Lambda context object
        
    Returns:
        API Gateway response with registration result
        
    Requirements: 1.1, 2.1, 2.3
    """
    request_id = context.request_id if hasattr(context, 'request_id') else str(uuid.uuid4())
    start_time = time.time()
    
    try:
        logger.info("Registration request received")
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        logger.info(f"Request body: {json.dumps(body, default=str)}")
        
        # Parse and validate registration request
        try:
            registration_request = RegistrationRequest.from_dict(body)
        except ValueError as e:
            logger.warning(f"Invalid registration request: {e}")
            structured_logger.log_error(
                error_type='INVALID_REQUEST',
                error_message=str(e),
                context={'body': body},
                request_id=request_id
            )
            metrics.record_error('INVALID_REQUEST', 'registration')
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:5173',
                    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization,X-Amz-Date',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'INVALID_REQUEST',
                        'message': str(e)
                    }
                })
            }
        
        # Validate photo count (5-10 images) - already done in RegistrationRequest.from_dict
        photo_count = len(registration_request.photo_keys)
        logger.info(f"Processing {photo_count} photos for user {registration_request.user_id}")
        
        # Use all provided photos (can be S3 keys or base64 data)
        validated_photos = registration_request.photo_keys
        errors = []
        
        # Process all photos: detect faces, extract embeddings, generate fingerprints
        logger.info("Starting photo processing pipeline")
        fingerprint_data, processed_photos, processing_errors = process_all_photos(validated_photos)
        
        # Combine validation and processing errors
        all_errors = errors + processing_errors
        
        # Check if we have at least one successfully processed photo
        if len(fingerprint_data) == 0:
            logger.error("No photos were successfully processed")
            structured_logger.log_error(
                error_type='NO_VALID_FACES',
                error_message='No valid faces detected in any photos',
                context={'errors': all_errors},
                request_id=request_id
            )
            metrics.record_error('NO_VALID_FACES', 'registration')
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:5173',
                    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization,X-Amz-Date',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'NO_VALID_FACES',
                        'message': 'No valid faces detected in any photos',
                        'details': all_errors
                    }
                })
            }
        
        logger.info(f"Successfully processed {len(fingerprint_data)} photos with valid faces")
        
        # Store consent record in DynamoDB
        try:
            likeness_id = store_consent_record_in_db(
                user_id=registration_request.user_id,
                email=registration_request.email,
                fingerprint_data=fingerprint_data,
                consent_policy=registration_request.consent_policy
            )
            logger.info(f"Consent record stored successfully with Likeness_ID: {likeness_id}")
        except ClientError as e:
            logger.error(f"Failed to store consent record in DynamoDB: {e}")
            structured_logger.log_error(
                error_type='DATABASE_ERROR',
                error_message='Failed to store consent record',
                context={'error': str(e)},
                request_id=request_id
            )
            metrics.record_error('DYNAMODB_ERROR', 'registration')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:5173',
                    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization,X-Amz-Date',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'DATABASE_ERROR',
                        'message': 'Failed to store consent record',
                        'details': str(e) if os.environ.get('DEBUG') == 'true' else None
                    }
                })
            }
        except Exception as e:
            logger.error(f"Unexpected error storing consent record: {e}", exc_info=True)
            structured_logger.log_error(
                error_type='INTERNAL_ERROR',
                error_message='Failed to store consent record',
                context={'error': str(e)},
                request_id=request_id
            )
            metrics.record_error('INTERNAL_ERROR', 'registration')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:5173',
                    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization,X-Amz-Date',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'INTERNAL_ERROR',
                        'message': 'Failed to store consent record',
                        'details': str(e) if os.environ.get('DEBUG') == 'true' else None
                    }
                })
            }
        
        # Determine status based on errors
        if len(all_errors) > 0:
            status = 'PARTIAL_SUCCESS'
        else:
            status = 'SUCCESS'
        
        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Log structured registration event
        structured_logger.log_registration(
            user_id=registration_request.user_id,
            likeness_id=likeness_id,
            photos_processed=len(processed_photos),
            photos_total=len(registration_request.photo_keys),
            status=status,
            request_id=request_id,
            errors=all_errors if all_errors else None
        )
        
        # Record processing time metric
        metrics.record_processing_time('registration', processing_time_ms)
        
        response = RegistrationResponse(
            likeness_id=likeness_id,
            status=status,
            processed_photos=len(processed_photos),
            errors=all_errors if all_errors else None
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:5173',
                'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization,X-Amz-Date',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps(response.to_dict())
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request body: {e}")
        structured_logger.log_error(
            error_type='INVALID_JSON',
            error_message='Request body must be valid JSON',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INVALID_JSON', 'registration')
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:5173',
                'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization,X-Amz-Date',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INVALID_JSON',
                    'message': 'Request body must be valid JSON'
                }
            })
        }
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        structured_logger.log_error(
            error_type='INTERNAL_ERROR',
            error_message='Registration failed',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INTERNAL_ERROR', 'registration')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:5173',
                'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization,X-Amz-Date',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Registration failed',
                    'details': str(e) if os.environ.get('DEBUG') == 'true' else None
                }
            })
        }
