/**
 * Set specific CORS origin to http://localhost:5173
 */

const { 
  APIGatewayClient,
  GetResourcesCommand,
  PutIntegrationResponseCommand,
  PutGatewayResponseCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';
const ALLOWED_ORIGIN = 'http://localhost:5173';

const client = new APIGatewayClient({ region: REGION });

// Gateway response types that need CORS headers
const RESPONSE_TYPES = [
  'DEFAULT_4XX',
  'DEFAULT_5XX',
  'UNAUTHORIZED',
  'ACCESS_DENIED',
  'RESOURCE_NOT_FOUND',
  'THROTTLED',
  'BAD_REQUEST_BODY',
  'BAD_REQUEST_PARAMETERS',
  'EXPIRED_TOKEN',
  'INVALID_API_KEY',
  'MISSING_AUTHENTICATION_TOKEN',
  'QUOTA_EXCEEDED',
  'INTEGRATION_FAILURE',
  'INTEGRATION_TIMEOUT'
];

async function getResources() {
  const command = new GetResourcesCommand({
    restApiId: API_ID,
    limit: 500
  });
  
  const response = await client.send(command);
  return response.items;
}

async function updateOptionsIntegrationResponse(resourceId, resourcePath) {
  console.log(`\nUpdating OPTIONS integration response for ${resourcePath}...`);
  
  try {
    await client.send(new PutIntegrationResponseCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': `'${ALLOWED_ORIGIN}'`,
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-API-Key,Authorization,X-Amz-Date'",
        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
      }
    }));
    console.log(`  ✓ Updated to allow ${ALLOWED_ORIGIN}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function updateGatewayResponse(responseType) {
  console.log(`\nUpdating ${responseType}...`);
  
  try {
    await client.send(new PutGatewayResponseCommand({
      restApiId: API_ID,
      responseType: responseType,
      responseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Origin': `'${ALLOWED_ORIGIN}'`,
        'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,X-API-Key,Authorization,X-Amz-Date'",
        'gatewayresponse.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
      }
    }));
    
    console.log(`  ✓ Updated to allow ${ALLOWED_ORIGIN}`);
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
    description: `Set specific CORS origin - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(70));
  console.log('SET SPECIFIC CORS ORIGIN');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  console.log(`Allowed Origin: ${ALLOWED_ORIGIN}`);
  
  try {
    // Get all resources
    console.log('\nFetching API resources...');
    const resources = await getResources();
    
    // Find target resources
    const targetPaths = ['/register', '/consent/check', '/consent/update', '/consent/revoke', '/evidence', '/upload/presigned-url'];
    const targetResources = resources.filter(r => targetPaths.includes(r.path));
    
    console.log(`\nTarget resources: ${targetResources.length}`);
    
    // Update OPTIONS integration responses
    console.log('\n' + '='.repeat(70));
    console.log('Updating OPTIONS integration responses...');
    console.log('='.repeat(70));
    
    let optionsCount = 0;
    for (const resource of targetResources) {
      const success = await updateOptionsIntegrationResponse(resource.id, resource.path);
      if (success) optionsCount++;
    }
    
    console.log(`\nOPTIONS responses updated: ${optionsCount}/${targetResources.length}`);
    
    // Update Gateway Responses
    console.log('\n' + '='.repeat(70));
    console.log('Updating Gateway Responses...');
    console.log('='.repeat(70));
    
    let gatewayCount = 0;
    for (const responseType of RESPONSE_TYPES) {
      const success = await updateGatewayResponse(responseType);
      if (success) gatewayCount++;
    }
    
    console.log(`\nGateway Responses updated: ${gatewayCount}/${RESPONSE_TYPES.length}`);
    
    if (optionsCount > 0 || gatewayCount > 0) {
      // Deploy the API
      console.log('\n' + '='.repeat(70));
      console.log('Deploying API...');
      console.log('='.repeat(70));
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ SPECIFIC CORS ORIGIN SET!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`\nWhat was changed:`);
      console.log(`  - CORS origin changed from '*' to '${ALLOWED_ORIGIN}'`);
      console.log(`  - ${optionsCount} OPTIONS methods updated`);
      console.log(`  - ${gatewayCount} Gateway Responses updated`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment`);
      console.log(`2. Clear browser cache completely`);
      console.log(`3. Close ALL browser windows`);
      console.log(`4. Open NEW incognito window`);
      console.log(`5. Go to ${ALLOWED_ORIGIN}/register`);
      console.log(`6. Try registration - should work now!`);
    } else {
      console.log('\n❌ No resources were updated successfully');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
