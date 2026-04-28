# Test All Dashboard Pages

## Dashboard URL
**http://localhost:5175/**

## Test Sequence

### 1. Registration Page
**URL**: http://localhost:5175/register

**Steps**:
1. Enter a User ID (e.g., "test-user-001")
2. Enter an email (optional)
3. Upload 5-10 photos of a face
4. Click "Register Likeness"
5. Wait for processing (should take 10-30 seconds)

**Expected Result**:
- ✅ Success message appears with Likeness ID
- ✅ localStorage contains `likenessId`
- ✅ localStorage contains `consentPolicy` (JSON object)
- ✅ Redirects to home page after 3 seconds

**Check localStorage**:
```javascript
// Open browser console (F12) and run:
localStorage.getItem('likenessId')
localStorage.getItem('consentPolicy')
```

---

### 2. Consent Policy Page
**URL**: http://localhost:5175/consent-policy

**Steps**:
1. Navigate to Consent Policy page
2. Should load immediately (no API call)
3. Toggle some policy settings (e.g., allow third-party edits)
4. Click "Save Changes"
5. Wait for confirmation

**Expected Result**:
- ✅ Page loads policy from localStorage (no "Unable to connect" error)
- ✅ Policy settings are displayed correctly
- ✅ Saving calls PUT /consent/update API
- ✅ Success message appears
- ✅ localStorage is updated with new policy

**Verify**:
- No "Unable to connect to server" error
- Policy changes are saved
- Browser console shows PUT request to `/consent/update`

---

### 3. Consent Check Page
**URL**: http://localhost:5175/consent-check

**Steps**:
1. Navigate to Consent Check page
2. Select a usage type (e.g., "General Generation")
3. Enter a requester ID (e.g., "demo-requester")
4. Upload a reference image (use one of the photos from registration)
5. Click "Check Consent"
6. Wait for result

**Expected Result**:
- ✅ No connection errors
- ✅ API call to POST /consent/check succeeds
- ✅ Decision is displayed (ALLOW or DENY)
- ✅ Shows match confidence and reasoning

**Verify**:
- Decision matches the policy settings
- If using same photo as registration, should show high confidence match
- Browser console shows POST request to `/consent/check`

---

### 4. Activity Logs Page
**URL**: http://localhost:5175/logs

**Steps**:
1. Navigate to Activity Logs page
2. Should load audit log entries
3. Look for the consent check from step 3

**Expected Result**:
- ✅ No connection errors
- ✅ API call to GET /evidence succeeds
- ✅ Shows list of audit log entries
- ✅ Recent consent check appears in the list

**Verify**:
- Logs are displayed in chronological order
- Each log shows timestamp, decision, and usage type
- Browser console shows GET request to `/evidence`

---

## Common Issues and Solutions

### Issue: "Unable to connect to server"
**Solution**: Check that `.env` file exists with correct API endpoint:
```
VITE_API_BASE_URL=https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
```

### Issue: "No registered likeness found"
**Solution**: 
1. Clear localStorage: `localStorage.clear()`
2. Go back to Registration page and register again

### Issue: White/blank page
**Solution**: 
1. Check browser console for errors
2. Verify all files are properly encoded (UTF-8)
3. Restart development server

### Issue: Registration fails with "No valid faces detected"
**Solution**: 
1. Use clear, well-lit photos of faces
2. Ensure photos are in JPEG/PNG format
3. Try different photos

---

## Browser Console Commands

### Check localStorage
```javascript
console.log('Likeness ID:', localStorage.getItem('likenessId'));
console.log('Consent Policy:', JSON.parse(localStorage.getItem('consentPolicy')));
```

### Clear localStorage
```javascript
localStorage.clear();
console.log('localStorage cleared');
```

### Check API configuration
```javascript
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

---

## Success Criteria

All pages should:
- ✅ Load without "Unable to connect" errors
- ✅ Display content correctly
- ✅ Make API calls to correct endpoints
- ✅ Show appropriate success/error messages
- ✅ Store/retrieve data from localStorage correctly

## Next Steps After Testing

If all tests pass:
1. Test the complete end-to-end flow multiple times
2. Try different photos and usage types
3. Test policy updates and verify they affect consent checks
4. Check that audit logs capture all consent checks

If any tests fail:
1. Check browser console for errors
2. Verify API endpoint in `.env` file
3. Check that Lambda functions are deployed correctly
4. Review CloudWatch logs for API errors
