# Fix S3 CORS Configuration
Write-Host "Fixing S3 CORS configuration..." -ForegroundColor Cyan

# Get bucket name
$bucketName = "likenessguard-photos-538784191640"

# Create CORS configuration
$corsConfig = @"
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
"@

# Save to file
$corsConfig | Out-File -FilePath "cors-config.json" -Encoding utf8

Write-Host "`nApplying CORS configuration to bucket: $bucketName" -ForegroundColor Yellow

# Apply CORS configuration
aws s3api put-bucket-cors `
    --bucket $bucketName `
    --cors-configuration file://cors-config.json `
    --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "CORS configuration applied successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to apply CORS configuration" -ForegroundColor Red
    exit 1
}

# Verify CORS configuration
Write-Host "`nVerifying CORS configuration..." -ForegroundColor Yellow
aws s3api get-bucket-cors `
    --bucket $bucketName `
    --region us-east-1

# Clean up
Remove-Item "cors-config.json" -Force

Write-Host "`nCORS configuration complete!" -ForegroundColor Green
Write-Host "The dashboard should now be able to upload files to S3." -ForegroundColor Yellow
