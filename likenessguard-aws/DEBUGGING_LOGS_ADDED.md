# Debugging Logs Added to Registration Lambda

## Date: 2026-02-21

## Issue
The Lambda function was receiving base64-encoded images correctly from the dashboard, but was failing with errors:
- "Bad Request" (400) when trying to use base64 strings as S3 keys
- "RequestHeaderSectionTooLarge" when base64 strings exceeded S3 key size limits

## Root Cause
The base64 detection logic `is_base64 = len(photo_data) > 500` was not working as expected. The Lambda was logging "Downloading from S3" even for base64 data.

## Solution
Added detailed logging to the `process_photo` function to debug the issue:
- Log photo data length
- Log first 50 characters of photo data
- Log the result of the `is_base64` check

## Changes Made
File: `likenessguard-aws/src/lambdas/registration/handler.py`

Added logging statements:
```python
logger.info(f"Photo data length: {len(photo_data)}")
logger.info(f"Photo data first 50 chars: {photo_data[:50]}")
logger.info(f"is_base64: {is_base64}")
```

## Deployment
Lambda function updated at: 2026-02-21 00:18:46 UTC
Function: LikenessGuard-Registration
Status: InProgress → Active

## Next Steps
1. Test registration from the dashboard
2. Check CloudWatch logs for the new debug information
3. Identify why the base64 detection is failing
4. Fix the detection logic based on the logs
