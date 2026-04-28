/**
 * Update existing OPTIONS methods to not require API key
 */

const { 
  APIGatewayClient,
  GetResourcesCommand,
  UpdateMethodCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';

const client = new APIGatewayClient({ region: REGION });

async function getResources() {
  const command = new GetResourcesCommand({
    restApiId: API_ID,
    limit: 500
  });
  
  const response = await client.send(command);
  return response.items;
}

async function updateOptionsMethod(resourceId, resourcePath) {
  console.log(`\nUpdating OPTIONS method for ${resourcePath}...`);
  
  try {
    // Update OPTIONS method to not require API key
    await client.send(new UpdateMethodCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      patchOperations: [
        {
          op: 'replace',
          path: '/apiKeyRequired',
          value: 'false'
        }
      ]
    }));
    console.log(`  ✓ API key requirement removed`);
    
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
    description: `Update OPTIONS methods - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(70));
  console.log('UPDATE OPTIONS METHODS - REMOVE API KEY REQUIREMENT');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  
  try {
    // Get all resources
    console.log('\nFetching API resources...');
    const resources = await getResources();
    console.log(`Found ${resources.length} resources`);
    
    // Find resources that need OPTIONS methods updated
    const targetPaths = ['/register', '/consent/check', '/consent/update', '/consent/revoke', '/evidence', '/upload/presigned-url'];
    const targetResources = resources.filter(r => targetPaths.includes(r.path));
    
    console.log(`\nTarget resources:`);
    targetResources.forEach(r => console.log(`  - ${r.path} (${r.id})`));
    
    // Update OPTIONS method for each resource
    console.log('\n' + '='.repeat(70));
    console.log('Updating OPTIONS methods...');
    console.log('='.repeat(70));
    
    let successCount = 0;
    for (const resource of targetResources) {
      const success = await updateOptionsMethod(resource.id, resource.path);
      if (success) successCount++;
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`OPTIONS methods updated: ${successCount}/${targetResources.length}`);
    
    if (successCount > 0) {
      // Deploy the API
      console.log('\n' + '='.repeat(70));
      console.log('Deploying API...');
      console.log('='.repeat(70));
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ OPTIONS METHODS UPDATE COMPLETE!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`\nWhat was fixed:`);
      console.log(`  - OPTIONS methods no longer require API key`);
      console.log(`  - Preflight requests will now succeed`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment`);
      console.log(`2. Clear browser cache (Ctrl+Shift+Delete)`);
      console.log(`3. Close ALL browser windows`);
      console.log(`4. Open NEW incognito window`);
      console.log(`5. Go to http://localhost:5173/register`);
      console.log(`6. Try registration - should work now!`);
    } else {
      console.log('\n❌ No OPTIONS methods were updated successfully');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
