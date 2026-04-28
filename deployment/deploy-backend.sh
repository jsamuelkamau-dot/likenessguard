#!/bin/bash

# Interpose Backend Deployment Script
# Deploys CloudFormation stack for Interpose SaaS Platform

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
STACK_NAME="interpose-platform"
REGION="us-east-1"
ALERT_EMAIL="alerts@interpose.io"
TEMPLATE_FILE="infrastructure/cloudformation-template.yaml"

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

Deploy the Interpose backend infrastructure using CloudFormation.

OPTIONS:
    -s, --stack-name NAME       CloudFormation stack name (default: interpose-platform)
    -r, --region REGION         AWS region (default: us-east-1)
    -e, --email EMAIL           Alert email address (default: alerts@interpose.io)
    -t, --template FILE         CloudFormation template file (default: infrastructure/cloudformation-template.yaml)
    -h, --help                  Display this help message

EXAMPLES:
    # Deploy with default settings
    $0

    # Deploy with custom stack name and region
    $0 --stack-name my-interpose --region us-west-2

    # Deploy with custom alert email
    $0 --email security@example.com

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -e|--email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        -t|--template)
            TEMPLATE_FILE="$2"
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

if [[ -z "$STACK_NAME" ]]; then
    print_error "Stack name cannot be empty"
    exit 1
fi

if [[ -z "$REGION" ]]; then
    print_error "Region cannot be empty"
    exit 1
fi

if [[ -z "$ALERT_EMAIL" ]]; then
    print_error "Alert email cannot be empty"
    exit 1
fi

if [[ ! -f "$TEMPLATE_FILE" ]]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Validate email format
if [[ ! "$ALERT_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    print_error "Invalid email format: $ALERT_EMAIL"
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

print_info "Deployment Configuration:"
print_info "  Stack Name: $STACK_NAME"
print_info "  Region: $REGION"
print_info "  Alert Email: $ALERT_EMAIL"
print_info "  Template: $TEMPLATE_FILE"
echo ""

# Check if stack already exists
print_info "Checking if stack exists..."
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
    print_warn "Stack '$STACK_NAME' already exists. This will update the existing stack."
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled."
        exit 0
    fi
    
    OPERATION="update"
else
    OPERATION="create"
fi

# Deploy CloudFormation stack
print_info "Deploying CloudFormation stack..."

if [[ "$OPERATION" == "create" ]]; then
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_FILE" \
        --parameters "ParameterKey=AlertEmailSource,ParameterValue=$ALERT_EMAIL" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION" \
        --tags "Key=Application,Value=Interpose" "Key=ManagedBy,Value=CloudFormation"
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to create CloudFormation stack"
        exit 1
    fi
    
    print_info "Stack creation initiated. Waiting for completion..."
    
    # Wait for stack creation to complete
    aws cloudformation wait stack-create-complete \
        --stack-name "$STACK_NAME" \
        --region "$REGION"
    
    if [[ $? -ne 0 ]]; then
        print_error "Stack creation failed or timed out"
        print_error "Check CloudFormation console for details"
        exit 1
    fi
else
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_FILE" \
        --parameters "ParameterKey=AlertEmailSource,ParameterValue=$ALERT_EMAIL" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
    
    if [[ $? -ne 0 ]]; then
        # Check if the error is "No updates are to be performed"
        if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
            print_warn "No updates to be performed on stack"
        else
            print_error "Failed to update CloudFormation stack"
            exit 1
        fi
    else
        print_info "Stack update initiated. Waiting for completion..."
        
        # Wait for stack update to complete
        aws cloudformation wait stack-update-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
        
        if [[ $? -ne 0 ]]; then
            print_error "Stack update failed or timed out"
            print_error "Check CloudFormation console for details"
            exit 1
        fi
    fi
fi

# Extract stack outputs
print_info "Extracting stack outputs..."

OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs' \
    --output json)

if [[ $? -ne 0 ]]; then
    print_error "Failed to retrieve stack outputs"
    exit 1
fi

# Parse and display outputs
API_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="APIEndpoint") | .OutputValue')
DASHBOARD_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="DashboardURL") | .OutputValue')
DASHBOARD_BUCKET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="DashboardBucketName") | .OutputValue')
LOGS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LogsTableName") | .OutputValue')
CUSTOMERS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CustomersTableName") | .OutputValue')
LAMBDA_FUNCTION=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LambdaFunctionName") | .OutputValue')

print_info ""
print_info "=========================================="
print_info "Deployment Successful!"
print_info "=========================================="
print_info ""
print_info "Stack Outputs:"
print_info "  API Endpoint: $API_ENDPOINT"
print_info "  Dashboard URL: $DASHBOARD_URL"
print_info "  Dashboard Bucket: $DASHBOARD_BUCKET"
print_info "  Logs Table: $LOGS_TABLE"
print_info "  Customers Table: $CUSTOMERS_TABLE"
print_info "  Lambda Function: $LAMBDA_FUNCTION"
print_info ""
print_info "Next Steps:"
print_info "  1. Deploy Lambda function code: ./deployment/package-lambda.sh"
print_info "  2. Initialize database: python deployment/init-database.py"
print_info "  3. Build and deploy dashboard"
print_info "  4. Verify SES email: aws ses verify-email-identity --email-address $ALERT_EMAIL --region $REGION"
print_info ""

# Save outputs to file for later use
OUTPUT_FILE="deployment/stack-outputs.json"
echo "$OUTPUTS" > "$OUTPUT_FILE"
print_info "Stack outputs saved to: $OUTPUT_FILE"

exit 0
