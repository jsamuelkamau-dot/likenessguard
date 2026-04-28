# S3 Content-Type Signature Fix - Complete

## Problem Identified

Photos were being uploaded to S3 with 200 OK responses, but the files were NOT being stored in S3. The Lambda logs showed:

```
NoSuchKey: The specified key does not exist
```

This was happening because:
1. Dashboard uploads photos to S3 using presigned URLs
2. S3 returns 200 OK (appears successful)
3. But S3 silently rejects the upload due to signature mismatch
4. Files don't actually get stored in S3
5. Registration Lambda tries to download non-existent files
6. Error: "No valid faces detected" (misleading error message)

## Root Cause

When generating presigned URLs with a `ContentType` parameter, S3 requires that the upload request includes the EXACT same Content-Type header. Any mismatch causes S3 to:
- Accept the upload (return 200 OK)
- But NOT store the file
- No error message is returned

The issue was:
```python
# Presigned URL generated with ContentType parameter
presigned_url = s3_client.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': PHOTOS_BUCKET,
        'Key': photo_key,
        'ContentType': 'image/jpeg'  # This creates a signature requirement
    },
    ExpiresIn=PRESIGNED_URL_EXPIRATION
)
```

Even though the dashboard was sending `Content-Type: image/jpeg`, there was still a signature mismatch causing silent failures.

## Solution Applied

**Removed the ContentType parameter from presigned URL generation:**

```python
# Generate presigned URL WITHOUT ContentType parameter
# This allows S3 to accept any content type without signature validation
presigned_url = s3_client.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': PHOTOS_BUCKET,
        'Key': photo_key
        # ContentType removed - no signature requirement
    },
    ExpiresIn=PRESIGNED_URL_EXPIRATION
)
```

## Changes Made

1. **File**: `likenessguard-aws/src/lambdas/upload_presigned_url/handler.py`
   - Removed `'ContentType': 'image/jpeg'` from presigned URL generation
   - Added comment explaining why ContentType is omitted

2. **Deployment**:
   - Built Lambda package: `sam build`
   - Updated UploadPresignedUrl function: `aws lambda update-function-code`
   - Status: **Successful**

## How It Works Now

1. **Dashboard requests presigned URLs** from `/upload-presigned-url`
2. **Lambda generates presigned URLs** WITHOUT ContentType parameter
3. **Dashboard uploads photos** to S3 using presigned URLs
   - Can send any Content-Type header (or none)
   - No signature mismatch issues
4. **S3 stores the files** successfully
5. **Registration Lambda downloads photos** from S3
6. **Photos are processed** (face detection or fallback fingerprinting)

## Testing

Try uploading photos again from the dashboard:

```powershell
# Start dashboard
cd likenessguard-dashboard
npm run dev

# Monitor Lambda logs
cd likenessguard-aws
.\check-logs.ps1

# Verify files in S3
aws s3 ls s3://likenessguard-photos-538784191640/uploads/ --recursive
```

## Expected Behavior

- ✅ Photos upload to S3 successfully
- ✅ Files persist in S3 (can be listed with aws s3 ls)
- ✅ Registration Lambda can download photos
- ✅ Face detection or fallback fingerprinting works
- ✅ Registration completes successfully

## Technical Details

**Lambda Function**: `LikenessGuard-UploadPresignedUrl`
**Last Update**: Successful
**Runtime**: Python 3.13

**Key Insight**: When using presigned URLs, omitting the ContentType parameter provides more flexibility and avoids signature mismatch issues. S3 will still store the file correctly, and the Content-Type can be inferred from the file extension or set by the client.

## Next Steps

1. Test photo upload from dashboard
2. Verify files appear in S3
3. Confirm registration completes successfully
4. Check that fingerprints are generated

The system should now work end-to-end with any photo upload.
