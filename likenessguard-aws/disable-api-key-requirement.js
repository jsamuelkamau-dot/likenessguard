/**
 * Disable API key requirement for all methods
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

async function disableApiKeyForMethod(resourceId, httpMethod, resourcePath) {
  console.log(`\nDisabling API key for ${httpMethod} ${resourcePath}...`);
  
  try {
    await client.send(new UpdateMethodCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: httpMethod,
      patchOperations: [
        {
          op: 'replace',
          path: '/apiKeyRequired',
          value: 'false'
        }
      ]
    }));
    console.log(`  ✓ API key disabled`);
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
    description: `Disable API key requirement - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(70));
  console.log('DISABLE API KEY REQUIREMENT');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  
  try {
    // Get all resources
    console.log('\nFetching API resources...');
    const resources = await client.send(new GetResourcesCommand({
      restApiId: API_ID,
      limit: 500
    }));
    
    console.log(`Found ${resources.items.length} resources`);
    
    // Disable API key for all methods
    console.log('\n' + '='.repeat(70));
    console.log('Disabling API key requirement for all methods...');
    console.log('='.repeat(70));
    
    let updateCount = 0;
    for (const resource of resources.items) {
      if (resource.resourceMethods) {
        for (const method of Object.keys(resource.resourceMethods)) {
          const success = await disableApiKeyForMethod(resource.id, method, resource.path);
          if (success) updateCount++;
        }
      }
    }
    
    console.log(`\nMethods updated: ${updateCount}`);
    
    if (updateCount > 0) {
      // Deploy the API
      console.log('\n' + '='.repeat(70));
      console.log('Deploying API...');
      console.log('='.repeat(70));
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ API KEY REQUIREMENT DISABLED!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`\nWhat was changed:`);
      console.log(`  - API key requirement disabled for ${updateCount} methods`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment`);
      console.log(`2. Test registration at http://localhost:5173/register`);
      console.log(`3. Registration should work without API key!`);
    } else {
      console.log('\n❌ No methods were updated successfully');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
