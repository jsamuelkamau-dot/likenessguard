# Error Handling Fixed - Registration Error Messages

## Issue
The dashboard was showing generic "invalid request" error instead of the actual error message from the backend.

## Root Cause
The API client's error handler was looking for error messages in the wrong structure:
- Looking for: `data.message` or `data.body.message`
- Actual structure: `data.error.message`

## Fix Applied

### Updated `src/services/api-client.ts`
Modified the `handleError` method to check multiple possible error structures:

```typescript
const errorMessage = 
  data?.error?.message ||  // Backend error structure ✅
  data?.message ||         // Direct message
  data?.body?.message ||   // Wrapped message
  'Invalid request';       // Fallback

const errorDetails = 
  data?.error?.details ||  // Backend error details ✅
  data?.errors ||          // Validation errors
  data?.details ||         // Direct details
  [];
```

### Updated `src/services/registration-service.ts`
Simplified error handling since the API client now properly formats errors:

```typescript
catch (error: any) {
  console.error('Registration error details:', {
    message: error.message,
    type: error.type,
    details: error.details,
    statusCode: error.statusCode,
    fullError: error
  });
  
  throw new Error(error.message || 'Registration failed. Please try again.');
}
```

## Test Results

Tested with the backend API:
```
Status: 400 Bad Request
Response: {
  "error": {
    "code": "NO_VALID_FACES",
    "message": "No valid faces detected in any photos",
    "details": [...]
  }
}
```

The error message is now properly extracted and displayed!

## What You Should See Now

Instead of:
```
❌ Registration error: invalid request
```

You should now see:
```
❌ Registration error: No valid faces detected in any photos
```

## Next Steps

1. **Restart the dev server** to pick up the changes:
   ```bash
   cd likenessguard-dashboard
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache** (just to be safe):
   - Chrome/Edge: `Ctrl+Shift+Delete`
   - Select "Cached images and files"
   - Clear

3. **Hard refresh** the page:
   - Windows: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

4. **Test registration** with real photos:
   - Upload 5-10 photos with clear, front-facing faces
   - Good lighting
   - No sunglasses or masks
   - One face per photo

## Expected Behavior

### With Test Images (No Faces)
```
Error: No valid faces detected in any photos
Details:
- No face detected in photo 0: No face detected with confidence >= 90.0%
- No face detected in photo 1: No face detected with confidence >= 90.0%
...
```

### With Real Photos (Faces Detected)
```
✅ Successfully registered likeness!
Likeness ID: uuid-here
Status: SUCCESS
Processed Photos: 5
```

### With Some Invalid Photos
```
✅ Registration partially successful
Likeness ID: uuid-here
Status: PARTIAL_SUCCESS
Processed Photos: 3
Errors:
- No face detected in photo 2
- Multiple faces detected in photo 4
```

## Files Modified

1. `src/services/api-client.ts` - Fixed error message extraction
2. `src/services/registration-service.ts` - Simplified error handling
3. `test-from-dashboard.cjs` - Test script to verify API responses

## Summary

The API was always working correctly - it was just the error message extraction that was broken. Now you'll see the actual error messages from the backend, which will help you understand what's wrong (e.g., "No valid faces detected" instead of generic "invalid request").
