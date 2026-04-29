# Deployment Guide — LikenessGuard v2

Deploy the entire LikenessGuard platform to your AWS account. This guide walks you through every step, from zero to a running consent enforcement system.

---

## Prerequisites

Before you begin, make sure you have the following installed and configured:

| Tool | Minimum Version | Install Guide |
|------|----------------|---------------|
| AWS CLI | v2.x | [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| AWS SAM CLI | v1.x | [Install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) |
| Python | 3.12+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| Make | any | Pre-installed on macOS/Linux; use `choco install make` on Windows |

Verify your tools:

```bash
aws --version        # aws-cli/2.x.x ...
sam --version        # SAM CLI, version 1.x.x
python --version     # Python 3.12+
node --version       # v20.x.x
make --version       # GNU Make ...
```

### AWS Bedrock Model Access

You must enable the following models in the **us-east-1** region via the [Bedrock console](https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess):

- `amazon.nova-pro-v1:0` — Consent Orchestrator
- `amazon.nova-lite-v1:0` — Policy Reasoner
- `anthropic.claude-3-haiku-20240307-v1:0` — Anomaly Agent
- `amazon.titan-embed-image-v1` — Facial embeddings

---

## One-Time Setup

### 1. Configure AWS credentials

```bash
aws configure
```

Enter your Access Key ID, Secret Access Key, and set the default region to `us-east-1`.

### 2. Clone the repository

```bash
git clone https://github.com/jsamuelkamau-dot/likenessguard.git
cd likenessguard
```

### 3. Create your environment file

```bash
cp .env.example .env
# Edit .env and replace YOUR_AWS_ACCOUNT_ID with your actual AWS account ID
```

---

## Deploy

### Option A: One command (recommended)

```bash
make deploy
```

This runs `sam build` followed by `sam deploy`, deploying the full CloudFormation stack including:
- API Gateway with all v2 routes
- 9 Lambda functions (Supervisor, Anomaly Agent, Consent Orchestrator, etc.)
- DynamoDB tables (ConsentRegistry, AuditLog, Federation, Suspensions)
- KMS signing key for Proof-of-Face certificates
- S3 buckets (photos, JWKS, audit archive)
- OpenSearch Serverless vector collection

### Option B: Step by step

```bash
# Build all Lambda functions
cd likenessguard-aws
sam build --template-file infrastructure/cloudformation-v2.yaml

# Deploy the stack
sam deploy \
  --template-file infrastructure/cloudformation-v2.yaml \
  --stack-name likenessguard-v2 \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset
```

---

## Post-Deploy Setup

After the stack deploys successfully, run the post-deploy steps to set up the OpenSearch vector index and publish the JWKS public key:

```bash
make post-deploy
```

This does two things:

### 1. Create the OpenSearch vector index

Sets up the k-NN index used for facial similarity search (512-dimensional Titan embeddings).

```bash
# Or run manually:
cd likenessguard-aws
python scripts/deploy_opensearch_index.py \
  --collection-endpoint YOUR_OPENSEARCH_ENDPOINT \
  --region us-east-1
```

### 2. Publish the JWKS public key

Publishes the KMS public key to S3 so third parties can verify Proof-of-Face signatures.

```bash
# Or run manually:
cd likenessguard-aws
python scripts/publish_jwks.py \
  --key-arn YOUR_KMS_KEY_ARN \
  --bucket likenessguard-jwks-YOUR_ACCOUNT_ID
```

---

## Verification

### Check the stack deployed successfully

```bash
aws cloudformation describe-stacks \
  --stack-name likenessguard-v2 \
  --query "Stacks[0].StackStatus" \
  --output text
# Expected: CREATE_COMPLETE or UPDATE_COMPLETE
```

### Get your API endpoint

```bash
aws cloudformation describe-stacks \
  --stack-name likenessguard-v2 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text
```

### Test a consent check

```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1/v2/consent/check \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://thispersondoesnotexist.com",
    "usage_type": "GENERAL_GENERATION",
    "requester_id": "test-deploy"
  }'
```

Expected response includes `decision`, `reason_code`, `confidence`, and `agent_trace`.

### Start the dashboard

```bash
make start
# Dashboard: http://localhost:5173
# MCP server: http://localhost:8080
```

---

## Cost Breakdown

LikenessGuard runs entirely on serverless — you pay only for what you use. No idle costs.

| Service | What It Does | Cost (100k checks/mo) |
|---------|-------------|----------------------|
| Lambda | 9 functions, ~300ms avg | $1.92 |
| Bedrock | Nova Pro + Haiku + Titan Embed | $1.90 |
| Rekognition | Face detection + comparison | $1.00 |
| KMS | ECDSA P-256 signing | $0.30 |
| DynamoDB | Consent registry + audit log | $0.13 |
| OpenSearch Serverless | Vector similarity (k-NN) | Free Tier |
| API Gateway | REST API | Free Tier (first 1M) |
| S3 | Photos + JWKS + audit archive | < $0.10 |
| CloudFront | JWKS distribution | < $0.05 |
| **Total** | | **~$4.20/month** |

> **Note:** Costs scale linearly. At 1M checks/month, expect ~$42/month.

---

## Teardown

To remove all deployed resources:

```bash
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name likenessguard-v2 --region us-east-1

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name likenessguard-v2 --region us-east-1
```

### Manual cleanup required

Some resources have deletion protection and won't be removed automatically:

- **DynamoDB tables** with deletion protection enabled — disable protection first, then delete
- **S3 buckets** with objects — empty the buckets first (`aws s3 rm s3://bucket-name --recursive`), then delete
- **KMS keys** — scheduled for deletion (30-day waiting period by default)
- **OpenSearch Serverless collection** — delete via the console or CLI

```bash
# Empty and delete S3 buckets
aws s3 rm s3://likenessguard-photos-YOUR_ACCOUNT_ID --recursive
aws s3 rm s3://likenessguard-jwks-YOUR_ACCOUNT_ID --recursive
aws s3 rm s3://likenessguard-audit-archive-YOUR_ACCOUNT_ID --recursive
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `sam build` fails | Make sure Python 3.12+ is installed and on your PATH |
| Stack creation fails on Bedrock | Enable model access in the [Bedrock console](https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) |
| OpenSearch index creation fails | Check that the collection is ACTIVE in the OpenSearch console |
| JWKS publish fails | Verify the KMS key ARN and S3 bucket name in your `.env` |
| `make deploy` permission error | Ensure your IAM user/role has CloudFormation, Lambda, DynamoDB, S3, KMS, and Bedrock permissions |
