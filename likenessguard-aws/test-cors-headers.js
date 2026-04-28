/**
 * Test CORS Headers on API Gateway Error Responses
 */

const https = require('https');

const API_ENDPOINT = 'ol35n8kn4f.execute-api.us-east-1.amazonaws.com';
const PATH = '/v1/register';

console.log('Testing CORS headers on error response...\n');

const options = {
  hostname: API_ENDPOINT,
  path: PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
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

req.end();
