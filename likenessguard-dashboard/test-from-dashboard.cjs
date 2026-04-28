/**
 * Test script to simulate what the dashboard is sending
 * Run this from the dashboard directory to test the exact request
 */

const axios = require('axios');

const API_BASE_URL = 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1';

// Simulate what the dashboard sends
const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const requestBody = {
  user_id: 'test-user-' + Date.now(),
  photo_keys: [testImage, testImage, testImage, testImage, testImage],
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

console.log('Testing registration from dashboard perspective...');
console.log('API Base URL:', API_BASE_URL);
console.log('Request body keys:', Object.keys(requestBody));
console.log('Photo count:', requestBody.photo_keys.length);
console.log('');

axios.post(`${API_BASE_URL}/register`, requestBody, {
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:5173'
  },
  timeout: 30000
})
.then(response => {
  console.log('✅ Success!');
  console.log('Status:', response.status);
  console.log('Data:', JSON.stringify(response.data, null, 2));
})
.catch(error => {
  console.log('❌ Error occurred');
  console.log('Status:', error.response?.status);
  console.log('Status Text:', error.response?.statusText);
  console.log('');
  console.log('Response Data:');
  console.log(JSON.stringify(error.response?.data, null, 2));
  console.log('');
  console.log('Error Message:', error.message);
  
  // Check error structure
  if (error.response?.data) {
    const data = error.response.data;
    console.log('');
    console.log('Error Structure Analysis:');
    console.log('- Has error object:', !!data.error);
    console.log('- Has error.message:', !!data.error?.message);
    console.log('- Has error.code:', !!data.error?.code);
    console.log('- Has error.details:', !!data.error?.details);
    
    if (data.error) {
      console.log('');
      console.log('Extracted Error Info:');
      console.log('- Code:', data.error.code);
      console.log('- Message:', data.error.message);
      console.log('- Details:', data.error.details);
    }
  }
});
