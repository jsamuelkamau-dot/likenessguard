const fs = require('fs');
const path = require('path');

// Test all dashboard API endpoints
async function testAllEndpoints() {
    console.log('Testing all LikenessGuard API endpoints...');
    
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
    console.log('');
    
    // Test 1: Registration endpoint
    console.log('1. Testing Registration endpoint...');
    await testRegistration(apiEndpoint);
    console.log('');
    
    // Test 2: Consent Check endpoint
    console.log('2. Testing Consent Check endpoint...');
    await testConsentCheck(apiEndpoint);
    console.log('');
    
    // Test 3: Consent Get endpoint (will fail without valid likeness_id)
    console.log('3. Testing Consent Get endpoint...');
    await testConsentGet(apiEndpoint);
    console.log('');
    
    // Test 4: Evidence Retrieval endpoint
    console.log('4. Testing Evidence Retrieval endpoint...');
    await testEvidenceRetrieval(apiEndpoint);
    console.log('');
    
    console.log('All endpoint tests completed!');
}

async function testRegistration(apiEndpoint) {
    const testImageBase64 = createTestImage();
    
    const requestBody = {
        photos: [testImageBase64],
        consent_policy: {
            allow_self_edits: true,
            deny_third_party_edits: false,
            deny_face_swaps: true,
            deny_sexualized_content: true,
            deny_impersonation: true,
            deny_political_use: false
        }
    };
    
    try {
        const response = await fetch(`${apiEndpoint}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`   Status: ${response.status}`);
        const responseText = await response.text();
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log(`   ✅ Registration successful! Likeness ID: ${result.likeness_id}`);
        } else {
            console.log(`   ❌ Registration failed`);
            try {
                const errorResult = JSON.parse(responseText);
                console.log(`   Error: ${errorResult.error?.message || 'Unknown error'}`);
            } catch (e) {
                console.log(`   Raw error: ${responseText.substring(0, 200)}...`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Network error: ${error.message}`);
    }
}

async function testConsentCheck(apiEndpoint) {
    const testImageBase64 = createTestImage();
    
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
        
        console.log(`   Status: ${response.status}`);
        const responseText = await response.text();
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log(`   ✅ Consent check successful! Decision: ${result.decision}, Reason: ${result.reason_code}`);
        } else {
            console.log(`   ❌ Consent check failed`);
            try {
                const errorResult = JSON.parse(responseText);
                console.log(`   Error: ${errorResult.error?.message || 'Unknown error'}`);
            } catch (e) {
                console.log(`   Raw error: ${responseText.substring(0, 200)}...`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Network error: ${error.message}`);
    }
}

async function testConsentGet(apiEndpoint) {
    try {
        const response = await fetch(`${apiEndpoint}/consent?likeness_id=test-likeness-id`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log(`   Status: ${response.status}`);
        const responseText = await response.text();
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log(`   ✅ Consent get successful!`);
        } else {
            console.log(`   ❌ Consent get failed (expected - no valid likeness_id)`);
            try {
                const errorResult = JSON.parse(responseText);
                console.log(`   Error: ${errorResult.error?.message || 'Unknown error'}`);
            } catch (e) {
                console.log(`   Raw error: ${responseText.substring(0, 200)}...`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Network error: ${error.message}`);
    }
}

async function testEvidenceRetrieval(apiEndpoint) {
    try {
        const response = await fetch(`${apiEndpoint}/evidence?likeness_id=test-likeness-id`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log(`   Status: ${response.status}`);
        const responseText = await response.text();
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log(`   ✅ Evidence retrieval successful! Found ${result.evidence?.length || 0} records`);
        } else {
            console.log(`   ❌ Evidence retrieval failed (expected - no valid likeness_id)`);
            try {
                const errorResult = JSON.parse(responseText);
                console.log(`   Error: ${errorResult.error?.message || 'Unknown error'}`);
            } catch (e) {
                console.log(`   Raw error: ${responseText.substring(0, 200)}...`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Network error: ${error.message}`);
    }
}

function createTestImage() {
    // Create a simple 100x100 PNG with a solid color
    const zlib = require('zlib');
    const width = 100;
    const height = 100;
    
    // PNG header
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    
    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0, 0, 0, 13]), // length
        Buffer.from('IHDR'),
        ihdrData,
        Buffer.from([ihdrCrc >> 24, (ihdrCrc >> 16) & 0xFF, (ihdrCrc >> 8) & 0xFF, ihdrCrc & 0xFF])
    ]);
    
    // Simple pixel data (solid red)
    const pixelData = Buffer.alloc(width * height * 3);
    for (let i = 0; i < pixelData.length; i += 3) {
        pixelData[i] = 255;     // Red
        pixelData[i + 1] = 0;   // Green
        pixelData[i + 2] = 0;   // Blue
    }
    
    // Add filter bytes
    const filteredData = Buffer.alloc(height * (width * 3 + 1));
    for (let y = 0; y < height; y++) {
        filteredData[y * (width * 3 + 1)] = 0; // filter type
        pixelData.copy(filteredData, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
    }
    
    const compressedData = zlib.deflateSync(filteredData);
    
    const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressedData]));
    const idatChunk = Buffer.concat([
        Buffer.from([(compressedData.length >> 24) & 0xFF, (compressedData.length >> 16) & 0xFF, (compressedData.length >> 8) & 0xFF, compressedData.length & 0xFF]),
        Buffer.from('IDAT'),
        compressedData,
        Buffer.from([idatCrc >> 24, (idatCrc >> 16) & 0xFF, (idatCrc >> 8) & 0xFF, idatCrc & 0xFF])
    ]);
    
    // IEND chunk
    const iendCrc = crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0, 0, 0, 0]),
        Buffer.from('IEND'),
        Buffer.from([iendCrc >> 24, (iendCrc >> 16) & 0xFF, (iendCrc >> 8) & 0xFF, iendCrc & 0xFF])
    ]);
    
    const pngBuffer = Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
    return pngBuffer.toString('base64');
}

function crc32(data) {
    const crcTable = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[i] = c;
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Run the test
testAllEndpoints().catch(console.error);