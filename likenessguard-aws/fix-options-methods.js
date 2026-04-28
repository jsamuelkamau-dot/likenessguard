/**
 * Fix OPTIONS methods to not require API key and return CORS headers
 */

const { 
  APIGatewayClient,
  GetResourcesCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  PutMethodResponseCommand,
  PutIntegrationResponseCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';

const client = new APIGatewayClient({ region: REGION });

// CORS headers to return
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': "'*'",
  'Access-Control-Allow-Headers': "'Content-Type,X-API-Key,Authorization,X-Amz-Date'",
  'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
};

async function getResources() {
  const command = new GetResourcesCommand({
    restApiId: API_ID,
    limit: 500
  });
  
  const response = await client.send(command);
  return response.items;
}

async function addOptionsMethod(resourceId, resourcePath) {
  console.log(`\nAdding OPTIONS method to ${resourcePath}...`);
  
  try {
    // Step 1: Create OPTIONS method (no API key required)
    await client.send(new PutMethodCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      authorizationType: 'NONE',
      apiKeyRequired: false
    }));
    console.log(`  ✓ OPTIONS method created (no API key required)`);
    
    // Step 2: Create MOCK integration
    await client.send(new PutIntegrationCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      type: 'MOCK',
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }));
    console.log(`  ✓ MOCK integration created`);
    
    // Step 3: Create method response with CORS headers
    await client.send(new PutMethodResponseCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': false,
        'method.response.header.Access-Control-Allow-Headers': false,
        'method.response.header.Access-Control-Allow-Methods': false
      }
    }));
    console.log(`  ✓ Method response created`);
    
    // Step 4: Create integration response with CORS header values
    await client.send(new PutIntegrationResponseCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-API-Key,Authorization,X-Amz-Date'",
        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
      }
    }));
    console.log(`  ✓ Integration response created with CORS headers`);
    
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
    description: `Fix OPTIONS methods - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(70));
  console.log('FIX OPTIONS METHODS - REMOVE API KEY REQUIREMENT');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  
  try {
    // Get all resources
    console.log('\nFetching API resources...');
    const resources = await getResources();
    console.log(`Found ${resources.length} resources`);
    
    // Find resources that need OPTIONS methods
    const targetPaths = ['/register', '/consent/check', '/consent/update', '/consent/revoke', '/evidence', '/upload/presigned-url'];
    const targetResources = resources.filter(r => targetPaths.includes(r.path));
    
    console.log(`\nTarget resources:`);
    targetResources.forEach(r => console.log(`  - ${r.path} (${r.id})`));
    
    // Add OPTIONS method to each resource
    console.log('\n' + '='.repeat(70));
    console.log('Adding OPTIONS methods...');
    console.log('='.repeat(70));
    
    let successCount = 0;
    for (const resource of targetResources) {
      const success = await addOptionsMethod(resource.id, resource.path);
      if (success) successCount++;
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`OPTIONS methods added: ${successCount}/${targetResources.length}`);
    
    if (successCount > 0) {
      // Deploy the API
      console.log('\n' + '='.repeat(70));
      console.log('Deploying API...');
      console.log('='.repeat(70));
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ OPTIONS METHODS FIX COMPLETE!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`\nWhat was fixed:`);
      console.log(`  - OPTIONS methods no longer require API key`);
      console.log(`  - OPTIONS methods return proper CORS headers`);
      console.log(`  - Preflight requests will now succeed`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment`);
      console.log(`2. Clear browser cache completely`);
      console.log(`3. Try registration again`);
    } else {
      console.log('\n❌ No OPTIONS methods were added successfully');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
