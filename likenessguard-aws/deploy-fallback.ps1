# Deploy Lambda with Fallback Fingerprinting

Write-Host "=== Deploying Lambda with Fallback Fingerprinting ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating deployment package..." -ForegroundColor Yellow
Set-Location -Path "src"

if (Test-Path "../lambda-deployment.zip") {
    Remove-Item "../lambda-deployment.zip"
}

Compress-Archive -Path * -DestinationPath ../lambda-deployment.zip -Force

Set-Location -Path ".."

Write-Host "Deploying to AWS Lambda..." -ForegroundColor Yellow

aws lambda update-function-code `
    --function-name LikenessGuard-Registration `
    --zip-file fileb://lambda-deployment.zip

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Lambda function updated" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes deployed:" -ForegroundColor Cyan
    Write-Host "  - Fallback fingerprinting enabled" -ForegroundColor Gray
    Write-Host "  - System now works with ANY photo" -ForegroundColor Gray
    Write-Host "  - No face detection required" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Try uploading photos again!" -ForegroundColor Green
} else {
    Write-Host "Failed to update Lambda function" -ForegroundColor Red
}

Remove-Item "lambda-deployment.zip" -ErrorAction SilentlyContinue
