# Quick Lambda update script
Write-Host "Updating Lambda function code..." -ForegroundColor Cyan

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Yellow
$tempDir = "temp-deploy"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy source files
Copy-Item -Recurse -Path "src\*" -Destination $tempDir

# Create ZIP file
$zipFile = "lambda-deployment.zip"
if (Test-Path $zipFile) {
    Remove-Item -Force $zipFile
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile

# Update Lambda function
Write-Host "Updating Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name LikenessGuard-Registration `
    --zip-file fileb://$zipFile `
    --region us-east-1

# Clean up
Remove-Item -Recurse -Force $tempDir
Remove-Item -Force $zipFile

Write-Host "Lambda function updated successfully!" -ForegroundColor Green
