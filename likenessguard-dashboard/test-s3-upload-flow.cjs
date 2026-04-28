/**
 * Test S3 Upload Flow with Content-Type Fix
 * 
 * This script tests:
 * 1. Getting presigned URLs from the backend
 * 2. Uploading files to S3 with correct Content-Type header
 * 3. Verifying files are actually persisted in S3
 * 4. Testing registration with S3 keys
 */

const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const API_BASE_URL = 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1';
const TEST_USER_ID = `test-user-${Date.now()}`;

// Create a simple test image (1x1 red pixel JPEG)
const createTestImage = () => {
  // Minimal JPEG file (1x1 red pixel)
  const jpegData = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0x37, 0xFF, 0xD9
  ]);
  return jpegData;
};

// Make HTTPS request
const makeRequest = (url, options, body = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    req.end();
  });
};

// Upload file to S3 using presigned URL
const uploadToS3 = (presignedUrl, fileData) => {
  return new Promise((resolve, reject) => {
    const url = new URL(presignedUrl);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',  // MUST match presigned URL ContentType
        'Content-Length': fileData.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`  S3 Upload Response: ${res.statusCode} ${res.statusMessage}`);
        console.log(`  ETag: ${res.headers.etag || 'N/A'}`);
        resolve({ 
          statusCode: res.statusCode, 
          headers: res.headers, 
          body: data,
          etag: res.headers.etag 
        });
      });
    });
    
    req.on('error', reject);
    req.write(fileData);
    req.end();
  });
};

// Check if file exists in S3
const checkS3File = (photoKey) => {
  try {
    const bucket = 'likenessguard-photos-538784191640';
    const result = execSync(`aws s3 ls s3://${bucket}/${photoKey}`, { encoding: 'utf8' });
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
};

// Main test flow
const runTest = async () => {
  console.log('=== S3 Upload Flow Test with Content-Type Fix ===\n');
  
  try {
    // Step 1: Get presigned URLs
    console.log('Step 1: Getting presigned URLs...');
    const presignedResponse = await makeRequest(
      `${API_BASE_URL}/upload/presigned-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      {
        user_id: TEST_USER_ID,
        photo_count: 5
      }
    );
    
    if (presignedResponse.statusCode !== 200) {
      console.error('Failed to get presigned URLs:', presignedResponse.body);
      return;
    }
    
    console.log(`✓ Got ${presignedResponse.body.upload_urls.length} presigned URLs`);
    console.log(`  Expires in: ${presignedResponse.body.expires_in} seconds\n`);
    
    // Step 2: Upload files to S3
    console.log('Step 2: Uploading files to S3...');
    const testImage = createTestImage();
    const uploadResults = [];
    
    for (let i = 0; i < presignedResponse.body.upload_urls.length; i++) {
      const { photo_key, upload_url } = presignedResponse.body.upload_urls[i];
      console.log(`  Uploading file ${i + 1}/${presignedResponse.body.upload_urls.length}...`);
      console.log(`  Photo key: ${photo_key}`);
      
      const uploadResult = await uploadToS3(upload_url, testImage);
      uploadResults.push({ photo_key, ...uploadResult });
      
      if (uploadResult.statusCode === 200) {
        console.log(`  ✓ Upload successful\n`);
      } else {
        console.log(`  ✗ Upload failed: ${uploadResult.statusCode}\n`);
      }
    }
    
    // Step 3: Wait for S3 consistency
    console.log('Step 3: Waiting for S3 consistency (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✓ Wait complete\n');
    
    // Step 4: Verify files exist in S3
    console.log('Step 4: Verifying files in S3...');
    let filesFound = 0;
    
    for (const result of uploadResults) {
      const exists = checkS3File(result.photo_key);
      if (exists) {
        console.log(`  ✓ File exists: ${result.photo_key}`);
        filesFound++;
      } else {
        console.log(`  ✗ File NOT found: ${result.photo_key}`);
      }
    }
    
    console.log(`\n  Total files found: ${filesFound}/${uploadResults.length}\n`);
    
    if (filesFound === 0) {
      console.error('ERROR: No files were persisted in S3!');
      console.error('This indicates the Content-Type fix did not work.');
      return;
    }
    
    if (filesFound < uploadResults.length) {
      console.warn('WARNING: Some files were not persisted in S3.');
      console.warn('This may indicate intermittent issues.');
    }
    
    if (filesFound === uploadResults.length) {
      console.log('✓ SUCCESS: All files were persisted in S3!');
      console.log('✓ Content-Type fix is working correctly!\n');
      
      // Step 5: Test registration with S3 keys
      console.log('Step 5: Testing registration with S3 keys...');
      const photoKeys = uploadResults.map(r => r.photo_key);
      
      const registrationResponse = await makeRequest(
        `${API_BASE_URL}/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        {
          user_id: TEST_USER_ID,
          photo_keys: photoKeys,
          consent_policy: {
            allow_self_edits: true,
            deny_third_party_edits: true,
            deny_face_swaps: true,
            deny_sexualized_content: true,
            deny_impersonation: true,
            deny_political_use: true
          },
          email: 'test@example.com'
        }
      );
      
      console.log(`  Registration response: ${registrationResponse.statusCode}`);
      console.log(`  Response body:`, JSON.stringify(registrationResponse.body, null, 2));
      
      if (registrationResponse.statusCode === 200) {
        console.log('\n✓ Registration successful!');
        console.log(`  Likeness ID: ${registrationResponse.body.likeness_id}`);
      } else {
        console.log('\n✗ Registration failed');
        console.log('  This is expected if test images don\'t contain valid faces');
      }
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error(error);
  }
};

runTest();
