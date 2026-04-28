# LikenessGuard AWS Deployment Script (PowerShell) - Simplified Version
# This script packages Lambda functions and deploys the SAM template

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "LikenessGuard AWS Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
$awsVersion = aws --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS CLI is not installed." -ForegroundColor Red
    Write-Host "Visit: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green

# Check if SAM CLI is installed
Write-Host "Checking SAM CLI..." -ForegroundColor Yellow
$samVersion = sam --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS SAM CLI is not installed." -ForegroundColor Red
    Write-Host "Visit: https://docs.aws.amazon.com/serverless-application-model/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ SAM CLI found: $samVersion" -ForegroundColor Green

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --output json 2>&1 | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS credentials not configured." -ForegroundColor Red
    Write-Host "Run 'aws configure' first." -ForegroundColor Yellow
    exit 1
}
$AWS_ACCOUNT_ID = $identity.Account
Write-Host "✓ AWS Account: $AWS_ACCOUNT_ID" -ForegroundColor Green

# Configuration
if ($env:AWS_REGION) {
    $AWS_REGION = $env:AWS_REGION
} else {
    $AWS_REGION = "us-east-1"
}
$STACK_NAME = "likenessguard-prototype"
$S3_BUCKET = "likenessguard-deployment-$AWS_ACCOUNT_ID"
$TEMPLATE_FILE = "infrastructure/template.yaml"

Write-Host "✓ AWS Region: $AWS_REGION" -ForegroundColor Green
Write-Host ""

# Create S3 bucket for deployment artifacts if it doesn't exist
Write-Host "Checking deployment bucket..." -ForegroundColor Yellow
aws s3 ls "s3://$S3_BUCKET" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating deployment bucket: $S3_BUCKET" -ForegroundColor Yellow
    if ($AWS_REGION -eq "us-east-1") {
        aws s3 mb "s3://$S3_BUCKET"
    } else {
        aws s3 mb "s3://$S3_BUCKET" --region $AWS_REGION
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Bucket created" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create bucket" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Bucket exists: $S3_BUCKET" -ForegroundColor Green
}
Write-Host ""

# Build SAM application
Write-Host "Building SAM application..." -ForegroundColor Yellow
sam build --template-file $TEMPLATE_FILE
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: SAM build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build complete" -ForegroundColor Green
Write-Host ""

# Deploy SAM application (using sam deploy --guided for first time)
Write-Host "Deploying SAM application..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

sam deploy `
    --template-file .aws-sam/build/template.yaml `
    --stack-name $STACK_NAME `
    --s3-bucket $S3_BUCKET `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $AWS_REGION `
    --no-fail-on-empty-changeset `
    --parameter-overrides Environment=prototype

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    Write-Host "Check the error messages above for details" -ForegroundColor Yellow
    exit 1
}

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
Write-Host "Stack Name: $STACK_NAME" -ForegroundColor White
Write-Host "Region: $AWS_REGION" -ForegroundColor White
Write-Host "S3 Bucket: $S3_BUCKET" -ForegroundColor White
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
Write-Host "Deployment completed successfully!" -ForegroundColor Green

