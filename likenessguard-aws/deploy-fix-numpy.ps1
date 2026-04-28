#!/usr/bin/env pwsh
# Deploy Lambda function with numpy import fix

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Lambda Fix: Remove numpy import" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get stack name
$stackName = "likenessguard-stack"

Write-Host "Building Lambda deployment package..." -ForegroundColor Yellow
sam build --template-file infrastructure/template.yaml

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying to AWS..." -ForegroundColor Yellow
sam deploy --stack-name $stackName --no-confirm-changeset --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The numpy import has been removed from the registration Lambda." -ForegroundColor White
Write-Host "The system now uses only Python standard library (hashlib) for fallback fingerprinting." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test registration with any photo" -ForegroundColor White
Write-Host "2. Check Lambda logs: .\check-logs.ps1" -ForegroundColor White
Write-Host ""
