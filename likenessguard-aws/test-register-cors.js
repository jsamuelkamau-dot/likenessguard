/**
 * Test actual registration endpoint with CORS
 */

const https = require('https');

const API_ENDPOINT = 'ol35n8kn4f.execute-api.us-east-1.amazonaws.com';
const PATH = '/v1/register';

console.log('Testing POST /register with CORS...\n');

// First test OPTIONS
console.log('1. Testing OPTIONS preflight...');
const optionsReq = https.request({
  hostname: API_ENDPOINT,
  path: PATH,
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:5173',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type'
  }
}, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   CORS Origin: ${res.headers['access-control-allow-origin']}`);
  console.log(`   CORS Methods: ${res.headers['access-control-allow-methods']}`);
  console.log(`   CORS Headers: ${res.headers['access-control-allow-headers']}`);
  
  if (res.statusCode === 200) {
    console.log('   ✅ OPTIONS preflight successful!\n');
    
    // Now test actual POST
    console.log('2. Testing POST request...');
    const postData = JSON.stringify({
      subject_id: 'test-user-123',
      photos: ['base64encodedphoto1', 'base64encodedphoto2']
    });
    
    const postReq = https.request({
      hostname: API_ENDPOINT,
      path: PATH,
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (postRes) => {
      console.log(`   Status: ${postRes.statusCode}`);
      console.log(`   CORS Origin: ${postRes.headers['access-control-allow-origin']}`);
      
      let body = '';
      postRes.on('data', (chunk) => body += chunk);
      postRes.on('end', () => {
        console.log(`   Response: ${body.substring(0, 200)}...`);
        
        if (postRes.statusCode === 400) {
          console.log('   ✅ POST request successful (400 = validation error, which is expected)');
        } else if (postRes.statusCode === 200) {
          console.log('   ✅ POST request successful!');
        } else {
          console.log('   ❌ Unexpected status code');
        }
      });
    });
    
    postReq.on('error', (error) => {
      console.error('   ❌ POST Error:', error.message);
    });
    
    postReq.write(postData);
    postReq.end();
  } else {
    console.log('   ❌ OPTIONS preflight failed');
  }
});

optionsReq.on('error', (error) => {
  console.error('   ❌ OPTIONS Error:', error.message);
});

optionsReq.end();
