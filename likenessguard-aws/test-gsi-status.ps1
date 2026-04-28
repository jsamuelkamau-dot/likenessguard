#!/usr/bin/env pwsh
# Test script to check GSI status and query performance

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LikenessGuard - GSI Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check GSI status
Write-Host "Checking LikenessIDIndex status..." -ForegroundColor Yellow

try {
    $gsiStatus = aws dynamodb describe-table `
        --table-name LikenessGuard-AuditLog `
        --query 'Table.GlobalSecondaryIndexes[?IndexName==`LikenessIDIndex`].IndexStatus' `
        --output text 2>$null

    if ([string]::IsNullOrEmpty($gsiStatus)) {
        Write-Host "❌ GSI not found. Has the deployment completed?" -ForegroundColor Red
        exit 1
    }
    elseif ($gsiStatus -eq "CREATING") {
        Write-Host "⏳ GSI is being created. Please wait..." -ForegroundColor Yellow
        Write-Host "   This typically takes 5-10 minutes." -ForegroundColor Cyan
        exit 0
    }
    elseif ($gsiStatus -eq "ACTIVE") {
        Write-Host "✅ GSI is ACTIVE and ready to use!" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  GSI status: $gsiStatus" -ForegroundColor Yellow
        exit 1
    }

    Write-Host ""
    Write-Host "Checking GSI details..." -ForegroundColor Yellow
    aws dynamodb describe-table `
        --table-name LikenessGuard-AuditLog `
        --query 'Table.GlobalSecondaryIndexes[?IndexName==`LikenessIDIndex`]' `
        --output json

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "GSI is ready! Activity Logs should now work." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}
catch {
    Write-Host "Error checking GSI status: $_" -ForegroundColor Red
    exit 1
}
