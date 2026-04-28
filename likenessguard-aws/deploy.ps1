# LikenessGuard AWS Deployment Script (PowerShell)
# This script packages Lambda functions and deploys the SAM template

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "LikenessGuard AWS Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $null = Get-Command aws -ErrorAction Stop
    Write-Host "✓ AWS CLI found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if SAM CLI is installed
try {
    $null = Get-Command sam -ErrorAction Stop
    Write-Host "✓ SAM CLI found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS SAM CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $AWS_ACCOUNT_ID = $identity.Account
    Write-Host "✓ AWS Account: $AWS_ACCOUNT_ID" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Configuration
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$STACK_NAME = "likenessguard-prototype"
$S3_BUCKET = "likenessguard-deployment-$AWS_ACCOUNT_ID"
$TEMPLATE_FILE = "infrastructure/template.yaml"
$PACKAGED_TEMPLATE = "infrastructure/packaged-template.yaml"

Write-Host "✓ AWS Region: $AWS_REGION" -ForegroundColor Green
Write-Host ""

# Create S3 bucket for deployment artifacts if it doesn't exist
Write-Host "Checking deployment bucket..." -ForegroundColor Yellow
$bucketExists = $false
try {
    aws s3 ls "s3://$S3_BUCKET" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $bucketExists = $true
    }
} catch {
    $bucketExists = $false
}

if ($bucketExists) {
    Write-Host "✓ Bucket exists: $S3_BUCKET" -ForegroundColor Green
} else {
    Write-Host "Creating deployment bucket: $S3_BUCKET" -ForegroundColor Yellow
    if ($AWS_REGION -eq "us-east-1") {
        aws s3 mb "s3://$S3_BUCKET"
    } else {
        aws s3 mb "s3://$S3_BUCKET" --region $AWS_REGION
    }
    Write-Host "✓ Bucket created" -ForegroundColor Green
}
Write-Host ""

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt -t src/lambdas/dependencies/ --upgrade
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ No requirements.txt found, skipping dependency installation" -ForegroundColor Yellow
}
Write-Host ""

# Build SAM application
Write-Host "Building SAM application..." -ForegroundColor Yellow
sam build --template-file $TEMPLATE_FILE
Write-Host "✓ Build complete" -ForegroundColor Green
Write-Host ""

# Package SAM application
Write-Host "Packaging SAM application..." -ForegroundColor Yellow
sam package `
    --template-file .aws-sam/build/template.yaml `
    --s3-bucket $S3_BUCKET `
    --output-template-file $PACKAGED_TEMPLATE
Write-Host "✓ Package complete" -ForegroundColor Green
Write-Host ""

# Deploy SAM application
Write-Host "Deploying SAM application..." -ForegroundColor Yellow
sam deploy `
    --template-file $PACKAGED_TEMPLATE `
    --stack-name $STACK_NAME `
    --capabilities CAPABILITY_IAM `
    --region $AWS_REGION `
    --no-fail-on-empty-changeset `
    --parameter-overrides Environment=prototype

Write-Host ""
Write-Host "✓ Deployment complete!" -ForegroundColor Green
Write-Host ""

# Get stack outputs
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Stack Outputs:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
aws cloudformation describe-stacks `
    --stack-name $STACK_NAME `
    --region $AWS_REGION `
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' `
    --output table

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Stack Name: $STACK_NAME"
Write-Host "Region: $AWS_REGION"
Write-Host "S3 Bucket: $S3_BUCKET"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the API endpoints using the URLs above"
Write-Host "2. Run the demo script: python demo/demo_flow.py"
Write-Host "3. Monitor CloudWatch logs for any issues"
Write-Host "4. Check AWS Free Tier usage in the billing console"
Write-Host ""
Write-Host "To delete the stack:" -ForegroundColor Yellow
Write-Host "  aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION"
Write-Host ""
