# Activity Logs GSI Fix - Complete

## Problem Summary

The Activity Logs page in the LikenessGuard dashboard was not showing any logs because the DynamoDB `AuditLogTable` lacked a Global Secondary Index (GSI) on `LikenessID`. This forced the application to use an inefficient `scan()` operation that couldn't effectively query audit records by likeness ID.

## Solution Implemented

### 1. CloudFormation Template Updates (`infrastructure/template.yaml`)

**Added `LikenessID` to AttributeDefinitions:**
```yaml
AttributeDefinitions:
  - AttributeName: QueryID
    AttributeType: S
  - AttributeName: Timestamp
    AttributeType: N
  - AttributeName: LikenessID
    AttributeType: S
```

**Added GlobalSecondaryIndexes:**
```yaml
GlobalSecondaryIndexes:
  - IndexName: LikenessIDIndex
    KeySchema:
      - AttributeName: LikenessID
        KeyType: HASH
      - AttributeName: Timestamp
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
```

**Updated IAM Policy:**
Added explicit permission for the GSI:
```yaml
Resource:
  - !GetAtt ConsentRegistryTable.Arn
  - !GetAtt AuditLogTable.Arn
  - !Sub '${AuditLogTable.Arn}/index/LikenessIDIndex'
```

### 2. DynamoDB Client Updates (`src/shared/services/dynamodb_client.py`)

**Replaced inefficient `scan()` with efficient `query()`:**

**Before:**
```python
def query_table():
    items = []
    scan_kwargs = {
        'FilterExpression': 'LikenessID = :likeness_id',
        'ExpressionAttributeValues': {':likeness_id': likeness_id},
        'Limit': limit
    }
    
    response = self.audit_table.scan(**scan_kwargs)
    items.extend(response.get('Items', []))
    
    return items
```

**After:**
```python
def query_table():
    items = []
    query_kwargs = {
        'IndexName': 'LikenessIDIndex',
        'KeyConditionExpression': 'LikenessID = :likeness_id',
        'ExpressionAttributeValues': {':likeness_id': likeness_id},
        'Limit': limit,
        'ScanIndexForward': False  # Sort descending (newest first)
    }
    
    # Handle pagination
    while True:
        response = self.audit_table.query(**query_kwargs)
        items.extend(response.get('Items', []))
        
        # Check if we've hit the limit or there are no more items
        if len(items) >= limit or 'LastEvaluatedKey' not in response:
            break
        
        query_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    return items[:limit]  # Ensure we don't exceed limit
```

**Key Improvements:**
- Uses `query()` with the `LikenessIDIndex` GSI instead of `scan()`
- Leverages `ScanIndexForward=False` for automatic descending sort (newest first)
- Properly handles pagination with `LastEvaluatedKey`
- Removes manual sorting since GSI handles it efficiently
- Much faster and more cost-effective

## Deployment Instructions

### Option 1: Using Deployment Scripts

**PowerShell (Windows):**
```powershell
cd likenessguard-aws
.\deploy-gsi-fix.ps1
```

**Bash (Linux/Mac):**
```bash
cd likenessguard-aws
chmod +x deploy-gsi-fix.sh
./deploy-gsi-fix.sh
```

### Option 2: Manual Deployment

```bash
cd likenessguard-aws
sam build
sam deploy
```

## Post-Deployment

### GSI Creation Timeline
- The GSI will be created automatically during deployment
- **Creation time:** 5-10 minutes (depending on existing data)
- The table remains available during GSI creation

### Verify GSI Status

**AWS Console:**
1. Navigate to DynamoDB > Tables
2. Select `LikenessGuard-AuditLog`
3. Click the "Indexes" tab
4. Check that `LikenessIDIndex` shows status: **ACTIVE**

**AWS CLI:**
```bash
aws dynamodb describe-table --table-name LikenessGuard-AuditLog \
  --query 'Table.GlobalSecondaryIndexes[0].IndexStatus'
```

Expected output: `"ACTIVE"`

### Test Activity Logs

Once the GSI is active:
1. Open the LikenessGuard dashboard
2. Navigate to the Activity Logs page
3. Select a registered likeness from the dropdown
4. Audit records should now display efficiently

## Performance Impact

### Before (Scan Operation)
- **Operation:** Full table scan with filter
- **Performance:** O(n) - scans entire table
- **Cost:** High - reads all items then filters
- **Scalability:** Poor - degrades with table size

### After (Query with GSI)
- **Operation:** Direct query on indexed attribute
- **Performance:** O(log n) - uses index
- **Cost:** Low - reads only matching items
- **Scalability:** Excellent - constant performance

## Technical Details

### GSI Configuration
- **Index Name:** `LikenessIDIndex`
- **Partition Key:** `LikenessID` (String)
- **Sort Key:** `Timestamp` (Number)
- **Projection:** ALL (includes all attributes)
- **Billing Mode:** PAY_PER_REQUEST (same as table)

### Query Behavior
- Queries by `LikenessID` using `KeyConditionExpression`
- Results automatically sorted by `Timestamp` descending
- Supports pagination for large result sets
- Respects the `limit` parameter

## Files Modified

1. `likenessguard-aws/infrastructure/template.yaml`
   - Added `LikenessID` to `AttributeDefinitions`
   - Added `GlobalSecondaryIndexes` section
   - Updated IAM policy to include GSI permissions

2. `likenessguard-aws/src/shared/services/dynamodb_client.py`
   - Updated `get_audit_records_by_likeness()` method
   - Replaced `scan()` with `query()` using GSI
   - Improved pagination handling
   - Removed manual sorting (handled by GSI)

## Verification Checklist

- [x] CloudFormation template updated with GSI definition
- [x] DynamoDB client updated to use query() with GSI
- [x] IAM permissions include GSI access
- [x] Pagination properly handled
- [x] Sorting handled by GSI (ScanIndexForward=False)
- [x] Deployment scripts created
- [x] Documentation complete

## Notes

- The `LikenessID` field is already stored in audit records (optional field in AuditRecord model)
- No data migration required - existing records already have the field
- IAM policy already included `dynamodb:Query` permission
- GSI uses same billing mode as table (PAY_PER_REQUEST)
- No application code changes needed beyond DynamoDB client

## Next Steps

After deployment and GSI activation:
1. Test Activity Logs page with various likeness IDs
2. Verify performance improvement
3. Monitor CloudWatch metrics for query latency
4. Consider adding additional filters if needed (e.g., by action type)

## Support

If you encounter issues:
1. Check GSI status in AWS Console
2. Review CloudWatch logs for Lambda functions
3. Verify IAM permissions include GSI access
4. Ensure `LikenessID` field exists in audit records
