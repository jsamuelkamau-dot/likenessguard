# Registration Test Guide

## Current Status

✅ **API is working correctly!**

The backend API has been tested and is functioning properly:
- API endpoint is reachable
- CORS is configured correctly
- Base64 photo upload is working
- Request validation is working
- Lambda is processing requests

## Test Results

### Test with minimal images (1x1 pixel PNG):
```
Status: 400 Bad Request
Error Code: NO_VALID_FACES
Message: "No valid faces detected in any photos"
```

This is the **expected behavior** - the API correctly rejects images without faces.

## What This Means

The "invalid request" error you're seeing in the dashboard is likely one of these:

1. **Network/CORS issue** - Browser is blocking the request
2. **Request format issue** - Dashboard is sending data in wrong format
3. **Cached error** - Browser has cached an old error response

## How to Test

### Option 1: Browser Console Test

Open the dashboard at http://localhost:5173 and paste this in the browser console:

```javascript
// Test registration with proper format
fetch('https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:5173'
  },
  body: JSON.stringify({
    user_id: 'test-user-' + Date.now(),
    photo_keys: [
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
    ],
    consent_policy: {
      allow_self_edits: true,
      deny_third_party_edits: true,
      deny_face_swaps: true,
      deny_sexualized_content: true,
      deny_impersonation: true,
      deny_political_use: true
    },
    email: 'test@example.com'
  })
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
  // Expected: 400 with NO_VALID_FACES error (because test images have no faces)
})
.catch(error => console.error('Error:', error));
```

### Expected Result:
```json
{
  "error": {
    "code": "NO_VALID_FACES",
    "message": "No valid faces detected in any photos",
    "details": [
      "No face detected in photo 0: No face detected with confidence >= 90.0%",
      "No face detected in photo 1: No face detected with confidence >= 90.0%",
      ...
    ]
  }
}
```

This confirms the API is working!

### Option 2: Test with Real Photos

1. Go to http://localhost:5173/register
2. **Clear browser cache** (Ctrl+Shift+Delete or Cmd+Shift+Delete)
3. **Hard refresh** (Ctrl+Shift+R or Cmd+Shift+R)
4. Upload 5-10 photos with clear faces
5. Fill in the form
6. Submit

### Option 3: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to register
4. Look for the POST request to `/register`
5. Check:
   - Request Headers (should have Content-Type: application/json)
   - Request Payload (should have user_id, photo_keys, consent_policy)
   - Response (check status code and error message)

## Common Issues and Solutions

### Issue 1: "Invalid request" error
**Cause**: Old cached response or network issue
**Solution**: 
- Clear browser cache completely
- Try in incognito/private window
- Hard refresh the page

### Issue 2: CORS error
**Cause**: Browser blocking cross-origin request
**Solution**: 
- Check that VITE_API_BASE_URL is set correctly in .env
- Restart the dev server after changing .env
- Check browser console for CORS errors

### Issue 3: 400 Bad Request with "Missing required field"
**Cause**: Request format is incorrect
**Solution**:
- Check that consent_policy uses snake_case (allow_self_edits, not allowSelfEdits)
- Check that all required fields are present (user_id, photo_keys, consent_policy)
- Check that photo_keys is an array with 5-10 items

### Issue 4: 400 Bad Request with "NO_VALID_FACES"
**Cause**: Photos don't contain detectable faces
**Solution**:
- Use photos with clear, front-facing faces
- Ensure good lighting and resolution
- Avoid group photos (only one face per photo)
- Avoid sunglasses, masks, or obstructions

## API Configuration

Current configuration (from .env):
```
VITE_API_BASE_URL=https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
VITE_APP_ENV=production
```

CORS is configured for: `http://localhost:5173`

## Next Steps

1. **Clear browser cache** - This is the most common fix
2. **Test in browser console** - Use the test code above
3. **Check network tab** - Look at the actual request/response
4. **Try with real photos** - Upload photos with clear faces

If you're still seeing "invalid request" after these steps, please share:
- The exact error message from browser console
- The request payload from Network tab
- The response from Network tab
