#!/bin/bash
# LikenessGuard AWS Deployment Script
# This script packages Lambda functions and deploys the SAM template

set -e  # Exit on error

echo "=========================================="
echo "LikenessGuard AWS Deployment Script"
echo "=========================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed. Please install it first."
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "ERROR: AWS SAM CLI is not installed. Please install it first."
    echo "Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}
echo "✓ AWS Account: $AWS_ACCOUNT_ID"
echo "✓ AWS Region: $AWS_REGION"
echo ""

# Configuration
STACK_NAME="likenessguard-prototype"
S3_BUCKET="likenessguard-deployment-${AWS_ACCOUNT_ID}"
TEMPLATE_FILE="infrastructure/template.yaml"
PACKAGED_TEMPLATE="infrastructure/packaged-template.yaml"

# Create S3 bucket for deployment artifacts if it doesn't exist
echo "Checking deployment bucket..."
if ! aws s3 ls "s3://${S3_BUCKET}" 2>&1 > /dev/null; then
    echo "Creating deployment bucket: ${S3_BUCKET}"
    if [ "$AWS_REGION" == "us-east-1" ]; then
        aws s3 mb "s3://${S3_BUCKET}"
    else
        aws s3 mb "s3://${S3_BUCKET}" --region "${AWS_REGION}"
    fi
    echo "✓ Bucket created"
else
    echo "✓ Bucket exists: ${S3_BUCKET}"
fi
echo ""

# Install Python dependencies
echo "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt -t src/lambdas/dependencies/ --upgrade
    echo "✓ Dependencies installed"
else
    echo "⚠ No requirements.txt found, skipping dependency installation"
fi
echo ""

# Build SAM application
echo "Building SAM application..."
sam build --template-file ${TEMPLATE_FILE}
echo "✓ Build complete"
echo ""

# Package SAM application
echo "Packaging SAM application..."
sam package \
    --template-file .aws-sam/build/template.yaml \
    --s3-bucket ${S3_BUCKET} \
    --output-template-file ${PACKAGED_TEMPLATE}
echo "✓ Package complete"
echo ""

# Deploy SAM application
echo "Deploying SAM application..."
sam deploy \
    --template-file ${PACKAGED_TEMPLATE} \
    --stack-name ${STACK_NAME} \
    --capabilities CAPABILITY_IAM \
    --region ${AWS_REGION} \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
        Environment=prototype

echo ""
echo "✓ Deployment complete!"
echo ""

# Get stack outputs
echo "=========================================="
echo "Stack Outputs:"
echo "=========================================="
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo ""
echo "=========================================="
echo "Deployment Summary:"
echo "=========================================="
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${AWS_REGION}"
echo "S3 Bucket: ${S3_BUCKET}"
echo ""
echo "Next Steps:"
echo "1. Test the API endpoints using the URLs above"
echo "2. Run the demo script: python demo/demo_flow.py"
echo "3. Monitor CloudWatch logs for any issues"
echo "4. Check AWS Free Tier usage in the billing console"
echo ""
echo "To delete the stack:"
echo "  aws cloudformation delete-stack --stack-name ${STACK_NAME} --region ${AWS_REGION}"
echo ""
