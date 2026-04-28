#!/bin/bash
# Deployment script for LikenessGuard AWS Prototype

set -e

echo "=== LikenessGuard AWS Prototype Deployment ==="
echo ""

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "ERROR: Virtual environment not activated."
    echo "Please run: source venv/bin/activate"
    exit 1
fi

# Run tests before deployment
echo "Running tests..."
pytest -m "not slow"
if [ $? -ne 0 ]; then
    echo "ERROR: Tests failed. Deployment aborted."
    exit 1
fi
echo "Tests passed."
echo ""

# Build SAM application
echo "Building SAM application..."
cd infrastructure
sam build
if [ $? -ne 0 ]; then
    echo "ERROR: SAM build failed."
    exit 1
fi
echo "Build complete."
echo ""

# Deploy
echo "Deploying to AWS..."
if [ "$1" == "--guided" ]; then
    sam deploy --guided
else
    sam deploy
fi

if [ $? -ne 0 ]; then
    echo "ERROR: Deployment failed."
    exit 1
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "To view stack outputs:"
echo "  aws cloudformation describe-stacks --stack-name likenessguard-prototype --query 'Stacks[0].Outputs'"
