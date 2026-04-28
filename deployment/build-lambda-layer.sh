#!/bin/bash
# Build script to package Interpose agent as AWS Lambda layer

set -e

echo "Building Interpose Lambda Layer..."

# Clean up previous builds
rm -rf layer
rm -f interpose-lambda-layer.zip

# Create layer directory structure
mkdir -p layer/python

# Install dependencies to layer/python directory
echo "Installing dependencies..."
pip install -r requirements.txt -t layer/python --no-deps

# Install only runtime dependencies (not test dependencies)
pip install requests>=2.31.0 boto3>=1.34.0 -t layer/python

# Copy agent code to layer/python
echo "Copying agent code..."
cp -r interpose layer/python/

# Remove test files and cache from layer
echo "Cleaning up test files..."
find layer/python -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find layer/python -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find layer/python -type f -name "*.pyc" -delete
find layer/python -type f -name "*.pyo" -delete

# Create ZIP file with correct structure
echo "Creating ZIP file..."
cd layer
zip -r ../interpose-lambda-layer.zip python
cd ..

# Get ZIP file size
SIZE=$(du -h interpose-lambda-layer.zip | cut -f1)

echo "✓ Lambda layer built successfully!"
echo "  File: interpose-lambda-layer.zip"
echo "  Size: $SIZE"
echo ""
echo "Next steps:"
echo "1. Upload to AWS Lambda:"
echo "   aws lambda publish-layer-version \\"
echo "     --layer-name interpose-agent \\"
echo "     --description 'Interpose AI monitoring agent' \\"
echo "     --zip-file fileb://interpose-lambda-layer.zip \\"
echo "     --compatible-runtimes python3.11 python3.12"
echo ""
echo "2. Attach to your Lambda function:"
echo "   aws lambda update-function-configuration \\"
echo "     --function-name YOUR_FUNCTION_NAME \\"
echo "     --layers arn:aws:lambda:REGION:ACCOUNT_ID:layer:interpose-agent:VERSION"
echo ""
echo "3. Set environment variables in your Lambda function:"
echo "   INTERPOSE_API_KEY=your_api_key"
echo "   INTERPOSE_BACKEND_URL=https://api.interpose.io"
