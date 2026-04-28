#!/bin/bash

# Interpose Dashboard Build Script
# Builds the React dashboard for production deployment

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DASHBOARD_DIR="dashboard"
API_URL=""
STACK_NAME="interpose-platform"
REGION="us-east-1"

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

Build the Interpose dashboard for production deployment.

OPTIONS:
    -a, --api-url URL           API endpoint URL (required, or auto-detected from stack)
    -s, --stack-name NAME       CloudFormation stack name for auto-detection (default: interpose-platform)
    -r, --region REGION         AWS region (default: us-east-1)
    -d, --dashboard-dir DIR     Dashboard directory (default: dashboard)
    -h, --help                  Display this help message

EXAMPLES:
    # Build with auto-detected API URL from CloudFormation stack
    $0

    # Build with explicit API URL
    $0 --api-url https://api.example.com

    # Build with custom stack name
    $0 --stack-name my-interpose --region us-west-2

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--api-url)
            API_URL="$2"
            shift 2
            ;;
        -s|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -d|--dashboard-dir)
            DASHBOARD_DIR="$2"
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

# Validate dashboard directory exists
if [[ ! -d "$DASHBOARD_DIR" ]]; then
    print_error "Dashboard directory not found: $DASHBOARD_DIR"
    exit 1
fi

# Check if package.json exists
if [[ ! -f "$DASHBOARD_DIR/package.json" ]]; then
    print_error "package.json not found in $DASHBOARD_DIR"
    exit 1
fi

# Auto-detect API URL from CloudFormation stack if not provided
if [[ -z "$API_URL" ]]; then
    print_info "API URL not provided, attempting to auto-detect from CloudFormation stack..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it or provide --api-url explicitly."
        exit 1
    fi
    
    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        print_error "CloudFormation stack '$STACK_NAME' not found in region '$REGION'"
        print_error "Please deploy the backend first or provide --api-url explicitly"
        exit 1
    fi
    
    # Extract API endpoint from stack outputs
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
        --output text)
    
    if [[ -z "$API_URL" || "$API_URL" == "None" ]]; then
        print_error "Failed to retrieve API endpoint from CloudFormation stack"
        print_error "Please provide --api-url explicitly"
        exit 1
    fi
    
    print_info "Auto-detected API URL: $API_URL"
fi

# Validate API URL format
if [[ ! "$API_URL" =~ ^https?:// ]]; then
    print_error "Invalid API URL format: $API_URL"
    print_error "URL must start with http:// or https://"
    exit 1
fi

print_info "Build Configuration:"
print_info "  Dashboard Directory: $DASHBOARD_DIR"
print_info "  API URL: $API_URL"
echo ""

# Check if node and npm are installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_info "Node version: $(node --version)"
print_info "npm version: $(npm --version)"
echo ""

# Install dependencies if node_modules doesn't exist
if [[ ! -d "$DASHBOARD_DIR/node_modules" ]]; then
    print_info "Installing dependencies..."
    cd "$DASHBOARD_DIR"
    npm install
    cd ..
    print_info "Dependencies installed successfully"
else
    print_info "Dependencies already installed (node_modules exists)"
fi

# Set production environment variables
print_info "Setting production environment variables..."
export NODE_ENV=production
export VITE_API_URL="$API_URL"

print_info "  NODE_ENV=$NODE_ENV"
print_info "  VITE_API_URL=$VITE_API_URL"
echo ""

# Build the dashboard
print_info "Building dashboard..."
cd "$DASHBOARD_DIR"

# Run the build command
npm run build

if [[ $? -ne 0 ]]; then
    print_error "Dashboard build failed"
    exit 1
fi

cd ..

# Verify build output exists
if [[ ! -d "$DASHBOARD_DIR/dist" ]]; then
    print_error "Build output directory not found: $DASHBOARD_DIR/dist"
    exit 1
fi

# Check if index.html exists
if [[ ! -f "$DASHBOARD_DIR/dist/index.html" ]]; then
    print_error "index.html not found in build output"
    exit 1
fi

# Display build statistics
BUILD_SIZE=$(du -sh "$DASHBOARD_DIR/dist" | cut -f1)
FILE_COUNT=$(find "$DASHBOARD_DIR/dist" -type f | wc -l)

print_info ""
print_info "=========================================="
print_info "Build Successful!"
print_info "=========================================="
print_info ""
print_info "Build Statistics:"
print_info "  Output Directory: $DASHBOARD_DIR/dist"
print_info "  Total Size: $BUILD_SIZE"
print_info "  File Count: $FILE_COUNT"
print_info ""
print_info "Next Steps:"
print_info "  1. Upload to S3: ./deployment/upload-dashboard.sh"
print_info "  2. Invalidate CloudFront cache: ./deployment/invalidate-cloudfront.sh"
print_info ""

exit 0
