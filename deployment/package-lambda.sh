#!/bin/bash

# Interpose Lambda Function Packaging Script
# Packages Lambda function code and dependencies for deployment

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BACKEND_DIR="backend"
BUILD_DIR="build/lambda"
OUTPUT_FILE="lambda-deployment.zip"
STACK_NAME="interpose-platform"
REGION="us-east-1"
S3_BUCKET=""
DEPLOY_TO_LAMBDA=false

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Package Lambda function code and dependencies for deployment.

OPTIONS:
    -b, --backend-dir DIR       Backend source directory (default: backend)
    -o, --output FILE           Output ZIP file name (default: lambda-deployment.zip)
    -s, --s3-bucket BUCKET      S3 bucket for uploading package (optional)
    -d, --deploy                Deploy to Lambda function after packaging
    -n, --stack-name NAME       CloudFormation stack name (default: interpose-platform)
    -r, --region REGION         AWS region (default: us-east-1)
    -h, --help                  Display this help message

EXAMPLES:
    # Package Lambda function
    $0

    # Package and upload to S3
    $0 --s3-bucket my-lambda-bucket

    # Package and deploy to Lambda
    $0 --deploy

    # Package, upload to S3, and deploy
    $0 --s3-bucket my-lambda-bucket --deploy

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backend-dir)
            BACKEND_DIR="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -s|--s3-bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        -d|--deploy)
            DEPLOY_TO_LAMBDA=true
            shift
            ;;
        -n|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate parameters
print_info "Validating parameters..."

if [[ ! -d "$BACKEND_DIR" ]]; then
    print_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

if [[ ! -f "$BACKEND_DIR/lambda_handler.py" ]]; then
    print_error "lambda_handler.py not found in $BACKEND_DIR"
    exit 1
fi

if [[ ! -f "$BACKEND_DIR/requirements.txt" ]]; then
    print_error "requirements.txt not found in $BACKEND_DIR"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install it first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    print_error "pip3 is not installed. Please install it first."
    exit 1
fi

print_info "Packaging Configuration:"
print_info "  Backend Directory: $BACKEND_DIR"
print_info "  Output File: $OUTPUT_FILE"
print_info "  S3 Bucket: ${S3_BUCKET:-None}"
print_info "  Deploy to Lambda: $DEPLOY_TO_LAMBDA"
print_info "  Stack Name: $STACK_NAME"
print_info "  Region: $REGION"
echo ""

# Clean up previous build
print_info "Cleaning up previous build..."
rm -rf "$BUILD_DIR"
rm -f "$OUTPUT_FILE"

# Create build directory
print_info "Creating build directory..."
mkdir -p "$BUILD_DIR"

# Install dependencies to build directory
print_info "Installing dependencies..."
pip3 install -r "$BACKEND_DIR/requirements.txt" -t "$BUILD_DIR" --upgrade --quiet

if [[ $? -ne 0 ]]; then
    print_error "Failed to install dependencies"
    exit 1
fi

# Copy Lambda handler and other Python files
print_info "Copying Lambda function code..."
cp "$BACKEND_DIR/lambda_handler.py" "$BUILD_DIR/"

# Copy __init__.py if it exists
if [[ -f "$BACKEND_DIR/__init__.py" ]]; then
    cp "$BACKEND_DIR/__init__.py" "$BUILD_DIR/"
fi

# Remove unnecessary files to reduce package size
print_info "Optimizing package size..."
cd "$BUILD_DIR"

# Remove test files
find . -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true

# Remove documentation and examples
find . -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.md" -delete 2>/dev/null || true
find . -name "*.txt" -delete 2>/dev/null || true

# Remove .dist-info directories
find . -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true

cd - > /dev/null

# Create ZIP file
print_info "Creating deployment package..."
cd "$BUILD_DIR"
zip -r "../../$OUTPUT_FILE" . -q

if [[ $? -ne 0 ]]; then
    print_error "Failed to create ZIP file"
    exit 1
fi

cd - > /dev/null

# Get package size
PACKAGE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
print_info "Package created: $OUTPUT_FILE ($PACKAGE_SIZE)"

# Check if package size exceeds Lambda limit (50MB for direct upload, 250MB unzipped)
PACKAGE_SIZE_BYTES=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
if [[ $PACKAGE_SIZE_BYTES -gt 52428800 ]]; then
    print_warn "Package size exceeds 50MB. You must upload to S3 before deploying to Lambda."
    if [[ -z "$S3_BUCKET" ]]; then
        print_error "S3 bucket is required for packages larger than 50MB"
        exit 1
    fi
fi

# Upload to S3 if bucket specified
if [[ -n "$S3_BUCKET" ]]; then
    print_info "Uploading package to S3..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Upload to S3
    aws s3 cp "$OUTPUT_FILE" "s3://$S3_BUCKET/$OUTPUT_FILE" --region "$REGION"
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to upload package to S3"
        exit 1
    fi
    
    print_info "Package uploaded to: s3://$S3_BUCKET/$OUTPUT_FILE"
fi

# Deploy to Lambda if requested
if [[ "$DEPLOY_TO_LAMBDA" == true ]]; then
    print_info "Deploying to Lambda function..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Get Lambda function name from CloudFormation stack
    LAMBDA_FUNCTION=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
        --output text 2>/dev/null)
    
    if [[ -z "$LAMBDA_FUNCTION" ]]; then
        print_error "Could not find Lambda function in stack: $STACK_NAME"
        print_error "Make sure the CloudFormation stack is deployed first"
        exit 1
    fi
    
    print_info "Updating Lambda function: $LAMBDA_FUNCTION"
    
    # Update Lambda function code
    if [[ -n "$S3_BUCKET" ]]; then
        # Update from S3
        aws lambda update-function-code \
            --function-name "$LAMBDA_FUNCTION" \
            --s3-bucket "$S3_BUCKET" \
            --s3-key "$OUTPUT_FILE" \
            --region "$REGION" \
            --output json > /dev/null
    else
        # Direct upload
        aws lambda update-function-code \
            --function-name "$LAMBDA_FUNCTION" \
            --zip-file "fileb://$OUTPUT_FILE" \
            --region "$REGION" \
            --output json > /dev/null
    fi
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to update Lambda function"
        exit 1
    fi
    
    print_info "Lambda function updated successfully"
    
    # Wait for function to be updated
    print_info "Waiting for function update to complete..."
    aws lambda wait function-updated \
        --function-name "$LAMBDA_FUNCTION" \
        --region "$REGION"
    
    if [[ $? -ne 0 ]]; then
        print_warn "Function update wait timed out, but deployment may have succeeded"
    fi
fi

print_info ""
print_info "=========================================="
print_info "Packaging Complete!"
print_info "=========================================="
print_info ""
print_info "Package Details:"
print_info "  File: $OUTPUT_FILE"
print_info "  Size: $PACKAGE_SIZE"
if [[ -n "$S3_BUCKET" ]]; then
    print_info "  S3 Location: s3://$S3_BUCKET/$OUTPUT_FILE"
fi
if [[ "$DEPLOY_TO_LAMBDA" == true ]]; then
    print_info "  Deployed to: $LAMBDA_FUNCTION"
fi
print_info ""

# Clean up build directory
print_info "Cleaning up build directory..."
rm -rf "$BUILD_DIR"

print_info "Done!"

exit 0
