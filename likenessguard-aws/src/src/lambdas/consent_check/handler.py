"""
Consent Check Lambda Handler

Evaluates consent for generation requests, performs similarity matching, returns decisions.

Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 10.6, 11.3, 12.1, 13.1, 13.2
"""

import json
import logging
import os
import base64
import time
import uuid
from typing import Dict, Any, Optional

from shared.models.data_models import (
    ConsentCheckRequest,
    ConsentCheckResponse,
    Decision,
    ReasonCode,
    UsageType,
    AuditRecord
)
from shared.services.rekognition_client import (
    RekognitionClient,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    RekognitionServiceError
)
from shared.services.fingerprint_generator import (
    generate_fingerprint,
    normalize_embedding,
    InvalidEmbeddingError
)
from shared.services.similarity_matcher import SimilarityMatcher
from shared.services.policy_evaluator import evaluate_consent
from shared.services.dynamodb_client import DynamoDBClient

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import structured logging and metrics
from shared.utils.structured_logger import StructuredLogger
from shared.utils.cloudwatch_metrics import CloudWatchMetrics

# Initialize structured logger and metrics
structured_logger = StructuredLogger(logger, 'consent_check')
metrics = CloudWatchMetrics()

# Initialize AWS clients (reused across invocations)
rekognition_client = None
dynamodb_client = None
similarity_matcher = None


def get_rekognition_client() -> RekognitionClient:
    """Get or create Rekognition client (singleton pattern for Lambda reuse)."""
    global rekognition_client
    if rekognition_client is None:
        rekognition_client = RekognitionClient()
    return rekognition_client


def get_dynamodb_client() -> DynamoDBClient:
    """Get or create DynamoDB client (singleton pattern for Lambda reuse)."""
    global dynamodb_client
    if dynamodb_client is None:
        consent_table = os.environ.get('CONSENT_REGISTRY_TABLE', 'ConsentRegistry')
        audit_table = os.environ.get('AUDIT_LOG_TABLE', 'AuditLog')
        dynamodb_client = DynamoDBClient(
            consent_table_name=consent_table,
            audit_table_name=audit_table
        )
    return dynamodb_client


def get_similarity_matcher() -> SimilarityMatcher:
    """Get or create similarity matcher (singleton pattern for Lambda reuse)."""
    global similarity_matcher
    if similarity_matcher is None:
        threshold = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))
        similarity_matcher = SimilarityMatcher(
            get_dynamodb_client(),
            similarity_threshold=threshold
        )
    return similarity_matcher


def validate_request(body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Validate required parameters in the consent check request.
    
    Args:
        body: Request body dictionary
        
    Returns:
        Error response dict if validation fails, None if valid
        
    Requirements: 11.3 - Validate required parameters
    """
    required_fields = ['referenceImage', 'usageType', 'requesterId']
    missing_fields = [field for field in required_fields if field not in body]
    
    if missing_fields:
        logger.warning(f"Missing required fields: {missing_fields}")
        metrics.record_error('INVALID_REQUEST', 'consent_check')
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': f'Missing required parameters: {", ".join(missing_fields)}',
                    'timestamp': int(time.time()),
                    'requestId': str(uuid.uuid4())
                }
            })
        }
    
    # Validate usage type
    try:
        UsageType(body['usageType'])
    except ValueError:
        logger.warning(f"Invalid usage type: {body['usageType']}")
        metrics.record_error('INVALID_REQUEST', 'consent_check')
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': f'Invalid usageType. Must be one of: {[t.value for t in UsageType]}',
                    'timestamp': int(time.time()),
                    'requestId': str(uuid.uuid4())
                }
            })
        }
    
    return None


def decode_reference_image(reference_image: str) -> bytes:
    """
    Decode reference image from base64 or return as-is if already bytes.
    
    Args:
        reference_image: Base64 encoded image string or S3 key
        
    Returns:
        Image bytes
        
    Raises:
        ValueError: If image cannot be decoded
    """
    try:
        # Try to decode as base64
        if reference_image.startswith('data:image'):
            # Remove data URL prefix
            reference_image = reference_image.split(',')[1]
        
        return base64.b64decode(reference_image)
    except Exception as e:
        logger.error(f"Failed to decode reference image: {e}")
        raise ValueError(f"Invalid reference image format: {e}")


def process_reference_image(image_bytes: bytes) -> list:
    """
    Process reference image: detect face and generate query fingerprint.
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Query embedding (normalized)
        
    Raises:
        NoFaceDetectedError: If no face detected
        MultipleFacesDetectedError: If multiple faces detected
        RekognitionServiceError: If Rekognition service fails
        
    Requirements: 8.2, 8.3 - Process reference image and generate fingerprint
    """
    rekognition = get_rekognition_client()
    
    # Detect face in reference image
    logger.info("Detecting face in reference image")
    face_detection = rekognition.detect_faces(image_bytes)
    
    # The detect_faces method returns a single FaceDetection object
    # and raises NoFaceDetectedError if no face is found
    # and raises MultipleFacesDetectedError if multiple faces are found
    
    # Extract embedding from the detected face
    logger.info("Extracting face embedding")
    embedding = rekognition.extract_embedding(face_detection, image_bytes)
    
    # Normalize embedding for similarity comparison
    normalized_embedding = normalize_embedding(embedding)
    
    return normalized_embedding


def perform_consent_check(
    query_embedding: list,
    usage_type: UsageType,
    requester_id: str,
    user_id: Optional[str] = None
) -> ConsentCheckResponse:
    """
    Perform consent check: find matches, evaluate policy, return decision.
    v2: Uses OpenSearch k-NN when USE_OPENSEARCH=true, falls back to DynamoDB.
    """
    use_opensearch = os.environ.get('USE_OPENSEARCH', 'true').lower() == 'true'

    if use_opensearch:
        return _perform_consent_check_opensearch(query_embedding, usage_type, requester_id, user_id)
    else:
        return _perform_consent_check_dynamodb(query_embedding, usage_type, requester_id, user_id)


def _perform_consent_check_opensearch(
    query_embedding: list,
    usage_type: UsageType,
    requester_id: str,
    user_id: Optional[str] = None
) -> ConsentCheckResponse:
    """OpenSearch k-NN path — v2 hybrid matching."""
    import sys as _sys
    _sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

    try:
        from lambdas.shared.opensearch_client import knn_query
    except ImportError:
        logger.warning("OpenSearch client not available, falling back to DynamoDB")
        return _perform_consent_check_dynamodb(query_embedding, usage_type, requester_id, user_id)

    threshold = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))

    try:
        candidates = knn_query(query_embedding, k=10)
    except Exception as e:
        logger.warning(f"OpenSearch k-NN failed: {e}, falling back to DynamoDB")
        return _perform_consent_check_dynamodb(query_embedding, usage_type, requester_id, user_id)

    if not candidates:
        return ConsentCheckResponse(
            decision=Decision.UNKNOWN,
            likeness_id=None,
            reason_code=ReasonCode.UNKNOWN_NO_MATCH,
            similarity_score=None,
            timestamp=int(time.time())
        )

    best = candidates[0]
    best_score = best.get('score', 0.0)
    subject_id = best.get('subject_id')

    if best_score < threshold:
        return ConsentCheckResponse(
            decision=Decision.DENY,
            likeness_id=subject_id,
            reason_code=ReasonCode.DENY_POLICY_VIOLATION,
            similarity_score=best_score,
            timestamp=int(time.time())
        )

    # Load policy from DynamoDB
    dynamodb = get_dynamodb_client()
    try:
        consent_record = dynamodb.get_consent_record(subject_id)
        if consent_record is None:
            return ConsentCheckResponse(
                decision=Decision.UNKNOWN,
                likeness_id=subject_id,
                reason_code=ReasonCode.UNKNOWN_NO_MATCH,
                similarity_score=best_score,
                timestamp=int(time.time())
            )
        policy = consent_record.consent_policy
    except Exception as e:
        logger.error(f"Failed to load policy for {subject_id}: {e}")
        return ConsentCheckResponse(
            decision=Decision.UNKNOWN,
            likeness_id=subject_id,
            reason_code=ReasonCode.UNKNOWN_SERVICE_ERROR,
            similarity_score=best_score,
            timestamp=int(time.time())
        )

    decision, reason_code = evaluate_consent(
        policy=policy,
        usage_type=usage_type,
        requester_id=requester_id,
        user_id=user_id or requester_id
    )

    return ConsentCheckResponse(
        decision=decision,
        likeness_id=subject_id,
        reason_code=reason_code,
        similarity_score=best_score,
        timestamp=int(time.time())
    )


def _perform_consent_check_dynamodb(
    query_embedding: list,
    usage_type: UsageType,
    requester_id: str,
    user_id: Optional[str] = None
) -> ConsentCheckResponse:
    """Original DynamoDB path — v1 fallback."""
    matcher = get_similarity_matcher()
    result = matcher.match_and_select(query_embedding)

    if result is None:
        logger.info("No matching likeness found")
        return ConsentCheckResponse(
            decision=Decision.UNKNOWN,
            likeness_id=None,
            reason_code=ReasonCode.UNKNOWN_NO_MATCH,
            similarity_score=None,
            timestamp=int(time.time())
        )

    selected_match, selection_reason = result
    logger.info(
        f"Match found: likeness_id={selected_match.likeness_id}, "
        f"similarity={selected_match.similarity_score:.4f}"
    )

    decision, reason_code = evaluate_consent(
        policy=selected_match.consent_policy,
        usage_type=usage_type,
        requester_id=requester_id,
        user_id=user_id or requester_id
    )

    return ConsentCheckResponse(
        decision=decision,
        likeness_id=selected_match.likeness_id,
        reason_code=reason_code,
        similarity_score=selected_match.similarity_score,
        timestamp=int(time.time())
    )


def log_decision_and_record_evidence(
    response: ConsentCheckResponse,
    requester_id: str,
    usage_type: UsageType,
    processing_time_ms: int,
    request_id: str
) -> None:
    """
    Log decision to CloudWatch and record evidence in DynamoDB.
    
    Args:
        response: Consent check response
        requester_id: ID of the requester
        usage_type: Type of usage requested
        processing_time_ms: Processing time in milliseconds
        request_id: Request identifier
        
    Requirements: 12.1, 13.1, 13.2 - Log decisions and record evidence
    """
    dynamodb = get_dynamodb_client()
    
    # Create audit record
    audit_record = AuditRecord(
        query_id=str(uuid.uuid4()),
        timestamp=response.timestamp,
        likeness_id=response.likeness_id,
        decision=response.decision,
        similarity_score=response.similarity_score,
        reason_code=response.reason_code,
        requester_id=requester_id,
        usage_type=usage_type,  # Pass the enum, not .value
        ttl=response.timestamp + (180 * 24 * 60 * 60)  # 180 days retention
    )
    
    # Store audit record
    try:
        dynamodb.store_audit_record(audit_record)
        logger.info(f"Audit record stored: query_id={audit_record.query_id}")
    except Exception as e:
        logger.error(f"Failed to store audit record: {e}")
        structured_logger.log_error(
            error_type='AUDIT_LOG_ERROR',
            error_message='Failed to store audit record',
            context={'error': str(e)},
            request_id=request_id
        )
        # Don't fail the request if audit logging fails
    
    # Log structured consent check event
    structured_logger.log_consent_check(
        decision=response.decision.value,
        likeness_id=response.likeness_id,
        reason_code=response.reason_code.value,
        similarity_score=response.similarity_score,
        requester_id=requester_id,
        usage_type=usage_type.value,
        processing_time_ms=processing_time_ms,
        request_id=request_id
    )
    
    # Record decision metric
    metrics.record_decision(response.decision.value, usage_type.value)
    
    # Record processing time metric
    metrics.record_processing_time('consent_check', processing_time_ms)
    
    # Record evidence for DENY decisions
    if response.decision == Decision.DENY and response.likeness_id:
        logger.info(f"Recording evidence for DENY decision: likeness_id={response.likeness_id}")
        # Evidence is already recorded in the audit log with all required metadata


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for consent checking.
    
    Flow:
    1. Parse and validate request
    2. Decode reference image
    3. Detect face and generate query fingerprint
    4. Find matching fingerprints
    5. Evaluate consent policy
    6. Log decision and record evidence
    7. Return decision
    
    Args:
        event: API Gateway event containing consent check request
        context: Lambda context object
        
    Returns:
        API Gateway response with consent decision
        
    Requirements: 8.1, 8.4, 9.1, 9.2, 9.3, 9.4
    """
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        logger.info(f"Consent check request received: request_id={request_id}")
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate required parameters
        validation_error = validate_request(body)
        if validation_error:
            return validation_error
        
        # Parse request
        reference_image = body['referenceImage']
        usage_type = UsageType(body['usageType'])
        requester_id = body['requesterId']
        user_id = body.get('userId')  # Optional for self-edit checks
        
        # Decode reference image
        try:
            image_bytes = decode_reference_image(reference_image)
        except ValueError as e:
            logger.warning(f"Invalid image format: {e}")
            structured_logger.log_error(
                error_type='INVALID_IMAGE',
                error_message=str(e),
                context={'requester_id': requester_id},
                request_id=request_id
            )
            metrics.record_error('INVALID_IMAGE', 'consent_check')
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'INVALID_IMAGE',
                        'message': str(e),
                        'timestamp': int(time.time()),
                        'requestId': request_id
                    }
                })
            }
        
        # Process reference image
        try:
            query_embedding = process_reference_image(image_bytes)
        except NoFaceDetectedError:
            logger.info("No face detected in reference image")
            response = ConsentCheckResponse(
                decision=Decision.UNKNOWN,
                likeness_id=None,
                reason_code=ReasonCode.UNKNOWN_NO_FACE,
                similarity_score=None,
                timestamp=int(time.time())
            )
            
            # Log decision
            processing_time_ms = int((time.time() - start_time) * 1000)
            log_decision_and_record_evidence(response, requester_id, usage_type, processing_time_ms, request_id)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(response.to_dict())
            }
        
        except (MultipleFacesDetectedError, RekognitionServiceError) as e:
            logger.error(f"Rekognition error: {e}")
            structured_logger.log_error(
                error_type='REKOGNITION_ERROR',
                error_message='Face detection service unavailable',
                context={'error': str(e), 'requester_id': requester_id},
                request_id=request_id
            )
            metrics.record_error('REKOGNITION_ERROR', 'consent_check')
            return {
                'statusCode': 502,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'REKOGNITION_ERROR',
                        'message': 'Face detection service unavailable',
                        'timestamp': int(time.time()),
                        'requestId': request_id
                    }
                })
            }
        
        # Perform consent check
        response = perform_consent_check(
            query_embedding=query_embedding,
            usage_type=usage_type,
            requester_id=requester_id,
            user_id=user_id
        )
        
        # Log decision and record evidence
        processing_time_ms = int((time.time() - start_time) * 1000)
        log_decision_and_record_evidence(response, requester_id, usage_type, processing_time_ms, request_id)
        
        # Calculate processing time
        logger.info(f"Consent check completed in {processing_time_ms}ms")
        
        # Return decision
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response.to_dict())
        }
        
    except Exception as e:
        logger.error(f"Consent check error: {str(e)}", exc_info=True)
        structured_logger.log_error(
            error_type='INTERNAL_ERROR',
            error_message='Consent check failed',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INTERNAL_ERROR', 'consent_check')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Consent check failed',
                    'timestamp': int(time.time()),
                    'requestId': request_id
                }
            })
        }
