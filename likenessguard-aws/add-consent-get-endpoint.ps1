# Add GET /consent endpoint - Complete Implementation
# This script adds the missing GET /consent endpoint to retrieve consent policies

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Adding GET /consent Endpoint" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create the Lambda handler
Write-Host "Step 1: Creating Lambda handler..." -ForegroundColor Yellow

$handlerContent = @"
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
"@

$handlerContent | Out-File -FilePath "src/lambdas/consent_get/handler.py" -Encoding UTF8
Write-Host "✓ Created handler.py" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Updating CloudFormation template..." -ForegroundColor Yellow

# Read the template
$templatePath = "infrastructure/template.yaml"
$template = Get-Content $templatePath -Raw

# Check if ConsentGetFunction already exists
if ($template -match "ConsentGetFunction:") {
    Write-Host "✓ ConsentGetFunction already exists in template" -ForegroundColor Green
} else {
    # Find the position to insert (after ConsentUpdateFunction)
    $insertPosition = $template.IndexOf("  # Lambda Function: Consent Revoke")
    
    if ($insertPosition -eq -1) {
        Write-Host "ERROR: Could not find insertion point in template" -ForegroundColor Red
        exit 1
    }
    
    $newFunction = @"

  # Lambda Function: Consent Get
  ConsentGetFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: LikenessGuard-ConsentGet
      CodeUri: ../src/
      Handler: lambdas.consent_get.handler.lambda_handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Events:
        ConsentGetApi:
          Type: Api
          Properties:
            RestApiId: !Ref LikenessGuardApi
            Path: /consent
            Method: GET

"@
    
    # Insert the new function
    $template = $template.Insert($insertPosition, $newFunction)
    
    # Add CloudWatch Log Group (find position after ConsentUpdateLogGroup)
    $logGroupPosition = $template.IndexOf("  ConsentRevokeLogGroup:")
    
    if ($logGroupPosition -eq -1) {
        Write-Host "ERROR: Could not find log group insertion point" -ForegroundColor Red
        exit 1
    }
    
    $newLogGroup = @"

  ConsentGetLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /aws/lambda/LikenessGuard-ConsentGet
      RetentionInDays: 90

"@
    
    # Insert the log group
    $template = $template.Insert($logGroupPosition, $newLogGroup)
    
    # Save the updated template
    $template | Out-File -FilePath $templatePath -Encoding UTF8
    Write-Host "✓ Updated template.yaml" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Building SAM application..." -ForegroundColor Yellow
sam build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: SAM build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build completed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Deploying to AWS..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes..." -ForegroundColor Cyan
sam deploy --stack-name likenessguard-prototype --no-confirm-changeset --no-fail-on-empty-changeset --capabilities CAPABILITY_NAMED_IAM

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The GET /consent endpoint is now available at:" -ForegroundColor Cyan
Write-Host "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/consent?likeness_id=<ID>" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test with:" -ForegroundColor Cyan
Write-Host 'curl "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/consent?likeness_id=<YOUR_LIKENESS_ID>"' -ForegroundColor Yellow
Write-Host ""
