#!/usr/bin/env pwsh
# Deploy GSI fix for Activity Logs
# This script deploys the LikenessIDIndex GSI to enable efficient audit log queries

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LikenessGuard - Deploy GSI Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "infrastructure/template.yaml")) {
    Write-Host "Error: Must run from likenessguard-aws directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Building SAM application..." -ForegroundColor Yellow
sam build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: SAM build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Deploying to AWS..." -ForegroundColor Yellow
Write-Host "Note: GSI creation may take a few minutes" -ForegroundColor Cyan
sam deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: SAM deploy failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The LikenessIDIndex GSI is being created." -ForegroundColor Cyan
Write-Host "This process may take 5-10 minutes." -ForegroundColor Cyan
Write-Host ""
Write-Host "You can check the status in the AWS Console:" -ForegroundColor Yellow
Write-Host "  DynamoDB > Tables > LikenessGuard-AuditLog > Indexes" -ForegroundColor White
Write-Host ""
Write-Host "Once the GSI status shows 'ACTIVE', the Activity Logs" -ForegroundColor Yellow
Write-Host "page will display audit records efficiently." -ForegroundColor Yellow
Write-Host ""
