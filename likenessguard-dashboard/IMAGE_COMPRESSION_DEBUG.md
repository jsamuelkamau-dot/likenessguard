# Image Compression Debug - Registration Error Fix

## Issue
Registration failing with 400 Bad Request error: "Invalid request"

## Current Status
- Image compression is already implemented and working
- Images are being compressed to 400x400 pixels at 0.5 quality
- Total payload size is only 0.08 MB (well under the 10MB limit)
- The error is happening at the backend validation stage

## Changes Made

### 1. Enhanced Error Logging (registration-service.ts)
Added detailed error logging to capture the exact error response from the backend:

```typescript
catch (error: any) {
  // Log detailed error information
  console.error('Registration error details:', {
    message: error.message,
    response: error.response,
    data: error.response?.data,
    status: error.response?.status,
    statusText: error.response?.statusText,
    error: error
  });
  
  // Re-throw with better error message
  if (error.response?.data?.error) {
    throw new Error(error.response.data.error.message || 'Registration failed');
  }
}
```

### 2. Enhanced Request Logging
Added more detailed logging of the request structure to help debug:

```typescript
console.log('Request body structure:', {
  user_id: requestBody.user_id,
  photo_keys_count: requestBody.photo_keys.length,
  photo_keys_sample: requestBody.photo_keys[0]?.substring(0, 50) + '...',
  consent_policy: requestBody.consent_policy,
  email: requestBody.email
});
```

## Next Steps

### To Debug Further:
1. **Check Browser Console** - Look for the new "Registration error details" log
2. **Check Backend Logs** - Look at CloudWatch logs for the registration Lambda
3. **Verify Request Format** - Ensure the consent_policy keys match exactly

### Possible Root Causes:
1. **Base64 Format Issue** - The backend might not be recognizing the base64 data
2. **Consent Policy Format** - Keys might not match (snake_case vs camelCase)
3. **Missing Required Field** - A field might be undefined or null
4. **Backend Validation** - The backend validation logic might be too strict

### Quick Test:
Try registering again and check the console for:
- "Registration error details" - This will show the exact backend error
- "Request body structure" - This will show what we're sending

## Backend Validation Logic

The backend expects:
```python
{
  "user_id": "string",
  "photo_keys": ["base64_string1", "base64_string2", ...],  # 5-10 items
  "consent_policy": {
    "allow_self_edits": bool,
    "deny_third_party_edits": bool,
    "deny_face_swaps": bool,
    "deny_sexualized_content": bool,
    "deny_impersonation": bool,
    "deny_political_use": bool
  },
  "email": "string" (optional)
}
```

## Image Compression Settings

Current settings (working well):
- **Max dimensions**: 400x400 pixels
- **Quality**: 0.5 (50%)
- **Format**: JPEG
- **Result**: ~0.08 MB for 5 photos (well under 10MB limit)

These settings are optimal for the use case and don't need to be changed.

## Files Modified
- `likenessguard-dashboard/src/services/registration-service.ts` - Enhanced error logging and request logging

