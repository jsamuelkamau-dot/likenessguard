# DynamoDB Access Issue - Root Cause Analysis

## Issue Summary
The Lambda function successfully processes photos and generates fingerprints, but fails when trying to store the consent record in DynamoDB with an `AccessDeniedException`.

## Root Cause
The DynamoDB client is trying to access table `ConsentRegistry` instead of `LikenessGuard-ConsentRegistry`. This is happening because:

1. **Environment Variable Mismatch (FIXED)**: The DynamoDB client was looking for `CONSENT_TABLE_NAME` but CloudFormation sets `CONSENT_REGISTRY_TABLE`. This has been fixed in the code.

2. **Lambda Code Caching**: Despite updating the code and redeploying, the Lambda was still using the old default value. This suggests the Lambda container was cached.

## Evidence from Logs
```
[ERROR] Failed to store consent record in DynamoDB: An error occurred (AccessDeniedException) when calling the PutItem operation: User: arn:aws:sts::538784191640:assumed-role/LikenessGuard-LambdaExecutionRole/LikenessGuard-Registration is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:538784191640:table/ConsentRegistry
```

Note: The error shows `table/ConsentRegistry` (without the `LikenessGuard-` prefix), confirming the client is using the old default value.

## Current Status

### ✅ Fixed
- Environment variable names in `dynamodb_client.py` updated from `CONSENT_TABLE_NAME` to `CONSENT_REGISTRY_TABLE`
- Default values updated from `ConsentRegistry` to `LikenessGuard-ConsentRegistry`
- Lambda function code redeployed with `--publish` flag (Version 1)
- Environment variables confirmed correct in Lambda configuration
- IAM policy confirmed correct (allows access to `LikenessGuard-ConsentRegistry`)

### ✅ Verified
- Photos are processed successfully (all 5 photos)
- Faces detected with 99-100% confidence
- Fingerprints generated correctly
- Likeness_ID created: `135df3e6-640b-4f6f-805f-036b2c7a3aa8`

### ❌ Still Failing
- DynamoDB storage fails with `AccessDeniedException`
- Lambda is trying to access `ConsentRegistry` instead of `LikenessGuard-ConsentRegistry`

## Next Steps

### Option 1: Wait for Lambda Container Refresh
The Lambda container may still be cached. Wait 5-10 minutes for AWS to fully refresh the container, then test again.

### Option 2: Force Container Refresh
1. Update the Lambda environment variables (even with a dummy change) to force a container refresh:
   ```bash
   aws lambda update-function-configuration --function-name LikenessGuard-Registration --environment Variables={CONSENT_REGISTRY_TABLE=LikenessGuard-ConsentRegistry,AUDIT_LOG_TABLE=LikenessGuard-AuditLog,PHOTO_BUCKET=likenessguard-photos-538784191640,SIMILARITY_THRESHOLD=0.85,LOG_LEVEL=INFO,FORCE_REFRESH=true}
   ```

2. Wait for the update to complete:
   ```bash
   aws lambda wait function-updated --function-name LikenessGuard-Registration
   ```

3. Test again

### Option 3: Add Explicit Logging
Add logging to the DynamoDB client `__init__` method to see what table name it's actually using:
```python
def __init__(self, ...):
    self.consent_table_name = consent_table_name or os.environ.get(
        'CONSENT_REGISTRY_TABLE', 'LikenessGuard-ConsentRegistry'
    )
    logger.info(f"DynamoDB client initialized with consent_table_name: {self.consent_table_name}")
    logger.info(f"Environment variable CONSENT_REGISTRY_TABLE: {os.environ.get('CONSENT_REGISTRY_TABLE', 'NOT SET')}")
```

### Option 4: Temporary IAM Policy Workaround
As a temporary workaround, add permission for the old table name to the IAM policy:
```json
{
    "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
    ],
    "Resource": [
        "arn:aws:dynamodb:us-east-1:538784191640:table/LikenessGuard-ConsentRegistry",
        "arn:aws:dynamodb:us-east-1:538784191640:table/LikenessGuard-AuditLog",
        "arn:aws:dynamodb:us-east-1:538784191640:table/ConsentRegistry",
        "arn:aws:dynamodb:us-east-1:538784191640:table/AuditLog"
    ],
    "Effect": "Allow"
}
```

This would allow the Lambda to work even with the old default values, but it's not a proper fix.

## Files Modified
- `likenessguard-aws/src/shared/services/dynamodb_client.py` - Updated environment variable names and defaults
- Lambda function code redeployed (Version 1, CodeSha256: NrhRMQJTmd9L5BhC+xmg2b2OhAvXCsPkGUijsDz6xlU=)

## Deployment Timestamp
- Latest deployment: 2026-02-21 00:32:58 UTC
- Lambda State: Active
- Version: 1

## Recommendation
**Try Option 1 first** - wait 5-10 minutes for the Lambda container to fully refresh, then test again. If that doesn't work, proceed with Option 2 to force a container refresh.
