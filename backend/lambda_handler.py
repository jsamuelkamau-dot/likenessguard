"""
AWS Lambda handler for Interpose backend API
"""

import json
import os
import time
import bcrypt
import boto3
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from boto3.dynamodb.conditions import Key


# Set up structured JSON logging for CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def log_structured(level: str, message: str, **kwargs):
    """
    Log structured JSON messages to CloudWatch.
    
    Args:
        level: Log level (INFO, WARNING, ERROR)
        message: Log message
        **kwargs: Additional structured data to include in log
    """
    log_data = {
        'timestamp': int(time.time() * 1000),
        'level': level,
        'message': message,
        **kwargs
    }
    
    if level == 'ERROR':
        logger.error(json.dumps(log_data))
    elif level == 'WARNING':
        logger.warning(json.dumps(log_data))
    else:
        logger.info(json.dumps(log_data))


# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
ses_client = boto3.client('ses')

# Get table names from environment variables
LOGS_TABLE = os.environ.get('LOGS_TABLE', 'AIObserveLogs')
CUSTOMERS_TABLE = os.environ.get('CUSTOMERS_TABLE', 'Customers')
ALERT_EMAIL_SOURCE = os.environ.get('ALERT_EMAIL_SOURCE', 'alerts@interpose.io')

# Get table references
logs_table = dynamodb.Table(LOGS_TABLE)
customers_table = dynamodb.Table(CUSTOMERS_TABLE)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main entry point for API Gateway requests.
    
    Routes requests based on HTTP method and path:
    - POST /logs: Submit log entry
    - GET /logs: Query customer logs
    - POST /auth: Authenticate user
    
    Args:
        event: API Gateway event object
        context: Lambda context object
        
    Returns:
        API Gateway response object with statusCode, body, and headers
    """
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    
    # Log Lambda invocation
    log_structured(
        'INFO',
        'Lambda invocation',
        http_method=http_method,
        path=path,
        request_id=context.aws_request_id if context else None,
        source_ip=event.get('requestContext', {}).get('identity', {}).get('sourceIp')
    )
    
    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'OK'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Headers': 'Content-Type,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            }
        }
    
    # Route based on method and path
    if http_method == 'POST' and path == '/logs':
        return handle_log_submission(event)
    elif http_method == 'GET' and path == '/logs':
        return handle_log_query(event)
    elif http_method == 'POST' and path == '/auth':
        return handle_auth(event)
    else:
        log_structured(
            'WARNING',
            'Route not found',
            http_method=http_method,
            path=path
        )
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Not Found'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }


def validate_api_key(api_key: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Validate API key against Customers table.
    
    Args:
        api_key: API key from X-API-Key header
        
    Returns:
        Customer record if valid, None otherwise
    """
    if not api_key:
        log_structured('WARNING', 'API key validation failed: missing key')
        return None
    
    try:
        # Query Customers table using ApiKeyIndex GSI
        log_structured(
            'INFO',
            'Validating API key',
            operation='dynamodb_query',
            table=CUSTOMERS_TABLE,
            index='ApiKeyIndex'
        )
        
        response = customers_table.query(
            IndexName='ApiKeyIndex',
            KeyConditionExpression=Key('api_key').eq(api_key)
        )
        
        items = response.get('Items', [])
        if items:
            customer_id = items[0].get('customer_id', 'unknown')
            log_structured(
                'INFO',
                'API key validation successful',
                customer_id=customer_id
            )
            return items[0]
        else:
            log_structured('WARNING', 'API key validation failed: invalid key')
            return None
    except Exception as e:
        log_structured(
            'ERROR',
            'API key validation error',
            error=str(e),
            operation='dynamodb_query'
        )
        return None


def handle_log_submission(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle log submission from agent.
    
    Validates API key, stores log in DynamoDB, and generates alerts if needed.
    
    Handles invalid JSON, missing fields, DynamoDB failures, and SES failures gracefully.
    
    Args:
        event: API Gateway event object
        
    Returns:
        API Gateway response object
    """
    # Validate API key
    api_key = event.get('headers', {}).get('X-API-Key') or event.get('headers', {}).get('x-api-key')
    customer = validate_api_key(api_key)
    
    if not customer:
        log_structured('WARNING', 'Log submission rejected: invalid API key')
        return {
            'statusCode': 401,
            'body': json.dumps({'error': 'Invalid API Key'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }
    
    customer_id = customer.get('customer_id', 'unknown')
    
    try:
        # Parse log entry from request body
        body = event.get('body', '{}')
        
        # Handle invalid JSON
        try:
            log_entry = json.loads(body)
        except json.JSONDecodeError as e:
            log_structured(
                'ERROR',
                'Invalid JSON in log submission',
                customer_id=customer_id,
                error=str(e)
            )
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid JSON in request body'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        # Validate required fields
        required_fields = ['ai_service', 'endpoint', 'risk_score']
        missing_fields = [field for field in required_fields if field not in log_entry]
        
        if missing_fields:
            log_structured(
                'ERROR',
                'Missing required fields in log submission',
                customer_id=customer_id,
                missing_fields=missing_fields
            )
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required fields',
                    'missing_fields': missing_fields
                }),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        # Add customer_id and timestamp
        log_entry['customer_id'] = customer_id
        log_entry['timestamp'] = int(time.time() * 1000)
        
        # Convert float values to Decimal for DynamoDB
        if 'risk_score' in log_entry:
            log_entry['risk_score'] = Decimal(str(log_entry['risk_score']))
        if 'request_size_bytes' in log_entry:
            log_entry['request_size_bytes'] = Decimal(str(log_entry['request_size_bytes']))
        if 'response_status' in log_entry:
            log_entry['response_status'] = Decimal(str(log_entry['response_status']))
        
        # Store log entry in DynamoDB with error handling
        try:
            log_structured(
                'INFO',
                'Storing log entry in DynamoDB',
                customer_id=customer_id,
                operation='dynamodb_put_item',
                table=LOGS_TABLE,
                ai_service=log_entry.get('ai_service'),
                risk_score=float(log_entry.get('risk_score', 0))
            )
            
            logs_table.put_item(Item=log_entry)
            
            log_structured(
                'INFO',
                'Log entry stored successfully',
                customer_id=customer_id,
                log_id=log_entry.get('log_id')
            )
        except Exception as db_error:
            log_structured(
                'ERROR',
                'DynamoDB put_item failed',
                customer_id=customer_id,
                operation='dynamodb_put_item',
                error=str(db_error)
            )
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Failed to store log entry'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        # Check for high-risk alert (risk_score > 70)
        risk_score = float(log_entry.get('risk_score', 0))
        if risk_score > 70:
            log_structured(
                'WARNING',
                'High-risk log detected, sending alert',
                customer_id=customer_id,
                risk_score=risk_score,
                ai_service=log_entry.get('ai_service')
            )
            # Send alert but don't block on SES failures
            send_alert(customer, log_entry)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Log received'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }
    except Exception as e:
        log_structured(
            'ERROR',
            'Error handling log submission',
            customer_id=customer_id,
            error=str(e)
        )
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }


def send_alert(customer: Dict[str, Any], log_entry: Dict[str, Any]) -> None:
    """
    Send high-risk alert email via AWS SES.
    
    Args:
        customer: Customer record from DynamoDB
        log_entry: Log entry that triggered the alert
    """
    customer_id = customer.get('customer_id', 'unknown')
    
    try:
        risk_score = float(log_entry.get('risk_score', 0))
        ai_service = log_entry.get('ai_service', 'unknown')
        timestamp = log_entry.get('timestamp', 0)
        sensitive_data_types = log_entry.get('sensitive_data_types', [])
        data_sources = log_entry.get('data_sources', [])
        
        email_body = f"""
High-risk AI activity detected:

Risk Score: {risk_score}
AI Service: {ai_service}
Timestamp: {timestamp}
Sensitive Data: {', '.join(sensitive_data_types) if sensitive_data_types else 'None'}
Data Sources: {', '.join(data_sources) if data_sources else 'None'}

Review immediately in your Interpose dashboard.
"""
        
        recipient_email = customer.get('alert_email', customer.get('email', ''))
        
        log_structured(
            'INFO',
            'Sending alert email via SES',
            customer_id=customer_id,
            operation='ses_send_email',
            recipient=recipient_email,
            risk_score=risk_score
        )
        
        ses_client.send_email(
            Source=ALERT_EMAIL_SOURCE,
            Destination={
                'ToAddresses': [recipient_email]
            },
            Message={
                'Subject': {
                    'Data': f'HIGH RISK ALERT: Score {risk_score}'
                },
                'Body': {
                    'Text': {
                        'Data': email_body
                    }
                }
            }
        )
        
        log_structured(
            'INFO',
            'Alert email sent successfully',
            customer_id=customer_id,
            recipient=recipient_email
        )
    except Exception as e:
        # Log error but don't raise exception (don't block log storage)
        log_structured(
            'ERROR',
            'Failed to send alert email',
            customer_id=customer_id,
            operation='ses_send_email',
            error=str(e)
        )


def handle_log_query(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle log query from dashboard.
    
    Validates API key and returns customer's logs from DynamoDB.
    Handles DynamoDB failures and data conversion errors gracefully.
    
    Args:
        event: API Gateway event object
        
    Returns:
        API Gateway response object with log entries
    """
    # Validate API key
    api_key = event.get('headers', {}).get('X-API-Key') or event.get('headers', {}).get('x-api-key')
    customer = validate_api_key(api_key)
    
    if not customer:
        log_structured('WARNING', 'Log query rejected: invalid API key')
        return {
            'statusCode': 401,
            'body': json.dumps({'error': 'Invalid API Key'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }
    
    customer_id = customer.get('customer_id', 'unknown')
    
    try:
        # Query logs from DynamoDB with error handling
        try:
            log_structured(
                'INFO',
                'Querying logs from DynamoDB',
                customer_id=customer_id,
                operation='dynamodb_query',
                table=LOGS_TABLE
            )
            
            response = logs_table.query(
                KeyConditionExpression='customer_id = :cid',
                ExpressionAttributeValues={':cid': customer_id},
                Limit=100,
                ScanIndexForward=False  # Descending order by timestamp
            )
            
            log_count = len(response.get('Items', []))
            log_structured(
                'INFO',
                'Logs retrieved successfully',
                customer_id=customer_id,
                log_count=log_count
            )
        except Exception as db_error:
            log_structured(
                'ERROR',
                'DynamoDB query failed',
                customer_id=customer_id,
                operation='dynamodb_query',
                error=str(db_error)
            )
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Failed to query logs'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        # Convert Decimal values back to float/int for JSON serialization
        items = response.get('Items', [])
        for item in items:
            try:
                # Convert specific numeric fields
                if 'risk_score' in item:
                    item['risk_score'] = float(item['risk_score'])
                if 'request_size_bytes' in item:
                    item['request_size_bytes'] = int(item['request_size_bytes'])
                if 'response_status' in item:
                    item['response_status'] = int(item['response_status'])
                if 'timestamp' in item:
                    item['timestamp'] = int(item['timestamp'])
                
                # Convert any remaining Decimal values
                for key, value in list(item.items()):
                    if isinstance(value, Decimal):
                        item[key] = float(value)
            except (ValueError, TypeError) as e:
                # If conversion fails, log and skip this item
                log_structured(
                    'ERROR',
                    'Error converting item values',
                    customer_id=customer_id,
                    error=str(e)
                )
                continue
        
        return {
            'statusCode': 200,
            'body': json.dumps(items),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }
    except Exception as e:
        log_structured(
            'ERROR',
            'Error querying logs',
            customer_id=customer_id,
            error=str(e)
        )
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }


def handle_auth(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle user authentication.
    
    Validates credentials against Customers table and returns API key.
    Handles invalid JSON, missing fields, and DynamoDB failures gracefully.
    
    Args:
        event: API Gateway event object
        
    Returns:
        API Gateway response object with api_key and customer_id
    """
    try:
        # Parse credentials from request body
        body = event.get('body', '{}')
        
        # Handle invalid JSON
        try:
            body_data = json.loads(body)
        except json.JSONDecodeError as e:
            log_structured(
                'ERROR',
                'Invalid JSON in auth request',
                error=str(e)
            )
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid JSON in request body'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        email = body_data.get('email')
        password = body_data.get('password')
        
        if not email or not password:
            log_structured(
                'WARNING',
                'Authentication failed: missing credentials'
            )
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Email and password required'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        # Query Customers table by email using EmailIndex GSI with error handling
        try:
            log_structured(
                'INFO',
                'Authenticating user',
                operation='dynamodb_query',
                table=CUSTOMERS_TABLE,
                index='EmailIndex',
                email=email
            )
            
            response = customers_table.query(
                IndexName='EmailIndex',
                KeyConditionExpression=Key('email').eq(email)
            )
        except Exception as db_error:
            log_structured(
                'ERROR',
                'DynamoDB query failed during auth',
                operation='dynamodb_query',
                error=str(db_error)
            )
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Authentication service unavailable'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        items = response.get('Items', [])
        if not items:
            log_structured(
                'WARNING',
                'Authentication failed: user not found',
                email=email
            )
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid credentials'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
        
        customer = items[0]
        customer_id = customer.get('customer_id', 'unknown')
        
        # Verify password using bcrypt
        # Note: bcrypt has a 72-byte password limit, truncate if necessary
        try:
            password_hash = customer.get('password_hash', '')
            if isinstance(password_hash, str):
                password_hash = password_hash.encode('utf-8')
            
            # Truncate password to 72 bytes for bcrypt compatibility
            password_bytes = password.encode('utf-8')[:72]
            
            if bcrypt.checkpw(password_bytes, password_hash):
                log_structured(
                    'INFO',
                    'Authentication successful',
                    customer_id=customer_id,
                    email=email
                )
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'api_key': customer['api_key'],
                        'customer_id': customer_id
                    }),
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
                }
            else:
                log_structured(
                    'WARNING',
                    'Authentication failed: invalid password',
                    customer_id=customer_id,
                    email=email
                )
                return {
                    'statusCode': 401,
                    'body': json.dumps({'error': 'Invalid credentials'}),
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
                }
        except Exception as bcrypt_error:
            log_structured(
                'ERROR',
                'Password verification failed',
                customer_id=customer_id,
                error=str(bcrypt_error)
            )
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Authentication service error'}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
            }
    except Exception as e:
        log_structured(
            'ERROR',
            'Error handling authentication',
            error=str(e)
        )
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        }
