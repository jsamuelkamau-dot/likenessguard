# Lambda Container Refresh - Complete

## Actions Taken

### 1. Code Fix
Updated `likenessguard-aws/src/shared/services/dynamodb_client.py`:
- Changed environment variable from `CONSENT_TABLE_NAME` to `CONSENT_REGISTRY_TABLE`
- Changed default value from `ConsentRegistry` to `LikenessGuard-ConsentRegistry`
- Changed environment variable from `AUDIT_TABLE_NAME` to `AUDIT_LOG_TABLE`
- Changed default value from `AuditLog` to `LikenessGuard-AuditLog`

### 2. Lambda Code Redeployment
```bash
aws lambda update-function-code --function-name LikenessGuard-Registration --zip-file fileb://lambda-deployment.zip --publish
```
- Deployed Version: 1
- CodeSha256: NrhRMQJTmd9L5BhC+xmg2b2OhAvXCsPkGUijsDz6xlU=
- Timestamp: 2026-02-21 00:32:58 UTC

### 3. Force Container Refresh
```bash
aws lambda update-function-configuration --function-name LikenessGuard-Registration --environment "Variables={CONSENT_REGISTRY_TABLE=LikenessGuard-ConsentRegistry,AUDIT_LOG_TABLE=LikenessGuard-AuditLog,PHOTO_BUCKET=likenessguard-photos-538784191640,SIMILARITY_THRESHOLD=0.85,LOG_LEVEL=INFO,FORCE_REFRESH=true}"
```
- Added `FORCE_REFRESH=true` environment variable to force container refresh
- Timestamp: 2026-02-21 00:34:28 UTC
- Status: Complete

## Current Lambda Configuration

### Environment Variables
```json
{
    "CONSENT_REGISTRY_TABLE": "LikenessGuard-ConsentRegistry",
    "AUDIT_LOG_TABLE": "LikenessGuard-AuditLog",
    "PHOTO_BUCKET": "likenessguard-photos-538784191640",
    "SIMILARITY_THRESHOLD": "0.85",
    "LOG_LEVEL": "INFO",
    "FORCE_REFRESH": "true"
}
```

### IAM Permissions
The Lambda has permission to access:
- `arn:aws:dynamodb:us-east-1:538784191640:table/LikenessGuard-ConsentRegistry`
- `arn:aws:dynamodb:us-east-1:538784191640:table/LikenessGuard-AuditLog`

## Next Steps

### Test the Registration Flow
The Lambda container has been completely refreshed. Test the registration flow from the dashboard:

1. Open the LikenessGuard dashboard at `http://localhost:5173`
2. Navigate to the Registration page
3. Upload 5 photos
4. Submit the registration

### Expected Result
- ✅ Photos processed successfully
- ✅ Faces detected
- ✅ Fingerprints generated
- ✅ Consent record stored in DynamoDB
- ✅ Likeness_ID returned

### If It Still Fails
If the registration still fails with the same error, check the CloudWatch logs:
```bash
.\check-logs.ps1
```

Look for:
- The table name being used by the DynamoDB client
- Any AccessDeniedException errors
- The environment variable values being read

### Alternative: Add Explicit Logging
If needed, add explicit logging to the DynamoDB client to see what's happening:
```python
def __init__(self, ...):
    self.consent_table_name = consent_table_name or os.environ.get(
        'CONSENT_REGISTRY_TABLE', 'LikenessGuard-ConsentRegistry'
    )
    logger.info(f"DynamoDB client initialized with consent_table_name: {self.consent_table_name}")
    logger.info(f"Environment variable CONSENT_REGISTRY_TABLE: {os.environ.get('CONSENT_REGISTRY_TABLE', 'NOT SET')}")
```

## Summary
The Lambda function has been:
1. Updated with the correct environment variable names
2. Redeployed with the new code
3. Force-refreshed by updating the environment variables

The container should now be using the correct table names. Test the registration flow to confirm the fix is working.
