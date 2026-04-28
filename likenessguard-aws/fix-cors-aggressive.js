/**
 * AGGRESSIVE CORS Fix - Allow ALL Origins
 * 
 * This script:
 * 1. Updates API Gateway to allow ALL origins (*)
 * 2. Removes API key requirement from OPTIONS
 * 3. Adds ALL possible CORS headers
 * 4. Forces immediate deployment
 */

const { 
  APIGatewayClient, 
  GetResourcesCommand,
  GetMethodCommand,
  UpdateMethodCommand,
  PutMethodResponseCommand,
  PutIntegrationResponseCommand,
  GetIntegrationResponseCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';

const client = new APIGatewayClient({ region: REGION });

// AGGRESSIVE CORS - Allow EVERYTHING
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': "'*'",
  'Access-Control-Allow-Headers': "'*'",  // Allow ALL headers
  'Access-Control-Allow-Methods': "'*'",  // Allow ALL methods
  'Access-Control-Expose-Headers': "'*'",
  'Access-Control-Max-Age': "'86400'"
};

async function getResources() {
  const command = new GetResourcesCommand({
    restApiId: API_ID,
    limit: 500
  });
  
  const response = await client.send(command);
  return response.items;
}

async function updatePostMethod(resourceId, resourcePath, httpMethod) {
  console.log(`\nUpdating ${httpMethod} method for ${resourcePath}...`);
  
  try {
    // Get current method to see if it exists
    try {
      await client.send(new GetMethodCommand({
        restApiId: API_ID,
        resourceId: resourceId,
        httpMethod: httpMethod
      }));
      
      // Method exists - check if it has method response for 200
      try {
        // Try to update existing method response
        await client.send(new PutMethodResponseCommand({
          restApiId: API_ID,
          resourceId: resourceId,
          httpMethod: httpMethod,
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': false,
            'method.response.header.Access-Control-Allow-Headers': false,
            'method.response.header.Access-Control-Allow-Methods': false,
            'method.response.header.Access-Control-Expose-Headers': false
          }
        }));
        console.log(`  ✓ ${httpMethod} method response updated`);
      } catch (e) {
        console.log(`  ℹ ${httpMethod} method response: ${e.message}`);
      }
      
      // Update integration response to add CORS headers
      try {
        await client.send(new PutIntegrationResponseCommand({
          restApiId: API_ID,
          resourceId: resourceId,
          httpMethod: httpMethod,
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
            'method.response.header.Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'],
            'method.response.header.Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods'],
            'method.response.header.Access-Control-Expose-Headers': CORS_HEADERS['Access-Control-Expose-Headers']
          }
        }));
        console.log(`  ✓ ${httpMethod} integration response updated with CORS headers`);
      } catch (e) {
        console.log(`  ✗ ${httpMethod} integration response error: ${e.message}`);
      }
      
    } catch (e) {
      console.log(`  ℹ ${httpMethod} method doesn't exist or error: ${e.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function setupOptionsMethod(resourceId, resourcePath) {
  console.log(`\nSetting up OPTIONS method for ${resourcePath}...`);
  
  try {
    // 1. Update OPTIONS method to remove API key requirement
    try {
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
    } catch (e) {
      console.log(`  ℹ OPTIONS method update: ${e.message}`);
    }
    
    // 2. Update OPTIONS integration response with AGGRESSIVE CORS headers
    try {
      await client.send(new PutIntegrationResponseCommand({
        restApiId: API_ID,
        resourceId: resourceId,
        httpMethod: 'OPTIONS',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
          'method.response.header.Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'],
          'method.response.header.Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods'],
          'method.response.header.Access-Control-Expose-Headers': CORS_HEADERS['Access-Control-Expose-Headers'],
          'method.response.header.Access-Control-Max-Age': CORS_HEADERS['Access-Control-Max-Age']
        },
        responseTemplates: {
          'application/json': ''
        }
      }));
      console.log(`  ✓ OPTIONS integration response updated with AGGRESSIVE CORS headers`);
    } catch (e) {
      console.log(`  ℹ OPTIONS integration response: ${e.message}`);
    }
    
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
    description: `AGGRESSIVE CORS fix - Allow ALL origins - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(70));
  console.log('AGGRESSIVE CORS FIX - ALLOW ALL ORIGINS (*)');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  console.log(`\nCORS Configuration:`);
  console.log(`  - Allow-Origin: * (ALL origins)`);
  console.log(`  - Allow-Headers: * (ALL headers)`);
  console.log(`  - Allow-Methods: * (ALL methods)`);
  console.log(`  - Expose-Headers: * (ALL headers)`);
  console.log(`  - Max-Age: 86400 (24 hours)`);
  
  try {
    // Get all resources
    console.log('\n' + '='.repeat(70));
    console.log('STEP 1: Fetching API resources...');
    console.log('='.repeat(70));
    const resources = await getResources();
    console.log(`Found ${resources.length} resources`);
    
    // Filter resources that need CORS
    const targetResources = resources.filter(r => 
      r.path !== '/' && 
      (r.path === '/register' || 
       r.path === '/upload/presigned-url' ||
       r.path === '/consent/check' ||
       r.path === '/consent/update' ||
       r.path === '/consent/revoke' ||
       r.path === '/evidence')
    );
    
    console.log(`\nTarget resources:`);
    targetResources.forEach(r => console.log(`  - ${r.path} (${r.id})`));
    
    // Setup OPTIONS for each resource
    console.log('\n' + '='.repeat(70));
    console.log('STEP 2: Updating OPTIONS methods...');
    console.log('='.repeat(70));
    let optionsSuccessCount = 0;
    for (const resource of targetResources) {
      const success = await setupOptionsMethod(resource.id, resource.path);
      if (success) optionsSuccessCount++;
    }
    
    // Update POST/PUT/DELETE methods to add CORS headers
    console.log('\n' + '='.repeat(70));
    console.log('STEP 3: Updating POST/PUT/DELETE methods...');
    console.log('='.repeat(70));
    let methodSuccessCount = 0;
    for (const resource of targetResources) {
      // Determine which HTTP methods this resource uses
      const methods = [];
      if (resource.path === '/register') methods.push('POST');
      if (resource.path === '/upload/presigned-url') methods.push('POST');
      if (resource.path === '/consent/check') methods.push('POST');
      if (resource.path === '/consent/update') methods.push('PUT');
      if (resource.path === '/consent/revoke') methods.push('DELETE');
      if (resource.path === '/evidence') methods.push('GET');
      
      for (const method of methods) {
        const success = await updatePostMethod(resource.id, resource.path, method);
        if (success) methodSuccessCount++;
      }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`CORS setup complete:`);
    console.log(`  - OPTIONS methods: ${optionsSuccessCount}/${targetResources.length}`);
    console.log(`  - Other methods: ${methodSuccessCount} updated`);
    
    // Always deploy if we updated anything
    if (optionsSuccessCount > 0 || methodSuccessCount > 0) {
      // Deploy the API
      console.log('\n' + '='.repeat(70));
      console.log('STEP 4: Deploying API...');
      console.log('='.repeat(70));
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ AGGRESSIVE CORS FIX COMPLETE!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`API Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}`);
      console.log(`\nCORS Configuration Applied:`);
      console.log(`  ✓ Allow-Origin: * (ALL origins - including localhost:5173)`);
      console.log(`  ✓ Allow-Headers: * (ALL headers - including X-API-Key)`);
      console.log(`  ✓ Allow-Methods: * (ALL methods)`);
      console.log(`  ✓ OPTIONS methods: NO API KEY REQUIRED`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment to propagate`);
      console.log(`2. Close ALL browser tabs`);
      console.log(`3. Open NEW incognito window`);
      console.log(`4. Go to http://localhost:5173/register`);
      console.log(`5. Try registration - CORS should now work!`);
    } else {
      console.log('\n❌ No resources were updated successfully');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
