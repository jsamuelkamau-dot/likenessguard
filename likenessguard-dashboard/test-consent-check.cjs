const fs = require('fs');
const path = require('path');

// Test consent check functionality
async function testConsentCheck() {
    console.log('Testing Consent Check API...');
    
    // Read API endpoint from .env file
    const envPath = path.join(__dirname, '.env');
    let apiEndpoint = 'https://your-api-gateway-url.amazonaws.com/prod';
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/VITE_API_BASE_URL=(.+)/);
        if (match) {
            apiEndpoint = match[1].trim();
        }
    }
    
    console.log(`Using API endpoint: ${apiEndpoint}`);
    
    // Create a small test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==';
    
    const requestBody = {
        referenceImage: testImageBase64,
        usageType: 'GENERAL_GENERATION',
        requesterId: 'test-requester'
    };
    
    try {
        const response = await fetch(`${apiEndpoint}/consent/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`Response body: ${responseText}`);
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log('✅ Consent check successful!');
            console.log(`Decision: ${result.decision}`);
            console.log(`Reason: ${result.reason_code}`);
            console.log(`Timestamp: ${result.timestamp}`);
            if (result.likeness_id) {
                console.log(`Likeness ID: ${result.likeness_id}`);
                console.log(`Similarity Score: ${result.similarity_score}`);
            }
        } else {
            console.log('❌ Consent check failed');
            try {
                const errorResult = JSON.parse(responseText);
                console.log(`Error: ${errorResult.error?.message || 'Unknown error'}`);
            } catch (e) {
                console.log(`Raw error: ${responseText}`);
            }
        }
        
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
}

// Run the test
testConsentCheck().catch(console.error);