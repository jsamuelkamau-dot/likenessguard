"""
Consent Get Lambda Handler
Handles consent policy retrieval.

Requirements:
- 3.1: Policy retrieval
"""
import json
import logging
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from botocore.exceptions import ClientError

from shared.services.dynamodb_client import DynamoDBClient

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Import structured logging and metrics
from shared.utils.structured_logger import StructuredLogger
from shared.utils.cloudwatch_metrics import CloudWatchMetrics

# Initialize structured logger and metrics
structured_logger = StructuredLogger(logger, 'consent_get')
metrics = CloudWatchMetrics()

# Initialize DynamoDB client
dynamodb_client = DynamoDBClient()


def lambda_handler(event, context):
    """
    Lambda handler for consent policy retrieval.
    
    This handler processes GET requests to retrieve consent policies by:
    1. Parsing and validating the likeness_id from query parameters
    2. Retrieving the consent record from DynamoDB
    3. Returning the policy and metadata
    
    Args:
        event: API Gateway event containing query parameters
        context: Lambda context object
        
    Returns:
        API Gateway response with consent policy
        
    Requirements: 3.1
    """
    request_id = context.request_id if hasattr(context, 'request_id') else 'unknown'
    
    try:
        logger.info("Consent get request received")
        
        # Parse query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        likeness_id = query_params.get('likeness_id')
        
        if not likeness_id:
            logger.warning("Missing likeness_id parameter")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'MISSING_PARAMETER',
                        'message': 'likeness_id query parameter is required'
                    }
                })
            }
        
        logger.info(f"Retrieving policy for Likeness_ID: {likeness_id}")
        
        # Get consent record from DynamoDB
        try:
            record = dynamodb_client.get_consent_record(likeness_id)
            
            if record is None:
                logger.warning(f"Likeness_ID not found: {likeness_id}")
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': {
                            'code': 'LIKENESS_NOT_FOUND',
                            'message': f'Likeness_ID {likeness_id} not found'
                        }
                    })
                }
            
            logger.info(f"Successfully retrieved policy for Likeness_ID: {likeness_id}")
            
            # Create response
            response_body = {
                'likeness_id': record.likeness_id,
                'consent_policy': record.consent_policy.to_dict(),
                'user_metadata': record.user_metadata.to_dict(),
                'created_at': record.created_at,
                'modified_at': record.modified_at
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(response_body)
            }
            
        except ClientError as e:
            logger.error(f"Failed to retrieve consent record: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'DATABASE_ERROR',
                        'message': 'Failed to retrieve consent record'
                    }
                })
            }
        
    except Exception as e:
        logger.error(f"Consent get error: {str(e)}", exc_info=True)
        structured_logger.log_error(
            error_type='INTERNAL_ERROR',
            error_message='Consent get failed',
            context={'error': str(e)},
            request_id=request_id
        )
        metrics.record_error('INTERNAL_ERROR', 'consent_get')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Consent get failed',
                    'details': str(e) if os.environ.get('DEBUG') == 'true' else None
                }
            })
        }
