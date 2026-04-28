# Manual CORS Fix - AWS Console (GUARANTEED TO WORK)

## Problem
CORS errors persist despite multiple programmatic fix attempts. The OPTIONS preflight works, but the actual POST/GET/PUT/DELETE requests don't return CORS headers.

## Root Cause
API Gateway is not configured to pass through Lambda response headers properly, OR the integration type is not set to Lambda Proxy.

## Solution: Manual Fix in AWS Console

### Step 1: Open AWS Console
1. Go to https://console.aws.amazon.com/
2. Navigate to **API Gateway**
3. Find and click on **LikenessGuard-API** (ID: ol35n8kn4f)

### Step 2: Fix /register Endpoint

#### 2.1: Check Integration Type
1. Click on `/register` in the left panel
2. Click on **POST** method
3. Click on **Integration Request**
4. Verify **Integration type** is set to **Lambda Function (proxy)**
   - If it says "Lambda Function" (without proxy), this is the problem!
   - You need to change it to Lambda Proxy integration

#### 2.2: Enable Lambda Proxy Integration (if needed)
1. Click on **Integration Request**
2. Check the box for **Use Lambda Proxy integration**
3. Click **Save**

#### 2.3: Enable CORS for /register
1. Select `/register` resource in the left panel
2. Click **Actions** → **Enable CORS**
3. Configure:
   - **Access-Control-Allow-Origin**: `*`
   - **Access-Control-Allow-Headers**: `Content-Type,X-API-Key,Authorization,X-Amz-Date`
   - **Access-Control-Allow-Methods**: `POST,OPTIONS`
4. Click **Enable CORS and replace existing CORS headers**
5. Click **Yes, replace existing values** when prompted

### Step 3: Repeat for ALL Endpoints

Repeat Step 2 for these endpoints:
- `/upload/presigned-url` (POST method)
- `/consent/check` (POST method)
- `/consent/update` (PUT method)
- `/consent/revoke` (DELETE method)
- `/evidence` (GET method)

For each endpoint:
1. Check Lambda Proxy integration is enabled
2. Enable CORS with wildcard settings

### Step 4: Deploy API
1. Click **Actions** → **Deploy API**
2. **Deployment stage**: `v1`
3. **Deployment description**: `Manual CORS fix - Lambda Proxy + CORS`
4. Click **Deploy**

### Step 5: Wait and Test
1. Wait **2 minutes** for deployment to propagate
2. Close ALL browser windows
3. Open a FRESH incognito window
4. Go to http://localhost:5173/register
5. Try registration

## Alternative: Create New API Gateway (Nuclear Option)

If the above doesn't work, the API Gateway configuration might be corrupted. Here's how to create a fresh one:

### Option A: Use AWS Console "Enable CORS" Feature
1. Go to API Gateway console
2. Select your API
3. For EACH resource, click **Actions** → **Enable CORS**
4. Use these settings for ALL resources:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Headers: *
   Access-Control-Allow-Methods: *
   ```
5. Deploy API

### Option B: Redeploy with SAM (if you have access)
```bash
cd likenessguard-aws
sam build
sam deploy --guided
```

During deployment, ensure:
- Lambda Proxy integration is enabled
- CORS is configured in template.yaml

## Verification

After applying the fix, test with this PowerShell command:

```powershell
$headers = @{
    'Content-Type' = 'application/json'
    'X-API-Key' = 'Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw'
    'Origin' = 'http://localhost:5173'
}

$body = @{
    user_id = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    email = "test@example.com"
    photo_keys = @("t1.jpg", "t2.jpg", "t3.jpg", "t4.jpg", "t5.jpg")
    consent_policy = @{
        allow_commercial = $false
        allow_editorial = $true
        allow_research = $true
        expiration_date = $null
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/register' `
    -Method POST -Headers $headers -Body $body -UseBasicParsing
```

Look for `Access-Control-Allow-Origin: *` in the response headers.

## Why This Works

The key issue is that API Gateway needs to be configured to:
1. Use **Lambda Proxy integration** - this passes Lambda response headers through to the client
2. Have **CORS enabled** on each resource - this adds CORS headers to OPTIONS responses
3. Lambda functions already have CORS headers in their code - they just need to be passed through

## If Still Not Working

If CORS still doesn't work after this manual fix:

1. **Check CloudFront**: Is there a CloudFront distribution in front of API Gateway? If yes, you need to configure CloudFront to forward Origin headers and cache CORS responses properly.

2. **Check API Key**: Make sure the API key is correct and not expired.

3. **Check Lambda Logs**: Go to CloudWatch Logs and check `/aws/lambda/LikenessGuard-Registration` to see if requests are reaching the Lambda function.

4. **Contact AWS Support**: At this point, there might be an account-level issue or a bug in API Gateway.

## Summary

The manual AWS Console approach is the most reliable because:
- It uses AWS's built-in "Enable CORS" feature
- It ensures Lambda Proxy integration is enabled
- It creates a fresh deployment
- It bypasses any CLI/SDK caching or timing issues

This should resolve the CORS issue once and for all.
