#!/bin/bash
# Setup script for LikenessGuard AWS Prototype

set -e

echo "=== LikenessGuard AWS Prototype Setup ==="
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment
echo ""
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Check AWS CLI
echo ""
echo "Checking AWS CLI..."
if command -v aws &> /dev/null; then
    aws_version=$(aws --version)
    echo "AWS CLI: $aws_version"
else
    echo "WARNING: AWS CLI not found. Please install it to deploy the application."
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
fi

# Check SAM CLI
echo ""
echo "Checking AWS SAM CLI..."
if command -v sam &> /dev/null; then
    sam_version=$(sam --version)
    echo "SAM CLI: $sam_version"
else
    echo "WARNING: AWS SAM CLI not found. Please install it to deploy the application."
    echo "Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Configure AWS credentials: aws configure"
echo "3. Run tests: pytest"
echo "4. Deploy infrastructure: sam build && sam deploy --guided"
