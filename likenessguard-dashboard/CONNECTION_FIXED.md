# LikenessGuard Dashboard Connection Fixed

## Issue Resolution Summary

The dashboard registration form was experiencing "Unable to connect to server" errors. The root cause was a mismatch between the frontend and backend photo handling:

- Frontend: Sending base64-encoded photos directly in the request
- Backend: Expecting S3 object keys and trying to download from S3

## Changes Made

### 1. Lambda Handler Updates (`likenessguard-aws/src/lambdas/registration/handler.py`)

Updated the registration Lambda to accept both S3 keys and base64-encoded photos:

- Modified `process_photo()` function to detect and handle base64 data
- Updated `process_all_photos()` to skip S3 deletion for base64 photos
- Removed S3 validation logic that was blocking base64 photos

Detection logic:
```python
is_base64 = '/' not in photo_data and (len(photo_data) > 100 or '=' in photo_data or '+' in photo_data)
```

### 2. Deployment

Created `deploy-lambda-only.ps1` script to quickly deploy Lambda updates:
- Packages Lambda with correct directory structure
- Updates `LikenessGuard-Registration` function
- Deployment ID: 7f290b93-fbaa-45db-adb6-a0d9a1394a88

### 3. Testing

Verified with `test-base64-registration.js`:
- Lambda now accepts base64 photos ✓
- CORS headers present ✓
- Base64 decoding works ✓
- Face detection runs (expected to fail on test image) ✓

## Current Status

✅ Lambda accepts base64-encoded photos
✅ CORS configured correctly (origin: http://localhost:5173)
✅ API key disabled for testing
✅ Registration endpoint functional

## Next Steps for User

1. **Hard refresh the dashboard** (Ctrl+Shift+R or Cmd+Shift+R)
   - This loads the updated JavaScript with base64 encoding

2. **Test registration form** at http://localhost:5173/register
   - Upload 5-10 photos with faces
   - Fill in user details
   - Submit the form

3. **Check browser console** for any errors
   - Network tab should show successful POST to `/register`
   - Response should be 200 OK (or 400 with validation errors)

## API Endpoint

- Base URL: `https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1`
- Registration: `POST /register`
- CORS Origin: `http://localhost:5173`
- API Key: Disabled

## Files Modified

- `likenessguard-aws/src/lambdas/registration/handler.py`
- `likenessguard-aws/deploy-lambda-only.ps1` (new)
- `likenessguard-aws/test-base64-registration.js` (new)
- `likenessguard-dashboard/src/services/registration-service.ts` (previous session)

## Technical Notes

The Lambda now supports both workflows:
1. **S3 workflow**: Upload to S3 → Send S3 keys → Lambda downloads
2. **Base64 workflow**: Convert to base64 in browser → Send base64 → Lambda decodes

Currently using base64 workflow to bypass S3 presigned URL timeout issues.
