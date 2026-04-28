# Dashboard Fix Instructions

## Issue
The Consent Policy and Consent Check pages show "Unable to connect to server" errors.

## Root Causes
1. Dashboard API configuration pointing to wrong endpoint
2. Missing GET /consent endpoint in API Gateway
3. Files may be corrupted (binary encoding issue)

## Fixes Required

### 1. API Configuration (COMPLETED)
Created `.env` file with correct API endpoint:
```
VITE_API_BASE_URL=https://ol35n8kn4f.execute-api.us-east-1.amazonaws.com/v1
VITE_APP_ENV=development
```

### 2. Update Registration to Store Consent Policy

**File**: `likenessguard-dashboard/src/pages/Registration.tsx`

Change the `handleSuccess` function from:
```typescript
const handleSuccess = (likenessId: string) => {
  localStorage.setItem('likenessId', likenessId);
  setTimeout(() => navigate('/'), 3000);
};
```

To:
```typescript
const handleSuccess = (likenessId: string, consentPolicy?: ConsentPolicy) => {
  localStorage.setItem('likenessId', likenessId);
  if (consentPolicy) {
    localStorage.setItem('consentPolicy', JSON.stringify(consentPolicy));
  }
  setTimeout(() => navigate('/'), 3000);
};
```

**File**: `likenessguard-dashboard/src/components/registration/RegistrationForm.tsx`

Update the `onSuccess` callback to pass the consent policy:
```typescript
if (onSuccess) {
  onSuccess(response.likeness_id, formState.consentPolicy);
}
```

### 3. Update Consent Policy Page to Use localStorage

**File**: `likenessguard-dashboard/src/pages/ConsentPolicy.tsx`

Replace the `fetchPolicy` function with:
```typescript
useEffect(() => {
  const loadPolicy = () => {
    try {
      setLoading(true);
      setError(null);

      // Get stored likeness ID and policy from localStorage
      const storedLikenessId = localStorage.getItem('likenessId');
      const storedPolicy = localStorage.getItem('consentPolicy');

      if (!storedLikenessId) {
        setError({
          type: 'validation',
          message: 'No registered likeness found',
          details: 'Please register your likeness before managing consent policies.',
        });
        return;
      }

      setLikenessId(storedLikenessId);

      // Load policy from localStorage
      if (storedPolicy) {
        setCurrentPolicy(JSON.parse(storedPolicy));
      } else {
        setCurrentPolicy(DEFAULT_POLICY);
      }
    } catch (err: any) {
      setError({
        type: 'unknown',
        message: 'Failed to load consent policy',
        details: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  loadPolicy();
}, []);
```

Update the `handleSave` function to save to localStorage:
```typescript
const handleSave = async (newPolicy: ConsentPolicy): Promise<void> => {
  if (!likenessId) {
    throw {
      type: 'validation',
      message: 'No likeness ID available',
      details: 'Please register your likeness first.',
    };
  }

  // Call the consent service to update policy
  await updatePolicy(likenessId, newPolicy);
  
  // Update local state and localStorage
  setCurrentPolicy(newPolicy);
  localStorage.setItem('consentPolicy', JSON.stringify(newPolicy));
};
```

### 4. Restart Dashboard Development Server

After making the changes:
```bash
cd likenessguard-dashboard
npm run dev
```

The dashboard should now:
- Use the correct AWS API Gateway endpoint
- Store consent policy in localStorage after registration
- Load consent policy from localStorage (no API call needed)
- Update consent policy via API when user makes changes

## Testing

1. **Registration**: Upload photos and register a likeness
   - Verify likeness_id is stored in localStorage
   - Verify consentPolicy is stored in localStorage

2. **Consent Policy**: Navigate to Consent Policy page
   - Should load policy from localStorage
   - Should display current policy settings
   - Should allow editing and saving

3. **Consent Check**: Navigate to Consent Check page
   - Upload a reference image
   - Select usage type
   - Click "Check Consent"
   - Should return ALLOW/DENY decision

## Alternative: Implement GET /consent Endpoint

If you prefer to implement the proper GET endpoint:

1. Create `likenessguard-aws/src/lambdas/consent_get/handler.py`
2. Add ConsentGetFunction to CloudFormation template
3. Add GET method to /consent resource
4. Deploy updated stack

See `MISSING_ENDPOINTS_ANALYSIS.md` for details.
