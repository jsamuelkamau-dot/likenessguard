const https = require('https');

// Create a small test image in base64 (1x1 pixel PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Create test request with 5 identical photos (just for testing)
const requestBody = JSON.stringify({
  user_id: 'test-user-123',
  photo_keys: [
    testImageBase64,
    testImageBase64,
    testImageBase64,
    testImageBase64,
    testImageBase64
  ],
  consent_policy: {
    allow_self_edits: true,
    deny_third_party_edits: true,
    deny_face_swaps: true,
    deny_sexualized_content: true,
    deny_impersonation: true,
    deny_political_use: true
  },
  email: 'test@example.com'
});

const options = {
  hostname: 'ol35n8kn4f.execute-api.us-east-1.amazonaws.com',
  port: 443,
  path: '/v1/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody),
    'Origin': 'http://localhost:5173'
  }
};

console.log('Testing registration with base64 photos...');
console.log('Request body size:', Buffer.byteLength(requestBody), 'bytes');

const req = https.request(options, (res) => {
  console.log('\nResponse Status:', res.statusCode);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(requestBody);
req.end();
