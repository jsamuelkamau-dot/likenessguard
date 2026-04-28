"""
Lambda handler for generating presigned URLs for S3 photo uploads.

This handler generates secure presigned URLs that allow the web dashboard
to upload photos directly to S3. The URLs are time-limited and scoped
to specific object keys to ensure security.
"""

import json
import uuid
import time
import os
from typing import Dict, Any, List
import boto3
from botocore.exceptions import ClientError

# Initialize AWS clients
s3_client = boto3.client('s3')

# Environment variables
PHOTOS_BUCKET = os.environ.get('PHOTO_BUCKET', '')
PRESIGNED_URL_EXPIRATION = 300  # 5 minutes

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for generating presigned URLs for photo uploads.
    
    Expected request body:
    {
        "user_id": "string",
        "photo_count": number (5-10)
    }
    
    Returns:
    {
        "upload_urls": [
            {
                "photo_key": "string",
                "upload_url": "string"
            }
        ],
        "expires_in": number (seconds)
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        if 'user_id' not in body:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'MISSING_USER_ID',
                        'message': 'user_id is required'
                    }
                })
            }
        
        user_id = body['user_id']
        photo_count = body.get('photo_count', 5)
        
        # Validate photo count
        if not isinstance(photo_count, int) or photo_count < 5 or photo_count > 10:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'INVALID_PHOTO_COUNT',
                        'message': 'photo_count must be between 5 and 10'
                    }
                })
            }
        
        # Generate unique photo keys and presigned URLs
        upload_urls = []
        timestamp = int(time.time())
        
        for i in range(photo_count):
            # Generate unique photo key
            photo_key = f"uploads/{user_id}/{timestamp}/{uuid.uuid4()}.jpg"
            
            try:
                # Generate presigned URL for PUT operation
                # NOTE: Removing ContentType parameter to avoid signature mismatch issues
                # S3 will accept any content type when ContentType is not specified in presigned URL
                presigned_url = s3_client.generate_presigned_url(
                    'put_object',
                    Params={
                        'Bucket': PHOTOS_BUCKET,
                        'Key': photo_key
                    },
                    ExpiresIn=PRESIGNED_URL_EXPIRATION
                )
                
                upload_urls.append({
                    'photo_key': photo_key,
                    'upload_url': presigned_url
                })
                
            except ClientError as e:
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': {
                            'code': 'S3_ERROR',
                            'message': f'Failed to generate presigned URL: {str(e)}'
                        }
                    })
                }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'upload_urls': upload_urls,
                'expires_in': PRESIGNED_URL_EXPIRATION
            })
        }
        
    except json.JSONDecodeError:
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
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': f'Internal server error: {str(e)}'
                }
            })
        }