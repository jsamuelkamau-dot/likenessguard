"""
Consent Revoke Lambda Handler
Handles consent revocation (sets policy to deny-all).

Requirements:
- 6.2: Consent revocation
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

from shared.models.data_models import ConsentPolicy, ConsentRevokeRequest, ConsentRevokeResponse
from shared.services.dynamodb_client import DynamoDBClient

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import structured logging and metrics
from shared.utils.structured_logger import StructuredLogger
from shared.utils.cloudwatch_metrics import CloudWatchMetrics

# Initialize structured logger and metrics
structured_logger = StructuredLogger(logger, 'consent_revoke')
metrics = CloudWatchMetrics()

# Initialize DynamoDB client
dynamodb_client = DynamoDBClient()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for consent revocation.
    
    This handler processes consent revocation requests by:
    1. Parsing and validating the incoming request
    2. Creating a deny-all consent policy
    3. Updating the policy in DynamoDB
    4. Logging the revocation event to CloudWatch
    
    Args:
        event: API Gateway event containing revocation request
        context: Lambda context object
        
    Returns:
        API Gateway response with revocation result
        
    Requirements: 6.2
    """
    request_id = context.request_id if hasattr(context, 'request_id') else 'unknown'
    
    try:
        logger.info("Consent revocation request received")
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        logger.info(f"Request body: {json.dumps(body, default=str)}")
        
        # Parse and validate revocation request
        try:
            revoke_request = ConsentRevokeRequest.from_dict(body)
        except ValueError as e:
            logger.warning(f"Invalid revocation request: {e}")
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
        
        # Get the existing record to log the old policy
        try:
            existing_record = dynamodb_client.get_consent_record(revoke_request.likeness_id)
            if existing_record is None:
                logger.warning(f"Likeness_ID not found: {revoke_request.likeness_id}")
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': {
                            'code': 'LIKENESS_NOT_FOUND',
                            'message': f'Likeness_ID {revoke_request.likeness_id} not found'
                        }
                    })
                }
            
            old_policy = existing_record.consent_policy
            logger.info(f"Retrieved existing policy for Likeness_ID: {revoke_request.likeness_id}")
            
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
        
        # Create deny-all policy (all deny flags set to True, allow_self_edits set to False)
        deny_all_policy = ConsentPolicy(
            allow_self_edits=False,
            deny_third_party_edits=True,
            deny_face_swaps=True,
            deny_sexualized_content=True,
            deny_impersonation=True,
            deny_political_use=True
        )
        logger.info(f"Created deny-all policy for revocation")
        
        # Update policy in DynamoDB (this also updates the modification timestamp)
        try:
            dynamodb_client.update_consent_policy(
                revoke_request.likeness_id,
                deny_all_policy
            )
            logger.info(f"Successfully revoked consent for Likeness_ID: {revoke_request.likeness_id}")
            
        except ValueError as e:
            # Record doesn't exist
            logger.warning(f"Likeness_ID not found during revocation: {revoke_request.likeness_id}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'LIKENESS_NOT_FOUND',
                        'message': f'Likeness_ID {revoke_request.likeness_id} not found'
                    }
                })
            }
        except ClientError as e:
            logger.error(f"Failed to revoke consent in DynamoDB: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'DATABASE_ERROR',
                        'message': 'Failed to revoke consent'
                    }
                })
            }
        
        # Log revocation event to CloudWatch
        current_time = int(time.time())
        
        # Log structured revocation event
        structured_logger.log_consent_revocation(
            likeness_id=revoke_request.likeness_id,
            old_policy=old_policy.to_dict(),
            request_id=request_id
        )
        
        # Create response
        response = ConsentRevokeResponse(
            likeness_id=revoke_request.likeness_id,
            status='SUCCESS',
            message='Consent revoked successfully - all usage types now denied',
            revoked_at=current_time
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
        metrics.record_error('INVALID_JSON', 'consent_revoke')
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
        logger.error(f"Consent revocation error: {str(e)}", exc_info=True)
        structured_logger.log_error(
            error_type='INTERNAL_ERROR',
            error_message='Consent revocation failed',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INTERNAL_ERROR', 'consent_revoke')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Consent revocation failed',
                    'details': str(e) if os.environ.get('DEBUG') == 'true' else None
                }
            })
        }
