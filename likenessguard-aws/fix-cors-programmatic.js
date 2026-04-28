/**
 * Programmatic CORS Fix for API Gateway
 * 
 * This script uses AWS SDK to directly update API Gateway CORS configuration.
 * It's more reliable than CLI commands and ensures proper configuration.
 */

const { 
  APIGatewayClient, 
  GetResourcesCommand,
  UpdateMethodCommand,
  UpdateIntegrationCommand,
  PutMethodResponseCommand,
  PutIntegrationResponseCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';

const client = new APIGatewayClient({ region: REGION });

// CORS headers configuration
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

async function setupOptionsMethod(resourceId, resourcePath) {
  console.log(`\nSetting up OPTIONS method for ${resourcePath}...`);
  
  try {
    // 1. Update OPTIONS method to remove API key requirement
    await client.send(new UpdateMethodCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      patchOperations: [
        {
          op: 'replace',
          path: '/apiKeyRequired',
          value: 'false'
        },
        {
          op: 'replace',
          path: '/authorizationType',
          value: 'NONE'
        }
      ]
    }));
    console.log(`  ✓ OPTIONS method updated (no auth, no API key)`);
    
    // 2. Update OPTIONS integration response with correct CORS headers
    await client.send(new PutIntegrationResponseCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
        'method.response.header.Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'],
        'method.response.header.Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods']
      },
      responseTemplates: {
        'application/json': ''
      }
    }));
    console.log(`  ✓ Integration response updated with CORS headers`);
    
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
    description: `Programmatic CORS fix - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(60));
  console.log('API Gateway CORS Fix - Programmatic Approach');
  console.log('='.repeat(60));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  
  try {
    // Get all resources
    console.log('\nFetching API resources...');
    const resources = await getResources();
    console.log(`Found ${resources.length} resources`);
    
    // Filter resources that need CORS (exclude root)
    const targetResources = resources.filter(r => 
      r.path !== '/' && 
      (r.path === '/register' || 
       r.path === '/upload/presigned-url' ||
       r.path === '/consent/check' ||
       r.path === '/consent/update' ||
       r.path === '/consent/revoke' ||
       r.path === '/evidence')
    );
    
    console.log(`\nTarget resources for CORS setup:`);
    targetResources.forEach(r => console.log(`  - ${r.path} (${r.id})`));
    
    // Setup OPTIONS for each resource
    let successCount = 0;
    for (const resource of targetResources) {
      const success = await setupOptionsMethod(resource.id, resource.path);
      if (success) successCount++;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CORS setup complete: ${successCount}/${targetResources.length} successful`);
    
    if (successCount > 0) {
      // Deploy the API
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(60)}`);
      console.log('✅ CORS FIX COMPLETE!');
      console.log(`${'='.repeat(60)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`API Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment to propagate`);
      console.log(`2. Clear browser cache or use incognito mode`);
      console.log(`3. Try registration again at http://localhost:5173/register`);
    } else {
      console.log('\n❌ No resources were updated successfully');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
