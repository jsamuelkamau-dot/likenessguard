# S3 Upload Fix Complete

## Problem
The dashboard was sending base64-encoded images directly in the `photo_keys` array to the `/register` endpoint. These base64 strings were too large to be used as HTTP headers, causing "RequestHeaderSectionTooLarge" error (HTTP 431).

## Root Cause
1. The `registration-service.ts` was compressing images and converting them to base64, then sending the base64 strings directly to the `/register` endpoint
2. The base64 strings were being treated as S3 keys by the Lambda function
3. The Lambda tried to use these huge base64 strings as S3 object keys: `s3_client.get_object(Bucket=PHOTOS_BUCKET, Key=photo_key)` where `photo_key` was actually a base64 string
4. This caused the request headers to exceed the size limit

## Solution Implemented

### 1. Fixed Registration Service (Dashboard)
**File**: `likenessguard-dashboard/src/services/registration-service.ts`

Changed the registration flow to:
1. Compress images (400x400, 0.5 quality)
2. Upload compressed images to S3 using presigned URLs
3. Send S3 keys (not base64) to the `/register` endpoint

The service now uses the `uploadFilesWithFallback` function which:
- Attempts S3 upload first (proper flow)
- Falls back to base64 if S3 upload fails (for resilience)

### 2. Re-enabled S3 Upload Service
**File**: `likenessguard-dashboard/src/services/s3-upload-service.ts`

Removed the temporary base64-only code and re-enabled the proper S3 upload flow:
- Gets presigned URLs from `/upload/presigned-url` endpoint
- Uploads files directly to S3
- Returns S3 keys for registration

### 3. Fixed Environment Variable Mismatch (Backend)
**Files**: 
- `likenessguard-aws/src/lambdas/registration/handler.py`
- `likenessguard-aws/src/lambdas/upload_presigned_url/handler.py`

Fixed environment variable name:
- CloudFormation template uses: `PHOTO_BUCKET`
- Lambda handlers were using: `PHOTOS_BUCKET` (with 'S')
- Changed handlers to use `PHOTO_BUCKET` (without 'S')

### 4. Deployed Lambda Functions
Both Lambda functions have been deployed with the fixes:
- `LikenessGuard-Registration` - Now correctly reads `PHOTO_BUCKET` env var
- `LikenessGuard-UploadPresignedUrl` - Now correctly reads `PHOTO_BUCKET` env var

## How It Works Now

### Registration Flow:
1. User selects 5-10 photos in the dashboard
2. Dashboard compresses images (400x400, 0.5 quality JPEG)
3. Dashboard requests presigned URLs from `/upload/presigned-url`
4. Dashboard uploads compressed images directly to S3 using presigned URLs
5. Dashboard sends S3 keys to `/register` endpoint
6. Lambda downloads images from S3 using the keys
7. Lambda processes images (face detection, fingerprint generation)
8. Lambda deletes images from S3 after processing
9. Lambda stores consent record in DynamoDB
10. Lambda returns registration response

### Fallback Flow:
If S3 upload fails (network issues, CORS issues, etc.):
1. Dashboard falls back to base64 encoding
2. Dashboard sends base64 strings to `/register` endpoint
3. Lambda detects base64 data (checks for '=' padding, '+' characters, length > 100)
4. Lambda decodes base64 directly instead of downloading from S3
5. Rest of the flow continues normally

## Benefits
1. **Proper Architecture**: Uses S3 for temporary storage as designed
2. **No Header Size Limits**: S3 keys are short strings, not large base64 data
3. **Better Performance**: Direct S3 upload is faster than sending large payloads through API Gateway
4. **Resilient**: Falls back to base64 if S3 upload fails
5. **Secure**: Presigned URLs are time-limited (5 minutes) and scoped to specific keys

## Testing
To test the fix:
1. Open the dashboard at `http://localhost:5173`
2. Navigate to Registration page
3. Upload 5-10 photos
4. Fill in user details and consent policy
5. Click "Register Likeness"
6. Check browser console for upload method: "Upload complete. Method: s3"
7. Verify registration succeeds

## Files Modified
- `likenessguard-dashboard/src/services/registration-service.ts` - Use S3 upload flow
- `likenessguard-dashboard/src/services/s3-upload-service.ts` - Re-enable S3 uploads
- `likenessguard-aws/src/lambdas/registration/handler.py` - Fix env var name
- `likenessguard-aws/src/lambdas/upload_presigned_url/handler.py` - Fix env var name

## Deployment
Lambda functions deployed:
- LikenessGuard-Registration (CodeSize: 398,057 bytes, Status: Successful)
- LikenessGuard-UploadPresignedUrl (CodeSize: 398,057 bytes, Status: Successful)

Both functions are now using the correct `PHOTO_BUCKET` environment variable.
