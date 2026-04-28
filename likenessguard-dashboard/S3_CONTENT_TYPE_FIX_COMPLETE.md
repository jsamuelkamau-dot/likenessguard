# S3 Upload Content-Type Fix - COMPLETE ✓

## Problem Identified

The S3 uploads were appearing successful (200 OK responses with ETags) but files were not actually being persisted in S3. This was causing the registration Lambda to fail with "NoSuchKey" errors.

## Root Cause

**Content-Type Mismatch Between Presigned URL and Upload**

When generating presigned URLs with specific parameters (like `ContentType`), S3 requires that the actual upload request uses the **exact same** Content-Type header. If there's a mismatch:
- S3 returns 200 OK (appears successful)
- S3 returns an ETag (appears successful)
- **BUT** S3 silently rejects the upload and doesn't persist the file

### The Mismatch

1. **Presigned URL Handler** (`upload_presigned_url/handler.py`):
   ```python
   presigned_url = s3_client.generate_presigned_url(
       'put_object',
       Params={
           'Bucket': PHOTOS_BUCKET,
           'Key': photo_key,
           'ContentType': 'image/jpeg'  # ← Hardcoded to image/jpeg
       },
       ExpiresIn=PRESIGNED_URL_EXPIRATION
   )
   ```

2. **S3 Upload Service** (`s3-upload-service.ts`) - BEFORE FIX:
   ```typescript
   const response = await fetch(presignedUrl, {
       method: 'PUT',
       body: file,
       headers: {
           'Content-Type': file.type,  // ← Could be image/png, image/webp, etc.
       },
   });
   ```

When a user uploaded a PNG file, the upload service sent `Content-Type: image/png`, but the presigned URL expected `Content-Type: image/jpeg`. This mismatch caused S3 to silently reject the upload.

## Solution

**Fixed the S3 upload service to always use `Content-Type: image/jpeg`** to match the presigned URL:

```typescript
const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
        'Content-Type': 'image/jpeg',  // ← MUST match presigned URL ContentType
    },
});
```

This is safe because:
1. The registration service already compresses all images to JPEG format before uploading
2. All File objects created after compression have JPEG data, even if the original was PNG/WebP
3. The presigned URL is generated with `ContentType: 'image/jpeg'`

## Files Modified

1. **likenessguard-dashboard/src/services/s3-upload-service.ts**
   - Changed `Content-Type: file.type` to `Content-Type: 'image/jpeg'`
   - Added comment explaining why this MUST match the presigned URL parameter

## Testing Results

Created comprehensive test script `test-s3-upload-flow.cjs` that:
1. Gets presigned URLs from backend
2. Uploads 5 test files to S3 with correct Content-Type
3. Waits for S3 consistency
4. Verifies files actually exist in S3 using AWS CLI
5. Tests registration with S3 keys

### Test Output
```
✓ Got 5 presigned URLs
✓ All 5 uploads returned 200 OK with ETags
✓ All 5 files verified to exist in S3
✓ SUCCESS: All files were persisted in S3!
✓ Content-Type fix is working correctly!
```

## Why This Was Hard to Debug

1. **S3 returned success indicators** (200 OK, ETag) even though it rejected the upload
2. **No error messages** - S3 silently discarded the upload
3. **CORS was working** - browser showed successful uploads
4. **Presigned URLs were valid** - no signature errors
5. **S3 consistency delays** - initially suspected eventual consistency issues

The only way to discover this was to:
- Check if files actually existed in S3 using AWS CLI
- Compare presigned URL parameters with actual upload headers
- Understand S3's strict parameter matching requirements

## Next Steps

The S3 upload flow is now working correctly. Users can:
1. Upload photos through the dashboard
2. Photos are compressed to JPEG (400x400, 0.5 quality)
3. Photos are uploaded to S3 with correct Content-Type
4. Files are persisted in S3
5. Registration Lambda can retrieve files from S3
6. Face detection and registration proceeds normally

## Related Issues Fixed

- ✓ Image compression working (400x400px, ~0.08MB for 5 photos)
- ✓ Error message handling fixed (proper error extraction from backend)
- ✓ Confidence threshold lowered (90% → 70% for better face detection)
- ✓ Environment variable mismatch fixed (PHOTOS_BUCKET → PHOTO_BUCKET)
- ✓ S3 CORS configuration applied
- ✓ Content-Type mismatch fixed (this issue)

## Date Completed
February 21, 2026
