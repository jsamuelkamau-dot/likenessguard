# Error Handling and Resilience - LikenessGuard AWS Prototype

## Overview

This document describes the error handling and resilience strategies implemented in the LikenessGuard prototype. The system follows AWS best practices for serverless error handling while maintaining simplicity appropriate for a prototype demonstration.

## Current Implementation

### 1. Lambda Function Error Handling

All Lambda functions implement comprehensive error handling:

**Pattern Used:**
```python
try:
    # Main logic
    logger.info("Operation started")
    # ... business logic ...
    return success_response
    
except ValueError as e:
    # Client errors (400)
    logger.warning(f"Validation error: {e}")
    return error_response(400, 'INVALID_REQUEST', str(e))
    
except ClientError as e:
    # AWS service errors (500)
    logger.error(f"AWS service error: {e}")
    return error_response(500, 'SERVICE_ERROR', 'Operation failed')
    
except Exception as e:
    # Unexpected errors (500)
    logger.error(f"Unexpected error: {e}", exc_info=True)
    return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
```

**Implemented in:**
- Registration Lambda (`src/lambdas/registration/handler.py`)
- Consent Check Lambda (`src/lambdas/consent_check/handler.py`)
- Consent Update Lambda (`src/lambdas/consent_update/handler.py`)
- Consent Revoke Lambda (`src/lambdas/consent_revoke/handler.py`)

### 2. Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional context (only in DEBUG mode)"
  }
}
```

**Error Codes:**
- `INVALID_REQUEST` - Missing or invalid parameters (HTTP 400)
- `INVALID_JSON` - Malformed JSON in request body (HTTP 400)
- `INVALID_POLICY` - Invalid consent policy structure (HTTP 400)
- `LIKENESS_NOT_FOUND` - Likeness ID does not exist (HTTP 404)
- `DATABASE_ERROR` - DynamoDB operation failed (HTTP 500)
- `SERVICE_ERROR` - AWS service unavailable (HTTP 500)
- `INTERNAL_ERROR` - Unexpected server error (HTTP 500)

### 3. Logging Strategy

**CloudWatch Integration:**
- All Lambda functions log to CloudWatch with structured logging
- Log levels: INFO (normal operations), WARNING (validation failures), ERROR (service failures)
- Log retention: 90 days (configured in SAM template)

**Log Format:**
```python
logger.info(f"Operation: {operation}, likeness_id={id}, status={status}")
logger.error(f"Error: {error_type}, details={details}", exc_info=True)
```

### 4. AWS Service Resilience

**Built-in AWS Resilience:**
- **Lambda**: Automatic retries for throttling and service errors
- **DynamoDB**: Automatic retries with exponential backoff (boto3 default)
- **Rekognition**: Automatic retries with exponential backoff (boto3 default)
- **API Gateway**: Built-in throttling and rate limiting

**Configuration:**
- API Gateway throttle: 100 requests/second, burst 200
- Lambda timeout: 30 seconds
- Lambda memory: 512MB
- DynamoDB: On-demand billing (auto-scaling)

### 5. Graceful Degradation

**Default-Deny Philosophy:**
When services are unavailable or errors occur, the system defaults to DENY/UNKNOWN:

- **Rekognition unavailable** → Return UNKNOWN (default deny)
- **DynamoDB unavailable** → Return error, client should retry
- **No face detected** → Return UNKNOWN (default deny)
- **Invalid input** → Return HTTP 400 with clear error message

This ensures the system fails safely, protecting user privacy even during failures.

## Production Enhancements (Future Work)

For production deployment, the following enhancements are recommended:

### 1. Retry Logic with Exponential Backoff

**Implementation:**
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=0.1, min=0.1, max=1.6),
    reraise=True
)
def call_aws_service():
    # AWS service call
    pass
```

**Configuration:**
- Initial delay: 100ms
- Max delay: 1600ms
- Max attempts: 5
- Jitter: Random 0-50ms to prevent thundering herd

### 2. Circuit Breaker Pattern

**Rekognition Circuit Breaker:**
- Threshold: 5 consecutive failures
- Timeout: 30 seconds
- Half-open: Allow 1 test request after timeout
- Fallback: Return UNKNOWN status

**DynamoDB Circuit Breaker:**
- Threshold: 3 consecutive failures
- Timeout: 10 seconds
- Half-open: Allow 1 test request after timeout
- Fallback: Return error response

**Implementation Library:** `pybreaker` or custom implementation

### 3. Advanced Error Monitoring

**CloudWatch Alarms:**
- Error rate > 5% for 5 minutes
- Circuit breaker open > 1 minute
- DynamoDB throttling events
- Lambda errors > 10/minute

**Metrics to Track:**
- Error rate by endpoint and error code
- Circuit breaker state changes
- Retry attempt counts
- Service availability percentages

### 4. Dead Letter Queues (DLQ)

For asynchronous operations:
- Configure SQS DLQ for failed Lambda invocations
- Implement retry logic for DLQ messages
- Alert on DLQ depth > threshold

### 5. Distributed Tracing

**AWS X-Ray Integration:**
- Enable X-Ray tracing for all Lambda functions
- Trace requests across services (API Gateway → Lambda → DynamoDB)
- Identify performance bottlenecks
- Debug complex error scenarios

## Testing Error Handling

### Unit Tests

All Lambda handlers have unit tests covering error scenarios:
- Invalid input validation
- Missing required parameters
- DynamoDB errors (mocked)
- Rekognition errors (mocked)
- Unexpected exceptions

### Property-Based Tests

Error handling properties are validated:
- **Property 55**: Transient failures are retried with backoff (future)
- **Property 56**: Error messages are descriptive but safe
- **Property 57**: Service unavailability returns UNKNOWN

### Integration Tests

For production, implement integration tests:
- Simulate DynamoDB throttling
- Simulate Rekognition service errors
- Test circuit breaker behavior
- Verify retry logic with real AWS services

## Error Handling Best Practices

### 1. Never Expose Internal Details

❌ Bad:
```json
{
  "error": "DynamoDB.ProvisionedThroughputExceededException at line 42"
}
```

✅ Good:
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable, please retry"
  }
}
```

### 2. Log Everything, Return Safely

```python
try:
    result = risky_operation()
except Exception as e:
    # Log detailed error for debugging
    logger.error(f"Operation failed: {e}", exc_info=True)
    # Return safe error to client
    return error_response(500, 'INTERNAL_ERROR', 'Operation failed')
```

### 3. Use Appropriate HTTP Status Codes

- **400**: Client error (invalid input)
- **401**: Unauthorized (missing/invalid API key)
- **404**: Resource not found
- **429**: Rate limit exceeded
- **500**: Server error (AWS service failure)
- **503**: Service unavailable (circuit breaker open)

### 4. Implement Timeouts

All operations should have timeouts:
- Lambda function timeout: 30 seconds
- DynamoDB query timeout: 5 seconds
- Rekognition API timeout: 10 seconds

### 5. Monitor and Alert

Set up alerts for:
- Error rate spikes
- Increased latency
- Service degradation
- Circuit breaker activations

## Conclusion

The current prototype implements robust error handling suitable for demonstration purposes:
- ✅ Comprehensive try-catch blocks in all Lambda functions
- ✅ Consistent error response format
- ✅ Structured logging to CloudWatch
- ✅ Default-deny fail-safe behavior
- ✅ AWS built-in retry mechanisms (boto3)

For production deployment, implement the recommended enhancements:
- ⏳ Custom retry logic with exponential backoff
- ⏳ Circuit breaker pattern
- ⏳ Advanced monitoring and alerting
- ⏳ Distributed tracing with X-Ray
- ⏳ Dead letter queues for async operations

The prototype demonstrates the core error handling principles while maintaining simplicity appropriate for a competition demonstration.
