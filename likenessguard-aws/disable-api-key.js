/**
 * Disable API key requirement for the API
 */

const { 
  APIGatewayClient,
  UpdateRestApiCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';

const client = new APIGatewayClient({ region: REGION });

async function disableApiKey() {
  console.log('Disabling API key requirement...');
  
  try {
    await client.send(new UpdateRestApiCommand({
      restApiId: API_ID,
      patchOperations: [
        {
          op: 'replace',
          path: '/apiKeySource',
          value: 'HEADER'
        }
      ]
    }));
    console.log('✓ API key source set to HEADER');
    return true;
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
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
  console.log('DISABLE API KEY REQUIREMENT (TEMPORARY FOR TESTING)');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  console.log(`\nNOTE: This is temporary to test CORS. Re-enable API key later.`);
  
  try {
    const success = await disableApiKey();
    
    if (success) {
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ API KEY REQUIREMENT DISABLED!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds`);
      console.log(`2. Remove API key from dashboard .env file (comment it out)`);
      console.log(`3. Restart dev server`);
      console.log(`4. Try registration`);
      console.log(`\nIMPORTANT: This removes API protection. Re-enable after testing!`);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
