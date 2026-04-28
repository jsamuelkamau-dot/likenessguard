# Deployment Guide — LikenessGuard v2

Deploy the entire LikenessGuard platform to your AWS account with a single command.

---

## Prerequisites

1. **AWS Account** with Bedrock model access enabled in us-east-1:
   - `amazon.nova-pro-v1:0`
   - `amazon.nova-lite-v1:0`
   - `anthropic.claude-3-haiku-20240307-v1:0`
   - `amazon.titan-embed-image-v1`

2. **Tools installed:**
   ```bash
   # AWS CLI v2
   aws --version  # >= 2.x

   # AWS SAM CLI
   sam --version  # >= 1.x

   # Python 3.13+
   python --version

   # Node.js 20+
   node --version
   ```

3. **AWS credentials configured:**
   ```bash
   aws configure
   # Enter your Access Key, Secret Key, region (us-east-1)
   ```

---

## Quick Deploy (One Command)

```bash
make deploy
```

This will:
1. Build all Lambda functions
2. Deploy the full CloudFormation stack (API Gateway, Lambdas, DynamoDB, KMS, S3, CloudFront)
3. Create the OpenSearch Serverless vector collection
4. Output the API endpoint URL

---

## Step-by-Step Deploy

If you prefer to deploy manually:

### 1. Clone and configure

```bash
git clone https://github.com/jsamuelkamau-dot/likenessguard.git
cd likenessguard
cp .env.example .env
# Edit .env with your AWS account ID
```

### 2. Build

```bash
cd likenessguard-aws
sam build --template-file infrastructure/cloudformation-v2.yaml
```

### 3. Deploy infrastructure

```bash
sam deploy \
  --template-file infrastructure/cloudformation-v2.yaml \
  --stack-name likenessguard-v2 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    UseOpenSearch=true \
    BedrockRegion=us-east-1
```

### 4. Create OpenSearch vector index

After the stack deploys, get the OpenSearch endpoint from the outputs:

```bash
# Get the endpoint
aws cloudformation describe-stacks \
  --stack-name likenessguard-v2 \
  --query "Stacks[0].Outputs[?OutputKey=='OpenSearchEndpoint'].OutputValue" \
  --output text

# Create the index
python scripts/deploy_opensearch_index.py \
  --collection-endpoint YOUR_ENDPOINT \
  --region us-east-1
```

### 5. Publish JWKS public key

```bash
# Get the KMS key ARN from stack outputs
aws cloudformation describe-stacks \
  --stack-name likenessguard-v2 \
  --query "Stacks[0].Outputs[?OutputKey=='KMSKeyArn'].OutputValue" \
  --output text

python scripts/publish_jwks.py \
  --key-arn YOUR_KMS_KEY_ARN \
  --bucket likenessguard-jwks-YOUR_ACCOUNT_ID
```

### 6. Start the dashboard

```bash
cd likenessguard-dashboard
npm install
npm run dev
# Open http://localhost:5173
```

---

## Verify Deployment

```bash
# Test the consent check endpoint
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1/v2/consent/check \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://thispersondoesnotexist.com", "usage_type": "GENERAL_GENERATION", "requester_id": "test"}'
```

Expected: a JSON response with `decision`, `reason_code`, and `agent_trace`.

---

## Cost

The entire platform runs on serverless — you only pay for what you use:

| Service | 100k checks/month |
|---------|-------------------|
| Lambda | $1.92 |
| Bedrock | $1.90 |
| Rekognition | $1.00 |
| KMS | $0.30 |
| DynamoDB | $0.13 |
| **Total** | **~$4.20/month** |

---

## Teardown

```bash
aws cloudformation delete-stack --stack-name likenessguard-v2 --region us-east-1
```

Note: DynamoDB tables with deletion protection and S3 buckets with content will need manual cleanup.
