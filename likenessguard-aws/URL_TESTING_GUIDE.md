# LikenessGuard URL Testing Guide

## Overview

This guide explains how to test the LikenessGuard system through API URLs after deployment to AWS.

## Prerequisites

Before you can test through URLs, you must:

1. ✅ Deploy the system to AWS (see DEPLOYMENT.md)
2. ✅ Get your API Gateway URLs from deployment output
3. ✅ Have your API key ready
4. ✅ Have test images prepared

## Step 1: Deploy to AWS

### Quick Deployment

```powershell
# Windows PowerShell
cd likenessguard-aws
.\deploy.ps1
```

```bash
# Linux/macOS
cd likenessguard-aws
chmod +x deploy.sh
./deploy.sh
```

### Get Your API URLs

After deployment completes, you'll see output like:

```
Stack Outputs:
┌─────────────────────────┬──────────────────────────────────────────────┐
│ RegistrationApiUrl      │ https://abc123.execute-api.us-east-1...     │
│ ConsentCheckApiUrl      │ https://abc123.execute-api.us-east-1...     │
│ ConsentUpdateApiUrl     │ https://abc123.execute-api.us-east-1...     │
│ ConsentRevokeApiUrl     │ https://abc123.execute-api.us-east-1...     │
│ EvidenceRetrievalApiUrl │ https://abc123.execute-api.us-east-1...     │
│ ApiKey                  │ your-api-key-here                            │
└─────────────────────────┴──────────────────────────────────────────────┘
```

**Save these URLs and the API key!**

## Step 2: Test Using cURL (Command Line)

### Test 1: Health Check (Optional)

```bash
curl -X GET "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/" \
  -H "x-api-key: YOUR_API_KEY"
```

### Test 2: Register a User

First, upload test photos to S3 (or use base64-encoded images):

```bash
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/register" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test@example.com",
    "photo_keys": [
      "s3://your-bucket/photo1.jpg",
      "s3://your-bucket/photo2.jpg",
      "s3://your-bucket/photo3.jpg",
      "s3://your-bucket/photo4.jpg",
      "s3://your-bucket/photo5.jpg"
    ],
    "consent_policy": {
      "allow_self_edits": true,
      "deny_third_party_edits": true,
      "deny_face_swaps": true,
      "deny_sexualized_content": true,
      "deny_impersonation": true,
      "deny_political_use": true
    }
  }'
```

**Expected Response:**
```json
{
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SUCCESS",
  "processed_photos": 5,
  "created_at": 1709481600,
  "message": "Registration successful"
}
```

**Save the `likeness_id` for next tests!**

### Test 3: Check Consent (ALLOW Scenario)

```bash
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/consent/check" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_image": "BASE64_ENCODED_IMAGE_HERE",
    "usage_type": "SELF_EDIT",
    "requester_id": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "decision": "ALLOW",
  "reason_code": "ALLOW_SELF_EDIT",
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "similarity_score": 0.92,
  "timestamp": 1709481600,
  "request_id": "req-123456"
}
```

### Test 4: Check Consent (DENY Scenario)

```bash
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/consent/check" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_image": "BASE64_ENCODED_IMAGE_HERE",
    "usage_type": "THIRD_PARTY_EDIT",
    "requester_id": "someone-else@example.com"
  }'
```

**Expected Response:**
```json
{
  "decision": "DENY",
  "reason_code": "DENY_THIRD_PARTY",
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "similarity_score": 0.92,
  "timestamp": 1709481600,
  "request_id": "req-123457"
}
```

### Test 5: Update Consent Policy

```bash
curl -X PUT "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/consent/update" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
    "consent_policy": {
      "allow_self_edits": true,
      "deny_third_party_edits": false,
      "deny_face_swaps": true,
      "deny_sexualized_content": true,
      "deny_impersonation": true,
      "deny_political_use": false
    }
  }'
```

**Expected Response:**
```json
{
  "status": "SUCCESS",
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "modified_at": 1709481700,
  "message": "Policy updated successfully"
}
```

### Test 6: Revoke Consent

```bash
curl -X DELETE "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/consent/revoke" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "likeness_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected Response:**
```json
{
  "status": "SUCCESS",
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "revoked_at": 1709481800,
  "message": "Consent revoked successfully"
}
```

### Test 7: Retrieve Evidence

```bash
curl -X GET "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod/evidence?likeness_id=550e8400-e29b-41d4-a716-446655440000&limit=10" \
  -H "x-api-key: YOUR_API_KEY"
```

**Expected Response:**
```json
{
  "evidence_records": [
    {
      "query_id": "req-123457",
      "timestamp": 1709481600,
      "decision": "DENY",
      "reason_code": "DENY_THIRD_PARTY",
      "usage_type": "THIRD_PARTY_EDIT",
      "requester_id": "someone-else@example.com",
      "similarity_score": 0.92,
      "metadata": {}
    }
  ],
  "count": 1,
  "next_key": null
}
```

## Step 3: Test Using Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Create a new collection called "LikenessGuard API"
4. Add requests for each endpoint

### Set Environment Variables

Create environment variables in Postman:
- `base_url`: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod`
- `api_key`: `YOUR_API_KEY`
- `likeness_id`: (will be set after registration)

### Request Templates

#### 1. Register User
- **Method**: POST
- **URL**: `{{base_url}}/register`
- **Headers**: 
  - `x-api-key`: `{{api_key}}`
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
```json
{
  "user_id": "test@example.com",
  "photo_keys": [
    "s3://bucket/photo1.jpg",
    "s3://bucket/photo2.jpg",
    "s3://bucket/photo3.jpg",
    "s3://bucket/photo4.jpg",
    "s3://bucket/photo5.jpg"
  ],
  "consent_policy": {
    "allow_self_edits": true,
    "deny_third_party_edits": true,
    "deny_face_swaps": true,
    "deny_sexualized_content": true,
    "deny_impersonation": true,
    "deny_political_use": true
  }
}
```

#### 2. Check Consent
- **Method**: POST
- **URL**: `{{base_url}}/consent/check`
- **Headers**: 
  - `x-api-key`: `{{api_key}}`
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
```json
{
  "reference_image": "BASE64_IMAGE_HERE",
  "usage_type": "THIRD_PARTY_EDIT",
  "requester_id": "someone@example.com"
}
```

## Step 4: Test Using Python Script

Create a file `test_api.py`:

```python
import requests
import base64
import json

# Configuration
BASE_URL = "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod"
API_KEY = "YOUR_API_KEY"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# Test 1: Register User
def test_register():
    url = f"{BASE_URL}/register"
    data = {
        "user_id": "test@example.com",
        "photo_keys": [
            "s3://bucket/photo1.jpg",
            "s3://bucket/photo2.jpg",
            "s3://bucket/photo3.jpg",
            "s3://bucket/photo4.jpg",
            "s3://bucket/photo5.jpg"
        ],
        "consent_policy": {
            "allow_self_edits": True,
            "deny_third_party_edits": True,
            "deny_face_swaps": True,
            "deny_sexualized_content": True,
            "deny_impersonation": True,
            "deny_political_use": True
        }
    }
    
    response = requests.post(url, headers=headers, json=data)
    print(f"Register Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.json().get("likeness_id")

# Test 2: Check Consent
def test_consent_check(likeness_id, image_path):
    url = f"{BASE_URL}/consent/check"
    
    # Load and encode image
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()
    
    data = {
        "reference_image": image_data,
        "usage_type": "THIRD_PARTY_EDIT",
        "requester_id": "someone@example.com"
    }
    
    response = requests.post(url, headers=headers, json=data)
    print(f"Consent Check Status: {response.status_code}")
    print(f"Response: {response.json()}")

# Test 3: Update Policy
def test_update_policy(likeness_id):
    url = f"{BASE_URL}/consent/update"
    data = {
        "likeness_id": likeness_id,
        "consent_policy": {
            "allow_self_edits": True,
            "deny_third_party_edits": False,
            "deny_face_swaps": True,
            "deny_sexualized_content": True,
            "deny_impersonation": True,
            "deny_political_use": False
        }
    }
    
    response = requests.put(url, headers=headers, json=data)
    print(f"Update Policy Status: {response.status_code}")
    print(f"Response: {response.json()}")

# Test 4: Get Evidence
def test_get_evidence(likeness_id):
    url = f"{BASE_URL}/evidence?likeness_id={likeness_id}&limit=10"
    
    response = requests.get(url, headers=headers)
    print(f"Get Evidence Status: {response.status_code}")
    print(f"Response: {response.json()}")

# Run all tests
if __name__ == "__main__":
    print("=== Testing LikenessGuard API ===\n")
    
    # Test registration
    print("1. Testing Registration...")
    likeness_id = test_register()
    print(f"\nLikeness ID: {likeness_id}\n")
    
    # Test consent check
    print("2. Testing Consent Check...")
    test_consent_check(likeness_id, "path/to/test/image.jpg")
    print()
    
    # Test policy update
    print("3. Testing Policy Update...")
    test_update_policy(likeness_id)
    print()
    
    # Test evidence retrieval
    print("4. Testing Evidence Retrieval...")
    test_get_evidence(likeness_id)
    print()
    
    print("=== All Tests Complete ===")
```

Run the script:
```bash
python test_api.py
```

## Step 5: Test Using Web Browser (Simple)

Create an HTML file `test_api.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>LikenessGuard API Tester</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ccc; }
        button { padding: 10px 20px; margin: 5px; }
        textarea { width: 100%; height: 100px; }
        .response { background: #f0f0f0; padding: 10px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>LikenessGuard API Tester</h1>
    
    <div class="section">
        <h2>Configuration</h2>
        <label>API URL:</label>
        <input type="text" id="apiUrl" style="width: 500px;" 
               placeholder="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/Prod">
        <br><br>
        <label>API Key:</label>
        <input type="text" id="apiKey" style="width: 500px;" 
               placeholder="your-api-key-here">
    </div>
    
    <div class="section">
        <h2>Test 1: Register User</h2>
        <button onclick="testRegister()">Register User</button>
        <div id="registerResponse" class="response"></div>
    </div>
    
    <div class="section">
        <h2>Test 2: Check Consent</h2>
        <label>Likeness ID:</label>
        <input type="text" id="likenessId" style="width: 400px;">
        <br><br>
        <button onclick="testConsentCheck()">Check Consent (DENY)</button>
        <div id="consentResponse" class="response"></div>
    </div>
    
    <div class="section">
        <h2>Test 3: Update Policy</h2>
        <button onclick="testUpdatePolicy()">Update Policy</button>
        <div id="updateResponse" class="response"></div>
    </div>
    
    <div class="section">
        <h2>Test 4: Get Evidence</h2>
        <button onclick="testGetEvidence()">Get Evidence</button>
        <div id="evidenceResponse" class="response"></div>
    </div>
    
    <script>
        async function testRegister() {
            const apiUrl = document.getElementById('apiUrl').value;
            const apiKey = document.getElementById('apiKey').value;
            
            const response = await fetch(`${apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: 'test@example.com',
                    photo_keys: [
                        's3://bucket/photo1.jpg',
                        's3://bucket/photo2.jpg',
                        's3://bucket/photo3.jpg',
                        's3://bucket/photo4.jpg',
                        's3://bucket/photo5.jpg'
                    ],
                    consent_policy: {
                        allow_self_edits: true,
                        deny_third_party_edits: true,
                        deny_face_swaps: true,
                        deny_sexualized_content: true,
                        deny_impersonation: true,
                        deny_political_use: true
                    }
                })
            });
            
            const data = await response.json();
            document.getElementById('registerResponse').textContent = 
                JSON.stringify(data, null, 2);
            
            if (data.likeness_id) {
                document.getElementById('likenessId').value = data.likeness_id;
            }
        }
        
        async function testConsentCheck() {
            const apiUrl = document.getElementById('apiUrl').value;
            const apiKey = document.getElementById('apiKey').value;
            const likenessId = document.getElementById('likenessId').value;
            
            const response = await fetch(`${apiUrl}/consent/check`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reference_image: 'BASE64_IMAGE_HERE',
                    usage_type: 'THIRD_PARTY_EDIT',
                    requester_id: 'someone@example.com'
                })
            });
            
            const data = await response.json();
            document.getElementById('consentResponse').textContent = 
                JSON.stringify(data, null, 2);
        }
        
        async function testUpdatePolicy() {
            const apiUrl = document.getElementById('apiUrl').value;
            const apiKey = document.getElementById('apiKey').value;
            const likenessId = document.getElementById('likenessId').value;
            
            const response = await fetch(`${apiUrl}/consent/update`, {
                method: 'PUT',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    likeness_id: likenessId,
                    consent_policy: {
                        allow_self_edits: true,
                        deny_third_party_edits: false,
                        deny_face_swaps: true,
                        deny_sexualized_content: true,
                        deny_impersonation: true,
                        deny_political_use: false
                    }
                })
            });
            
            const data = await response.json();
            document.getElementById('updateResponse').textContent = 
                JSON.stringify(data, null, 2);
        }
        
        async function testGetEvidence() {
            const apiUrl = document.getElementById('apiUrl').value;
            const apiKey = document.getElementById('apiKey').value;
            const likenessId = document.getElementById('likenessId').value;
            
            const response = await fetch(
                `${apiUrl}/evidence?likeness_id=${likenessId}&limit=10`,
                {
                    method: 'GET',
                    headers: {
                        'x-api-key': apiKey
                    }
                }
            );
            
            const data = await response.json();
            document.getElementById('evidenceResponse').textContent = 
                JSON.stringify(data, null, 2);
        }
    </script>
</body>
</html>
```

Open `test_api.html` in your browser and test the API!

## Troubleshooting

### Error: 401 Unauthorized
- Check your API key is correct
- Ensure `x-api-key` header is included

### Error: 403 Forbidden
- Verify your AWS credentials have proper permissions
- Check API Gateway resource policies

### Error: 500 Internal Server Error
- Check CloudWatch logs for Lambda function errors
- Verify DynamoDB tables exist
- Ensure IAM roles have correct permissions

### Error: Timeout
- Increase Lambda function timeout
- Check if Rekognition service is available
- Verify network connectivity

## Monitoring

### View CloudWatch Logs

```bash
# View consent check logs
aws logs tail /aws/lambda/likenessguard-consent-check --follow

# View registration logs
aws logs tail /aws/lambda/likenessguard-registration --follow
```

### Check API Gateway Metrics

```bash
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApiGateway \
    --metric-name Count \
    --dimensions Name=ApiName,Value=likenessguard-api \
    --start-time 2024-03-01T00:00:00Z \
    --end-time 2024-03-02T00:00:00Z \
    --period 3600 \
    --statistics Sum
```

## Next Steps

1. ✅ Deploy to AWS
2. ✅ Get API URLs and key
3. ✅ Test all endpoints
4. ✅ Monitor CloudWatch logs
5. ✅ Check Free Tier usage
6. ✅ Document any issues

## Summary

You now have multiple ways to test the LikenessGuard API through URLs:
- cURL (command line)
- Postman (GUI)
- Python script (automated)
- Web browser (interactive)

Choose the method that works best for you!
