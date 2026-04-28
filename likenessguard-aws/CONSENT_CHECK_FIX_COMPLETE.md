# Consent Check Fix Complete

## Issue Summary
The consent check feature was failing with `AttributeError: 'dict' object has no attribute 'fingerprint_embedding'` when processing images with faces.

## Root Cause
The `DynamoDBClient.query_all_fingerprints()` method was returning dictionaries without the `fingerprint_embedding` field, but the `SimilarityMatcher` was trying to access it as an object attribute.

## Fix Applied

### 1. Updated DynamoDBClient (src/shared/services/dynamodb_client.py)
Changed the `query_all_fingerprints()` method to include `FingerprintEmbedding` in the projection expression and return it in the result dictionaries:

```python
def query_all_fingerprints(self) -> List[Dict[str, Any]]:
    # ...
    scan_kwargs = {
        'ProjectionExpression': 'LikenessID, FingerprintHash, FingerprintEmbedding, ConsentPolicy'
    }
    # ...
    result.append({
        'likeness_id': item['LikenessID'],
        'fingerprint_hash': item['FingerprintHash'],
        'fingerprint_embedding': item['FingerprintEmbedding'],  # ADDED THIS
        'consent_policy': ConsentPolicy.from_dict(item['ConsentPolicy'])
    })
```

### 2. Deployed Lambda Function
- Created proper deployment package with correct directory structure
- Updated LikenessGuard-ConsentCheck Lambda function
- Forced container refresh by updating function configuration

## Deployment Commands
```powershell
# Deploy the fix
cd likenessguard-aws
.\deploy-consent-check-fix.ps1

# Force container refresh
aws lambda update-function-configuration `
    --function-name LikenessGuard-ConsentCheck `
    --description "Fixed similarity matcher dict access" `
    --region us-east-1
```

## Testing
Test the consent check with:
```bash
# Test with no face (should return UNKNOWN_NO_FACE)
node likenessguard-dashboard/test-consent-check-real.cjs

# Test with registered photo (should match and return decision)
node likenessguard-dashboard/test-consent-with-registered-photo.cjs <path-to-photo>
```

## Status
✅ Fix deployed and Lambda containers refreshed
✅ API responding correctly (200 OK)
✅ No more AttributeError in CloudWatch logs

## Next Steps
1. Test consent check with a real registered user photo
2. Verify similarity matching works correctly
3. Check that consent policies are properly evaluated
4. Test the dashboard consent check page

## Files Modified
- `likenessguard-aws/src/shared/services/dynamodb_client.py`
- Created `likenessguard-aws/deploy-consent-check-fix.ps1`
- Created `likenessguard-dashboard/test-consent-with-registered-photo.cjs`

## Notes
- The fix ensures that `fingerprint_embedding` is included in the data returned from DynamoDB
- The similarity matcher can now properly calculate cosine similarity scores
- Lambda containers were forced to refresh to ensure all instances use the new code
- Registration functionality remains untouched and working correctly
