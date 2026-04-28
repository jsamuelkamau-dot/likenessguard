# Interpose Backend Deployment Scripts

This directory contains scripts for deploying the Interpose SaaS Platform backend infrastructure.

## Scripts Overview

### 1. deploy-backend.sh
Deploys the CloudFormation stack for the Interpose backend infrastructure.

**Features:**
- Parameter validation
- Stack creation and update support
- Wait logic for stack operations
- Output extraction and display
- Error handling with colored output

**Usage:**
```bash
# Deploy with default settings
./deployment/deploy-backend.sh

# Deploy with custom parameters
./deployment/deploy-backend.sh \
  --stack-name my-interpose \
  --region us-west-2 \
  --email security@example.com

# Display help
./deployment/deploy-backend.sh --help
```

**Options:**
- `-s, --stack-name NAME`: CloudFormation stack name (default: interpose-platform)
- `-r, --region REGION`: AWS region (default: us-east-1)
- `-e, --email EMAIL`: Alert email address (default: alerts@interpose.io)
- `-t, --template FILE`: CloudFormation template file (default: infrastructure/cloudformation-template.yaml)
- `-h, --help`: Display help message

### 2. package-lambda.sh
Packages the Lambda function code and dependencies for deployment.

**Features:**
- Dependency installation to package directory
- Package size optimization (removes tests, docs, cache files)
- ZIP file creation
- Optional S3 upload
- Optional direct Lambda deployment
- Size validation (warns if >50MB)

**Usage:**
```bash
# Package Lambda function
./deployment/package-lambda.sh

# Package and upload to S3
./deployment/package-lambda.sh --s3-bucket my-lambda-bucket

# Package and deploy to Lambda
./deployment/package-lambda.sh --deploy

# Package, upload to S3, and deploy
./deployment/package-lambda.sh \
  --s3-bucket my-lambda-bucket \
  --deploy \
  --stack-name interpose-platform \
  --region us-east-1

# Display help
./deployment/package-lambda.sh --help
```

**Options:**
- `-b, --backend-dir DIR`: Backend source directory (default: backend)
- `-o, --output FILE`: Output ZIP file name (default: lambda-deployment.zip)
- `-s, --s3-bucket BUCKET`: S3 bucket for uploading package (optional)
- `-d, --deploy`: Deploy to Lambda function after packaging
- `-n, --stack-name NAME`: CloudFormation stack name (default: interpose-platform)
- `-r, --region REGION`: AWS region (default: us-east-1)
- `-h, --help`: Display help message

### 3. init-database.py
Initializes the Customers DynamoDB table with an initial customer account.

**Features:**
- Secure password generation
- Bcrypt password hashing
- API key generation
- Customer record creation
- Duplicate email detection
- Credentials file output

**Usage:**
```bash
# Initialize with default settings (generates random password)
python deployment/init-database.py

# Initialize with custom parameters
python deployment/init-database.py \
  --email admin@example.com \
  --password MySecurePassword123! \
  --company "My Company" \
  --stack-name interpose-platform \
  --region us-east-1

# Display help
python deployment/init-database.py --help
```

**Options:**
- `--email EMAIL`: Customer email address (default: admin@interpose.io)
- `--password PASSWORD`: Customer password (default: randomly generated)
- `--company COMPANY`: Company name (default: Interpose Demo)
- `--stack-name NAME`: CloudFormation stack name (default: interpose-platform)
- `--region REGION`: AWS region (default: us-east-1)
- `--help`: Display help message

**Output:**
- Displays customer credentials in terminal
- Saves credentials to `deployment/customer-credentials.txt`
- **IMPORTANT:** Delete the credentials file after saving the information securely!

### 4. build-dashboard.sh
Builds the React dashboard for production deployment.

**Features:**
- Auto-detects API endpoint from CloudFormation stack
- Sets production environment variables
- Installs npm dependencies if needed
- Runs Vite build process
- Validates build output
- Displays build statistics

**Usage:**
```bash
# Build with auto-detected API URL
./deployment/build-dashboard.sh

# Build with explicit API URL
./deployment/build-dashboard.sh --api-url https://api.example.com

# Build with custom stack name
./deployment/build-dashboard.sh \
  --stack-name my-interpose \
  --region us-west-2

# Display help
./deployment/build-dashboard.sh --help
```

**Options:**
- `-a, --api-url URL`: API endpoint URL (auto-detected from stack if not provided)
- `-s, --stack-name NAME`: CloudFormation stack name (default: interpose-platform)
- `-r, --region REGION`: AWS region (default: us-east-1)
- `-d, --dashboard-dir DIR`: Dashboard directory (default: dashboard)
- `-h, --help`: Display help message

**Output:**
- Build files in `dashboard/dist/`
- Build statistics (size, file count)

### 5. upload-dashboard.sh
Uploads built dashboard files to S3 with appropriate cache headers.

**Features:**
- Auto-detects S3 bucket from CloudFormation stack
- Uploads index.html with no-cache headers
- Uploads assets with long cache (1 year, immutable)
- Sets appropriate content-type headers
- Validates bucket access
- Displays upload statistics

**Usage:**
```bash
# Upload with auto-detected bucket
./deployment/upload-dashboard.sh

# Upload with explicit bucket name
./deployment/upload-dashboard.sh --bucket my-dashboard-bucket

# Upload with custom stack name
./deployment/upload-dashboard.sh \
  --stack-name my-interpose \
  --region us-west-2

# Display help
./deployment/upload-dashboard.sh --help
```

**Options:**
- `-b, --bucket NAME`: S3 bucket name (auto-detected from stack if not provided)
- `-s, --stack-name NAME`: CloudFormation stack name (default: interpose-platform)
- `-r, --region REGION`: AWS region (default: us-east-1)
- `-d, --dashboard-dir DIR`: Dashboard build directory (default: dashboard/dist)
- `-h, --help`: Display help message

**Cache Strategy:**
- `index.html`: no-cache (always fetch latest)
- Assets (JS, CSS, images): max-age=31536000 (1 year, immutable)
- Other files: max-age=3600 (1 hour)

### 6. invalidate-cloudfront.sh
Invalidates CloudFront cache after dashboard deployment.

**Features:**
- Auto-detects CloudFront distribution from CloudFormation stack
- Creates invalidation for specified paths
- Waits for invalidation to complete (optional)
- Displays invalidation status
- Shows dashboard URL

**Usage:**
```bash
# Invalidate all paths with auto-detected distribution
./deployment/invalidate-cloudfront.sh

# Invalidate specific paths
./deployment/invalidate-cloudfront.sh --paths "/index.html /assets/*"

# Invalidate with explicit distribution ID
./deployment/invalidate-cloudfront.sh --distribution-id E1234567890ABC

# Invalidate with custom stack name
./deployment/invalidate-cloudfront.sh \
  --stack-name my-interpose \
  --region us-east-1

# Display help
./deployment/invalidate-cloudfront.sh --help
```

**Options:**
- `-i, --distribution-id ID`: CloudFront distribution ID (auto-detected from stack if not provided)
- `-s, --stack-name NAME`: CloudFormation stack name (default: interpose-platform)
- `-r, --region REGION`: AWS region (default: us-east-1)
- `-p, --paths PATHS`: Paths to invalidate (default: /*)
- `-h, --help`: Display help message

**Note:** Invalidation may take several minutes to complete. The script will wait up to 10 minutes.

## Complete Deployment Workflow

Follow these steps to deploy the complete Interpose backend:

### Step 1: Deploy CloudFormation Stack
```bash
./deployment/deploy-backend.sh \
  --stack-name interpose-platform \
  --region us-east-1 \
  --email alerts@example.com
```

This creates:
- DynamoDB tables (AIObserveLogs, Customers)
- Lambda function (with placeholder code)
- API Gateway
- S3 bucket for dashboard
- CloudFront distribution
- IAM roles and policies

### Step 2: Package and Deploy Lambda Function
```bash
./deployment/package-lambda.sh --deploy
```

This:
- Installs Python dependencies
- Packages Lambda function code
- Deploys to the Lambda function created in Step 1

### Step 3: Initialize Database
```bash
python deployment/init-database.py \
  --email admin@example.com \
  --company "My Company"
```

This:
- Creates an initial customer account
- Generates API key for agent authentication
- Saves credentials to file

### Step 4: Verify SES Email (if using custom email)
```bash
aws ses verify-email-identity \
  --email-address alerts@example.com \
  --region us-east-1
```

Check your email for verification link and click it.

### Step 5: Build Dashboard
```bash
./deployment/build-dashboard.sh
```

This:
- Auto-detects API endpoint from CloudFormation stack
- Sets production environment variables (VITE_API_URL)
- Installs npm dependencies
- Builds React app with Vite
- Outputs to dashboard/dist/

### Step 6: Upload Dashboard to S3
```bash
./deployment/upload-dashboard.sh
```

This:
- Auto-detects S3 bucket from CloudFormation stack
- Uploads index.html with no-cache headers
- Uploads assets (JS/CSS/images) with 1-year cache
- Sets appropriate content-type headers

### Step 7: Invalidate CloudFront Cache
```bash
./deployment/invalidate-cloudfront.sh
```

This:
- Auto-detects CloudFront distribution from stack
- Invalidates all paths (/*) to clear cache
- Waits for invalidation to complete
- Displays dashboard URL

## Prerequisites

### Required Tools
- **AWS CLI**: Version 2.x or higher
- **Python 3**: Version 3.11 or higher
- **pip3**: Python package installer
- **Node.js**: Version 18.x or higher (for dashboard build)
- **npm**: Node package manager (for dashboard build)
- **zip**: ZIP compression utility
- **jq**: JSON processor (for parsing CloudFormation outputs)

### AWS Credentials
Configure AWS credentials before running scripts:
```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### IAM Permissions
Your AWS user/role needs permissions for:
- CloudFormation (create/update/delete stacks)
- DynamoDB (create tables, put items, query)
- Lambda (create/update functions)
- API Gateway (create APIs)
- S3 (create buckets, upload objects)
- CloudFront (create distributions)
- IAM (create roles and policies)
- SES (send emails, verify identities)
- CloudWatch Logs (create log groups)

## Troubleshooting

### CloudFormation Stack Creation Fails
- Check CloudWatch Logs for Lambda errors
- Verify IAM permissions
- Check if stack name already exists
- Review CloudFormation events in AWS Console

### Lambda Package Too Large
- Use S3 upload instead of direct upload
- Remove unnecessary dependencies
- Consider using Lambda layers for large dependencies

### Database Initialization Fails
- Ensure CloudFormation stack is deployed
- Verify AWS credentials have DynamoDB permissions
- Check if customer email already exists

### SES Email Not Sending
- Verify email address in SES
- Check if account is in SES sandbox mode (limits sending)
- Review CloudWatch logs for SES errors

### Dashboard Build Fails
- Ensure Node.js and npm are installed
- Check Node.js version (requires 18.x or higher)
- Delete `node_modules` and run `npm install` again
- Check for TypeScript compilation errors

### Dashboard Upload Fails
- Ensure build was successful (check `dashboard/dist/` exists)
- Verify S3 bucket exists and is accessible
- Check AWS credentials have S3 permissions
- Verify bucket policy allows uploads

### CloudFront Invalidation Fails
- Verify CloudFront distribution exists
- Check AWS credentials have CloudFront permissions
- Ensure distribution ID is correct
- Wait for previous invalidations to complete

## Output Files

The scripts generate the following files:

- `lambda-deployment.zip`: Lambda function deployment package
- `deployment/stack-outputs.json`: CloudFormation stack outputs
- `deployment/customer-credentials.txt`: Initial customer credentials (delete after use!)

## Security Notes

1. **Credentials File**: The `customer-credentials.txt` file contains sensitive information. Delete it after saving the credentials securely.

2. **API Keys**: Store API keys securely. Never commit them to version control.

3. **SES Sandbox**: By default, AWS SES accounts are in sandbox mode, which restricts email sending. Request production access if needed.

4. **IAM Permissions**: Follow the principle of least privilege when configuring IAM permissions.

5. **CloudFormation Templates**: Review templates before deployment to understand what resources will be created.

## Cost Considerations

Estimated monthly costs for low-volume usage:
- DynamoDB: $1-5 (on-demand pricing)
- Lambda: $0-2 (first 1M requests free)
- API Gateway: $3.50 per million requests
- S3: $0.023 per GB stored
- CloudFront: $0.085 per GB transferred
- SES: $0.10 per 1,000 emails

**Total estimated cost: $5-20/month for small deployments**

## Additional Resources

- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Interpose Main Documentation](../README.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review CloudWatch Logs for error details
3. Refer to the main project documentation
4. Open an issue in the repository
