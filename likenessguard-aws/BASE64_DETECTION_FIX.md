# Base64 Detection Fix - Complete

## Problem Identified

The Lambda function was incorrectly detecting base64-encoded images as S3 keys, causing:
1. **"Bad Request" errors** - When trying to use short base64 strings as S3 keys
2. **"RequestHeaderSectionTooLarge" errors** - When trying to use long base64 strings as S3 keys (S3 has header size limits)

## Root Cause

The detection logic in `process_photo()` was flawed:
```python
# OLD (BROKEN) LOGIC:
is_base64 = '/' not in photo_data and (len(photo_data) > 100 or '=' in photo_data or '+' in photo_data)
```

This logic failed because:
- Base64 strings CAN contain '/' characters (they're valid base64 characters)
- The length check of > 100 was too low (base64 images are thousands of characters)
- Checking for '=' and '+' is unreliable

## Solution

Changed to a simple, reliable length-based detection:
```python
# NEW (FIXED) LOGIC:
is_base64 = len(photo_data) > 500  # Base64 images are always > 500 chars
```

This works because:
- **S3 keys** are short paths like `"uploads/photo1.jpg"` (< 500 chars)
- **Base64 images** are very long strings (typically 50,000+ characters for a photo)
- Length is a reliable discriminator

## Changes Made

### File: `likenessguard-aws/src/lambdas/registration/handler.py`

1. **In `process_photo()` function** (line ~140):
   - Changed base64 detection to use `len(photo_data) > 500`

2. **In `process_all_photos()` function** (line ~200):
   - Changed S3 key detection to use `len(photo_data) < 500`

## Testing

After deployment, test with the dashboard:
1. Upload 5 photos through the registration form
2. The Lambda should now correctly:
   - Detect them as base64 data (not S3 keys)
   - Decode the base64 strings
   - Process the images with Rekognition or fallback fingerprinting
   - Successfully register the user

## Expected Behavior

- **Base64 uploads**: Photos are decoded and processed directly
- **S3 uploads** (if used): Photos are downloaded from S3 first
- **Fallback fingerprinting**: If face detection fails, raw image hashing is used
- **No more "RequestHeaderSectionTooLarge" errors**

## Deployment Status

Deployed via SAM CLI - Lambda functions updated with the fix.
