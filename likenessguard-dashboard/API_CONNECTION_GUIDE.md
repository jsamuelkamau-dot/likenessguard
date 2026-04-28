# LikenessGuard Dashboard - AWS Backend Connection Guide

## Connection Status ✅

The LikenessGuard dashboard has been successfully configured to connect to your deployed AWS backend!

### Configuration Details

- **API Endpoint**: `https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1`
- **API Key**: Configured (Ce5cjrmdnR...)
- **Environment**: Production
- **Dashboard URL**: http://localhost:5173/

### Files Updated

1. **`.env`** - Environment configuration with API endpoint and key
2. **`src/services/api-client.ts`** - Updated to include X-API-Key header
3. **`src/config/api-config.ts`** - Configured to use environment variables

## Testing the Connection

### Method 1: Browser Console Test

1. Open the dashboard at http://localhost:5173/
2. Open browser developer tools (F12)
3. Go to the Console tab
4. Run this test code:

```javascript
// Test API connection
const testAPI = async () => {
  const API_BASE_URL = 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1';
  const API_KEY = 'Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw';
  
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        user_id: 'test-user-' + Date.now(),
        photo_keys: ['test1.jpg', 'test2.jpg', 'test3.jpg', 'test4.jpg', 'test5.jpg'],
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
    });
    
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.status === 400) {
      console.log('✅ API connection successful! (400 error expected - photos don\'t exist in S3)');
    } else {
      console.log('Response status:', response.status);
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
};

testAPI();
```

### Method 2: Using Dashboard Features

1. Navigate to the Registration page
2. Try uploading some test images
3. The API calls will be made automatically

### Expected Behavior

- **Registration**: Should return a 400 error (photos don't exist in S3) - this confirms the API is reachable
- **Consent Check**: Should return a response (may be UNKNOWN for test data)

## Current Limitations

The AWS backend expects photos to be uploaded to S3 first, then S3 keys are passed to the registration endpoint. The dashboard currently sends base64 images, which won't work with the current backend implementation.

### Next Steps to Complete Integration

1. **Option A**: Modify the dashboard to upload images to S3 first
   - Add S3 upload functionality to the dashboard
   - Get presigned URLs from a new Lambda function
   - Upload images to S3, then call registration with S3 keys

2. **Option B**: Modify the AWS backend to accept base64 images
   - Update the registration Lambda to accept base64 images
   - Handle S3 upload within the Lambda function
   - This requires backend code changes

3. **Option C**: Create a hybrid approach
   - Add an upload endpoint to the AWS backend
   - Dashboard uploads images first, gets S3 keys
   - Then calls registration with the S3 keys

## Verification Commands

You can also test the API using curl:

```bash
# Test registration endpoint
curl -X POST "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw" \
  -d '{
    "user_id": "test-user-123",
    "photo_keys": ["test1.jpg", "test2.jpg", "test3.jpg", "test4.jpg", "test5.jpg"],
    "consent_policy": {
      "allow_self_edits": true,
      "deny_third_party_edits": true,
      "deny_face_swaps": true,
      "deny_sexualized_content": true,
      "deny_impersonation": true,
      "deny_political_use": true
    },
    "email": "test@example.com"
  }'

# Test consent check endpoint
curl -X POST "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/consent/check" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw" \
  -d '{
    "reference_image": "test-base64-image-data",
    "usage_type": "SELF_EDIT",
    "requester_id": "test-platform-123"
  }'
```

## Summary

✅ **Dashboard is configured and ready to connect to AWS backend**
✅ **API endpoint and authentication are properly set up**
⚠️ **Image upload workflow needs to be implemented for full functionality**

The connection infrastructure is in place. The next step is implementing the S3 upload workflow to make the registration feature fully functional.