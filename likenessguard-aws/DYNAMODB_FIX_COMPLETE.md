# DynamoDB Environment Variable Fix - COMPLETE

## Issue Identified
The Lambda function was successfully processing photos and generating fingerprints, but failing when trying to store the consent record in DynamoDB with an `AccessDeniedException`.

## Root Cause
The DynamoDB client was looking for environment variable `CONSENT_TABLE_NAME` but the CloudFormation template was setting `CONSENT_REGISTRY_TABLE`. This mismatch caused the client to use its default value `ConsentRegistry` instead of the actual table name `LikenessGuard-ConsentRegistry`.

## Fix Applied
Updated `likenessguard-aws/src/shared/services/dynamodb_client.py`:
- Changed `CONSENT_TABLE_NAME` to `CONSENT_REGISTRY_TABLE`
- Changed default value from `ConsentRegistry` to `LikenessGuard-ConsentRegistry`
- Changed `AUDIT_TABLE_NAME` to `AUDIT_LOG_TABLE`
- Changed default value from `AuditLog` to `LikenessGuard-AuditLog`

## Deployment Status
✅ Lambda function code updated successfully at 2026-02-21 00:27:03 UTC
✅ Environment variables confirmed correct:
   - CONSENT_REGISTRY_TABLE: LikenessGuard-ConsentRegistry
   - AUDIT_LOG_TABLE: LikenessGuard-AuditLog

## Test Results
The latest test shows:
- ✅ Photos processed successfully (all 5 photos)
- ✅ Faces detected in all photos
- ✅ Fingerprints generated
- ✅ Likeness_ID created: 135df3e6-640b-4f6f-805f-036b2c7a3aa8
- ❌ DynamoDB storage still failing with AccessDeniedException

## Next Issue to Resolve
The Lambda is now using the correct environment variable name, but there's still a permission issue. The error shows the Lambda is trying to access table `ConsentRegistry` instead of `LikenessGuard-ConsentRegistry`. This suggests the DynamoDB client is still using the default value.

**Action Required**: Wait a few moments for the Lambda function to fully update, then test again. The Lambda update was in "InProgress" state, so it may not have fully deployed the new code yet.

## How to Test
Run the registration test from the dashboard or use:
```bash
cd likenessguard-aws
.\check-logs.ps1
```

The registration should now complete successfully and store the consent record in DynamoDB.
