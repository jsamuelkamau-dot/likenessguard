# Interpose SaaS Platform - Deployment Guide

This comprehensive guide walks you through deploying the complete Interpose SaaS Platform, including backend infrastructure, environment configuration, email setup, and monitoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [CloudFormation Stack Deployment](#cloudformation-stack-deployment)
4. [Environment Variable Configuration](#environment-variable-configuration)
5. [SES Email Verification](#ses-email-verification)
6. [Custom Domain Setup (Optional)](#custom-domain-setup-optional)
7. [Monitoring and Alerting Setup](#monitoring-and-alerting-setup)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)
10. [Cost Estimation](#cost-estimation)

## Prerequisites

### Required Tools

Before deploying Interpose, ensure you have the following tools installed:

- **AWS CLI**: Version 2.x or higher
  ```bash
  aws --version
  # Should output: aws-cli/2.x.x or higher
  ```

- **Python 3**: Version 3.11 or higher
  ```bash
  python3 --version
  # Should output: Python 3.11.x or higher
  ```

- **Node.js**: Version 18.x or higher (for dashboard build)
  ```bash
  node --version
  # Should output: v18.x.x or higher
  ```

- **jq**: JSON processor for parsing CloudFormation outputs
  ```bash
  jq --version
  # Should output: jq-1.x or higher
  ```

### AWS Account Requirements



1. **Active AWS Account**: You need an AWS account with billing enabled
2. **IAM Permissions**: Your AWS user/role must have permissions for:
   - CloudFormation (create/update/delete stacks)
   - DynamoDB (create tables, put items, query)
   - Lambda (create/update functions, manage layers)
   - API Gateway (create REST APIs, deploy stages)
   - S3 (create buckets, upload objects, configure website hosting)
   - CloudFront (create distributions, invalidate cache)
   - IAM (create roles and policies)
   - SES (send emails, verify identities)
   - CloudWatch (create log groups, create alarms)
   - SNS (create topics, subscribe to topics)

3. **AWS Credentials Configuration**: Configure your AWS credentials:
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and default region
   ```

   Or set environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_DEFAULT_REGION=us-east-1
   ```

### Recommended AWS Regions

For optimal SES functionality, deploy to one of these regions:
- `us-east-1` (US East - N. Virginia) - **Recommended**
- `us-west-2` (US West - Oregon)
- `eu-west-1` (Europe - Ireland)

**Note**: SES is not available in all AWS regions. Check [AWS SES Region Availability](https://docs.aws.amazon.com/general/latest/gr/ses.html) before deploying.

## Quick Start

For experienced users, here's the complete deployment in 7 commands:

```bash
# 1. Deploy CloudFormation stack
./deployment/deploy-backend.sh --email alerts@example.com

# 2. Package and deploy Lambda function
./deployment/package-lambda.sh --deploy

# 3. Initialize customer database
python deployment/init-database.py --email admin@example.com

# 4. Verify SES email (check your inbox and click verification link)
aws ses verify-email-identity --email-address alerts@example.com

# 5. Build dashboard
./deployment/build-dashboard.sh

# 6. Upload dashboard to S3
./deployment/upload-dashboard.sh

# 7. Invalidate CloudFront cache
./deployment/invalidate-cloudfront.sh
```



## CloudFormation Stack Deployment

The CloudFormation template creates all necessary AWS infrastructure for the Interpose platform.

### Step 1: Review the CloudFormation Template

Before deploying, review the template to understand what resources will be created:

```bash
cat infrastructure/cloudformation-template.yaml
```

The template creates:
- **DynamoDB Tables**: `AIObserveLogs` and `Customers` with GSIs
- **Lambda Function**: `interpose-log-processor` with Python 3.11 runtime
- **API Gateway**: REST API with `/logs` and `/auth` endpoints
- **S3 Bucket**: For hosting the React dashboard
- **CloudFront Distribution**: CDN for global dashboard delivery
- **IAM Roles**: Lambda execution role with necessary permissions
- **CloudWatch Alarms**: Monitoring for errors and performance
- **SNS Topic**: For alarm notifications

### Step 2: Deploy the Stack

Use the deployment script for automated deployment:

```bash
./deployment/deploy-backend.sh \
  --stack-name interpose-platform \
  --region us-east-1 \
  --email alerts@example.com
```

**Parameters:**
- `--stack-name`: Name for your CloudFormation stack (default: `interpose-platform`)
- `--region`: AWS region for deployment (default: `us-east-1`)
- `--email`: Email address for sending high-risk alerts (default: `alerts@interpose.io`)

**Alternative: Manual Deployment**

If you prefer manual deployment:

```bash
aws cloudformation create-stack \
  --stack-name interpose-platform \
  --template-body file://infrastructure/cloudformation-template.yaml \
  --parameters ParameterKey=AlertEmailSource,ParameterValue=alerts@example.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Step 3: Wait for Stack Creation

The deployment script automatically waits for completion. If deploying manually:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name interpose-platform \
  --region us-east-1
```

This typically takes 5-10 minutes.

### Step 4: Retrieve Stack Outputs

After deployment, retrieve important endpoints and resource names:

```bash
aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' \
  --output table
```

Key outputs:
- **APIEndpoint**: Backend API URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)
- **DashboardURL**: CloudFront URL for dashboard (e.g., `https://d1234567890.cloudfront.net`)
- **DashboardBucketName**: S3 bucket name (e.g., `interpose-dashboard-123456789012`)
- **LogsTableName**: DynamoDB logs table name (`AIObserveLogs`)
- **CustomersTableName**: DynamoDB customers table name (`Customers`)
- **LambdaFunctionName**: Lambda function name (`interpose-log-processor`)

Save these outputs - you'll need them for subsequent steps.



## Environment Variable Configuration

The Interpose platform uses environment variables for configuration across all components.

### Backend Lambda Environment Variables

The CloudFormation template automatically configures these Lambda environment variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `LOGS_TABLE` | DynamoDB table for storing logs | `AIObserveLogs` |
| `CUSTOMERS_TABLE` | DynamoDB table for customer data | `Customers` |
| `ALERT_EMAIL_SOURCE` | Verified SES email for sending alerts | `alerts@example.com` |
| `PYTHONUNBUFFERED` | Disable Python output buffering | `1` |

**Viewing Current Configuration:**

```bash
aws lambda get-function-configuration \
  --function-name interpose-log-processor \
  --region us-east-1 \
  --query 'Environment.Variables'
```

**Updating Environment Variables:**

If you need to update environment variables after deployment:

```bash
aws lambda update-function-configuration \
  --function-name interpose-log-processor \
  --environment Variables="{LOGS_TABLE=AIObserveLogs,CUSTOMERS_TABLE=Customers,ALERT_EMAIL_SOURCE=newemail@example.com,PYTHONUNBUFFERED=1}" \
  --region us-east-1
```

### Agent Environment Variables

When deploying the Interpose agent, configure these environment variables:

| Variable | Description | Required | Example Value |
|----------|-------------|----------|---------------|
| `INTERPOSE_API_KEY` | Customer API key for authentication | Yes | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `INTERPOSE_BACKEND_URL` | Backend API endpoint URL | Yes | `https://abc123.execute-api.us-east-1.amazonaws.com/prod/logs` |
| `INTERPOSE_LOG_LEVEL` | Logging verbosity | No | `INFO` (default), `DEBUG`, `WARNING`, `ERROR` |
| `INTERPOSE_RETRY_ATTEMPTS` | Number of retry attempts for failed transmissions | No | `3` (default) |
| `INTERPOSE_TIMEOUT` | Request timeout in seconds | No | `5` (default) |

**Docker Deployment Example:**

```bash
docker run -d \
  -e INTERPOSE_API_KEY="your-api-key-here" \
  -e INTERPOSE_BACKEND_URL="https://your-api-endpoint.com/prod/logs" \
  -e INTERPOSE_LOG_LEVEL="INFO" \
  --name interpose-agent \
  interpose-agent:latest
```

**Python Library Example:**

```python
import os
import interpose

# Configure via environment variables
os.environ['INTERPOSE_API_KEY'] = 'your-api-key-here'
os.environ['INTERPOSE_BACKEND_URL'] = 'https://your-api-endpoint.com/prod/logs'

# Initialize agent
interpose.init()
```

**AWS Lambda Layer Example:**

For Lambda functions using the Interpose layer, set environment variables in the Lambda configuration:

```bash
aws lambda update-function-configuration \
  --function-name your-function-name \
  --environment Variables="{INTERPOSE_API_KEY=your-api-key,INTERPOSE_BACKEND_URL=https://your-api-endpoint.com/prod/logs}" \
  --region us-east-1
```

### Dashboard Environment Variables

The dashboard requires the API endpoint URL at build time:

| Variable | Description | Required | Example Value |
|----------|-------------|----------|---------------|
| `VITE_API_URL` | Backend API endpoint URL | Yes | `https://abc123.execute-api.us-east-1.amazonaws.com/prod` |

The build script automatically detects this from CloudFormation outputs. For manual builds:

```bash
cd dashboard
export VITE_API_URL="https://your-api-endpoint.com/prod"
npm run build
```



## SES Email Verification

AWS SES requires email address verification before sending emails. This is a critical step for the alert system.

### Understanding SES Sandbox Mode

New AWS accounts start in **SES Sandbox Mode**, which has restrictions:
- Can only send emails to verified addresses
- Limited to 200 emails per 24-hour period
- Maximum send rate of 1 email per second

For production use, you'll need to request production access (see below).

### Step 1: Verify Alert Email Address

Verify the email address you specified during CloudFormation deployment:

```bash
aws ses verify-email-identity \
  --email-address alerts@example.com \
  --region us-east-1
```

**Important**: Use the same region where you deployed the CloudFormation stack.

### Step 2: Check Your Email

AWS will send a verification email to the address. The email contains a verification link that expires in 24 hours.

1. Check your inbox for an email from `no-reply-aws@amazon.com`
2. Subject: "Amazon SES Email Address Verification Request in region [region]"
3. Click the verification link in the email

### Step 3: Confirm Verification Status

Verify that the email address is verified:

```bash
aws ses get-identity-verification-attributes \
  --identities alerts@example.com \
  --region us-east-1
```

Expected output:
```json
{
    "VerificationAttributes": {
        "alerts@example.com": {
            "VerificationStatus": "Success"
        }
    }
}
```

### Step 4: Verify Recipient Emails (Sandbox Mode Only)

If you're in SES Sandbox Mode, you must also verify the email addresses that will receive alerts:

```bash
# Verify each customer's alert email
aws ses verify-email-identity \
  --email-address customer1@example.com \
  --region us-east-1

aws ses verify-email-identity \
  --email-address customer2@example.com \
  --region us-east-1
```

Each recipient must click their verification link.

### Step 5: Request Production Access (Recommended)

For production deployments, request to move out of SES Sandbox Mode:

1. **Open the AWS SES Console**:
   ```bash
   # Or navigate to: https://console.aws.amazon.com/ses/
   ```

2. **Navigate to Account Dashboard** → **Request Production Access**

3. **Fill out the request form**:
   - **Mail Type**: Select "Transactional"
   - **Website URL**: Your company website or dashboard URL
   - **Use Case Description**: Example:
     ```
     We use AWS SES to send security alert notifications for our AI monitoring platform.
     Alerts are sent when high-risk AI activity is detected (risk score > 70).
     Recipients are authenticated customers who have opted in to receive alerts.
     We implement bounce and complaint handling via SES notifications.
     Expected volume: 100-500 emails per day.
     ```
   - **Compliance**: Confirm you comply with AWS policies
   - **Bounce/Complaint Handling**: Describe your process

4. **Submit the request**

AWS typically responds within 24 hours. Once approved, you can send to any email address without verification.

### Testing Email Sending

Test that SES is configured correctly:

```bash
aws ses send-email \
  --from alerts@example.com \
  --destination ToAddresses=recipient@example.com \
  --message Subject={Data="Test Email from Interpose",Charset=utf-8},Body={Text={Data="This is a test email to verify SES configuration.",Charset=utf-8}} \
  --region us-east-1
```

If successful, you'll receive a message ID:
```json
{
    "MessageId": "0000000000000000-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-000000"
}
```

### Troubleshooting SES Issues

**Email not received:**
- Check spam/junk folder
- Verify email address is verified in SES
- Check CloudWatch Logs for SES errors:
  ```bash
  aws logs tail /aws/lambda/interpose-log-processor --follow
  ```

**"Email address is not verified" error:**
- Ensure you verified the sender email address
- If in Sandbox Mode, verify recipient email addresses too
- Check verification status with `get-identity-verification-attributes`

**Rate limit exceeded:**
- You're in Sandbox Mode (limit: 1 email/second, 200/day)
- Request production access to increase limits

**Bounce or complaint rate too high:**
- AWS may throttle or suspend your account
- Implement proper bounce/complaint handling
- Only send to valid, opted-in email addresses



## Custom Domain Setup (Optional)

By default, Interpose uses AWS-generated URLs. For production deployments, you may want custom domains.

### Custom Domain for API Gateway

#### Prerequisites
- A registered domain name
- Access to DNS management (Route 53, Cloudflare, etc.)
- AWS Certificate Manager (ACM) certificate for your domain

#### Step 1: Request ACM Certificate

Request a certificate in the **same region** as your API Gateway:

```bash
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

Note the certificate ARN from the output.

#### Step 2: Validate Certificate

Add the DNS validation records to your domain:

```bash
# Get validation records
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123... \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add the CNAME record to your DNS provider. Wait for validation (usually 5-30 minutes).

#### Step 3: Create Custom Domain in API Gateway

```bash
aws apigateway create-domain-name \
  --domain-name api.yourdomain.com \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123... \
  --endpoint-configuration types=REGIONAL \
  --region us-east-1
```

#### Step 4: Create Base Path Mapping

```bash
# Get your API Gateway ID
API_ID=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1)

# Create base path mapping
aws apigateway create-base-path-mapping \
  --domain-name api.yourdomain.com \
  --rest-api-id $API_ID \
  --stage prod \
  --region us-east-1
```

#### Step 5: Update DNS

Add a CNAME record pointing to the API Gateway domain:

```
Type: CNAME
Name: api.yourdomain.com
Value: d-abc123xyz.execute-api.us-east-1.amazonaws.com
TTL: 300
```

Get the target domain from:
```bash
aws apigateway get-domain-name \
  --domain-name api.yourdomain.com \
  --region us-east-1 \
  --query 'regionalDomainName'
```

#### Step 6: Update Agent Configuration

Update your agent deployments to use the custom domain:

```bash
export INTERPOSE_BACKEND_URL="https://api.yourdomain.com/logs"
```

### Custom Domain for Dashboard (CloudFront)

#### Prerequisites
- A registered domain name
- ACM certificate in **us-east-1** (CloudFront requires this region)

#### Step 1: Request ACM Certificate in us-east-1

**Important**: CloudFront requires certificates in us-east-1, regardless of your stack region.

```bash
aws acm request-certificate \
  --domain-name dashboard.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

#### Step 2: Validate Certificate

Add DNS validation records (same process as API Gateway).

#### Step 3: Update CloudFront Distribution

```bash
# Get CloudFront distribution ID
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1)

# Get current distribution config
aws cloudfront get-distribution-config \
  --id $DIST_ID \
  --output json > dist-config.json

# Edit dist-config.json to add:
# - Aliases: ["dashboard.yourdomain.com"]
# - ViewerCertificate.ACMCertificateArn: your-certificate-arn
# - ViewerCertificate.SSLSupportMethod: "sni-only"

# Update distribution
aws cloudfront update-distribution \
  --id $DIST_ID \
  --if-match $(jq -r '.ETag' dist-config.json) \
  --distribution-config file://dist-config.json
```

#### Step 4: Update DNS

Add a CNAME record for your dashboard domain:

```
Type: CNAME
Name: dashboard.yourdomain.com
Value: d1234567890.cloudfront.net
TTL: 300
```

Get the CloudFront domain from:
```bash
aws cloudfront get-distribution \
  --id $DIST_ID \
  --query 'Distribution.DomainName'
```

#### Step 5: Test Custom Domains

```bash
# Test API
curl https://api.yourdomain.com/logs

# Test Dashboard
curl https://dashboard.yourdomain.com
```

### DNS Propagation

DNS changes can take 5 minutes to 48 hours to propagate globally. Check propagation status:

```bash
# Check DNS resolution
nslookup api.yourdomain.com
nslookup dashboard.yourdomain.com

# Test from different locations
dig api.yourdomain.com @8.8.8.8
dig dashboard.yourdomain.com @8.8.8.8
```



## Monitoring and Alerting Setup

The CloudFormation template automatically creates CloudWatch alarms for monitoring platform health.

### Pre-Configured CloudWatch Alarms

The following alarms are automatically created:

#### 1. Lambda Error Rate Alarm
- **Name**: `Interpose-Lambda-ErrorRate`
- **Metric**: Lambda function errors
- **Threshold**: > 0 errors in 5 minutes
- **Action**: Sends notification to SNS topic

#### 2. Lambda Error Rate Percentage Alarm
- **Name**: `Interpose-Lambda-ErrorRatePercentage`
- **Metric**: (Errors / Invocations) × 100
- **Threshold**: > 1% error rate
- **Action**: Sends notification to SNS topic

#### 3. API Gateway 5xx Error Alarm
- **Name**: `Interpose-APIGateway-5xxErrors`
- **Metric**: (5xx Errors / Total Requests) × 100
- **Threshold**: > 0.1% error rate
- **Action**: Sends notification to SNS topic

#### 4. DynamoDB Throttled Requests Alarm
- **Name**: `Interpose-DynamoDB-ThrottledRequests`
- **Metric**: DynamoDB throttled requests
- **Threshold**: > 0 throttled requests in 5 minutes
- **Action**: Sends notification to SNS topic

#### 5. SES Bounce Rate Alarm
- **Name**: `Interpose-SES-BounceRate`
- **Metric**: (Bounces / Sends) × 100
- **Threshold**: > 5% bounce rate
- **Action**: Sends notification to SNS topic

### Subscribe to Alarm Notifications

#### Step 1: Get SNS Topic ARN

```bash
SNS_TOPIC=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`AlarmTopicArn`].OutputValue' \
  --output text)

echo $SNS_TOPIC
```

#### Step 2: Subscribe Email to SNS Topic

```bash
aws sns subscribe \
  --topic-arn $SNS_TOPIC \
  --protocol email \
  --notification-endpoint ops-team@example.com \
  --region us-east-1
```

#### Step 3: Confirm Subscription

Check your email for a confirmation message from AWS SNS and click the confirmation link.

#### Step 4: Verify Subscription

```bash
aws sns list-subscriptions-by-topic \
  --topic-arn $SNS_TOPIC \
  --region us-east-1
```

### Additional Monitoring Options

#### Subscribe via SMS

```bash
aws sns subscribe \
  --topic-arn $SNS_TOPIC \
  --protocol sms \
  --notification-endpoint +1234567890 \
  --region us-east-1
```

#### Subscribe via Slack (using AWS Chatbot)

1. Set up AWS Chatbot in the AWS Console
2. Configure Slack workspace integration
3. Add the SNS topic to the Chatbot configuration

#### Subscribe via PagerDuty

1. Create an integration in PagerDuty
2. Get the integration email address
3. Subscribe the email to the SNS topic

### Viewing CloudWatch Logs

#### Lambda Function Logs

```bash
# Tail logs in real-time
aws logs tail /aws/lambda/interpose-log-processor --follow --region us-east-1

# View recent logs
aws logs tail /aws/lambda/interpose-log-processor --since 1h --region us-east-1

# Filter for errors
aws logs tail /aws/lambda/interpose-log-processor --filter-pattern "ERROR" --region us-east-1
```

#### API Gateway Logs

Enable API Gateway logging (optional, incurs additional costs):

```bash
# Get API ID
API_ID=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1)

# Enable logging
aws apigateway update-stage \
  --rest-api-id $API_ID \
  --stage-name prod \
  --patch-operations op=replace,path=/accessLogSettings/destinationArn,value=arn:aws:logs:us-east-1:123456789012:log-group:api-gateway-logs \
  --region us-east-1
```

### Custom CloudWatch Dashboards

Create a custom dashboard for visualizing metrics:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name Interpose-Platform \
  --dashboard-body file://cloudwatch-dashboard.json \
  --region us-east-1
```

Example dashboard configuration (`cloudwatch-dashboard.json`):

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum", "label": "Lambda Invocations"}],
          [".", "Errors", {"stat": "Sum", "label": "Lambda Errors"}],
          [".", "Duration", {"stat": "Average", "label": "Avg Duration (ms)"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Metrics",
        "yAxis": {"left": {"min": 0}}
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "Count", {"stat": "Sum", "label": "API Requests"}],
          [".", "4XXError", {"stat": "Sum", "label": "4xx Errors"}],
          [".", "5XXError", {"stat": "Sum", "label": "5xx Errors"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "API Gateway Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", {"stat": "Sum"}],
          [".", "ConsumedWriteCapacityUnits", {"stat": "Sum"}],
          [".", "UserErrors", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "DynamoDB Metrics"
      }
    }
  ]
}
```



### Setting Up Custom Alarms

Create additional alarms for specific use cases:

#### High Log Volume Alarm

Alert when log ingestion rate is unusually high:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Interpose-HighLogVolume \
  --alarm-description "Alert when log volume exceeds 1000 logs per minute" \
  --metric-name Invocations \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=interpose-log-processor \
  --alarm-actions $SNS_TOPIC \
  --region us-east-1
```

#### High-Risk Alert Volume Alarm

Alert when too many high-risk alerts are generated:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Interpose-HighRiskAlertSpike \
  --alarm-description "Alert when SES sends more than 50 emails in 5 minutes" \
  --metric-name Send \
  --namespace AWS/SES \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_TOPIC \
  --region us-east-1
```

#### DynamoDB Storage Size Alarm

Alert when DynamoDB table size grows too large:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Interpose-DynamoDBStorageSize \
  --alarm-description "Alert when DynamoDB table exceeds 10GB" \
  --metric-name TableSize \
  --namespace AWS/DynamoDB \
  --statistic Average \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 10737418240 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=AIObserveLogs \
  --alarm-actions $SNS_TOPIC \
  --region us-east-1
```

### Monitoring Best Practices

1. **Set up multiple notification channels**: Email, SMS, Slack, PagerDuty
2. **Review alarms weekly**: Adjust thresholds based on actual usage patterns
3. **Enable detailed monitoring**: For production environments, enable 1-minute metrics
4. **Create runbooks**: Document response procedures for each alarm
5. **Test alarm notifications**: Manually trigger alarms to verify notifications work
6. **Monitor costs**: Set up billing alarms to avoid unexpected charges

### Testing Alarms

Manually trigger alarms to verify they work:

```bash
# Trigger Lambda error alarm by invoking with invalid input
aws lambda invoke \
  --function-name interpose-log-processor \
  --payload '{"invalid": "data"}' \
  --region us-east-1 \
  response.json

# Check alarm state
aws cloudwatch describe-alarms \
  --alarm-names Interpose-Lambda-ErrorRate \
  --region us-east-1
```



## Post-Deployment Verification

After completing the deployment, verify that all components are working correctly.

### Step 1: Verify Backend API

Test the API endpoints:

```bash
# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
  --output text)

# Test health (should return 404 for root path - this is expected)
curl -i $API_ENDPOINT

# Test authentication endpoint
curl -X POST $API_ENDPOINT/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

Expected response for auth (if customer exists):
```json
{
  "api_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer_id": "cust_xyz789"
}
```

### Step 2: Verify DynamoDB Tables

Check that tables were created:

```bash
# List tables
aws dynamodb list-tables --region us-east-1

# Describe AIObserveLogs table
aws dynamodb describe-table \
  --table-name AIObserveLogs \
  --region us-east-1

# Describe Customers table
aws dynamodb describe-table \
  --table-name Customers \
  --region us-east-1
```

### Step 3: Verify Lambda Function

Test the Lambda function:

```bash
# Get function configuration
aws lambda get-function-configuration \
  --function-name interpose-log-processor \
  --region us-east-1

# Invoke function with test event
aws lambda invoke \
  --function-name interpose-log-processor \
  --payload '{"httpMethod":"GET","path":"/logs","headers":{"X-API-Key":"test"}}' \
  --region us-east-1 \
  response.json

# View response
cat response.json
```

### Step 4: Verify Dashboard

Check that the dashboard is accessible:

```bash
# Get dashboard URL
DASHBOARD_URL=$(aws cloudformation describe-stacks \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
  --output text)

echo "Dashboard URL: $DASHBOARD_URL"

# Test dashboard accessibility
curl -I $DASHBOARD_URL
```

Open the dashboard URL in a browser and verify:
- [ ] Login page loads
- [ ] Can authenticate with customer credentials
- [ ] Dashboard displays after login
- [ ] No console errors in browser developer tools

### Step 5: Verify SES Configuration

Test email sending:

```bash
# Send test email
aws ses send-email \
  --from alerts@example.com \
  --destination ToAddresses=recipient@example.com \
  --message Subject={Data="Interpose Test Email",Charset=utf-8},Body={Text={Data="This is a test email from Interpose.",Charset=utf-8}} \
  --region us-east-1
```

Check that the email was received (check spam folder if not in inbox).

### Step 6: End-to-End Test

Perform a complete end-to-end test:

1. **Deploy a test agent**:
   ```bash
   docker run -d \
     -e INTERPOSE_API_KEY="your-api-key" \
     -e INTERPOSE_BACKEND_URL="$API_ENDPOINT/logs" \
     --name interpose-test-agent \
     interpose-agent:latest
   ```

2. **Generate test AI API calls** (simulate with curl):
   ```bash
   # Simulate agent sending a log
   curl -X POST $API_ENDPOINT/logs \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{
       "log_id": "test-123",
       "ai_service": "openai",
       "endpoint": "https://api.openai.com/v1/chat/completions",
       "data_sources": ["postgres://db.example.com/users"],
       "sensitive_data_types": ["email"],
       "risk_score": 45,
       "request_method": "POST",
       "request_size_bytes": 1024,
       "response_status": 200
     }'
   ```

3. **Verify log appears in DynamoDB**:
   ```bash
   aws dynamodb scan \
     --table-name AIObserveLogs \
     --limit 10 \
     --region us-east-1
   ```

4. **Verify log appears in dashboard**:
   - Open dashboard in browser
   - Log in with customer credentials
   - Check that the test log appears in the activity feed

5. **Test high-risk alert**:
   ```bash
   # Send log with risk_score > 70
   curl -X POST $API_ENDPOINT/logs \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{
       "log_id": "test-456",
       "ai_service": "openai",
       "endpoint": "https://api.openai.com/v1/chat/completions",
       "data_sources": ["postgres://db.example.com/users"],
       "sensitive_data_types": ["ssn", "credit_card"],
       "risk_score": 85,
       "request_method": "POST",
       "request_size_bytes": 2048,
       "response_status": 200
     }'
   ```

6. **Verify alert email was sent**:
   - Check the alert email inbox
   - Verify email contains risk score, AI service, and sensitive data types

### Step 7: Verify CloudWatch Alarms

Check that alarms are active:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix Interpose \
  --region us-east-1 \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

All alarms should be in `OK` state initially.

### Verification Checklist

- [ ] CloudFormation stack deployed successfully
- [ ] DynamoDB tables created (AIObserveLogs, Customers)
- [ ] Lambda function deployed and configured
- [ ] API Gateway endpoints responding
- [ ] S3 bucket created for dashboard
- [ ] CloudFront distribution active
- [ ] SES email address verified
- [ ] Customer account created in database
- [ ] Dashboard accessible via CloudFront URL
- [ ] Can log in to dashboard
- [ ] Can submit logs via API
- [ ] Logs appear in DynamoDB
- [ ] Logs appear in dashboard
- [ ] High-risk alerts sent via email
- [ ] CloudWatch alarms created and active
- [ ] SNS topic subscriptions confirmed



## Troubleshooting

Common issues and solutions for Interpose deployment.

### CloudFormation Deployment Issues

#### Stack Creation Fails

**Symptom**: CloudFormation stack creation fails with error message.

**Solutions**:
1. Check CloudFormation events for specific error:
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name interpose-platform \
     --region us-east-1 \
     --max-items 20
   ```

2. Common causes:
   - **Insufficient IAM permissions**: Ensure your AWS user has all required permissions
   - **Resource limits**: Check AWS service quotas (Lambda functions, DynamoDB tables, etc.)
   - **Stack name already exists**: Use a different stack name or delete the existing stack
   - **Invalid parameters**: Verify email address format and other parameters

3. Delete failed stack and retry:
   ```bash
   aws cloudformation delete-stack \
     --stack-name interpose-platform \
     --region us-east-1
   ```

#### Stack Stuck in CREATE_IN_PROGRESS

**Symptom**: Stack creation takes longer than expected (>15 minutes).

**Solutions**:
1. Check for resource creation issues:
   ```bash
   aws cloudformation describe-stack-resources \
     --stack-name interpose-platform \
     --region us-east-1
   ```

2. Common causes:
   - CloudFront distribution creation (can take 15-20 minutes)
   - DynamoDB table creation with streams enabled
   - IAM role propagation delays

3. Wait for completion or cancellation. If stuck for >30 minutes, contact AWS support.

### Lambda Function Issues

#### Lambda Function Returns Errors

**Symptom**: API requests return 500 errors or Lambda invocation fails.

**Solutions**:
1. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/interpose-log-processor --follow --region us-east-1
   ```

2. Common causes:
   - **Missing environment variables**: Verify LOGS_TABLE, CUSTOMERS_TABLE, ALERT_EMAIL_SOURCE
   - **DynamoDB permissions**: Check Lambda execution role has DynamoDB access
   - **Code deployment issue**: Redeploy Lambda function code
   - **Timeout**: Increase Lambda timeout if processing takes >10 seconds

3. Test Lambda function directly:
   ```bash
   aws lambda invoke \
     --function-name interpose-log-processor \
     --payload '{"httpMethod":"GET","path":"/logs","headers":{"X-API-Key":"test"}}' \
     --region us-east-1 \
     --log-type Tail \
     response.json
   ```

#### Lambda Package Too Large

**Symptom**: Lambda deployment fails with "Unzipped size must be smaller than..." error.

**Solutions**:
1. Use S3 upload instead of direct upload:
   ```bash
   ./deployment/package-lambda.sh --s3-bucket my-lambda-bucket --deploy
   ```

2. Remove unnecessary dependencies from requirements.txt

3. Use Lambda layers for large dependencies

### DynamoDB Issues

#### Access Denied Errors

**Symptom**: Lambda function logs show "AccessDeniedException" for DynamoDB.

**Solutions**:
1. Verify Lambda execution role has DynamoDB permissions:
   ```bash
   aws iam get-role-policy \
     --role-name InterposeLogProcessorRole \
     --policy-name DynamoDBAccess \
     --region us-east-1
   ```

2. Ensure policy includes:
   - `dynamodb:PutItem`
   - `dynamodb:GetItem`
   - `dynamodb:Query`
   - `dynamodb:Scan`

3. Check resource ARNs include both tables and GSIs

#### Throttled Requests

**Symptom**: DynamoDB throttling errors in logs or CloudWatch alarm triggered.

**Solutions**:
1. Check current capacity mode:
   ```bash
   aws dynamodb describe-table \
     --table-name AIObserveLogs \
     --region us-east-1 \
     --query 'Table.BillingModeSummary'
   ```

2. Tables use PAY_PER_REQUEST (on-demand) by default, which auto-scales

3. If throttling persists:
   - Check for hot partition keys
   - Implement exponential backoff in agent
   - Consider switching to provisioned capacity with auto-scaling

### API Gateway Issues

#### CORS Errors

**Symptom**: Dashboard shows CORS errors in browser console.

**Solutions**:
1. Verify OPTIONS methods are configured:
   ```bash
   aws apigateway get-resources \
     --rest-api-id $API_ID \
     --region us-east-1
   ```

2. Check CORS headers in API Gateway responses:
   - `Access-Control-Allow-Origin: *`
   - `Access-Control-Allow-Headers: Content-Type,X-API-Key,...`
   - `Access-Control-Allow-Methods: GET,POST,OPTIONS`

3. Redeploy API Gateway stage:
   ```bash
   aws apigateway create-deployment \
     --rest-api-id $API_ID \
     --stage-name prod \
     --region us-east-1
   ```

#### 401 Unauthorized Errors

**Symptom**: API requests return 401 status.

**Solutions**:
1. Verify API key is correct:
   ```bash
   aws dynamodb scan \
     --table-name Customers \
     --region us-east-1 \
     --projection-expression "email,api_key"
   ```

2. Check X-API-Key header is included in requests

3. Verify customer record exists in Customers table

### SES Issues

#### Email Not Sending

**Symptom**: High-risk alerts not received, SES errors in Lambda logs.

**Solutions**:
1. Verify email address is verified:
   ```bash
   aws ses get-identity-verification-attributes \
     --identities alerts@example.com \
     --region us-east-1
   ```

2. Check SES sending quota:
   ```bash
   aws ses get-send-quota --region us-east-1
   ```

3. Verify Lambda has SES permissions:
   ```bash
   aws iam get-role-policy \
     --role-name InterposeLogProcessorRole \
     --policy-name SESAccess \
     --region us-east-1
   ```

4. Check CloudWatch logs for SES errors:
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/interpose-log-processor \
     --filter-pattern "SES" \
     --region us-east-1
   ```

#### Email in Spam Folder

**Symptom**: Alert emails delivered to spam/junk folder.

**Solutions**:
1. Request production access (move out of sandbox)
2. Configure SPF, DKIM, and DMARC records for your domain
3. Use a verified domain instead of individual email addresses
4. Improve email content (avoid spam trigger words)

### Dashboard Issues

#### Dashboard Not Loading

**Symptom**: CloudFront URL returns error or blank page.

**Solutions**:
1. Verify S3 bucket has files:
   ```bash
   aws s3 ls s3://interpose-dashboard-123456789012/ --recursive
   ```

2. Check CloudFront distribution status:
   ```bash
   aws cloudfront get-distribution \
     --id $DIST_ID \
     --query 'Distribution.Status'
   ```
   Status should be "Deployed"

3. Check browser console for errors (F12 → Console tab)

4. Verify VITE_API_URL was set correctly during build:
   ```bash
   # Check built files for API URL
   grep -r "execute-api" dashboard/dist/
   ```

#### Login Fails

**Symptom**: Dashboard login returns error or doesn't work.

**Solutions**:
1. Verify customer exists in database:
   ```bash
   aws dynamodb query \
     --table-name Customers \
     --index-name EmailIndex \
     --key-condition-expression "email = :email" \
     --expression-attribute-values '{":email":{"S":"admin@example.com"}}' \
     --region us-east-1
   ```

2. Check password hash is correct (bcrypt format)

3. Verify API endpoint is accessible from browser:
   ```bash
   curl -X POST $API_ENDPOINT/auth \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your-password"}'
   ```

4. Check browser network tab for API request/response

#### Dashboard Shows No Data

**Symptom**: Dashboard loads but shows no logs.

**Solutions**:
1. Verify logs exist in DynamoDB:
   ```bash
   aws dynamodb scan \
     --table-name AIObserveLogs \
     --limit 10 \
     --region us-east-1
   ```

2. Check API key is valid and matches customer

3. Verify dashboard is polling API (check browser network tab)

4. Check for JavaScript errors in browser console

### Agent Deployment Issues

#### Agent Can't Connect to Backend

**Symptom**: Agent logs show connection errors or timeouts.

**Solutions**:
1. Verify INTERPOSE_BACKEND_URL is correct:
   ```bash
   echo $INTERPOSE_BACKEND_URL
   # Should be: https://xxx.execute-api.region.amazonaws.com/prod/logs
   ```

2. Test API endpoint accessibility:
   ```bash
   curl -X POST $INTERPOSE_BACKEND_URL \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{"test": "data"}'
   ```

3. Check network connectivity and firewall rules

4. Verify API Gateway is deployed and accessible

#### Agent Not Intercepting Requests

**Symptom**: No logs appearing in dashboard, agent seems inactive.

**Solutions**:
1. Verify agent is running:
   ```bash
   docker ps | grep interpose-agent
   ```

2. Check agent logs:
   ```bash
   docker logs interpose-agent
   ```

3. Verify environment variables are set correctly

4. Ensure application is making HTTP requests to AI services

5. Check that requests library is being used (agent monkey-patches requests)

### Getting Help

If you're still experiencing issues:

1. **Check CloudWatch Logs**: Most issues leave traces in logs
2. **Review AWS Service Health Dashboard**: Check for AWS service outages
3. **Consult AWS Documentation**: For service-specific issues
4. **Open GitHub Issue**: For Interpose-specific problems
5. **Contact AWS Support**: For AWS infrastructure issues



## Cost Estimation

Understanding the costs associated with running Interpose helps with budgeting and optimization.

### Monthly Cost Breakdown (Low Volume)

Estimated costs for a small deployment with moderate usage:

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **DynamoDB** | 1M writes, 5M reads, 5GB storage | $1.25 - $5.00 |
| **Lambda** | 100K invocations, 512MB, 2s avg duration | $0.00 - $2.00 |
| **API Gateway** | 100K requests | $0.35 |
| **S3** | 1GB storage, 10K requests | $0.03 |
| **CloudFront** | 10GB transfer, 100K requests | $0.85 |
| **SES** | 1,000 emails | $0.10 |
| **CloudWatch** | Logs, metrics, alarms | $1.00 - $3.00 |
| **Data Transfer** | Outbound data transfer | $0.50 - $2.00 |
| **Total** | | **$4.08 - $13.33** |

### Monthly Cost Breakdown (Medium Volume)

Estimated costs for a medium deployment with higher usage:

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **DynamoDB** | 10M writes, 50M reads, 50GB storage | $12.50 - $50.00 |
| **Lambda** | 1M invocations, 512MB, 2s avg duration | $8.33 |
| **API Gateway** | 1M requests | $3.50 |
| **S3** | 5GB storage, 100K requests | $0.15 |
| **CloudFront** | 100GB transfer, 1M requests | $8.50 |
| **SES** | 10,000 emails | $1.00 |
| **CloudWatch** | Logs, metrics, alarms | $5.00 - $10.00 |
| **Data Transfer** | Outbound data transfer | $5.00 - $10.00 |
| **Total** | | **$43.98 - $91.48** |

### Cost Optimization Strategies

#### 1. DynamoDB Optimization

**Use TTL for automatic data expiration**:
- Logs are automatically deleted after 90 days
- Reduces storage costs
- Already configured in CloudFormation template

**Monitor read/write patterns**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=AIObserveLogs \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region us-east-1
```

**Consider provisioned capacity for predictable workloads**:
- Switch from on-demand to provisioned if usage is consistent
- Can save 50-70% on costs for steady workloads

#### 2. Lambda Optimization

**Reduce memory allocation if possible**:
```bash
# Test with lower memory (256MB instead of 512MB)
aws lambda update-function-configuration \
  --function-name interpose-log-processor \
  --memory-size 256 \
  --region us-east-1
```

**Optimize cold start times**:
- Use Lambda provisioned concurrency for critical workloads
- Minimize dependencies in Lambda package
- Use Lambda layers for shared dependencies

**Monitor Lambda duration**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=interpose-log-processor \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum \
  --region us-east-1
```

#### 3. CloudFront Optimization

**Use appropriate cache TTLs**:
- Dashboard assets: 1 year cache (already configured)
- index.html: no-cache (already configured)

**Enable compression**:
- Already enabled in CloudFormation template
- Reduces data transfer costs by 50-70%

**Use CloudFront price class**:
```bash
# Use PriceClass_100 (US, Canada, Europe) instead of PriceClass_All
# Already configured in CloudFormation template
```

#### 4. CloudWatch Logs Optimization

**Set log retention period**:
```bash
# Reduce retention from 30 days to 7 days
aws logs put-retention-policy \
  --log-group-name /aws/lambda/interpose-log-processor \
  --retention-in-days 7 \
  --region us-east-1
```

**Filter logs before storage**:
- Only log errors and warnings in production
- Use structured logging for easier filtering

#### 5. SES Optimization

**Use SES in the same region as Lambda**:
- Reduces data transfer costs
- Improves latency

**Batch email sending**:
- If sending multiple alerts, batch them into a single email
- Reduces SES API calls

#### 6. API Gateway Optimization

**Use caching for read-heavy endpoints**:
```bash
aws apigateway update-stage \
  --rest-api-id $API_ID \
  --stage-name prod \
  --patch-operations op=replace,path=/cacheClusterEnabled,value=true \
  --region us-east-1
```

**Note**: API Gateway caching adds $0.02/hour ($14.40/month) but can reduce Lambda invocations

### Cost Monitoring

#### Set Up Billing Alarms

Create a billing alarm to avoid unexpected charges:

```bash
# Create SNS topic for billing alerts
aws sns create-topic \
  --name billing-alerts \
  --region us-east-1

# Subscribe to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:billing-alerts \
  --protocol email \
  --notification-endpoint billing@example.com \
  --region us-east-1

# Create billing alarm (requires CloudWatch in us-east-1)
aws cloudwatch put-metric-alarm \
  --alarm-name Interpose-MonthlyBillingAlarm \
  --alarm-description "Alert when monthly charges exceed $50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-alerts \
  --region us-east-1
```

#### Use AWS Cost Explorer

1. Open AWS Cost Explorer in the AWS Console
2. Filter by service to see Interpose-related costs
3. Use tags to track costs by component:
   - Tag: `Application=Interpose`
   - Tag: `Component=Backend|Dashboard|Storage`

#### Monitor Daily Costs

```bash
# Get cost and usage for the last 7 days
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-08 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --filter file://cost-filter.json
```

Example `cost-filter.json`:
```json
{
  "Tags": {
    "Key": "Application",
    "Values": ["Interpose"]
  }
}
```

### Free Tier Benefits

AWS Free Tier includes:

- **Lambda**: 1M free requests per month, 400,000 GB-seconds compute time
- **DynamoDB**: 25GB storage, 25 read/write capacity units
- **API Gateway**: 1M API calls per month (first 12 months)
- **CloudFront**: 50GB data transfer out, 2M HTTP/HTTPS requests (first 12 months)
- **SES**: 62,000 emails per month (when sending from EC2)
- **CloudWatch**: 10 custom metrics, 10 alarms, 5GB log ingestion

**Note**: Free tier benefits vary by service and may be limited to the first 12 months.

### Cost Comparison: On-Demand vs. Provisioned

For predictable workloads, consider switching to provisioned capacity:

| Scenario | On-Demand Cost | Provisioned Cost | Savings |
|----------|----------------|------------------|---------|
| 1M reads/day | $12.50/month | $4.75/month | 62% |
| 100K writes/day | $12.50/month | $4.75/month | 62% |
| Combined | $25.00/month | $9.50/month | 62% |

**When to use provisioned**:
- Consistent, predictable traffic patterns
- Running for >1 month
- Cost optimization is a priority

**When to use on-demand**:
- Unpredictable traffic patterns
- Spiky workloads
- Development/testing environments



## Additional Resources

### Documentation

- **[User Guide](USER_GUIDE.md)**: How to use the Interpose dashboard and agent
- **[API Reference](API_REFERENCE.md)**: Complete API endpoint documentation
- **[Agent Deployment Guide](../deployment/AGENT_DEPLOYMENT.md)**: Detailed agent deployment instructions
- **[Architecture Documentation](../README.md)**: System architecture and design decisions

### AWS Documentation

- **[CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)**: CloudFormation best practices
- **[Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)**: Lambda function development
- **[DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)**: DynamoDB table design
- **[API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/)**: API Gateway configuration
- **[SES Developer Guide](https://docs.aws.amazon.com/ses/)**: Email sending with SES
- **[CloudWatch User Guide](https://docs.aws.amazon.com/cloudwatch/)**: Monitoring and logging

### Deployment Scripts

All deployment scripts are located in the `deployment/` directory:

- `deploy-backend.sh`: Deploy CloudFormation stack
- `package-lambda.sh`: Package and deploy Lambda function
- `init-database.py`: Initialize customer database
- `build-dashboard.sh`: Build React dashboard
- `upload-dashboard.sh`: Upload dashboard to S3
- `invalidate-cloudfront.sh`: Invalidate CloudFront cache
- `build-lambda-layer.sh`: Build Lambda layer for agent

See `deployment/README.md` for detailed script documentation.

### Infrastructure Templates

CloudFormation templates are located in the `infrastructure/` directory:

- `cloudformation-template.yaml`: Main infrastructure template
- `README.md`: Infrastructure deployment guide

### Support and Community

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions and share experiences
- **AWS Support**: For AWS infrastructure issues
- **Stack Overflow**: Tag questions with `interpose` and `aws`

## Security Considerations

### Best Practices

1. **Use IAM Roles**: Never hardcode AWS credentials
2. **Enable MFA**: Require multi-factor authentication for AWS Console access
3. **Rotate API Keys**: Regularly rotate customer API keys
4. **Use HTTPS**: All communication uses HTTPS (enforced by CloudFront and API Gateway)
5. **Encrypt at Rest**: DynamoDB encryption enabled by default
6. **Encrypt in Transit**: TLS 1.2+ required for all connections
7. **Least Privilege**: Lambda execution role has minimal required permissions
8. **Monitor Access**: Enable CloudTrail for audit logging
9. **Regular Updates**: Keep Lambda runtime and dependencies updated
10. **Backup Data**: Enable DynamoDB point-in-time recovery for production

### Enabling CloudTrail

Enable CloudTrail to audit all API calls:

```bash
aws cloudtrail create-trail \
  --name interpose-audit-trail \
  --s3-bucket-name my-cloudtrail-bucket \
  --is-multi-region-trail \
  --region us-east-1

aws cloudtrail start-logging \
  --name interpose-audit-trail \
  --region us-east-1
```

### Enabling DynamoDB Point-in-Time Recovery

Enable continuous backups for DynamoDB tables:

```bash
aws dynamodb update-continuous-backups \
  --table-name AIObserveLogs \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region us-east-1

aws dynamodb update-continuous-backups \
  --table-name Customers \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region us-east-1
```

### Secrets Management

For production deployments, use AWS Secrets Manager for sensitive configuration:

```bash
# Store alert email configuration
aws secretsmanager create-secret \
  --name interpose/alert-email \
  --secret-string '{"email":"alerts@example.com"}' \
  --region us-east-1

# Update Lambda to read from Secrets Manager
# (requires code changes and additional IAM permissions)
```

## Disaster Recovery

### Backup Strategy

1. **DynamoDB Backups**:
   - Enable point-in-time recovery (continuous backups)
   - Create on-demand backups before major changes
   - Retain backups for 35 days

2. **Lambda Function Code**:
   - Store Lambda deployment packages in S3
   - Version control all code in Git
   - Tag releases for easy rollback

3. **CloudFormation Templates**:
   - Version control templates in Git
   - Export stack templates regularly
   - Document all manual changes

4. **Dashboard Code**:
   - Version control in Git
   - Store built artifacts in S3
   - Tag releases for easy rollback

### Creating On-Demand Backups

```bash
# Backup DynamoDB tables
aws dynamodb create-backup \
  --table-name AIObserveLogs \
  --backup-name aiobservelogs-backup-$(date +%Y%m%d) \
  --region us-east-1

aws dynamodb create-backup \
  --table-name Customers \
  --backup-name customers-backup-$(date +%Y%m%d) \
  --region us-east-1

# Export CloudFormation template
aws cloudformation get-template \
  --stack-name interpose-platform \
  --region us-east-1 \
  --query 'TemplateBody' > backup-template-$(date +%Y%m%d).yaml
```

### Recovery Procedures

#### Restore DynamoDB Table

```bash
# List available backups
aws dynamodb list-backups \
  --table-name AIObserveLogs \
  --region us-east-1

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name AIObserveLogs-Restored \
  --backup-arn arn:aws:dynamodb:us-east-1:123456789012:table/AIObserveLogs/backup/01234567890123-abcdefgh \
  --region us-east-1
```

#### Rollback Lambda Function

```bash
# List function versions
aws lambda list-versions-by-function \
  --function-name interpose-log-processor \
  --region us-east-1

# Update alias to point to previous version
aws lambda update-alias \
  --function-name interpose-log-processor \
  --name prod \
  --function-version 2 \
  --region us-east-1
```

#### Rollback CloudFormation Stack

```bash
# Update stack with previous template
aws cloudformation update-stack \
  --stack-name interpose-platform \
  --template-body file://backup-template-20240101.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Multi-Region Deployment

For high availability, deploy Interpose in multiple AWS regions:

1. **Deploy to secondary region**:
   ```bash
   ./deployment/deploy-backend.sh \
     --stack-name interpose-platform-dr \
     --region us-west-2 \
     --email alerts@example.com
   ```

2. **Set up DynamoDB Global Tables**:
   - Convert tables to global tables
   - Enable replication to secondary region
   - Automatic failover for reads/writes

3. **Configure Route 53 health checks**:
   - Monitor primary region API endpoint
   - Automatic DNS failover to secondary region

4. **Replicate S3 dashboard bucket**:
   - Enable S3 cross-region replication
   - Create CloudFront distribution in secondary region

## Conclusion

You've successfully deployed the Interpose SaaS Platform! Here's a quick recap:

### What You've Deployed

- ✅ **Backend Infrastructure**: Lambda, API Gateway, DynamoDB
- ✅ **Dashboard**: React app hosted on S3 + CloudFront
- ✅ **Monitoring**: CloudWatch alarms and logging
- ✅ **Alerting**: SES email notifications for high-risk events
- ✅ **Security**: IAM roles, HTTPS, encryption at rest and in transit

### Next Steps

1. **Deploy the Agent**: Follow the [Agent Deployment Guide](../deployment/AGENT_DEPLOYMENT.md)
2. **Configure Monitoring**: Subscribe to SNS topics for alarm notifications
3. **Test End-to-End**: Generate test logs and verify they appear in the dashboard
4. **Optimize Costs**: Review usage patterns and adjust resources
5. **Enable Backups**: Set up automated backups for production data
6. **Request SES Production Access**: Move out of sandbox mode for production use
7. **Set Up Custom Domains**: Configure custom domains for API and dashboard (optional)

### Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review CloudWatch Logs for error details
3. Consult the [Additional Resources](#additional-resources)
4. Open a GitHub issue for platform-specific problems
5. Contact AWS Support for infrastructure issues

### Feedback

We'd love to hear about your deployment experience! Please share:

- Deployment time and any challenges faced
- Suggestions for improving this guide
- Feature requests or bug reports
- Success stories and use cases

Thank you for deploying Interpose! 🚀

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Maintained By**: Interpose Team

