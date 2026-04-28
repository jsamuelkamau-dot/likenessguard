# Deploy Registration and Upload Presigned URL Lambda Functions
# This script deploys the fixed Lambda functions that now properly handle S3 uploads

Write-Host "Deploying Registration and Upload Presigned URL Lambda Functions..." -ForegroundColor Cyan

# Navigate to the AWS directory
Set-Location likenessguard-aws

# Create deployment package
Write-Host "`nCreating deployment package..." -ForegroundColor Yellow
if (Test-Path "registration-lambda.zip") {
    Remove-Item "registration-lambda.zip" -Force
}

# Create zip with proper structure
Compress-Archive -Path "src/*" -DestinationPath "registration-lambda.zip" -Force

Write-Host "Deployment package created: registration-lambda.zip" -ForegroundColor Green

# Deploy Registration Lambda
Write-Host "`nDeploying Registration Lambda..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name LikenessGuard-Registration `
    --zip-file fileb://registration-lambda.zip `
    --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Registration Lambda deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to deploy Registration Lambda" -ForegroundColor Red
    exit 1
}

# Deploy Upload Presigned URL Lambda
Write-Host "`nDeploying Upload Presigned URL Lambda..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name LikenessGuard-UploadPresignedUrl `
    --zip-file fileb://registration-lambda.zip `
    --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Upload Presigned URL Lambda deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to deploy Upload Presigned URL Lambda" -ForegroundColor Red
    exit 1
}

# Wait for functions to be ready
Write-Host "`nWaiting for functions to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Get function info
Write-Host "`nRegistration Function Info:" -ForegroundColor Cyan
aws lambda get-function --function-name LikenessGuard-Registration --region us-east-1 --query 'Configuration.[FunctionName,LastModified,CodeSize,LastUpdateStatus]' --output table

Write-Host "`nUpload Presigned URL Function Info:" -ForegroundColor Cyan
aws lambda get-function --function-name LikenessGuard-UploadPresignedUrl --region us-east-1 --query 'Configuration.[FunctionName,LastModified,CodeSize,LastUpdateStatus]' --output table

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test the registration flow in the dashboard"
Write-Host "2. Check CloudWatch logs for any errors"
Write-Host "3. Verify S3 uploads are working correctly"
