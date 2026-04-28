#!/bin/bash

# Interpose CloudFront Invalidation Script
# Invalidates CloudFront cache after dashboard deployment

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DISTRIBUTION_ID=""
STACK_NAME="interpose-platform"
REGION="us-east-1"
PATHS="/*"

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

Invalidate CloudFront cache after dashboard deployment.

OPTIONS:
    -i, --distribution-id ID    CloudFront distribution ID (required, or auto-detected from stack)
    -s, --stack-name NAME       CloudFormation stack name for auto-detection (default: interpose-platform)
    -r, --region REGION         AWS region (default: us-east-1)
    -p, --paths PATHS           Paths to invalidate (default: /*)
    -h, --help                  Display this help message

EXAMPLES:
    # Invalidate all paths with auto-detected distribution
    $0

    # Invalidate specific paths
    $0 --paths "/index.html /assets/*"

    # Invalidate with explicit distribution ID
    $0 --distribution-id E1234567890ABC

    # Invalidate with custom stack name
    $0 --stack-name my-interpose --region us-west-2

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--distribution-id)
            DISTRIBUTION_ID="$2"
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
        -p|--paths)
            PATHS="$2"
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

# Auto-detect distribution ID from CloudFormation stack if not provided
if [[ -z "$DISTRIBUTION_ID" ]]; then
    print_info "Distribution ID not provided, attempting to auto-detect from CloudFormation stack..."
    
    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        print_error "CloudFormation stack '$STACK_NAME' not found in region '$REGION'"
        print_error "Please deploy the backend first or provide --distribution-id explicitly"
        exit 1
    fi
    
    # Get the dashboard URL from stack outputs
    DASHBOARD_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
        --output text)
    
    if [[ -z "$DASHBOARD_URL" || "$DASHBOARD_URL" == "None" ]]; then
        print_error "Failed to retrieve dashboard URL from CloudFormation stack"
        print_error "Please provide --distribution-id explicitly"
        exit 1
    fi
    
    # Extract CloudFront domain from URL (format: https://d1234567890abc.cloudfront.net)
    CLOUDFRONT_DOMAIN=$(echo "$DASHBOARD_URL" | sed 's|https://||' | sed 's|/.*||')
    
    if [[ ! "$CLOUDFRONT_DOMAIN" =~ \.cloudfront\.net$ ]]; then
        print_error "Dashboard URL does not appear to be a CloudFront distribution: $DASHBOARD_URL"
        print_error "Please provide --distribution-id explicitly"
        exit 1
    fi
    
    # Query CloudFront to find distribution ID by domain name
    print_info "Querying CloudFront for distribution ID..."
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?DomainName=='$CLOUDFRONT_DOMAIN'].Id" \
        --output text)
    
    if [[ -z "$DISTRIBUTION_ID" || "$DISTRIBUTION_ID" == "None" ]]; then
        print_error "Failed to find CloudFront distribution with domain: $CLOUDFRONT_DOMAIN"
        print_error "Please provide --distribution-id explicitly"
        exit 1
    fi
    
    print_info "Auto-detected distribution ID: $DISTRIBUTION_ID"
fi

# Validate distribution ID format (should start with E and be alphanumeric)
if [[ ! "$DISTRIBUTION_ID" =~ ^E[A-Z0-9]+$ ]]; then
    print_error "Invalid CloudFront distribution ID format: $DISTRIBUTION_ID"
    print_error "Distribution ID should start with 'E' followed by alphanumeric characters"
    exit 1
fi

# Verify distribution exists
print_info "Verifying distribution exists..."
if ! aws cloudfront get-distribution --id "$DISTRIBUTION_ID" &> /dev/null; then
    print_error "CloudFront distribution not found: $DISTRIBUTION_ID"
    exit 1
fi

print_info "Invalidation Configuration:"
print_info "  Distribution ID: $DISTRIBUTION_ID"
print_info "  Paths: $PATHS"
print_info "  Region: $REGION"
echo ""

# Create invalidation
print_info "Creating CloudFront invalidation..."

# Generate caller reference (unique identifier for this invalidation)
CALLER_REFERENCE="dashboard-deploy-$(date +%s)"

# Create invalidation batch JSON
INVALIDATION_BATCH=$(cat <<EOF
{
  "Paths": {
    "Quantity": 1,
    "Items": ["$PATHS"]
  },
  "CallerReference": "$CALLER_REFERENCE"
}
EOF
)

# Execute invalidation
INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --invalidation-batch "$INVALIDATION_BATCH" \
    --output json)

if [[ $? -ne 0 ]]; then
    print_error "Failed to create CloudFront invalidation"
    exit 1
fi

# Extract invalidation ID
INVALIDATION_ID=$(echo "$INVALIDATION_OUTPUT" | jq -r '.Invalidation.Id')

if [[ -z "$INVALIDATION_ID" || "$INVALIDATION_ID" == "null" ]]; then
    print_error "Failed to extract invalidation ID from response"
    exit 1
fi

print_info "Invalidation created successfully"
print_info "Invalidation ID: $INVALIDATION_ID"
echo ""

# Wait for invalidation to complete (optional)
print_info "Waiting for invalidation to complete..."
print_warn "This may take several minutes. You can press Ctrl+C to skip waiting."
print_warn "The invalidation will continue in the background."
echo ""

# Wait with timeout (max 10 minutes)
WAIT_START=$(date +%s)
MAX_WAIT=600  # 10 minutes

while true; do
    # Get invalidation status
    STATUS=$(aws cloudfront get-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID" \
        --query 'Invalidation.Status' \
        --output text)
    
    if [[ "$STATUS" == "Completed" ]]; then
        print_info "Invalidation completed successfully!"
        break
    fi
    
    # Check timeout
    ELAPSED=$(($(date +%s) - WAIT_START))
    if [[ $ELAPSED -ge $MAX_WAIT ]]; then
        print_warn "Invalidation is still in progress after $MAX_WAIT seconds"
        print_warn "The invalidation will continue in the background"
        break
    fi
    
    # Show progress
    print_info "Status: $STATUS (elapsed: ${ELAPSED}s)"
    sleep 10
done

# Get distribution domain name
DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
    --id "$DISTRIBUTION_ID" \
    --query 'Distribution.DomainName' \
    --output text)

print_info ""
print_info "=========================================="
print_info "Invalidation Successful!"
print_info "=========================================="
print_info ""
print_info "Invalidation Details:"
print_info "  Distribution ID: $DISTRIBUTION_ID"
print_info "  Invalidation ID: $INVALIDATION_ID"
print_info "  Paths Invalidated: $PATHS"
print_info "  Status: $STATUS"
print_info ""
print_info "Dashboard URL:"
print_info "  https://$DISTRIBUTION_DOMAIN"
print_info ""
print_info "Note: It may take a few minutes for the cache to fully clear."
print_info "You can check invalidation status with:"
print_info "  aws cloudfront get-invalidation --distribution-id $DISTRIBUTION_ID --id $INVALIDATION_ID"
print_info ""

exit 0
