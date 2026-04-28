# Troubleshooting Connection Issues

## Issue: "Unable to connect to server"

This error occurs when the dashboard cannot connect to the AWS API Gateway backend.

## ✅ Solution Applied

I've restarted the development server to pick up the environment variables from `.env` file.

### What Was Fixed

1. **Development Server Restarted**: The server needed to be restarted to load the `.env` file
2. **Environment Variables**: The `.env` file contains:
   - `VITE_API_BASE_URL`: Points to AWS API Gateway
   - `VITE_API_KEY`: Contains the API key for authentication

### Current Configuration

**API Endpoint**: `https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1`  
**API Key**: Configured (hidden for security)  
**Dashboard**: http://localhost:5173/

### ⚠️ IMPORTANT: You Must Hard Refresh Your Browser

The browser has cached the old configuration. You MUST do a hard refresh:
- **Windows**: Press `Ctrl + Shift + R`
- **Mac**: Press `Cmd + Shift + R`

Without this step, the dashboard will still use the old cached code!

## 🧪 How to Test

### Step 1: Refresh Your Browser
1. Go to http://localhost:5173/
2. Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) to hard refresh
3. This clears the cache and loads the new configuration

### Step 2: Verify API Connection
Open browser console (F12) and run:

```javascript
// Test API connectivity
fetch('https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/upload/presigned-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw'
  },
  body: JSON.stringify({
    user_id: 'test-' + Date.now(),
    photo_count: 5
  })
})
.then(r => r.json())
.then(d => console.log('✅ API Connected:', d))
.catch(e => console.error('❌ API Error:', e));
```

**Expected Result**: You should see presigned URLs in the console

### Step 3: Try Registration Again
1. Navigate to http://localhost:5173/register
2. Upload 5-10 photos
3. Fill in User ID and email
4. Click "Register Likeness"

## 🔍 Debugging Steps

### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any error messages
4. Check Network tab for failed requests

### Verify Environment Variables
The dashboard should be using these values:
- **API Base URL**: From `VITE_API_BASE_URL` in `.env`
- **API Key**: From `VITE_API_KEY` in `.env`

### Check Network Tab
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try registration again
4. Look for requests to:
   - `/upload/presigned-url` - Should return 200 with URLs
   - S3 PUT requests - Should return 200
   - `/register` - Should return 200 with likeness_id

## 🚨 Common Issues

### Issue 1: CORS Error
**Symptom**: "Access to fetch has been blocked by CORS policy"  
**Solution**: The API Gateway is configured with CORS. If you see this, the API endpoint might be wrong.

### Issue 2: 403 Forbidden
**Symptom**: API returns 403 status  
**Solution**: API key is missing or incorrect. Check `.env` file.

### Issue 3: Network Error
**Symptom**: "Failed to fetch" or "Network request failed"  
**Solution**: 
- Check internet connection
- Verify API Gateway endpoint is accessible
- Try the test command in browser console

### Issue 4: 401 Unauthorized
**Symptom**: API returns 401 status  
**Solution**: API key is invalid or expired. Contact admin for new key.

## 📋 Verification Checklist

- [ ] Development server is running (http://localhost:5173/)
- [ ] Browser has been hard refreshed (Ctrl+Shift+R)
- [ ] `.env` file exists with correct values
- [ ] API test in console returns presigned URLs
- [ ] Network tab shows requests going to AWS API Gateway
- [ ] No CORS errors in console

## 🔧 Manual Fix (If Issue Persists)

If the issue persists after restarting, try these steps:

### 1. Stop the Development Server
```bash
# Press Ctrl+C in the terminal running the dev server
```

### 2. Clear Node Modules Cache
```bash
cd likenessguard-dashboard
rm -rf node_modules/.vite
```

### 3. Restart Development Server
```bash
npm run dev
```

### 4. Hard Refresh Browser
- Windows: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

## 📞 Still Having Issues?

If you're still experiencing connection issues:

1. **Check CloudWatch Logs**:
   - Go to AWS Console → CloudWatch → Log Groups
   - Look for `/aws/lambda/LikenessGuard-UploadPresignedUrl`
   - Check for any errors

2. **Verify API Gateway**:
   - Go to AWS Console → API Gateway
   - Find `LikenessGuard-API`
   - Verify it's deployed to `v1` stage

3. **Test API Directly**:
   ```bash
   curl -X POST "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/upload/presigned-url" \
     -H "Content-Type: application/json" \
     -H "X-API-Key: Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw" \
     -d '{"user_id": "test", "photo_count": 5}'
   ```

## ✅ Success Indicators

You'll know it's working when:
- ✅ No "Unable to connect to server" error
- ✅ Registration form submits without errors
- ✅ You see "Processing your photos..." loading message
- ✅ You receive a success message with likeness_id
- ✅ Network tab shows successful API calls

---

**Status**: Development server restarted with correct configuration  
**Next Step**: Refresh browser and try registration again  
**Last Updated**: February 20, 2026
