/**
 * Test script to debug registration endpoint
 * Tests with proper request format to identify the exact error
 */

const https = require('https');

const API_BASE = 'ol35n8kn4f.execute-api.us-east-1.amazonaws.com';
const API_PATH = '/v1/register';

// Create a minimal valid request
const requestBody = {
  user_id: 'test-user-123',
  photo_keys: [
    // 5 small base64 test images (1x1 pixel red PNG)
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
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
};

const postData = JSON.stringify(requestBody);

const options = {
  hostname: API_BASE,
  port: 443,
  path: API_PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Origin': 'http://localhost:5173'
  }
};

console.log('Testing registration endpoint...');
console.log('URL:', `https://${API_BASE}${API_PATH}`);
console.log('Request body size:', Buffer.byteLength(postData), 'bytes');
console.log('Photo count:', requestBody.photo_keys.length);
console.log('');

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(postData);
req.end();
