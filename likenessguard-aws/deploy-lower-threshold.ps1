# Deploy Lambda with Lower Confidence Threshold (50%)
# This script deploys the registration Lambda with a more permissive face detection threshold

Write-Host "=== Deploying Lambda with 50% Confidence Threshold ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating deployment package..." -ForegroundColor Yellow
Set-Location -Path "src"

# Create zip file
if (Test-Path "../lambda-deployment.zip") {
    Remove-Item "../lambda-deployment.zip"
}

# Use 7zip if available, otherwise use Compress-Archive
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    7z a -tzip ../lambda-deployment.zip * -r
} else {
    Compress-Archive -Path * -DestinationPath ../lambda-deployment.zip -Force
}

Set-Location -Path ".."

if (Test-Path "lambda-deployment.zip") {
    $zipSize = (Get-Item "lambda-deployment.zip").Length / 1MB
    Write-Host "✓ Deployment package created: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create deployment package" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying to AWS Lambda..." -ForegroundColor Yellow

# Update Lambda function
aws lambda update-function-code `
    --function-name LikenessGuard-Registration `
    --zip-file fileb://lambda-deployment.zip `
    --output json | ConvertFrom-Json | Select-Object FunctionName, CodeSize, LastUpdateStatus, LastModified | Format-List

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Lambda function updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes deployed:" -ForegroundColor Cyan
    Write-Host "  • Confidence threshold lowered from 70% to 50%" -ForegroundColor Gray
    Write-Host "  • More permissive face detection" -ForegroundColor Gray
    Write-Host "  • Should work with lower quality photos" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Please try uploading photos again through the dashboard." -ForegroundColor Yellow
} else {
    Write-Host "✗ Failed to update Lambda function" -ForegroundColor Red
    exit 1
}

# Cleanup
Remove-Item "lambda-deployment.zip" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
