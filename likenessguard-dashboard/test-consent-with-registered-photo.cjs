const fs = require('fs');
const path = require('path');

// Test consent check with a registered user's photo
async function testConsentCheck() {
    console.log('Testing Consent Check API with registered photo...');
    
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
    
    // Ask user for photo path
    console.log('\nPlease provide the path to a photo you used during registration:');
    console.log('(This should be a photo of your face that you uploaded when registering)');
    
    // For testing, we'll use a placeholder - user should replace this
    const photoPath = process.argv[2];
    
    if (!photoPath) {
        console.log('\n❌ Error: Please provide a photo path as an argument');
        console.log('Usage: node test-consent-with-registered-photo.cjs <path-to-photo>');
        console.log('Example: node test-consent-with-registered-photo.cjs C:\\Users\\YourName\\Pictures\\selfie.jpg');
        return;
    }
    
    if (!fs.existsSync(photoPath)) {
        console.log(`\n❌ Error: Photo not found at ${photoPath}`);
        return;
    }
    
    // Read and encode the photo
    const photoBuffer = fs.readFileSync(photoPath);
    const photoBase64 = photoBuffer.toString('base64');
    
    console.log(`\nPhoto loaded: ${photoPath}`);
    console.log(`Photo size: ${(photoBuffer.length / 1024).toFixed(2)} KB`);
    
    const requestBody = {
        referenceImage: photoBase64,
        usageType: 'GENERAL_GENERATION',
        requesterId: 'test-requester'
    };
    
    try {
        console.log('\nSending consent check request...');
        const response = await fetch(`${apiEndpoint}/consent/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`Response status: ${response.status}`);
        
        const responseText = await response.text();
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log('\n✅ Consent check successful!');
            console.log(`Decision: ${result.decision}`);
            console.log(`Reason: ${result.reason_code}`);
            console.log(`Timestamp: ${result.timestamp}`);
            if (result.likeness_id) {
                console.log(`Likeness ID: ${result.likeness_id}`);
                console.log(`Similarity Score: ${result.similarity_score}`);
            }
            
            // Interpret the result
            console.log('\n--- Interpretation ---');
            if (result.decision === 'ALLOW') {
                console.log('✅ The consent check ALLOWED this usage');
                console.log('This means the person in the photo has consented to this type of use');
            } else if (result.decision === 'DENY') {
                console.log('❌ The consent check DENIED this usage');
                console.log('This means the person in the photo has NOT consented to this type of use');
            } else if (result.decision === 'UNKNOWN') {
                if (result.reason_code === 'UNKNOWN_NO_FACE') {
                    console.log('⚠️  No face detected in the photo');
                    console.log('Make sure the photo contains a clear, visible face');
                } else if (result.reason_code === 'UNKNOWN_NO_MATCH') {
                    console.log('⚠️  No matching likeness found');
                    console.log('This person has not registered their likeness in the system');
                }
            }
        } else {
            console.log('\n❌ Consent check failed');
            try {
                const errorResult = JSON.parse(responseText);
                console.log(`Error: ${errorResult.error?.message || 'Unknown error'}`);
                console.log(`Error Code: ${errorResult.error?.code || 'Unknown'}`);
            } catch (e) {
                console.log(`Raw error: ${responseText}`);
            }
        }
        
    } catch (error) {
        console.log('\n❌ Network error:', error.message);
    }
}

// Run the test
testConsentCheck().catch(console.error);
