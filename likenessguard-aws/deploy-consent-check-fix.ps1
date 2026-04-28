# Deploy Consent Check Lambda with fixed code structure
Write-Host "Deploying Consent Check Lambda with fixed code..." -ForegroundColor Cyan

# Clean up old build artifacts
Write-Host "Cleaning up old artifacts..." -ForegroundColor Yellow
if (Test-Path ".aws-sam/build") {
    Remove-Item -Recurse -Force ".aws-sam/build" -ErrorAction SilentlyContinue
}

# Create temporary directory for packaging
$tempDir = "temp-consent-deploy"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy all source files to temp directory (maintaining structure)
Write-Host "Copying source files..." -ForegroundColor Yellow
Copy-Item -Recurse -Path "src/*" -Destination $tempDir

# Create ZIP file
$zipFile = "consent-check-fixed.zip"
if (Test-Path $zipFile) {
    Remove-Item -Force $zipFile
}

Write-Host "Creating deployment package..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir/*" -DestinationPath $zipFile

# Update Lambda function
Write-Host "Updating Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name LikenessGuard-ConsentCheck `
    --zip-file fileb://$zipFile `
    --region us-east-1

# Wait for update to complete
Write-Host "Waiting for Lambda to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check status
$status = aws lambda get-function --function-name LikenessGuard-ConsentCheck --region us-east-1 --query "Configuration.LastUpdateStatus" --output text
Write-Host "Lambda status: $status" -ForegroundColor $(if ($status -eq "Successful") { "Green" } else { "Yellow" })

# Clean up
Remove-Item -Recurse -Force $tempDir
Remove-Item -Force $zipFile

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test the consent check with:" -ForegroundColor Yellow
Write-Host "  node likenessguard-dashboard/test-consent-check-real.cjs"
