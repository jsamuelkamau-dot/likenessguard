#!/bin/bash

# Interpose Dashboard S3 Upload Script
# Uploads built dashboard files to S3 with appropriate cache headers

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DASHBOARD_DIR="dashboard/dist"
BUCKET_NAME=""
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

Upload the built Interpose dashboard to S3 with appropriate cache headers.

OPTIONS:
    -b, --bucket NAME           S3 bucket name (required, or auto-detected from stack)
    -s, --stack-name NAME       CloudFormation stack name for auto-detection (default: interpose-platform)
    -r, --region REGION         AWS region (default: us-east-1)
    -d, --dashboard-dir DIR     Dashboard build directory (default: dashboard/dist)
    -h, --help                  Display this help message

CACHE STRATEGY:
    - index.html: no-cache (always fetch latest)
    - Assets (JS, CSS, images): max-age=31536000 (1 year, immutable)
    - Other files: max-age=3600 (1 hour)

EXAMPLES:
    # Upload with auto-detected bucket from CloudFormation stack
    $0

    # Upload with explicit bucket name
    $0 --bucket my-dashboard-bucket

    # Upload with custom stack name
    $0 --stack-name my-interpose --region us-west-2

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bucket)
            BUCKET_NAME="$2"
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
    print_error "Dashboard build directory not found: $DASHBOARD_DIR"
    print_error "Please run ./deployment/build-dashboard.sh first"
    exit 1
fi

# Check if index.html exists
if [[ ! -f "$DASHBOARD_DIR/index.html" ]]; then
    print_error "index.html not found in $DASHBOARD_DIR"
    print_error "Please run ./deployment/build-dashboard.sh first"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity --region "$REGION" &> /dev/null; then
    print_error "AWS credentials are not configured or invalid"
    exit 1
fi

# Auto-detect bucket name from CloudFormation stack if not provided
if [[ -z "$BUCKET_NAME" ]]; then
    print_info "Bucket name not provided, attempting to auto-detect from CloudFormation stack..."
    
    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        print_error "CloudFormation stack '$STACK_NAME' not found in region '$REGION'"
        print_error "Please deploy the backend first or provide --bucket explicitly"
        exit 1
    fi
    
    # Extract bucket name from stack outputs
    BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DashboardBucketName`].OutputValue' \
        --output text)
    
    if [[ -z "$BUCKET_NAME" || "$BUCKET_NAME" == "None" ]]; then
        print_error "Failed to retrieve bucket name from CloudFormation stack"
        print_error "Please provide --bucket explicitly"
        exit 1
    fi
    
    print_info "Auto-detected bucket: $BUCKET_NAME"
fi

# Verify bucket exists
if ! aws s3 ls "s3://$BUCKET_NAME" --region "$REGION" &> /dev/null; then
    print_error "S3 bucket does not exist or is not accessible: $BUCKET_NAME"
    exit 1
fi

print_info "Upload Configuration:"
print_info "  Dashboard Directory: $DASHBOARD_DIR"
print_info "  S3 Bucket: $BUCKET_NAME"
print_info "  Region: $REGION"
echo ""

# Upload index.html with no-cache header
print_info "Uploading index.html with no-cache header..."
aws s3 cp "$DASHBOARD_DIR/index.html" "s3://$BUCKET_NAME/index.html" \
    --region "$REGION" \
    --content-type "text/html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --metadata-directive REPLACE

if [[ $? -ne 0 ]]; then
    print_error "Failed to upload index.html"
    exit 1
fi

print_info "index.html uploaded successfully"

# Upload assets (JS, CSS, images) with long cache
print_info "Uploading assets with long cache (1 year)..."

# Upload JavaScript files
if ls "$DASHBOARD_DIR"/assets/*.js &> /dev/null; then
    aws s3 sync "$DASHBOARD_DIR/assets" "s3://$BUCKET_NAME/assets" \
        --region "$REGION" \
        --exclude "*" \
        --include "*.js" \
        --content-type "application/javascript" \
        --cache-control "public, max-age=31536000, immutable" \
        --metadata-directive REPLACE
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to upload JavaScript files"
        exit 1
    fi
    print_info "JavaScript files uploaded successfully"
fi

# Upload CSS files
if ls "$DASHBOARD_DIR"/assets/*.css &> /dev/null; then
    aws s3 sync "$DASHBOARD_DIR/assets" "s3://$BUCKET_NAME/assets" \
        --region "$REGION" \
        --exclude "*" \
        --include "*.css" \
        --content-type "text/css" \
        --cache-control "public, max-age=31536000, immutable" \
        --metadata-directive REPLACE
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to upload CSS files"
        exit 1
    fi
    print_info "CSS files uploaded successfully"
fi

# Upload image files (PNG, JPG, SVG, ICO)
if ls "$DASHBOARD_DIR"/assets/*.{png,jpg,jpeg,svg,ico} &> /dev/null 2>&1; then
    # PNG files
    if ls "$DASHBOARD_DIR"/assets/*.png &> /dev/null; then
        aws s3 sync "$DASHBOARD_DIR/assets" "s3://$BUCKET_NAME/assets" \
            --region "$REGION" \
            --exclude "*" \
            --include "*.png" \
            --content-type "image/png" \
            --cache-control "public, max-age=31536000, immutable" \
            --metadata-directive REPLACE
    fi
    
    # JPG files
    if ls "$DASHBOARD_DIR"/assets/*.{jpg,jpeg} &> /dev/null 2>&1; then
        aws s3 sync "$DASHBOARD_DIR/assets" "s3://$BUCKET_NAME/assets" \
            --region "$REGION" \
            --exclude "*" \
            --include "*.jpg" \
            --include "*.jpeg" \
            --content-type "image/jpeg" \
            --cache-control "public, max-age=31536000, immutable" \
            --metadata-directive REPLACE
    fi
    
    # SVG files
    if ls "$DASHBOARD_DIR"/assets/*.svg &> /dev/null; then
        aws s3 sync "$DASHBOARD_DIR/assets" "s3://$BUCKET_NAME/assets" \
            --region "$REGION" \
            --exclude "*" \
            --include "*.svg" \
            --content-type "image/svg+xml" \
            --cache-control "public, max-age=31536000, immutable" \
            --metadata-directive REPLACE
    fi
    
    # ICO files
    if ls "$DASHBOARD_DIR"/assets/*.ico &> /dev/null; then
        aws s3 sync "$DASHBOARD_DIR/assets" "s3://$BUCKET_NAME/assets" \
            --region "$REGION" \
            --exclude "*" \
            --include "*.ico" \
            --content-type "image/x-icon" \
            --cache-control "public, max-age=31536000, immutable" \
            --metadata-directive REPLACE
    fi
    
    print_info "Image files uploaded successfully"
fi

# Upload any remaining files with moderate cache (1 hour)
print_info "Uploading remaining files with moderate cache (1 hour)..."
aws s3 sync "$DASHBOARD_DIR" "s3://$BUCKET_NAME" \
    --region "$REGION" \
    --exclude "index.html" \
    --exclude "assets/*" \
    --cache-control "public, max-age=3600" \
    --metadata-directive REPLACE

if [[ $? -ne 0 ]]; then
    print_error "Failed to upload remaining files"
    exit 1
fi

# Count uploaded files
TOTAL_FILES=$(aws s3 ls "s3://$BUCKET_NAME" --recursive --region "$REGION" | wc -l)

print_info ""
print_info "=========================================="
print_info "Upload Successful!"
print_info "=========================================="
print_info ""
print_info "Upload Statistics:"
print_info "  S3 Bucket: s3://$BUCKET_NAME"
print_info "  Total Files: $TOTAL_FILES"
print_info ""
print_info "Cache Strategy Applied:"
print_info "  - index.html: no-cache (always fresh)"
print_info "  - Assets (JS/CSS/images): 1 year cache (immutable)"
print_info "  - Other files: 1 hour cache"
print_info ""
print_info "Next Steps:"
print_info "  1. Invalidate CloudFront cache: ./deployment/invalidate-cloudfront.sh"
print_info "  2. Access dashboard via CloudFront URL"
print_info ""

exit 0
