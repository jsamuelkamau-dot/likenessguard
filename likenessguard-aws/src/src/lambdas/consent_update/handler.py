"""
Consent Update Lambda Handler
Handles consent policy modifications.

Requirements:
- 6.1: Policy modification
- 6.3: Modification timestamp updates
- 6.5: Policy change logging
"""
import json
import logging
import os
import sys
import time
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from botocore.exceptions import ClientError

from shared.models.data_models import ConsentPolicy, ConsentUpdateRequest, ConsentUpdateResponse
from shared.services.dynamodb_client import DynamoDBClient

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import structured logging and metrics
from shared.utils.structured_logger import StructuredLogger
from shared.utils.cloudwatch_metrics import CloudWatchMetrics

# Initialize structured logger and metrics
structured_logger = StructuredLogger(logger, 'consent_update')
metrics = CloudWatchMetrics()

# Initialize DynamoDB client
dynamodb_client = DynamoDBClient()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for consent policy updates.
    
    This handler processes consent policy update requests by:
    1. Parsing and validating the incoming request
    2. Validating the new policy structure
    3. Updating the policy in DynamoDB
    4. Updating the modification timestamp
    5. Logging the policy change to CloudWatch
    
    Args:
        event: API Gateway event containing update request
        context: Lambda context object
        
    Returns:
        API Gateway response with update result
        
    Requirements: 6.1, 6.3, 6.5
    """
    request_id = context.request_id if hasattr(context, 'request_id') else 'unknown'
    
    try:
        logger.info("Consent update request received")
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        logger.info(f"Request body: {json.dumps(body, default=str)}")
        
        # Parse and validate update request
        try:
            update_request = ConsentUpdateRequest.from_dict(body)
        except ValueError as e:
            logger.warning(f"Invalid update request: {e}")
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
        
        # Validate policy structure
        try:
            new_policy = update_request.new_policy
            # Policy validation happens in ConsentPolicy constructor
            logger.info(f"Validated new policy for Likeness_ID: {update_request.likeness_id}")
        except Exception as e:
            logger.warning(f"Invalid policy structure: {e}")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'INVALID_POLICY',
                        'message': f'Invalid policy structure: {str(e)}'
                    }
                })
            }
        
        # Get the existing record to log the old policy
        try:
            existing_record = dynamodb_client.get_consent_record(update_request.likeness_id)
            if existing_record is None:
                logger.warning(f"Likeness_ID not found: {update_request.likeness_id}")
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': {
                            'code': 'LIKENESS_NOT_FOUND',
                            'message': f'Likeness_ID {update_request.likeness_id} not found'
                        }
                    })
                }
            
            old_policy = existing_record.consent_policy
            logger.info(f"Retrieved existing policy for Likeness_ID: {update_request.likeness_id}")
            
        except ClientError as e:
            logger.error(f"Failed to retrieve existing record: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'DATABASE_ERROR',
                        'message': 'Failed to retrieve existing consent record'
                    }
                })
            }
        
        # Update policy in DynamoDB (this also updates the modification timestamp)
        try:
            dynamodb_client.update_consent_policy(
                update_request.likeness_id,
                new_policy
            )
            logger.info(f"Successfully updated policy for Likeness_ID: {update_request.likeness_id}")
            
        except ValueError as e:
            # Record doesn't exist
            logger.warning(f"Likeness_ID not found during update: {update_request.likeness_id}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'LIKENESS_NOT_FOUND',
                        'message': f'Likeness_ID {update_request.likeness_id} not found'
                    }
                })
            }
        except ClientError as e:
            logger.error(f"Failed to update policy in DynamoDB: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'DATABASE_ERROR',
                        'message': 'Failed to update consent policy'
                    }
                })
            }
        
        # Log policy change to CloudWatch
        current_time = int(time.time())
        
        # Log structured policy update event
        structured_logger.log_policy_update(
            likeness_id=update_request.likeness_id,
            old_policy=old_policy.to_dict(),
            new_policy=new_policy.to_dict(),
            request_id=request_id
        )
        
        # Create response
        response = ConsentUpdateResponse(
            likeness_id=update_request.likeness_id,
            status='SUCCESS',
            message='Consent policy updated successfully',
            modified_at=current_time
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
        logger.error(f"Invalid JSON in request body: {e}")
        structured_logger.log_error(
            error_type='INVALID_JSON',
            error_message='Request body must be valid JSON',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INVALID_JSON', 'consent_update')
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INVALID_JSON',
                    'message': 'Request body must be valid JSON'
                }
            })
        }
    except Exception as e:
        logger.error(f"Consent update error: {str(e)}", exc_info=True)
        structured_logger.log_error(
            error_type='INTERNAL_ERROR',
            error_message='Consent update failed',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INTERNAL_ERROR', 'consent_update')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Consent update failed',
                    'details': str(e) if os.environ.get('DEBUG') == 'true' else None
                }
            })
        }
