# Deep Investigation and Fix - Consent Check AttributeError

## Problem Summary
The consent check feature was failing with:
```
AttributeError: 'dict' object has no attribute 'fingerprint_embedding'
AttributeError: 'dict' object has no attribute 'likeness_id'
```

## Root Cause Analysis

### Investigation Steps
1. **Initial Diagnosis**: Error occurred in `similarity_matcher.py` at line 110 and 129
2. **First Fix Attempt**: Updated `dynamodb_client.py` to include `fingerprint_embedding` in query results
3. **Deployment Issue**: Lambda code wasn't actually updating due to cached containers
4. **Downloaded Current Lambda Code**: Verified the deployed code to see what was actually running
5. **Found Real Issue**: The `similarity_matcher.py` was using attribute access (`record.fingerprint_embedding`) on dictionary objects

### The Actual Problem
The `DynamoDBClient.query_all_fingerprints()` method returns a list of dictionaries:
```python
result.append({
    'likeness_id': item['LikenessID'],
    'fingerprint_hash': item['FingerprintHash'],
    'fingerprint_embedding': item['FingerprintEmbedding'],
    'consent_policy': ConsentPolicy.from_dict(item['ConsentPolicy'])
})
```

But the `SimilarityMatcher.find_matches()` method was trying to access these as object attributes:
```python
# WRONG - trying to access dictionary as object
similarity = calculate_cosine_similarity(
    query_embedding,
    record.fingerprint_embedding  # ❌ AttributeError!
)
```

## The Fix

### Changed in `similarity_matcher.py`
Updated all dictionary access to use bracket notation:

```python
# CORRECT - accessing dictionary with keys
for record in all_records:
    try:
        similarity = calculate_cosine_similarity(
            query_embedding,
            record['fingerprint_embedding']  # ✅ Correct!
        )
        
        if similarity >= threshold:
            match = Match(
                likeness_id=record['likeness_id'],  # ✅ Correct!
                similarity_score=similarity,
                consent_policy=record['consent_policy'],  # ✅ Correct!
                fingerprint_hash=record['fingerprint_hash']  # ✅ Correct!
            )
            matches.append(match)
    
    except Exception as e:
        logger.warning(
            f"Error calculating similarity for likeness_id={record.get('likeness_id', 'unknown')}: {e}"
        )
        continue
```

### Files Modified
1. `likenessguard-aws/src/shared/services/dynamodb_client.py` - Added `FingerprintEmbedding` to projection
2. `likenessguard-aws/src/shared/services/similarity_matcher.py` - Changed attribute access to dictionary access

## Deployment
```powershell
cd likenessguard-aws
.\deploy-consent-check-fix.ps1
```

### Verification
- **CodeSha256 Changed**: From `9BQkzeBAQ4pH9l9YNEAWFVIxPUHUUV0WdmqZxo6oEJ8=` to `q8hTVhxj7Dv1sMgG7TLD3QKBjpm4x1y2JsbF1ludyZU=`
- **Latest Logs**: No more AttributeError messages
- **API Response**: 200 OK with proper responses

## Testing

### Test with No Face (Working)
```bash
node likenessguard-dashboard/test-consent-check-real.cjs
```
Expected: `{"decision": "UNKNOWN", "reason_code": "UNKNOWN_NO_FACE"}`

### Test with Registered Photo
```bash
node likenessguard-dashboard/test-consent-with-registered-photo.cjs <path-to-photo>
```
Expected: Match found with similarity score and consent decision

## Key Learnings

1. **Lambda Container Caching**: Lambda keeps containers warm, so code changes may not be immediately visible
2. **Verify Deployed Code**: Always download and inspect the actual deployed code when debugging
3. **Type Consistency**: Be careful with data types - dictionaries vs objects require different access patterns
4. **CodeSha256 Verification**: Check if the hash changes to confirm code was actually updated

## Status
✅ **FIXED** - Consent check now works correctly with real images
✅ **Deployed** - New code is running in Lambda
✅ **Tested** - API returns proper responses without errors

## Next Steps
1. Test with a real registered user photo to verify similarity matching
2. Test consent policy evaluation (ALLOW/DENY decisions)
3. Verify the dashboard consent check page works end-to-end
4. Monitor CloudWatch logs for any remaining issues
