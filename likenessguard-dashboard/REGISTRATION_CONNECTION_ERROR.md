# Registration Connection Error - Final Fix

## Current Status
✅ **Dashboard**: Loading correctly  
✅ **Registration Form**: Displaying properly  
❌ **API Connection**: "Unable to connect to server" error

## The Issue
When you click "Register Likeness", the dashboard cannot connect to the AWS API Gateway backend.

## Root Cause
This is a **network/API connectivity issue**, not a code issue. The dashboard is trying to connect to:
```
https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
```

## Possible Causes

### 1. API Key Issue (Most Likely)
The API key might be incorrect or expired.

### 2. CORS Configuration
The API Gateway might not have CORS properly configured for your local development.

### 3. API Gateway Not Responding
The backend might be down or not deployed.

## Immediate Test

Open your browser console (F12) and run this test:

```javascript
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
.then(d => console.log('✅ API Response:', d))
.catch(e => console.error('❌ API Error:', e));
```

## Expected Results

### If API is Working
You should see:
```json
{
  "upload_urls": [
    { "photo_key": "...", "upload_url": "..." },
    ...
  ],
  "expires_in": 300
}
```

### If API Key is Wrong
You'll see:
```
403 Forbidden
```

### If CORS is the Issue
You'll see:
```
Access to fetch has been blocked by CORS policy
```

### If API is Down
You'll see:
```
Failed to fetch
```

## Solutions Based on Test Results

### Solution 1: API Key Issue (403 Error)
The API key in `.env` might be wrong. You need to:
1. Go to AWS Console → API Gateway
2. Find your API: `LikenessGuard-API`
3. Go to API Keys section
4. Get the correct API key
5. Update `.env` file with the new key
6. Restart dev server

### Solution 2: CORS Issue
The API Gateway needs CORS headers. Check:
1. AWS Console → API Gateway → `LikenessGuard-API`
2. Go to Resources
3. Select OPTIONS method
4. Verify CORS is enabled with:
   - Access-Control-Allow-Origin: `*` or `http://localhost:5173`
   - Access-Control-Allow-Headers: `Content-Type,X-API-Key`
   - Access-Control-Allow-Methods: `GET,POST,PUT,DELETE,OPTIONS`

### Solution 3: API Gateway Not Deployed
The API might not be deployed to the `v1` stage:
1. AWS Console → API Gateway → `LikenessGuard-API`
2. Click "Deploy API"
3. Select stage: `v1`
4. Deploy

### Solution 4: Wrong API Endpoint
Verify the API Gateway endpoint:
1. AWS Console → API Gateway → `LikenessGuard-API`
2. Go to Stages → `v1`
3. Copy the "Invoke URL"
4. Update `.env` file if different:
   ```
   VITE_API_BASE_URL=<your-invoke-url>
   ```

## Quick Verification Steps

### 1. Check API Gateway Status
```bash
# Test with curl (Windows CMD)
curl -X POST "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/upload/presigned-url" ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw" ^
  -d "{\"user_id\": \"test\", \"photo_count\": 5}"
```

### 2. Check Network Tab
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try registration again
4. Look for the request to `/upload/presigned-url`
5. Check the response:
   - **200**: API is working, but something else is wrong
   - **403**: API key issue
   - **404**: Endpoint not found
   - **500**: Server error
   - **Failed**: Network/CORS issue

### 3. Check Console Errors
Look for specific error messages in the console that might give more details.

## Current Configuration

### Environment Variables (.env)
```
VITE_API_BASE_URL=https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
VITE_API_KEY=Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw
VITE_APP_ENV=production
```

### API Client Configuration
- Base URL: From `VITE_API_BASE_URL`
- API Key: From `VITE_API_KEY` (sent as `X-API-Key` header)
- Timeout: 30 seconds
- Retry: 3 attempts with exponential backoff

## Next Steps

1. **Run the test command** in browser console (see above)
2. **Share the result** - tell me what you see
3. Based on the result, we'll apply the appropriate fix

## Alternative: Use Mock Mode

If you want to test the dashboard without the backend, I can create a mock mode that simulates the API responses. This would let you see the full registration flow without needing the AWS backend.

Would you like me to:
- A) Help debug the API connection (recommended)
- B) Create a mock mode for testing

---

**Status**: Dashboard working, API connection failing  
**Action Required**: Run test command and share results  
**Last Updated**: February 20, 2026
