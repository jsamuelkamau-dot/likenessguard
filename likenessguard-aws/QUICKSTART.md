# LikenessGuard AWS Prototype - Quick Start Guide

## Prerequisites

Before you begin, ensure you have:

1. **Python 3.11 or higher** installed
   ```bash
   python3 --version
   ```

2. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure
   ```

3. **AWS SAM CLI** installed
   ```bash
   sam --version
   ```
   
   If not installed, follow: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

4. **AWS Account** with appropriate permissions (Administrator or equivalent)

## Setup (5 minutes)

### 1. Clone and Navigate

```bash
cd likenessguard-aws
```

### 2. Run Setup Script

**On Linux/Mac**:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**On Windows**:
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 3. Activate Virtual Environment

**On Linux/Mac**:
```bash
source venv/bin/activate
```

**On Windows**:
```powershell
venv\Scripts\activate
```

## Deploy Infrastructure (10 minutes)

### Option 1: Guided Deployment (First Time)

```bash
cd infrastructure
sam build
sam deploy --guided
```

You'll be prompted for:
- **Stack Name**: Press Enter to use default `likenessguard-prototype`
- **AWS Region**: Enter your preferred region (e.g., `us-east-1`)
- **Confirm changes**: Enter `y`
- **Allow SAM CLI IAM role creation**: Enter `y`
- **Disable rollback**: Enter `n`
- **Save arguments to config**: Enter `y`

### Option 2: Automated Deployment (Subsequent Deploys)

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## Verify Deployment

### 1. Check Stack Status

```bash
aws cloudformation describe-stacks \
  --stack-name likenessguard-prototype \
  --query 'Stacks[0].StackStatus'
```

Expected output: `"CREATE_COMPLETE"` or `"UPDATE_COMPLETE"`

### 2. Get API Endpoint

```bash
aws cloudformation describe-stacks \
  --stack-name likenessguard-prototype \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

Save this endpoint URL - you'll need it for API calls.

### 3. Create API Key

```bash
# Get API ID
API_ID=$(aws cloudformation describe-stacks \
  --stack-name likenessguard-prototype \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1)

# Create API key
aws apigateway create-api-key \
  --name LikenessGuardTestKey \
  --enabled \
  --query 'value' \
  --output text
```

Save this API key - you'll need it for authentication.

## Run Tests

```bash
# Run all tests
pytest

# Run only unit tests
pytest -m unit

# Run only property-based tests
pytest -m property

# Run with coverage report
pytest --cov=src --cov-report=html
```

## Test the API

### 1. Health Check (Registration Endpoint)

```bash
API_ENDPOINT="<your-api-endpoint>"
API_KEY="<your-api-key>"

curl -X POST "${API_ENDPOINT}/register" \
  -H "X-Api-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "photos": [],
    "consentPolicy": {
      "allowSelfEdits": true,
      "denyThirdPartyEdits": true,
      "denyFaceSwaps": true,
      "denySexualizedContent": true,
      "denyImpersonation": true,
      "denyPoliticalUse": true
    }
  }'
```

Expected response:
```json
{
  "message": "Registration handler - implementation pending",
  "status": "SUCCESS"
}
```

### 2. Consent Check Endpoint

```bash
curl -X POST "${API_ENDPOINT}/consent/check" \
  -H "X-Api-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceImage": "base64-encoded-image",
    "usageType": "SELF_EDIT",
    "requesterId": "test-platform-001"
  }'
```

Expected response:
```json
{
  "decision": "UNKNOWN",
  "reasonCode": "NOT_IMPLEMENTED",
  "message": "Consent check handler - implementation pending"
}
```

## Monitor the System

### View Lambda Logs

```bash
# Registration function logs
aws logs tail /aws/lambda/LikenessGuard-Registration --follow

# Consent check function logs
aws logs tail /aws/lambda/LikenessGuard-ConsentCheck --follow
```

### View CloudWatch Metrics

```bash
# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=LikenessGuard-Registration \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Clean Up (Remove All Resources)

**WARNING**: This will delete all data and resources.

```bash
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name likenessguard-prototype

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name likenessguard-prototype

# Verify deletion
aws cloudformation describe-stacks --stack-name likenessguard-prototype
```

Expected: Stack not found error (indicates successful deletion)

## Next Steps

1. **Implement Core Logic**: Start with Task 2 - Implement core data models
2. **Run Property Tests**: Ensure correctness with property-based testing
3. **Build Demo Flow**: Create demonstration script for end-to-end testing
4. **Document Architecture**: Prepare documentation for AWS Builder Center

## Troubleshooting

### Issue: SAM build fails

**Solution**: Ensure you're in the `infrastructure` directory and virtual environment is activated.

```bash
cd infrastructure
source ../venv/bin/activate  # Linux/Mac
sam build
```

### Issue: Deployment fails with IAM permissions error

**Solution**: Ensure your AWS credentials have sufficient permissions. You need:
- CloudFormation full access
- Lambda full access
- DynamoDB full access
- S3 full access
- IAM role creation permissions
- API Gateway full access

### Issue: API returns 403 Forbidden

**Solution**: Verify you're including the API key in the request header:
```bash
-H "X-Api-Key: your-api-key-here"
```

### Issue: Lambda function timeout

**Solution**: Check CloudWatch Logs for errors. Common causes:
- Rekognition service unavailable
- DynamoDB table not accessible
- Network connectivity issues

### Issue: Tests fail with boto3 errors

**Solution**: Ensure AWS credentials are configured:
```bash
aws configure
# Or set environment variables:
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_DEFAULT_REGION=us-east-1
```

## Support

For issues or questions:
1. Check `docs/infrastructure.md` for detailed documentation
2. Review CloudWatch Logs for error details
3. Verify AWS Free Tier limits haven't been exceeded

## Free Tier Monitoring

Monitor your usage to stay within Free Tier limits:

```bash
# Check Lambda invocations (limit: 1M/month)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --start-time $(date -u -d '1 month ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 2592000 \
  --statistics Sum

# Check DynamoDB storage (limit: 25 GB)
aws dynamodb describe-table \
  --table-name LikenessGuard-ConsentRegistry \
  --query 'Table.TableSizeBytes'
```

## Project Structure

```
likenessguard-aws/
├── README.md                 # Project overview
├── QUICKSTART.md            # This file
├── requirements.txt         # Python dependencies
├── requirements-dev.txt     # Development dependencies
├── pytest.ini              # Test configuration
├── samconfig.toml          # SAM deployment config
├── infrastructure/
│   └── template.yaml       # CloudFormation/SAM template
├── src/
│   ├── lambdas/           # Lambda function handlers
│   ├── shared/            # Shared code and utilities
│   └── tests/             # Test suite
├── scripts/
│   ├── setup.sh           # Setup script
│   └── deploy.sh          # Deployment script
└── docs/
    └── infrastructure.md  # Detailed documentation
```
