# Interpose Infrastructure Deployment

This directory contains the AWS CloudFormation template for deploying the Interpose SaaS Platform backend infrastructure.

## Overview

The CloudFormation template (`cloudformation-template.yaml`) creates all necessary AWS resources for the Interpose platform:

- **DynamoDB Tables**: AIObserveLogs and Customers with appropriate GSIs
- **Lambda Function**: Log processor with Python 3.11 runtime
- **API Gateway**: REST API with /logs and /auth endpoints
- **S3 Bucket**: Static website hosting for the dashboard
- **CloudFront Distribution**: CDN for global dashboard delivery
- **IAM Roles**: Lambda execution role with DynamoDB, SES, and CloudWatch permissions

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. AWS account with permissions to create CloudFormation stacks
3. Verified SES email address for sending alerts (if using custom email)

## Deployment

### Quick Deployment

Deploy the stack with default parameters:

```bash
aws cloudformation create-stack \
  --stack-name interpose-platform \
  --template-body file://cloudformation-template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Custom Parameters

Deploy with custom alert email:

```bash
aws cloudformation create-stack \
  --stack-name interpose-platform \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=AlertEmailSource,ParameterValue=your-email@example.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Wait for Completion

```bash
aws cloudformation wait stack-create-complete \
  --stack-name interpose-platform \
  --region us-east-1
```

## Retrieve Outputs

After deployment, retrieve the important endpoints:

```bash
aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

Key outputs:
- **APIEndpoint**: Backend API URL for agent configuration
- **DashboardURL**: CloudFront URL for accessing the dashboard
- **DashboardBucketName**: S3 bucket name for uploading dashboard files
- **LogsTableName**: DynamoDB table for logs
- **CustomersTableName**: DynamoDB table for customers

## Post-Deployment Steps

### 1. Deploy Lambda Function Code

The template creates a Lambda function with placeholder code. Deploy the actual backend code:

```bash
# Package the Lambda function
cd ../backend
zip -r lambda-deployment.zip lambda_handler.py requirements.txt

# Upload to Lambda
aws lambda update-function-code \
  --function-name interpose-log-processor \
  --zip-file fileb://lambda-deployment.zip \
  --region us-east-1
```

### 2. Deploy Dashboard

Build and upload the React dashboard to S3:

```bash
# Build the dashboard
cd ../dashboard
npm install
npm run build

# Get the bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardBucketName`].OutputValue' \
  --output text)

# Upload to S3
aws s3 sync build/ s3://${BUCKET_NAME}/ \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://${BUCKET_NAME}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1)

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

### 3. Initialize Customer Database

Create an initial customer account:

```bash
# Use the AWS Console or CLI to add a customer record to the Customers table
# Include: customer_id, email, password_hash (bcrypt), api_key, alert_email, company_name, created_at, subscription_tier
```

### 4. Configure SES

If using a custom alert email, verify it in SES:

```bash
aws ses verify-email-identity \
  --email-address your-email@example.com \
  --region us-east-1
```

## Stack Updates

Update the stack with changes:

```bash
aws cloudformation update-stack \
  --stack-name interpose-platform \
  --template-body file://cloudformation-template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Stack Deletion

Delete the entire stack (WARNING: This will delete all data):

```bash
# Empty the S3 bucket first
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardBucketName`].OutputValue' \
  --output text)

aws s3 rm s3://${BUCKET_NAME}/ --recursive

# Delete the stack
aws cloudformation delete-stack \
  --stack-name interpose-platform \
  --region us-east-1
```

## Resource Details

### DynamoDB Tables

**AIObserveLogs**
- Partition Key: `customer_id` (String)
- Sort Key: `timestamp` (Number)
- TTL: Enabled on `ttl` attribute (90 days retention)
- Streams: Enabled for audit trail

**Customers**
- Partition Key: `customer_id` (String)
- GSI: `EmailIndex` on `email` attribute
- GSI: `ApiKeyIndex` on `api_key` attribute

### Lambda Function

- Runtime: Python 3.11
- Memory: 512 MB
- Timeout: 10 seconds
- Environment Variables:
  - `LOGS_TABLE`: AIObserveLogs
  - `CUSTOMERS_TABLE`: Customers
  - `ALERT_EMAIL_SOURCE`: Configured alert email

### API Gateway

- Type: REST API (Regional)
- Endpoints:
  - `POST /logs`: Submit log entries
  - `GET /logs`: Query customer logs
  - `POST /auth`: Authenticate users
- CORS: Enabled on all endpoints

### S3 & CloudFront

- S3 Bucket: Static website hosting enabled
- CloudFront: HTTPS redirect, global edge locations
- Cache: 24-hour default TTL for assets

## Cost Estimation

Estimated monthly costs (low-volume usage):
- DynamoDB: $1-5 (on-demand pricing)
- Lambda: $0-2 (first 1M requests free)
- API Gateway: $3.50 per million requests
- S3: $0.023 per GB stored
- CloudFront: $0.085 per GB transferred
- SES: $0.10 per 1,000 emails

Total estimated cost for small deployment: $5-20/month

## Troubleshooting

### Lambda Function Not Responding

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/interpose-log-processor --follow
```

### API Gateway CORS Issues

Verify OPTIONS methods are configured correctly and return proper headers.

### DynamoDB Access Denied

Ensure Lambda execution role has proper permissions to access both tables and GSIs.

### SES Email Not Sending

1. Verify email address in SES
2. Check if account is in SES sandbox mode
3. Review CloudWatch logs for SES errors

## Support

For issues or questions, refer to the main project documentation or open an issue in the repository.
