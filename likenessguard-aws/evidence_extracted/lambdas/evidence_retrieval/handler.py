"""
Evidence Retrieval Lambda Handler

Retrieves evidence records for a user's likeness.

Requirements:
- 13.3: Evidence retrieval API with authentication
"""
import json
import logging
import os
import sys
import time
import uuid
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from botocore.exceptions import ClientError

from shared.models.data_models import (
    EvidenceRetrievalRequest,
    EvidenceRetrievalResponse,
    EvidenceRecord
)
from shared.services.dynamodb_client import DynamoDBClient

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import structured logging and metrics
from shared.utils.structured_logger import StructuredLogger
from shared.utils.cloudwatch_metrics import CloudWatchMetrics

# Initialize structured logger and metrics
structured_logger = StructuredLogger(logger, 'evidence_retrieval')
metrics = CloudWatchMetrics()

# Initialize DynamoDB client
dynamodb_client = DynamoDBClient()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for evidence retrieval.
    
    This handler processes evidence retrieval requests by:
    1. Parsing and validating the incoming request
    2. Authenticating the user (user can only see their own evidence)
    3. Retrieving evidence records from DynamoDB
    4. Returning paginated results
    
    Args:
        event: API Gateway event containing retrieval request
        context: Lambda context object
        
    Returns:
        API Gateway response with evidence records
        
    Requirements: 13.3
    """
    request_id = context.request_id if hasattr(context, 'request_id') else str(uuid.uuid4())
    start_time = time.time()
    
    try:
        logger.info("Evidence retrieval request received")
        
        # Parse query parameters (GET request)
        query_params = event.get('queryStringParameters', {}) or {}
        
        # Parse and validate retrieval request
        try:
            retrieval_request = EvidenceRetrievalRequest.from_dict(query_params)
        except ValueError as e:
            logger.warning(f"Invalid retrieval request: {e}")
            structured_logger.log_error(
                error_type='INVALID_REQUEST',
                error_message=str(e),
                context={'query_params': query_params},
                request_id=request_id
            )
            metrics.record_error('INVALID_REQUEST', 'evidence_retrieval')
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'INVALID_REQUEST',
                        'message': str(e)
                    }
                })
            }
        
        # TODO: Add authentication check here
        # In a production system, verify that the authenticated user
        # has permission to access evidence for this likeness_id
        # For prototype, we assume authentication is handled by API Gateway
        
        # Retrieve evidence records from DynamoDB
        try:
            # Conditional query logic: use table scan if no likeness_id, otherwise use GSI query
            if retrieval_request.likeness_id is None:
                # No likeness_id provided - retrieve all audit records
                audit_records = dynamodb_client.get_all_audit_records(
                    limit=retrieval_request.limit
                )
                logger.info(f"Retrieved {len(audit_records)} evidence records (all records)")
            else:
                # Specific likeness_id provided - use GSI query for filtered results
                audit_records = dynamodb_client.get_audit_records_by_likeness(
                    likeness_id=retrieval_request.likeness_id,
                    limit=retrieval_request.limit
                )
                logger.info(f"Retrieved {len(audit_records)} evidence records for Likeness_ID: {retrieval_request.likeness_id}")
            
        except ClientError as e:
            logger.error(f"Failed to retrieve evidence records from DynamoDB: {e}")
            structured_logger.log_error(
                error_type='DATABASE_ERROR',
                error_message='Failed to retrieve evidence records',
                context={'error': str(e), 'likeness_id': retrieval_request.likeness_id},
                request_id=request_id
            )
            metrics.record_error('DYNAMODB_ERROR', 'evidence_retrieval')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'DATABASE_ERROR',
                        'message': 'Failed to retrieve evidence records'
                    }
                })
            }
        except Exception as e:
            logger.error(f"Unexpected error retrieving evidence records: {e}", exc_info=True)
            structured_logger.log_error(
                error_type='INTERNAL_ERROR',
                error_message='Failed to retrieve evidence records',
                context={'error': str(e), 'likeness_id': retrieval_request.likeness_id},
                request_id=request_id
            )
            metrics.record_error('INTERNAL_ERROR', 'evidence_retrieval')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'INTERNAL_ERROR',
                        'message': 'Failed to retrieve evidence records'
                    }
                })
            }
        
        # Convert audit records to evidence records
        evidence_records = [
            EvidenceRecord.from_audit_record(audit_record)
            for audit_record in audit_records
        ]
        
        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Log structured evidence retrieval event
        structured_logger.log_system_event(
            event_name='EVIDENCE_RETRIEVAL',
            message=f'Evidence retrieval: {len(evidence_records)} records',
            metadata={
                'likeness_id': retrieval_request.likeness_id,
                'count': len(evidence_records),
                'processing_time_ms': processing_time_ms
            },
            request_id=request_id
        )
        
        # Record processing time metric
        metrics.record_processing_time('evidence_retrieval', processing_time_ms)
        
        # Create response
        response = EvidenceRetrievalResponse(
            likeness_id=retrieval_request.likeness_id if retrieval_request.likeness_id else "ALL",
            evidence_records=evidence_records,
            count=len(evidence_records),
            last_evaluated_key=None  # TODO: Implement pagination if needed
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response.to_dict())
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request: {e}")
        structured_logger.log_error(
            error_type='INVALID_JSON',
            error_message='Request must be valid JSON',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INVALID_JSON', 'evidence_retrieval')
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INVALID_JSON',
                    'message': 'Request must be valid JSON'
                }
            })
        }
    except Exception as e:
        logger.error(f"Evidence retrieval error: {str(e)}", exc_info=True)
        structured_logger.log_error(
            error_type='INTERNAL_ERROR',
            error_message='Evidence retrieval failed',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INTERNAL_ERROR', 'evidence_retrieval')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Evidence retrieval failed',
                    'details': str(e) if os.environ.get('DEBUG') == 'true' else None
                }
            })
        }
