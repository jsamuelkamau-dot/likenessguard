# Deploy only the registration Lambda function
Write-Host "Deploying registration Lambda function..." -ForegroundColor Cyan

# Package the Lambda function
Write-Host "Packaging Lambda function..." -ForegroundColor Yellow
$tempDir = "temp-lambda-package"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Create the expected directory structure: lambdas/registration/
New-Item -ItemType Directory -Path "$tempDir/lambdas/registration" -Force | Out-Null

# Copy Lambda handler to the correct location
Copy-Item -Path "src/lambdas/registration/handler.py" -Destination "$tempDir/lambdas/registration/handler.py"

# Copy shared modules to the root
Copy-Item -Path "src/shared" -Destination "$tempDir/shared" -Recurse -Force

# Create ZIP file
$zipFile = "registration-lambda.zip"
if (Test-Path $zipFile) {
    Remove-Item -Force $zipFile
}

Write-Host "Creating ZIP file..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir/*" -DestinationPath $zipFile -Force

# Update Lambda function
Write-Host "Updating Lambda function code..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name LikenessGuard-Registration `
    --zip-file "fileb://$zipFile" `
    --region us-east-1

# Clean up
Remove-Item -Recurse -Force $tempDir
Remove-Item -Force $zipFile

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "Lambda function 'LikenessGuard-Registration' has been updated." -ForegroundColor Green
