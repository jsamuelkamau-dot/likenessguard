#!/bin/bash
# Test script to check GSI status and query performance

echo "========================================"
echo "LikenessGuard - GSI Status Check"
echo "========================================"
echo ""

# Check GSI status
echo "Checking LikenessIDIndex status..."
GSI_STATUS=$(aws dynamodb describe-table \
  --table-name LikenessGuard-AuditLog \
  --query 'Table.GlobalSecondaryIndexes[?IndexName==`LikenessIDIndex`].IndexStatus' \
  --output text 2>/dev/null)

if [ -z "$GSI_STATUS" ]; then
    echo "❌ GSI not found. Has the deployment completed?" 
    exit 1
elif [ "$GSI_STATUS" = "CREATING" ]; then
    echo "⏳ GSI is being created. Please wait..."
    echo "   This typically takes 5-10 minutes."
    exit 0
elif [ "$GSI_STATUS" = "ACTIVE" ]; then
    echo "✅ GSI is ACTIVE and ready to use!"
else
    echo "⚠️  GSI status: $GSI_STATUS"
    exit 1
fi

echo ""
echo "Checking GSI details..."
aws dynamodb describe-table \
  --table-name LikenessGuard-AuditLog \
  --query 'Table.GlobalSecondaryIndexes[?IndexName==`LikenessIDIndex`]' \
  --output json

echo ""
echo "========================================"
echo "GSI is ready! Activity Logs should now work."
echo "========================================"
