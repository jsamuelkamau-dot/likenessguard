# Missing Endpoints Analysis

## Issue
The Consent Policy and Consent Check pages are showing "Unable to connect to server" errors.

## Root Cause
1. **Dashboard API Configuration**: The dashboard was configured to use `http://localhost:3000/api` but the actual AWS API Gateway endpoint is `https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1`

2. **Missing GET /consent Endpoint**: The dashboard's `getPolicy()` function tries to GET from `/consent` to retrieve a consent policy, but this endpoint doesn't exist in the API Gateway.

## Current API Endpoints
```
✅ POST /register - Registration Lambda
✅ POST /consent/check - ConsentCheck Lambda
✅ PUT /consent/update - ConsentUpdate Lambda  
✅ DELETE /consent/revoke - ConsentRevoke Lambda
✅ GET /evidence - EvidenceRetrieval Lambda
✅ POST /upload/presigned-url - UploadPresignedUrl Lambda
❌ GET /consent - MISSING (needed for retrieving consent policy)
```

## Fixes Applied

### 1. Dashboard API Configuration
Created `.env` file with correct API endpoint:
```
VITE_API_BASE_URL=https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
```

### 2. Missing GET /consent Endpoint
Need to either:
- **Option A**: Add a new Lambda function for GET /consent
- **Option B**: Modify the dashboard to use the existing consent data from registration

## Recommended Solution

**Option B** is simpler for the prototype. The dashboard should:
1. Store the full consent policy in localStorage after registration (not just likeness_id)
2. Use the stored policy for display/editing
3. Only call the API when updating the policy

This avoids the need for a GET endpoint and reduces API calls.

## Implementation Plan

1. ✅ Update dashboard `.env` with correct API endpoint
2. Update `ConsentPolicyPage` to:
   - Store full consent policy in localStorage after registration
   - Read policy from localStorage instead of calling GET /consent
   - Only call API for updates (PUT /consent/update)
3. Restart dashboard development server to pick up new environment variables

## Alternative: Implement GET /consent Endpoint

If we want to implement the GET endpoint properly:

1. Create `src/lambdas/consent_get/handler.py`:
   - Accept likeness_id as query parameter
   - Query DynamoDB for consent record
   - Return consent policy

2. Update `infrastructure/template.yaml`:
   - Add ConsentGetFunction Lambda
   - Add GET method to /consent resource
   - Wire up Lambda integration

3. Deploy the updated stack

## Next Steps
1. Implement Option B (localStorage-based policy management)
2. Test Consent Policy page
3. Test Consent Check page
4. Verify all dashboard features work end-to-end
