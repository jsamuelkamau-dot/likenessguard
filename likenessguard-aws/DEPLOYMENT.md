# LikenessGuard AWS Deployment Guide

This guide explains how to deploy the LikenessGuard prototype to AWS.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **AWS SAM CLI** installed
4. **Python 3.9+** installed
5. **Git** (optional, for version control)

### Installing Prerequisites

#### AWS CLI
```bash
# macOS/Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Download and run: https://awscli.amazonaws.com/AWSCLIV2.msi
```

#### AWS SAM CLI
```bash
# macOS
brew install aws-sam-cli

# Windows
# Download and run: https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi

# Linux
pip install aws-sam-cli
```

#### Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your default output format (json)
```

## Deployment Steps

### 1. Clone or Navigate to Project Directory

```bash
cd likenessguard-aws
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Deployment Script

#### On Linux/macOS:
```bash
chmod +x deploy.sh
./deploy.sh
```

#### On Windows (PowerShell):
```powershell
.\deploy.ps1
```

### 4. Manual Deployment (Alternative)

If the deployment script doesn't work, you can deploy manually:

```bash
# Set variables
export AWS_REGION=us-east-1
export STACK_NAME=likenessguard-prototype
export S3_BUCKET=likenessguard-deployment-$(aws sts get-caller-identity --query Account --output text)

# Create S3 bucket for deployment
aws s3 mb s3://${S3_BUCKET}

# Build SAM application
sam build --template-file infrastructure/template.yaml

# Package SAM application
sam package \
    --template-file .aws-sam/build/template.yaml \
    --s3-bucket ${S3_BUCKET} \
    --output-template-file infrastructure/packaged-template.yaml

# Deploy SAM application
sam deploy \
    --template-file infrastructure/packaged-template.yaml \
    --stack-name ${STACK_NAME} \
    --capabilities CAPABILITY_IAM \
    --region ${AWS_REGION} \
    --parameter-overrides Environment=prototype
```

## Post-Deployment

### Verify Deployment

Check that all resources were created:

```bash
aws cloudformation describe-stacks \
    --stack-name likenessguard-prototype \
    --query 'Stacks[0].Outputs' \
    --output table
```

### Get API Endpoints

The deployment outputs will include:
- **RegistrationApiUrl**: Endpoint for user registration
- **ConsentCheckApiUrl**: Endpoint for consent checks
- **ConsentUpdateApiUrl**: Endpoint for policy updates
- **ConsentRevokeApiUrl**: Endpoint for consent revocation
- **EvidenceRetrievalApiUrl**: Endpoint for evidence retrieval

### Test the Deployment

1. **Run the demo script**:
   ```bash
   python demo/demo_flow.py
   ```

2. **Test individual endpoints** (replace with your actual API URLs):
   ```bash
   # Example: Test consent check endpoint
   curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod/consent/check \
     -H "Content-Type: application/json" \
     -d '{"reference_image": "base64_encoded_image", "usage_type": "SELF_EDIT", "requester_id": "user@example.com"}'
   ```

### Monitor the System

1. **CloudWatch Logs**:
   ```bash
   aws logs tail /aws/lambda/likenessguard-consent-check --follow
   ```

2. **CloudWatch Metrics**:
   - Navigate to CloudWatch Console
   - View custom metrics under "LikenessGuard" namespace

3. **DynamoDB Tables**:
   ```bash
   aws dynamodb list-tables
   aws dynamodb scan --table-name ConsentRegistry
   ```

## Environment Variables

The deployment uses these environment variables (configured in template.yaml):

- `CONSENT_REGISTRY_TABLE`: DynamoDB table for consent records
- `AUDIT_LOG_TABLE`: DynamoDB table for audit logs
- `SIMILARITY_THRESHOLD`: Threshold for face matching (default: 0.85)
- `AWS_DEFAULT_REGION`: AWS region for services

## Cost Monitoring

### Free Tier Limits

The prototype is designed to stay within AWS Free Tier:

- **Lambda**: 1M requests/month, 400K GB-seconds compute
- **API Gateway**: 1M API calls/month
- **DynamoDB**: 25GB storage, 25 read/write capacity units
- **S3**: 5GB storage, 20K GET requests, 2K PUT requests
- **CloudWatch**: 10 custom metrics, 5GB log ingestion
- **Rekognition**: 5,000 images/month (first year only)

### Monitor Costs

```bash
# Check current month's costs
aws ce get-cost-and-usage \
    --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=SERVICE
```

## Troubleshooting

### Deployment Fails

1. **Check AWS credentials**:
   ```bash
   aws sts get-caller-identity
   ```

2. **Check SAM CLI version**:
   ```bash
   sam --version
   ```

3. **View CloudFormation events**:
   ```bash
   aws cloudformation describe-stack-events --stack-name likenessguard-prototype
   ```

### Lambda Function Errors

1. **View logs**:
   ```bash
   aws logs tail /aws/lambda/likenessguard-consent-check --follow
   ```

2. **Test function directly**:
   ```bash
   aws lambda invoke \
     --function-name likenessguard-consent-check \
     --payload '{"body": "{}"}' \
     response.json
   ```

### DynamoDB Issues

1. **Check table status**:
   ```bash
   aws dynamodb describe-table --table-name ConsentRegistry
   ```

2. **Scan table contents**:
   ```bash
   aws dynamodb scan --table-name ConsentRegistry --max-items 10
   ```

## Cleanup

To delete all resources and avoid charges:

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name likenessguard-prototype

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name likenessguard-prototype

# Delete S3 deployment bucket (optional)
aws s3 rb s3://likenessguard-deployment-YOUR_ACCOUNT_ID --force

# Verify deletion
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE
```

## Security Considerations

1. **API Keys**: The prototype uses API Gateway API keys for authentication. In production, use AWS Cognito or IAM authentication.

2. **Encryption**: All data is encrypted at rest (S3, DynamoDB) and in transit (TLS 1.2+).

3. **IAM Roles**: Lambda functions use least-privilege IAM roles defined in the SAM template.

4. **VPC**: For production, consider deploying Lambda functions in a VPC with private subnets.

5. **Secrets**: Store sensitive configuration in AWS Secrets Manager or Systems Manager Parameter Store.

## Next Steps

1. Review the [Architecture Documentation](docs/infrastructure.md)
2. Read the [API Documentation](docs/api-documentation.md)
3. Explore the [Security and Privacy](docs/security-and-privacy.md) guide
4. Run the full test suite: `pytest src/tests/`
5. Customize consent policies for your use case

## Support

For issues or questions:
- Check the [QUICKSTART.md](QUICKSTART.md) guide
- Review CloudWatch logs for error details
- Consult AWS documentation for service-specific issues
