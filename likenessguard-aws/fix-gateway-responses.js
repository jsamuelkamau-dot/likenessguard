/**
 * Fix API Gateway Error Responses to Include CORS Headers
 * 
 * This fixes 4xx/5xx Gateway Responses that don't have CORS headers.
 * This is the REAL issue - error responses from API Gateway itself
 * (not Lambda) don't include CORS headers.
 */

const { 
  APIGatewayClient, 
  PutGatewayResponseCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';

const client = new APIGatewayClient({ region: REGION });

// CORS headers to add to ALL gateway responses
const CORS_HEADERS = {
  'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
  'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,X-API-Key,Authorization,X-Amz-Date'",
  'gatewayresponse.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
};

// Gateway response types that need CORS headers
const RESPONSE_TYPES = [
  'DEFAULT_4XX',           // All 4xx errors
  'DEFAULT_5XX',           // All 5xx errors
  'UNAUTHORIZED',          // 401
  'ACCESS_DENIED',         // 403
  'RESOURCE_NOT_FOUND',    // 404
  'REQUEST_TOO_LARGE',     // 413
  'THROTTLED',             // 429
  'BAD_REQUEST_BODY',      // 400
  'BAD_REQUEST_PARAMETERS',// 400
  'EXPIRED_TOKEN',         // 403
  'INVALID_API_KEY',       // 403
  'MISSING_AUTHENTICATION_TOKEN', // 403
  'QUOTA_EXCEEDED',        // 429
  'INTEGRATION_FAILURE',   // 504
  'INTEGRATION_TIMEOUT'    // 504
];

async function fixGatewayResponse(responseType) {
  console.log(`\nFixing ${responseType}...`);
  
  try {
    await client.send(new PutGatewayResponseCommand({
      restApiId: API_ID,
      responseType: responseType,
      responseParameters: CORS_HEADERS
    }));
    
    console.log(`  ✓ CORS headers added to ${responseType}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function deployApi() {
  console.log(`\nDeploying API to ${STAGE} stage...`);
  
  const command = new CreateDeploymentCommand({
    restApiId: API_ID,
    stageName: STAGE,
    description: `Fix Gateway Responses CORS - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(70));
  console.log('FIX API GATEWAY ERROR RESPONSES - ADD CORS HEADERS');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  console.log(`\nThis fixes 4xx/5xx error responses that don't have CORS headers.`);
  console.log(`Without this, ANY error from API Gateway causes CORS errors.`);
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 1: Adding CORS headers to Gateway Responses...');
    console.log('='.repeat(70));
    
    let successCount = 0;
    
    for (const responseType of RESPONSE_TYPES) {
      const success = await fixGatewayResponse(responseType);
      if (success) successCount++;
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Gateway Responses fixed: ${successCount}/${RESPONSE_TYPES.length}`);
    
    if (successCount > 0) {
      // Deploy the API
      console.log('\n' + '='.repeat(70));
      console.log('STEP 2: Deploying API...');
      console.log('='.repeat(70));
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ GATEWAY RESPONSES CORS FIX COMPLETE!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`API Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}`);
      console.log(`\nWhat was fixed:`);
      console.log(`  - ${successCount} Gateway Response types now include CORS headers`);
      console.log(`  - 4xx/5xx errors from API Gateway will now have CORS headers`);
      console.log(`  - This includes: 401, 403, 404, 429, 500, 502, 503, 504 errors`);
      console.log(`\nWhy this matters:`);
      console.log(`  - Before: ANY API Gateway error → CORS error in browser`);
      console.log(`  - After: API Gateway errors include CORS headers → proper error handling`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment to propagate`);
      console.log(`2. Close ALL browser windows`);
      console.log(`3. Open NEW incognito window`);
      console.log(`4. Go to http://localhost:5173/register`);
      console.log(`5. Try registration - should work now!`);
    } else {
      console.log('\n❌ No Gateway Responses were updated successfully');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
