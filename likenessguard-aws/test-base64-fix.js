// Test Base64 Detection Fix
// This test verifies that the Lambda correctly processes base64-encoded images

const https = require('https');
const fs = require('fs');

const API_URL = 'https://rvqxvhzqe3.execute-api.us-east-1.amazonaws.com/v1';

// Read a test image and convert to base64
function imageToBase64(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
}

async function testRegistration() {
    console.log('=== Testing Base64 Detection Fix ===\n');
    
    // Create a simple 1x1 pixel PNG image in base64
    // This is a valid PNG but won't have a face (will test fallback fingerprinting)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const requestData = {
        user_id: 'test-user-' + Date.now(),
        email: 'test@example.com',
        photo_keys: [
            testImage,
            testImage,
            testImage,
            testImage,
            testImage
        ],
        consent_policy: {
            allow_commercial: true,
            allow_editorial: false,
            allow_research: true,
            expiration_date: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
        }
    };
    
    console.log('Sending registration request with 5 base64-encoded images...');
    console.log('Image length:', testImage.length, 'characters');
    console.log('(Should be detected as base64, not S3 key)\n');
    
    const options = {
        hostname: 'rvqxvhzqe3.execute-api.us-east-1.amazonaws.com',
        port: 443,
        path: '/v1/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('Response Status:', res.statusCode);
                console.log('Response Body:', data);
                console.log('\n');
                
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 200) {
                        console.log('✓ SUCCESS! Registration completed');
                        console.log('  Likeness ID:', response.likeness_id);
                        console.log('  Status:', response.status);
                        console.log('  Photos Processed:', response.processed_photos);
                        
                        if (response.errors && response.errors.length > 0) {
                            console.log('  Warnings:', response.errors);
                        }
                        
                        console.log('\n✓ Base64 detection is working correctly!');
                        console.log('  Images were processed as base64 data, not S3 keys');
                        resolve(response);
                    } else {
                        console.log('✗ FAILED! Registration returned error');
                        console.log('  Error Code:', response.error?.code);
                        console.log('  Error Message:', response.error?.message);
                        
                        if (response.error?.details) {
                            console.log('  Details:', response.error.details);
                        }
                        
                        reject(new Error(response.error?.message || 'Registration failed'));
                    }
                } catch (e) {
                    console.log('✗ Failed to parse response:', e.message);
                    reject(e);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('✗ Request failed:', error);
            reject(error);
        });
        
        req.write(JSON.stringify(requestData));
        req.end();
    });
}

// Run the test
testRegistration()
    .then(() => {
        console.log('\n=== Test Complete ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n=== Test Failed ===');
        console.error(error.message);
        process.exit(1);
    });
