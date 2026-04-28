# CORS Fix - Deployment Instructions

## Issue
The dashboard is getting a CORS error when trying to connect to the API Gateway:
```
Access to fetch has been blocked by CORS policy
```

## Fix Applied
Updated the CloudFormation template to include the correct CORS headers:
- Added `X-API-Key` (capital letters) to allowed headers
- Added `GET` method
- Added `X-Amz-Date` header

## Deployment Steps

### Step 1: Build the SAM Application
```bash
cd likenessguard-aws
sam build
```

### Step 2: Deploy the Updated Configuration
```bash
sam deploy
```

This will update the API Gateway with the new CORS configuration.

### Step 3: Verify Deployment
After deployment completes, the API Gateway will allow requests from `localhost:5173`.

## Alternative: Quick Manual Fix (If You Don't Want to Redeploy)

If you want to test immediately without redeploying:

1. Go to **AWS Console** → **API Gateway**
2. Find `LikenessGuard-API`
3. For EACH resource (`/register`, `/upload/presigned-url`, `/consent`, etc.):
   - Select the resource
   - Click **Actions** → **Enable CORS**
   - Set:
     - **Access-Control-Allow-Origin**: `*`
     - **Access-Control-Allow-Headers**: `Content-Type,X-API-Key,X-Api-Key,Authorization`
     - **Access-Control-Allow-Methods**: `GET,POST,PUT,DELETE,OPTIONS`
   - Click **Enable CORS**
4. Click **Actions** → **Deploy API**
5. Select stage: `v1`
6. Click **Deploy**

## After Deployment

1. Wait 1-2 minutes for the changes to propagate
2. Go back to your dashboard at http://localhost:5173/register
3. Try registration again
4. It should now work!

## Verification

Run this test in browser console after deployment:

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
.then(d => console.log('✅ Success:', d))
.catch(e => console.error('❌ Error:', e));
```

You should see presigned URLs without any CORS error.

---

## Final CORS Fix - Deployment Complete ✅

**Date**: February 20, 2026  
**Time**: 11:35 UTC

### What Was Done:

#### 1. Updated ALL Endpoints with Correct CORS Headers
- `/register` (cp0h58)
- `/upload/presigned-url` (b48e2h)
- `/consent/check` (1g0jzh)
- `/consent/revoke` (3cr9ss)
- `/consent/update` (uklm4d)
- `/evidence` (w0j6hr)

#### 2. Fixed CORS Configuration
- Added `X-API-Key` (capital letters) to `Access-Control-Allow-Headers`
- Added `GET` method to `Access-Control-Allow-Methods`
- Set `Access-Control-Allow-Origin` to `*` (all origins)
- Removed API key requirement from OPTIONS methods (preflight requests should never require auth)

#### 3. Multiple Deployments to Ensure Propagation
- **Deployment 1** (82c5pk): Initial CORS fix for `/upload/presigned-url`
- **Deployment 2** (7zd0hw): Updated all endpoints with correct headers
- **Deployment 3** (fx0w19): Removed API key requirement from OPTIONS methods
- **Deployment 4** (yfuaox): Force deployment to ensure changes propagate

### Final CORS Configuration:
```
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-API-Key
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Origin: *
```

### Verification:
Tested OPTIONS request manually - confirmed working:
```powershell
$headers = @{
  'Origin'='http://localhost:5173'
  'Access-Control-Request-Method'='POST'
  'Access-Control-Request-Headers'='Content-Type,X-API-Key'
}
Invoke-WebRequest -Uri 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/register' `
  -Method OPTIONS -Headers $headers
```

Result: ✅ Returns correct CORS headers

### Next Steps:
1. **Wait 60 seconds** for the latest deployment (yfuaox) to fully propagate
2. **Close all browser tabs** with the dashboard
3. **Open a new incognito/private window**
4. Go to `http://localhost:5173/register`
5. Try registration - should work now!

### Troubleshooting:
If still seeing CORS errors:
1. Check browser console Network tab
2. Look for the OPTIONS preflight request
3. Verify it returns status 200 with CORS headers
4. If OPTIONS succeeds but POST fails, check Lambda function CORS headers

**Status**: ✅ FULLY DEPLOYED  
**Latest Deployment**: yfuaox  
**Deployment Time**: 2026-02-20 11:35:43 UTC  
**API Gateway Stage**: v1
