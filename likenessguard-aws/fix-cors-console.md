# CORS Fix - Manual AWS Console Method

The API Gateway CLI updates aren't working reliably. Please follow these steps in the AWS Console:

## Steps to Fix CORS in AWS Console:

1. **Open AWS Console** → Go to **API Gateway**

2. **Find your API**: `LikenessGuard-API` (ID: ol35n8kn4f)

3. **For the `/register` resource**:
   - Click on `/register` in the left panel
   - Click **Actions** → **Enable CORS**
   - Set the following:
     - **Access-Control-Allow-Origin**: `*`
     - **Access-Control-Allow-Headers**: `Content-Type,X-API-Key,Authorization`
     - **Access-Control-Allow-Methods**: `POST,OPTIONS`
   - Click **Enable CORS and replace existing CORS headers**
   - Click **Yes, replace existing values**

4. **Deploy the API**:
   - Click **Actions** → **Deploy API**
   - **Deployment stage**: `v1`
   - **Deployment description**: `Fix CORS for register endpoint`
   - Click **Deploy**

5. **Wait 30 seconds** then try registration again

## Why This Works:
The AWS Console's "Enable CORS" feature automatically:
- Creates/updates the OPTIONS method
- Sets correct integration responses
- Sets correct method responses
- Removes API key requirement from OPTIONS
- Deploys changes immediately

This is more reliable than CLI commands which can have timing/caching issues.
