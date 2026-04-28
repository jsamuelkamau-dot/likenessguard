# API Type Definitions

This directory contains TypeScript type definitions for the LikenessGuard API contracts.

## Overview

The `api-types.ts` file defines all TypeScript interfaces and enums that match the backend API request/response structures. These types ensure type safety when making API calls and handling responses in the dashboard.

## Type Categories

### Enums

- **UsageType**: Types of AI generation usage (SELF_EDIT, THIRD_PARTY_EDIT, FACE_SWAP, GENERAL_GENERATION)
- **Decision**: Consent check decisions (ALLOW, DENY, UNKNOWN)
- **ReasonCode**: Detailed reason codes explaining decisions

### Core Data Models

- **ConsentPolicy**: Machine-readable consent policy with boolean flags
- **UserMetadata**: User information associated with a likeness
- **ConsentRecord**: Complete consent record from the registry
- **AuditRecord**: Audit log entry for consent check history

### API Request/Response Types

#### Registration API (POST /register)
- `RegistrationRequest`: Request body with user_id, photo_keys, consent_policy
- `RegistrationResponse`: Response with likeness_id, status, processed_photos

#### Consent Check API (POST /consent/check)
- `ConsentCheckRequest`: Request body with referenceImage, usageType, requesterId
- `ConsentCheckResponse`: Response with decision, reason_code, similarity_score

#### Consent Policy API
- `ConsentUpdateRequest`: Request for PUT /consent
- `ConsentUpdateResponse`: Response with updated policy info
- `ConsentRevokeRequest`: Request for DELETE /consent
- `ConsentRevokeResponse`: Response with revocation confirmation
- `ConsentGetRequest`: Request for GET /consent
- `ConsentGetResponse`: Response with current policy

#### Activity Logs API (GET /evidence)
- `EvidenceRetrievalRequest`: Request with likeness_id and pagination params
- `EvidenceRetrievalResponse`: Response with evidence_records array
- `EvidenceRecord`: Individual activity log entry
- `ActivityLog`: Alias for EvidenceRecord

#### Violations API
- `Violation`: Filtered evidence record with DENY decision
- `ViolationsResponse`: Response with violations array

### Error Types

- **ApiError**: Standard error response structure
- **ApiErrorResponse**: Complete error response wrapper

### Helper Types

- **ApiResponse<T>**: Generic type for success or error responses
- **HttpMethod**: HTTP methods used by the API
- **ApiEndpoint**: Enum of API endpoint paths

## Usage Examples

### Making a Registration Request

```typescript
import { RegistrationRequest, RegistrationResponse } from '@/types/api-types';

const request: RegistrationRequest = {
  user_id: 'user123',
  photo_keys: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg'],
  consent_policy: {
    allow_self_edits: true,
    deny_third_party_edits: true,
    deny_face_swaps: true,
    deny_sexualized_content: true,
    deny_impersonation: true,
    deny_political_use: true,
  },
  email: 'user@example.com',
};

// Make API call
const response: RegistrationResponse = await apiClient.post('/register', request);
console.log(response.likeness_id);
```

### Handling Consent Check Response

```typescript
import { ConsentCheckRequest, ConsentCheckResponse, Decision } from '@/types/api-types';

const request: ConsentCheckRequest = {
  referenceImage: 'base64encodedimage',
  usageType: UsageType.SELF_EDIT,
  requesterId: 'requester123',
};

const response: ConsentCheckResponse = await apiClient.post('/consent/check', request);

if (response.decision === Decision.ALLOW) {
  console.log('Consent granted!');
} else if (response.decision === Decision.DENY) {
  console.log('Consent denied:', response.reason_code);
} else {
  console.log('No match found');
}
```

### Updating Consent Policy

```typescript
import { ConsentUpdateRequest, ConsentUpdateResponse } from '@/types/api-types';

const request: ConsentUpdateRequest = {
  likeness_id: 'likeness-uuid-123',
  new_policy: {
    allow_self_edits: false,
    deny_third_party_edits: true,
    deny_face_swaps: true,
    deny_sexualized_content: true,
    deny_impersonation: true,
    deny_political_use: true,
  },
};

const response: ConsentUpdateResponse = await apiClient.put('/consent', request);
console.log(response.message);
```

### Retrieving Activity Logs

```typescript
import { EvidenceRetrievalRequest, EvidenceRetrievalResponse } from '@/types/api-types';

const request: EvidenceRetrievalRequest = {
  likeness_id: 'likeness-uuid-123',
  limit: 50,
};

const response: EvidenceRetrievalResponse = await apiClient.get('/evidence', request);
console.log(`Found ${response.count} activity logs`);

response.evidence_records.forEach(record => {
  console.log(`${record.timestamp}: ${record.decision} - ${record.reason_code}`);
});
```

### Error Handling

```typescript
import { ApiError, ApiErrorResponse } from '@/types/api-types';

try {
  const response = await apiClient.post('/register', request);
} catch (error) {
  const apiError = error as ApiErrorResponse;
  console.error(`Error ${apiError.body.error.code}: ${apiError.body.error.message}`);
  
  if (apiError.body.error.details) {
    console.error('Details:', apiError.body.error.details);
  }
}
```

## Type Safety Benefits

1. **Compile-time validation**: TypeScript catches type mismatches before runtime
2. **IDE autocomplete**: Get intelligent suggestions for API request/response fields
3. **Refactoring safety**: Changes to types are caught across the entire codebase
4. **Documentation**: Types serve as inline documentation for API contracts
5. **Reduced bugs**: Prevents common mistakes like typos in field names

## Maintenance

When the backend API changes:

1. Update the corresponding types in `api-types.ts`
2. Run tests: `npm test api-types.test.ts`
3. Update this README if new types are added
4. Check for TypeScript errors across the codebase: `npm run type-check`

## Testing

Unit tests for type definitions are in `api-types.test.ts`. Run them with:

```bash
npm test api-types.test.ts
```

These tests verify that:
- Enums have correct values
- Interfaces accept valid data structures
- Optional fields work correctly
- Error types are properly structured

## Related Files

- `api-types.ts`: Type definitions
- `api-types.test.ts`: Unit tests
- `../services/api-client.ts`: API client that uses these types
- `../services/*-service.ts`: Service layer that uses these types
