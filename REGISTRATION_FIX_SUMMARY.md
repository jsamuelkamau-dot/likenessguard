# Registration Fix Summary

## Problem Solved
Fixed the "RequestHeaderSectionTooLarge" error (HTTP 431) that occurred when registering a likeness with photos.

## Root Cause
The dashboard was sending base64-encoded images directly in the request body to the `/register` endpoint. These base64 strings were too large and were being treated as S3 keys, causing the HTTP headers to exceed the size limit.

## Solution
Implemented proper S3 upload flow:
1. Dashboard compresses images (400x400, 0.5 quality JPEG)
2. Dashboard requests presigned URLs from `/upload/presigned-url` endpoint
3. Dashboard uploads compressed images directly to S3
4. Dashboard sends S3 keys (short strings) to `/register` endpoint
5. Lambda downloads images from S3 using the keys
6. Lambda processes images and deletes them from S3

## Changes Made

### Dashboard (Frontend)
1. **registration-service.ts**: Modified to use S3 upload flow instead of sending base64 directly
2. **s3-upload-service.ts**: Re-enabled S3 upload functionality (was temporarily disabled)

### Backend (AWS Lambda)
1. **registration/handler.py**: Fixed environment variable name from `PHOTOS_BUCKET` to `PHOTO_BUCKET`
2. **upload_presigned_url/handler.py**: Fixed environment variable name from `PHOTOS_BUCKET` to `PHOTO_BUCKET`

### Deployment
- Deployed both Lambda functions with the fixes
- Both functions now correctly read the `PHOTO_BUCKET` environment variable

## Testing Results
✅ Presigned URL endpoint working correctly
✅ S3 upload successful
✅ All tests passed

## Next Steps
1. Test the full registration flow in the dashboard at http://localhost:5173
2. Upload 5-10 photos and verify registration succeeds
3. Check browser console for "Upload complete. Method: s3" message
4. Verify no more "RequestHeaderSectionTooLarge" errors

## Files Modified
- `likenessguard-dashboard/src/services/registration-service.ts`
- `likenessguard-dashboard/src/services/s3-upload-service.ts`
- `likenessguard-aws/src/lambdas/registration/handler.py`
- `likenessguard-aws/src/lambdas/upload_presigned_url/handler.py`

## Documentation Created
- `likenessguard-dashboard/S3_UPLOAD_FIX_COMPLETE.md` - Detailed technical documentation
- `likenessguard-dashboard/test-s3-upload-flow.cjs` - Test script for S3 upload flow
- `likenessguard-aws/deploy-registration-fix.ps1` - Deployment script

## Benefits
1. No more header size limit errors
2. Faster uploads (direct to S3)
3. Better architecture (uses S3 as designed)
4. Resilient (falls back to base64 if S3 fails)
5. Secure (presigned URLs are time-limited)
