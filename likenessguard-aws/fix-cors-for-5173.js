const { 
  APIGatewayClient, 
  GetRestApisCommand,
  GetResourcesCommand,
  UpdateIntegrationResponseCommand,
  PutMethodResponseCommand,
  PutIntegrationResponseCommand
} = require('@aws-sdk/client-api-gateway');

const client = new APIGatewayClient({ region: 'us-east-1' });

async function fixCORS() {
  try {
    console.log('Finding API Gateway...');
    
    // Get all APIs
    const apisResponse = await client.send(new GetRestApisCommand({}));
    const api = apisResponse.items.find(api => 
      api.name === 'LikenessGuard-API' || api.name.includes('likenessguard')
    );
    
    if (!api) {
      console.error('API Gateway not found');
      return;
    }
    
    console.log(`Found API: ${api.name} (${api.id})`);
    
    // Get all resources
    const resourcesResponse = await client.send(new GetResourcesCommand({
      restApiId: api.id
    }));
    
    console.log(`Found ${resourcesResponse.items.length} resources`);
    
    // Update CORS headers for all resources
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Credentials': 'false'
    };
    
    for (const resource of resourcesResponse.items) {
      if (resource.resourceMethods) {
        for (const [method, methodData] of Object.entries(resource.resourceMethods)) {
          if (method === 'OPTIONS') continue; // Skip OPTIONS, it's handled separately
          
          try {
            console.log(`Updating ${method} ${resource.path}...`);
            
            // Update integration response
            await client.send(new PutIntegrationResponseCommand({
              restApiId: api.id,
              resourceId: resource.id,
              httpMethod: method,
              statusCode: '200',
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': `'http://localhost:5173'`,
                'method.response.header.Access-Control-Allow-Headers': `'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'`,
                'method.response.header.Access-Control-Allow-Methods': `'GET,POST,PUT,DELETE,OPTIONS'`
              }
            }));
            
            console.log(`✓ Updated ${method} ${resource.path}`);
          } catch (error) {
            if (error.name !== 'NotFoundException') {
              console.error(`Error updating ${method} ${resource.path}:`, error.message);
            }
          }
        }
      }
    }
    
    console.log('\n✅ CORS configuration updated for port 5173');
    console.log('Note: You may need to redeploy the API for changes to take effect');
    console.log('Run: aws apigateway create-deployment --rest-api-id', api.id, '--stage-name v1');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCORS();
