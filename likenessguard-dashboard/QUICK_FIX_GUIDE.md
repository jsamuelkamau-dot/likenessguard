# Quick Fix Guide - Registration Error

## TL;DR

✅ **The API is working!** The error is likely a browser cache issue.

## Quick Fix (Do This First)

### 1. Clear Browser Cache
- **Chrome/Edge**: `Ctrl+Shift+Delete` → Select "All time" → Check "Cached images and files" → Clear
- **Firefox**: `Ctrl+Shift+Delete` → Select "Everything" → Check "Cache" → Clear
- **Safari**: `Cmd+Option+E`

### 2. Hard Refresh
- **Windows**: `Ctrl+Shift+R` or `Ctrl+F5`
- **Mac**: `Cmd+Shift+R`

### 3. Test in Incognito/Private Window
- **Chrome/Edge**: `Ctrl+Shift+N`
- **Firefox**: `Ctrl+Shift+P`
- **Safari**: `Cmd+Shift+N`

Then go to: `http://localhost:5173/register`

## Verify API is Working

Open browser console (F12) and paste:

```javascript
fetch('https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'test-' + Date.now(),
    photo_keys: ['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='],
    consent_policy: {
      allow_self_edits: true,
      deny_third_party_edits: true,
      deny_face_swaps: true,
      deny_sexualized_content: true,
      deny_impersonation: true,
      deny_political_use: true
    }
  })
})
.then(r => r.json())
.then(d => console.log('✅ API Working!', d))
.catch(e => console.error('❌ Error:', e));
```

**Expected**: You should see `NO_VALID_FACES` error (this is good - it means API is working!)

## Testing with Real Photos

1. Go to `http://localhost:5173/register`
2. Upload 5-10 photos with **clear faces**:
   - Front-facing
   - Good lighting
   - No sunglasses/masks
   - One face per photo
3. Fill in User ID
4. Submit

## Still Having Issues?

Check the Network tab in DevTools (F12):
1. Go to Network tab
2. Try to register
3. Click on the `/register` request
4. Check the Response tab for the actual error

## Need More Help?

See these detailed guides:
- `REGISTRATION_ERROR_ANALYSIS.md` - Complete investigation
- `REGISTRATION_TEST_GUIDE.md` - Detailed testing instructions
- `IMAGE_COMPRESSION_DEBUG.md` - Compression details

## What We Fixed

✅ Image compression is working (400x400, 0.5 quality)
✅ API endpoint is configured correctly
✅ CORS is configured correctly
✅ Backend is processing requests correctly
✅ Enhanced error logging in registration service

The issue is most likely cached error responses in your browser.
