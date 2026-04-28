/**
 * Test OPTIONS (preflight) request
 */

const https = require('https');

const API_ENDPOINT = 'ol35n8kn4f.execute-api.us-east-1.amazonaws.com';
const PATH = '/v1/register';

console.log('Testing OPTIONS preflight request...\n');

const options = {
  hostname: API_ENDPOINT,
  path: PATH,
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:5173',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type,x-api-key'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('\nResponse Headers:');
  
  Object.keys(res.headers).forEach(key => {
    console.log(`  ${key}: ${res.headers[key]}`);
  });
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    if (body) {
      console.log('\nResponse Body:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
