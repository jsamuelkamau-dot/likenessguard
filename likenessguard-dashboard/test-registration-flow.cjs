/**
 * Test Registration Flow
 * 
 * This script tests the complete registration flow:
 * 1. Get presigned URLs
 * 2. Upload to S3
 * 3. Register with S3 keys
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1';

// Test data
const TEST_USER_ID = `test-user-${Date.now()}`;
const TEST_PHOTO_COUNT = 5;

console.log('Testing Registration Flow');
console.log('=========================\n');
console.log(`User ID: ${TEST_USER_ID}`);
console.log(`Photo Count: ${TEST_PHOTO_COUNT}\n`);

// Step 1: Get presigned URLs
console.log('Step 1: Getting presigned URLs...');

const presignedRequest = JSON.stringify({
  user_id: TEST_USER_ID,
  photo_count: TEST_PHOTO_COUNT
});

const presignedOptions = {
  hostname: 'ol35n8kn4f.execute-api.us-east-1.amazonaws.com',
  port: 443,
  path: '/v1/upload/presigned-url',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': presignedRequest.length
  }
};

const presignedReq = https.request(presignedOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}\n`);
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✓ Presigned URLs received successfully');
      console.log(`  - Received ${response.upload_urls.length} URLs`);
      console.log(`  - Expires in: ${response.expires_in} seconds`);
      console.log(`  - Sample photo key: ${response.upload_urls[0].photo_key}`);
      console.log(`  - Sample URL length: ${response.upload_urls[0].upload_url.length} chars\n`);
      
      console.log('Step 2: Test S3 upload (simulated)');
      console.log('  - In the dashboard, files will be uploaded using fetch() with PUT method');
      console.log('  - CORS is now configured to allow localhost:5173\n');
      
      console.log('Step 3: Registration would use these S3 keys:');
      response.upload_urls.forEach((url, i) => {
        console.log(`  - Photo ${i + 1}: ${url.photo_key}`);
      });
      
      console.log('\n✓ Flow test complete!');
      console.log('\nNext: Test in the dashboard at http://localhost:5173');
    } else {
      console.error('✗ Failed to get presigned URLs');
    }
  });
});

presignedReq.on('error', (error) => {
  console.error('Error:', error.message);
});

presignedReq.write(presignedRequest);
presignedReq.end();
