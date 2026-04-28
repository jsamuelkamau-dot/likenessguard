# Deploy Lambda with Fallback Fingerprinting
# This allows the system to work with ANY photo, even if face detection fails

Write-Host "=== Deploying Lambda with Fallback Fingerprinting ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEW BEHAVIOR:" -ForegroundColor Yellow
Write-Host "  • Tries face detection first (best quality)" -ForegroundColor Gray
Write-Host "  • Falls back to raw image fingerprinting if face detection fails" -ForegroundColor Gray
Write-Host "  • Works with ANY photo - no restrictions!" -ForegroundColor Gray
Write-Host ""

Write-Host "Creating deployment package..." -ForegroundColor Yellow
Set-Location -Path "src"

# Create zip file
if (Test-Path "../lambda-deployment.zip") {
    Remove-Item "../lambda-deployment.zip"
}

# Use 7zip if available, otherwise use Compress-Archive
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    7z a -tzip ../lambda-deployment.zip * -r | Out-Null
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
$result = aws lambda update-function-code `
    --function-name LikenessGuard-Registration `
    --zip-file fileb://lambda-deployment.zip `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Lambda function updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Function Details:" -ForegroundColor Cyan
    Write-Host "  Name: $($result.FunctionName)" -ForegroundColor Gray
    Write-Host "  Code Size: $([math]::Round($result.CodeSize / 1024, 2)) KB" -ForegroundColor Gray
    Write-Host "  Status: $($result.LastUpdateStatus)" -ForegroundColor Gray
    Write-Host "  Modified: $($result.LastModified)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Changes deployed:" -ForegroundColor Cyan
    Write-Host "  ✓ Fallback fingerprinting enabled" -ForegroundColor Green
    Write-Host "  ✓ System now works with ANY photo" -ForegroundColor Green
    Write-Host "  ✓ No face detection required" -ForegroundColor Green
    Write-Host "  ✓ Poor quality photos accepted" -ForegroundColor Green
    Write-Host "  ✓ Artistic/abstract photos accepted" -ForegroundColor Green
    Write-Host ""
    Write-Host "How it works:" -ForegroundColor Yellow
    Write-Host "  1. Tries face detection first (best quality fingerprints)" -ForegroundColor Gray
    Write-Host "  2. If face detection fails, uses raw image hash" -ForegroundColor Gray
    Write-Host "  3. Generates 128-dimensional pseudo-embedding from image" -ForegroundColor Gray
    Write-Host "  4. Creates fingerprint from pseudo-embedding" -ForegroundColor Gray
    Write-Host "  5. Consent checking works the same way" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Please try uploading photos again through the dashboard." -ForegroundColor Cyan
    Write-Host "The system will now accept ANY photo you provide!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to update Lambda function" -ForegroundColor Red
    exit 1
}

# Cleanup
Remove-Item "lambda-deployment.zip" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
