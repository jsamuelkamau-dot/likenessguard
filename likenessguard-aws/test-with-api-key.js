/**
 * Test API Request with API Key
 */

const https = require('https');

const API_ENDPOINT = 'ol35n8kn4f.execute-api.us-east-1.amazonaws.com';
const PATH = '/v1/register';
const API_KEY = 'Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw';

console.log('Testing API request WITH API key...\n');

const testData = JSON.stringify({
  name: "Test User",
  email: "test@example.com",
  photo_count: 5,
  photos: ["base64data1", "base64data2", "base64data3", "base64data4", "base64data5"],
  consent_policy: {
    commercial_use: true,
    ai_training: false,
    public_display: true
  }
});

const options = {
  hostname: API_ENDPOINT,
  path: PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData),
    'X-API-Key': API_KEY,
    'Origin': 'http://localhost:5173'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('\nResponse Headers:');
  
  const corsHeaders = {};
  Object.keys(res.headers).forEach(key => {
    if (key.toLowerCase().includes('access-control')) {
      corsHeaders[key] = res.headers[key];
    }
  });
  
  if (Object.keys(corsHeaders).length > 0) {
    console.log('✅ CORS Headers Found:');
    Object.keys(corsHeaders).forEach(key => {
      console.log(`  ${key}: ${corsHeaders[key]}`);
    });
  } else {
    console.log('❌ No CORS headers found');
  }
  
  console.log('\nAll Response Headers:');
  Object.keys(res.headers).forEach(key => {
    console.log(`  ${key}: ${res.headers[key]}`);
  });
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(testData);
req.end();
