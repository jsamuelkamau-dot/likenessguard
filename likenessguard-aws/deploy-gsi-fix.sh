#!/bin/bash
# Deploy GSI fix for Activity Logs
# This script deploys the LikenessIDIndex GSI to enable efficient audit log queries

echo "========================================"
echo "LikenessGuard - Deploy GSI Fix"
echo "========================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "infrastructure/template.yaml" ]; then
    echo "Error: Must run from likenessguard-aws directory"
    exit 1
fi

echo "Step 1: Building SAM application..."
sam build
if [ $? -ne 0 ]; then
    echo "Error: SAM build failed"
    exit 1
fi

echo ""
echo "Step 2: Deploying to AWS..."
echo "Note: GSI creation may take a few minutes"
sam deploy
if [ $? -ne 0 ]; then
    echo "Error: SAM deploy failed"
    exit 1
fi

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "The LikenessIDIndex GSI is being created."
echo "This process may take 5-10 minutes."
echo ""
echo "You can check the status in the AWS Console:"
echo "  DynamoDB > Tables > LikenessGuard-AuditLog > Indexes"
echo ""
echo "Once the GSI status shows 'ACTIVE', the Activity Logs"
echo "page will display audit records efficiently."
echo ""
