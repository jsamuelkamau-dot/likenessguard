# End-to-End S3 Upload Workflow Test Plan

## Test Execution Date
February 20, 2026

## Test Environment
- **Dashboard**: http://localhost:5173/
- **API Endpoint**: https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
- **S3 Bucket**: likenessguard-photos-538784191640

## Test Scenarios

### 1. Presigned URL Generation Test
**Objective**: Verify the `/upload/presigned-url` endpoint works correctly

**Test Steps**:
1. Send POST request with valid user_id and photo_count (5-10)
2. Verify response contains correct number of upload URLs
3. Verify URLs have proper structure and expiration time
4. Test validation: photo_count < 5 (should fail)
5. Test validation: photo_count > 10 (should fail)

**Expected Results**:
- ✅ Valid requests return 200 with presigned URLs
- ✅ Invalid photo_count returns 400 with error message
- ✅ URLs expire in 300 seconds (5 minutes)

### 2. S3 Direct Upload Test
**Objective**: Verify images can be uploaded directly to S3 using presigned URLs

**Test Steps**:
1. Get presigned URLs from endpoint
2. Create test image blobs (JPEG format)
3. Upload images to S3 using PUT requests
4. Verify successful uploads (200 status)

**Expected Results**:
- ✅ Images upload successfully to S3
- ✅ S3 returns 200 status for successful uploads
- ✅ Images are stored in correct path: `uploads/{user_id}/{timestamp}/{uuid}.jpg`

### 3. Registration with S3 Keys Test
**Objective**: Verify registration works with S3 keys instead of base64

**Test Steps**:
1. Upload 5 images to S3
2. Send registration request with S3 keys
3. Verify registration succeeds
4. Check response contains likeness_id
5. Verify photos are processed and deleted from S3

**Expected Results**:
- ✅ Registration succeeds with S3 keys
- ✅ Likeness_id is generated
- ✅ Photos are processed by Rekognition
- ✅ Photos are deleted from S3 after processing

### 4. Fallback to Base64 Test
**Objective**: Verify system falls back to base64 when S3 upload fails

**Test Steps**:
1. Simulate S3 upload failure (invalid presigned URL)
2. Verify system falls back to base64 encoding
3. Verify registration still succeeds with base64 data

**Expected Results**:
- ✅ System detects S3 upload failure
- ✅ Automatically converts images to base64
- ✅ Registration succeeds with base64 fallback

### 5. Dashboard UI Integration Test
**Objective**: Verify complete workflow through dashboard UI

**Test Steps**:
1. Navigate to Registration page
2. Upload 5-10 test images
3. Fill in user details and consent policy
4. Submit registration form
5. Monitor network tab for API calls
6. Verify success message and likeness_id

**Expected Results**:
- ✅ File upload UI works correctly
- ✅ Presigned URL request is made
- ✅ Images upload to S3
- ✅ Registration completes successfully
- ✅ User receives confirmation with likeness_id

### 6. Error Handling Test
**Objective**: Verify proper error handling for various failure scenarios

**Test Steps**:
1. Test with invalid file types (non-image files)
2. Test with files exceeding size limit (>10MB)
3. Test with insufficient photos (<5)
4. Test with too many photos (>10)
5. Test with network failures

**Expected Results**:
- ✅ Invalid file types are rejected with clear error
- ✅ Oversized files are rejected
- ✅ Photo count validation works correctly
- ✅ Network errors are handled gracefully
- ✅ User receives helpful error messages

### 7. Performance Test
**Objective**: Measure upload performance and compare with base64

**Test Steps**:
1. Upload 5 images using S3 workflow
2. Measure total time from start to registration complete
3. Compare with base64 upload time (if available)

**Expected Results**:
- ✅ S3 upload is faster than base64 for large images
- ✅ Total workflow completes in reasonable time (<30 seconds)
- ✅ No timeout errors

### 8. Security Test
**Objective**: Verify security measures are in place

**Test Steps**:
1. Verify presigned URLs expire after 5 minutes
2. Verify expired URLs cannot be used
3. Verify S3 bucket has proper access controls
4. Verify photos are deleted after processing

**Expected Results**:
- ✅ Expired URLs return 403 Forbidden
- ✅ S3 bucket blocks public access
- ✅ Photos are automatically deleted
- ✅ No sensitive data in URLs or responses

## Test Execution Log

### Test 1: Presigned URL Generation
**Status**: ✅ PASSED
- Valid request (photo_count=5): SUCCESS
- Invalid request (photo_count=3): FAILED as expected with proper error
- Response structure: CORRECT
- Expiration time: 300 seconds (CORRECT)

### Test 2: S3 Direct Upload
**Status**: ⏳ PENDING
- Awaiting execution

### Test 3: Registration with S3 Keys
**Status**: ⏳ PENDING
- Awaiting execution

### Test 4: Fallback to Base64
**Status**: ⏳ PENDING
- Awaiting execution

### Test 5: Dashboard UI Integration
**Status**: ⏳ PENDING
- Awaiting execution

### Test 6: Error Handling
**Status**: ⏳ PENDING
- Awaiting execution

### Test 7: Performance
**Status**: ⏳ PENDING
- Awaiting execution

### Test 8: Security
**Status**: ⏳ PENDING
- Awaiting execution

## Test Results Summary

**Total Tests**: 8
**Passed**: 1
**Failed**: 0
**Pending**: 7

## Next Steps
1. Execute remaining test scenarios
2. Document any issues found
3. Create bug reports for failures
4. Update implementation based on test results
5. Re-test after fixes
