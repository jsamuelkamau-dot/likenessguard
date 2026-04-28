Write-Host "Step 3: Building SAM application..." -ForegroundColor Yellow
sam build --template-file infrastructure/template.yaml

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: SAM build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build completed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Deploying to AWS..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes..." -ForegroundColor Cyan
sam deploy --stack-name likenessguard-prototype --no-confirm-changeset --no-fail-on-empty-changeset --capabilities CAPABILITY_NAMED_IAM

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The GET /consent endpoint is now available at:" -ForegroundColor Cyan
Write-Host "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/consent?likeness_id=<ID>" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test with:" -ForegroundColor Cyan
Write-Host 'curl "https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1/consent?likeness_id=<YOUR_LIKENESS_ID>"' -ForegroundColor Yellow
Write-Host ""
