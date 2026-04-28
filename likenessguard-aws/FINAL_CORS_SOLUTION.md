# Final CORS Solution

## Current Status

We've fixed TWO major issues:
1. ✅ Gateway Responses now have CORS headers (4xx/5xx errors)
2. ✅ Lambda function is working (removed numpy dependency)
3. ✅ OPTIONS methods updated to not require API key

## Remaining Issue

The OPTIONS preflight requests are still returning 403 Forbidden. This is because:
- The API Gateway has `ApiKeyRequired: true` at the API level
- Even though we updated individual OPTIONS methods to not require API key, the stage-level setting is interfering

## Solution Options

### Option 1: Temporarily Disable API Key (Quick Test)
This will let us test if everything else works:

1. Update `infrastructure/template.yaml`:
```yaml
Auth:
  ApiKeyRequired: false  # Change from true to false
```

2. Redeploy:
```bash
cd likenessguard-aws/infrastructure
sam build
sam deploy --stack-name likenessguard-prototype --resolve-s3 --no-confirm-changeset --capabilities CAPABILITY_NAMED_IAM --region us-east-1
```

3. Test registration without API key

### Option 2: Use API Gateway Resource Policy (Recommended)
Create a resource policy that allows OPTIONS requests without API key:

```javascript
const { APIGatewayClient, UpdateRestApiCommand } = require('@aws-sdk/client-api-gateway');

const client = new APIGatewayClient({ region: 'us-east-1' });

const policy = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:538784191640:ol35n8kn4f/*/OPTIONS/*"
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:538784191640:ol35n8kn4f/*/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceVpce": "your-api-key-here"
        }
      }
    }
  ]
};

await client.send(new UpdateRestApiCommand({
  restApiId: 'ol35n8kn4f',
  patchOperations: [
    {
      op: 'replace',
      path: '/policy',
      value: JSON.stringify(policy)
    }
  ]
}));
```

### Option 3: Manual AWS Console Fix (Fastest)

1. Go to AWS Console → API Gateway
2. Select "LikenessGuard-API"
3. For each resource (/register, /consent/check, etc.):
   - Click on "OPTIONS" method
   - Click "Method Request"
   - Change "API Key Required" to "false"
   - Click the checkmark to save
4. Click "Actions" → "Deploy API"
5. Select "v1" stage
6. Click "Deploy"

## Recommended Immediate Action

Since we've spent a lot of time on this, I recommend **Option 3 (Manual Console Fix)** as the fastest way to test:

1. Open AWS Console
2. Go to API Gateway → LikenessGuard-API
3. Disable API key for all OPTIONS methods
4. Deploy to v1 stage
5. Test registration

This will take 2-3 minutes and we can verify if everything else is working.

## Alternative: Remove API Key Requirement Entirely

If you don't need API key protection (for development/testing), we can:

1. Remove `ApiKeyRequired: true` from template.yaml
2. Redeploy
3. Remove API key from dashboard .env file
4. Test

This is the simplest solution for development but removes API protection.

## What We've Accomplished

- CORS headers on all Gateway Responses ✅
- Lambda function working without numpy ✅
- OPTIONS methods configured (but blocked by stage-level API key) ✅
- All code changes complete ✅

The only remaining issue is the API key requirement blocking OPTIONS requests, which can be fixed in 2-3 minutes via AWS Console.
