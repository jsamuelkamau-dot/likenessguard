# Build script to package Interpose agent as AWS Lambda layer (PowerShell)

Write-Host "Building Interpose Lambda Layer..." -ForegroundColor Cyan

# Clean up previous builds
if (Test-Path "layer") {
    Remove-Item -Recurse -Force layer
}
if (Test-Path "interpose-lambda-layer.zip") {
    Remove-Item -Force interpose-lambda-layer.zip
}

# Create layer directory structure
New-Item -ItemType Directory -Path "layer\python" -Force | Out-Null

# Install dependencies to layer/python directory
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install requests>=2.31.0 boto3>=1.34.0 -t layer\python --quiet

# Copy agent code to layer/python
Write-Host "Copying agent code..." -ForegroundColor Yellow
Copy-Item -Recurse -Path "interpose" -Destination "layer\python\"

# Remove test files and cache from layer
Write-Host "Cleaning up test files..." -ForegroundColor Yellow
Get-ChildItem -Path "layer\python" -Directory -Recurse -Filter "tests" | Remove-Item -Recurse -Force
Get-ChildItem -Path "layer\python" -Directory -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force
Get-ChildItem -Path "layer\python" -File -Recurse -Filter "*.pyc" | Remove-Item -Force
Get-ChildItem -Path "layer\python" -File -Recurse -Filter "*.pyo" | Remove-Item -Force

# Create ZIP file with correct structure
Write-Host "Creating ZIP file..." -ForegroundColor Yellow
Compress-Archive -Path "layer\python" -DestinationPath "interpose-lambda-layer.zip" -Force

# Get ZIP file size
$size = (Get-Item "interpose-lambda-layer.zip").Length / 1MB
$sizeFormatted = "{0:N2} MB" -f $size

Write-Host ""
Write-Host "✓ Lambda layer built successfully!" -ForegroundColor Green
Write-Host "  File: interpose-lambda-layer.zip" -ForegroundColor White
Write-Host "  Size: $sizeFormatted" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Upload to AWS Lambda:" -ForegroundColor White
Write-Host "   aws lambda publish-layer-version \"
Write-Host "     --layer-name interpose-agent \"
Write-Host "     --description 'Interpose AI monitoring agent' \"
Write-Host "     --zip-file fileb://interpose-lambda-layer.zip \"
Write-Host "     --compatible-runtimes python3.11 python3.12"
Write-Host ""
Write-Host "2. Attach to your Lambda function:" -ForegroundColor White
Write-Host "   aws lambda update-function-configuration \"
Write-Host "     --function-name YOUR_FUNCTION_NAME \"
Write-Host "     --layers arn:aws:lambda:REGION:ACCOUNT_ID:layer:interpose-agent:VERSION"
Write-Host ""
Write-Host "3. Set environment variables in your Lambda function:" -ForegroundColor White
Write-Host "   INTERPOSE_API_KEY=your_api_key"
Write-Host "   INTERPOSE_BACKEND_URL=https://api.interpose.io"
