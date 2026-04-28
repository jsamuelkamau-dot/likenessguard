// Simple API connection test
const API_BASE_URL = 'https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1';
const API_KEY = 'Ce5cjrmdnR9gJeIweS2P05oo3hXj0zvp9iN7AwWw';

async function testAPI() {
    console.log('Testing LikenessGuard API connection...');
    console.log('API Endpoint:', API_BASE_URL);
    console.log('API Key:', API_KEY.substring(0, 8) + '...');

    // Test registration endpoint
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({
                user_id: 'test-user-' + Date.now(),
                photo_keys: ['test1.jpg', 'test2.jpg', 'test3.jpg', 'test4.jpg', 'test5.jpg'],
                consent_policy: {
                    allow_self_edits: true,
                    deny_third_party_edits: true,
                    deny_face_swaps: true,
                    deny_sexualized_content: true,
                    deny_impersonation: true,
                    deny_political_use: true
                },
                email: 'test@example.com'
            })
        });

        console.log('Registration Response Status:', response.status);
        const data = await response.text();
        console.log('Registration Response:', data);
    } catch (error) {
        console.error('Registration Test Error:', error);
    }
}

// Run test if in browser
if (typeof window !== 'undefined') {
    testAPI();
}

// Export for Node.js
if (typeof module !== 'undefined') {
    module.exports = { testAPI };
}