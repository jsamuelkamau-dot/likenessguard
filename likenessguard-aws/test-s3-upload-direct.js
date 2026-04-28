/**
 * Test S3 upload directly to verify presigned URL functionality
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Test configuration
const API_BASE_URL = 'https://ol3sn8kn4f.execute-api.us-east-1.amazonaws.com/v1';
const USER_ID = 'test-user-' + Date.now();

// Create a small test image (1x1 red pixel JPEG)
const testImageBuffer = Buffer.from([
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

async function makeRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

async function testS3Upload() {
  console.log('=== Testing S3 Upload Flow ===\n');
  
  try {
    // Step 1: Get presigned URLs
    console.log('Step 1: Requesting presigned URLs...');
    const presignedResponse = await makeRequest(
      `${API_BASE_URL}/upload-presigned-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      JSON.stringify({
        user_id: USER_ID,
        photo_count: 1
      })
    );
    
    console.log(`Status: ${presignedResponse.statusCode}`);
    
    if (presignedResponse.statusCode !== 200) {
      console.error('Failed to get presigned URLs');
      console.error('Response:', presignedResponse.body);
      return;
    }
    
    const presignedData = JSON.parse(presignedResponse.body);
    console.log('Presigned URL received');
    console.log(`Photo key: ${presignedData.upload_urls[0].photo_key}`);
    console.log(`Expires in: ${presignedData.expires_in} seconds\n`);
    
    // Step 2: Upload to S3
    console.log('Step 2: Uploading to S3...');
    const uploadUrl = presignedData.upload_urls[0].upload_url;
    const photoKey = presignedData.upload_urls[0].photo_key;
    
    const uploadResponse = await makeRequest(
      uploadUrl,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': testImageBuffer.length
        }
      },
      testImageBuffer
    );
    
    console.log(`Upload status: ${uploadResponse.statusCode}`);
    console.log(`Upload headers:`, uploadResponse.headers);
    
    if (uploadResponse.statusCode !== 200) {
      console.error('S3 upload failed');
      console.error('Response body:', uploadResponse.body);
      return;
    }
    
    const etag = uploadResponse.headers.etag;
    if (etag) {
      console.log(`✓ Upload successful! ETag: ${etag}\n`);
    } else {
      console.warn('⚠ Warning: No ETag in response\n');
    }
    
    // Step 3: Verify file exists in S3
    console.log('Step 3: Verifying file in S3...');
    const { execSync } = require('child_process');
    
    try {
      const result = execSync(`aws s3 ls s3://likenessguard-photos-538784191640/${photoKey}`, {
        encoding: 'utf-8'
      });
      console.log('✓ File exists in S3!');
      console.log(result);
    } catch (error) {
      console.error('✗ File NOT found in S3!');
      console.error('This indicates the upload returned 200 OK but S3 did not store the file.');
      console.error('This is typically caused by Content-Type mismatch in presigned URL.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testS3Upload();
