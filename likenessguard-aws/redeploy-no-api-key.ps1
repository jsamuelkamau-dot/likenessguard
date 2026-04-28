# Redeploy CloudFormation stack with API key disabled
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "REDEPLOYING LIKENESSGUARD WITH API KEY DISABLED" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Change to infrastructure directory
Set-Location infrastructure

Write-Host "Building SAM application..." -ForegroundColor Yellow
sam build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying to AWS..." -ForegroundColor Yellow
sam deploy --stack-name likenessguard-prototype --resolve-s3 --no-confirm-changeset --capabilities CAPABILITY_NAMED_IAM --region us-east-1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "API key requirement has been disabled." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Wait 30 seconds for deployment to propagate" -ForegroundColor White
Write-Host "2. Test registration at http://localhost:5173/register" -ForegroundColor White
Write-Host "3. Check browser console for any errors" -ForegroundColor White
Write-Host ""
