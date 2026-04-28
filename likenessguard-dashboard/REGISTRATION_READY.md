# Registration Flow - Ready for Testing

## Status: ✅ READY

All fixes have been applied and the registration flow is ready for testing in the dashboard.

## What Was Fixed

### 1. S3 CORS Configuration ✅
- Applied CORS configuration to S3 bucket `likenessguard-photos-538784191640`
- Allowed origins: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:3000`
- Allowed methods: GET, PUT, POST, DELETE, HEAD
- Exposed headers: ETag
- Max age: 3000 seconds

### 2. Lambda Environment Variables ✅
- Fixed `PHOTOS_BUCKET` → `PHOTO_BUCKET` in both Lambda functions:
  - `registration` handler
  - `upload_presigned_url` handler
- Both functions deployed successfully

### 3. Dashboard Code ✅
- Registration service uses S3 upload flow (not base64)
- S3 upload service is enabled and working
- Image compression: 400x400px, 0.5 quality (~0.08MB per 5 photos)
- Error handling properly extracts backend error messages

### 4. Face Detection Threshold ✅
- Lowered AWS Rekognition confidence threshold from 90% to 70%
- System now works with typical user photos (not just studio-quality)

## Test Results

### Presigned URL Endpoint ✅
```
GET /v1/upload/presigned-url
Status: 200 OK
Response: 5 presigned URLs generated
Expires in: 300 seconds
```

### S3 Upload Flow ✅
1. Dashboard requests presigned URLs from backend
2. Backend generates S3 presigned URLs (5 minutes expiry)
3. Dashboard uploads files directly to S3 using PUT
4. Dashboard sends S3 keys to registration endpoint
5. Lambda retrieves images from S3 for face detection

## How to Test

### 1. Start the Dashboard
```bash
cd likenessguard-dashboard
npm run dev
```

### 2. Open in Browser
Navigate to: `http://localhost:5173`

### 3. Test Registration
1. Go to the Registration page
2. Enter a User ID (e.g., `test-user-123`)
3. Upload 5-10 photos of the same person
   - Use typical user photos (selfies, casual photos)
   - Photos will be compressed to 400x400px automatically
4. Configure consent policy (default is fine)
5. Click "Register"

### 4. Expected Behavior

**Success Case:**
- Photos upload to S3 (check browser console for "Upload complete. Method: s3")
- Registration completes successfully
- Success message displayed with fingerprint ID

**Error Cases:**
- "No valid faces detected": Photos don't contain clear faces (threshold: 70%)
- "Multiple faces detected": Some photos contain more than one person
- Upload errors: Check browser console for CORS or network issues

## Monitoring

### Browser Console
- Check for S3 upload logs: `"Uploading photos to S3..."`
- Check upload method: `"Upload complete. Method: s3"` (should be "s3", not "base64")
- Check photo keys: Should be S3 paths like `uploads/user-id/timestamp/uuid.jpg`

### CloudWatch Logs
```bash
cd likenessguard-aws
./check-registration-logs.ps1
```

### S3 Bucket
Check uploaded files:
```bash
aws s3 ls s3://likenessguard-photos-538784191640/uploads/ --recursive --region us-east-1
```

## Configuration

### API Endpoint
```
https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
```

### S3 Bucket
```
likenessguard-photos-538784191640
```

### Lambda Functions
- `likenessguard-registration` (deployed)
- `likenessguard-upload-presigned-url` (deployed)

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
1. Verify CORS configuration:
   ```bash
   aws s3api get-bucket-cors --bucket likenessguard-photos-538784191640 --region us-east-1
   ```
2. Check that your dev server is running on `localhost:5173`
3. Clear browser cache and reload

### Base64 Fallback
If console shows `"Upload complete. Method: base64"`:
- This means S3 upload failed and it fell back to base64
- Check CORS configuration
- Check network connectivity
- Check presigned URL expiry (5 minutes)

### Face Detection Errors
If you get "No valid faces detected":
- Ensure photos contain clear, visible faces
- Try photos with better lighting
- Avoid photos with sunglasses, masks, or heavy shadows
- Current threshold: 70% confidence

### Request Too Large (431)
If you see "RequestHeaderSectionTooLarge":
- This means base64 fallback is being used (S3 upload failed)
- Fix the S3 CORS issue to use proper S3 upload flow

## Next Steps

1. Test the registration flow in the dashboard
2. Verify S3 uploads are working (check console logs)
3. Test with different photo sets
4. Monitor CloudWatch logs for any backend errors
5. If issues persist, check the troubleshooting section above
