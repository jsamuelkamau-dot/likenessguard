/**
 * Check and Fix Lambda Proxy Integration
 * 
 * This script checks if Lambda Proxy integration is enabled for all endpoints
 * and fixes it if not. This is the KEY to making CORS work.
 */

const { 
  APIGatewayClient, 
  GetResourcesCommand,
  GetMethodCommand,
  GetIntegrationCommand,
  PutIntegrationCommand,
  CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const API_ID = 'ol35n8kn4f';
const REGION = 'us-east-1';
const STAGE = 'v1';
const ACCOUNT_ID = '538784191640'; // From your S3 bucket name

const client = new APIGatewayClient({ region: REGION });

async function getResources() {
  const command = new GetResourcesCommand({
    restApiId: API_ID,
    limit: 500
  });
  
  const response = await client.send(command);
  return response.items;
}

async function checkAndFixIntegration(resourceId, resourcePath, httpMethod, lambdaName) {
  console.log(`\nChecking ${httpMethod} ${resourcePath}...`);
  
  try {
    // Get current integration
    const integration = await client.send(new GetIntegrationCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: httpMethod
    }));
    
    console.log(`  Current integration type: ${integration.type}`);
    console.log(`  URI: ${integration.uri}`);
    
    // Check if it's Lambda Proxy
    const isProxy = integration.uri && integration.uri.includes(':lambda:') && integration.uri.includes('/invocations');
    const hasProxyInType = integration.type === 'AWS_PROXY';
    
    if (hasProxyInType && isProxy) {
      console.log(`  ✓ Lambda Proxy integration already enabled`);
      return false; // No change needed
    }
    
    console.log(`  ✗ Lambda Proxy integration NOT properly configured`);
    console.log(`  → Fixing integration...`);
    
    // Fix: Set up Lambda Proxy integration
    const lambdaArn = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${lambdaName}`;
    const uri = `arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
    
    await client.send(new PutIntegrationCommand({
      restApiId: API_ID,
      resourceId: resourceId,
      httpMethod: httpMethod,
      type: 'AWS_PROXY',
      integrationHttpMethod: 'POST', // Always POST for Lambda
      uri: uri
    }));
    
    console.log(`  ✓ Lambda Proxy integration enabled`);
    return true; // Change made
    
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
    description: `Fix Lambda Proxy integration - ${new Date().toISOString()}`
  });
  
  const response = await client.send(command);
  console.log(`✓ Deployment created: ${response.id}`);
  return response.id;
}

async function main() {
  console.log('='.repeat(70));
  console.log('CHECK AND FIX LAMBDA PROXY INTEGRATION');
  console.log('='.repeat(70));
  console.log(`API ID: ${API_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Stage: ${STAGE}`);
  console.log(`Account ID: ${ACCOUNT_ID}`);
  
  try {
    // Get all resources
    console.log('\n' + '='.repeat(70));
    console.log('STEP 1: Fetching API resources...');
    console.log('='.repeat(70));
    const resources = await getResources();
    console.log(`Found ${resources.length} resources`);
    
    // Define endpoints and their Lambda functions
    const endpoints = [
      { path: '/register', method: 'POST', lambda: 'LikenessGuard-Registration' },
      { path: '/upload/presigned-url', method: 'POST', lambda: 'LikenessGuard-UploadPresignedUrl' },
      { path: '/consent/check', method: 'POST', lambda: 'LikenessGuard-ConsentCheck' },
      { path: '/consent/update', method: 'PUT', lambda: 'LikenessGuard-ConsentUpdate' },
      { path: '/consent/revoke', method: 'DELETE', lambda: 'LikenessGuard-ConsentRevoke' },
      { path: '/evidence', method: 'GET', lambda: 'LikenessGuard-EvidenceRetrieval' }
    ];
    
    console.log('\n' + '='.repeat(70));
    console.log('STEP 2: Checking and fixing integrations...');
    console.log('='.repeat(70));
    
    let changesMade = 0;
    
    for (const endpoint of endpoints) {
      const resource = resources.find(r => r.path === endpoint.path);
      if (!resource) {
        console.log(`\n✗ Resource not found: ${endpoint.path}`);
        continue;
      }
      
      const changed = await checkAndFixIntegration(
        resource.id,
        endpoint.path,
        endpoint.method,
        endpoint.lambda
      );
      
      if (changed) changesMade++;
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Integration check complete: ${changesMade} endpoints fixed`);
    
    if (changesMade > 0) {
      // Deploy the API
      console.log('\n' + '='.repeat(70));
      console.log('STEP 3: Deploying API...');
      console.log('='.repeat(70));
      const deploymentId = await deployApi();
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('✅ LAMBDA PROXY INTEGRATION FIX COMPLETE!');
      console.log(`${'='.repeat(70)}`);
      console.log(`\nDeployment ID: ${deploymentId}`);
      console.log(`API Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}`);
      console.log(`\nWhat was fixed:`);
      console.log(`  - ${changesMade} endpoints now use Lambda Proxy integration`);
      console.log(`  - Lambda response headers (including CORS) will now pass through`);
      console.log(`\nNext steps:`);
      console.log(`1. Wait 30 seconds for deployment to propagate`);
      console.log(`2. Close ALL browser windows`);
      console.log(`3. Open NEW incognito window`);
      console.log(`4. Go to http://localhost:5173/register`);
      console.log(`5. Try registration - CORS should now work!`);
    } else {
      console.log('\n✓ All endpoints already have Lambda Proxy integration enabled');
      console.log('The CORS issue might be something else. Check:');
      console.log('  1. Lambda function code has CORS headers in responses');
      console.log('  2. API Gateway stage is deployed');
      console.log('  3. Browser cache is cleared');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
