# API Services

This directory contains the API client and service layer for the LikenessGuard dashboard.

## API Client

The `api-client.ts` file provides a robust HTTP client built on Axios with the following features:

### Features

- **Error Handling**: Automatic error categorization (validation, server, network, unknown)
- **Retry Logic**: Exponential backoff retry for network and server errors (not validation errors)
- **Timeout Configuration**: Configurable request timeout (default: 30 seconds)
- **Request/Response Interceptors**: Global error handling and request modification
- **Type Safety**: Full TypeScript support with typed requests and responses

### Usage

```typescript
import { getApiClient } from './services/api-client';

const client = getApiClient();

// GET request
const data = await client.get('/endpoint', { param: 'value' });

// POST request
const result = await client.post('/endpoint', { data: 'value' });

// PUT request
const updated = await client.put('/endpoint', { data: 'value' });

// DELETE request
const deleted = await client.delete('/endpoint');
```

### Error Handling

The API client categorizes errors into four types:

1. **Validation Errors (4xx)**: Client-side errors, invalid input
2. **Server Errors (5xx)**: Backend errors
3. **Network Errors**: Connection issues, timeouts
4. **Unknown Errors**: Unexpected errors

```typescript
try {
  const data = await client.get('/endpoint');
} catch (error) {
  const apiError = error as ApiError;
  
  switch (apiError.type) {
    case 'validation':
      // Handle validation errors
      console.error('Invalid input:', apiError.message);
      break;
    case 'server':
      // Handle server errors
      console.error('Server error:', apiError.message);
      break;
    case 'network':
      // Handle network errors
      console.error('Connection error:', apiError.message);
      break;
    default:
      console.error('Unknown error:', apiError.message);
  }
}
```

### Configuration

The API client is configured via environment variables:

- `VITE_API_BASE_URL`: Base URL for the LikenessGuard backend API
- Default timeout: 30 seconds
- Default max retries: 3
- Default retry delay: 1 second (with exponential backoff)

See `src/config/api-config.ts` for configuration details.

### Testing

The API client includes comprehensive unit tests covering:

- HTTP method functionality (GET, POST, PUT, DELETE)
- Error handling for all error types
- Retry logic with exponential backoff
- Configuration and utility methods

Run tests with:

```bash
npm test -- api-client.test.ts
```

## Registration Service

The `registration-service.ts` file handles likeness registration operations including file conversion, validation, and API integration.

### Features

- **File-to-Base64 Conversion**: Converts image files to base64 strings for API upload
- **Image Validation**: Validates file formats (JPEG, PNG, WebP) and sizes
- **Registration API**: Calls POST /register endpoint with user data and photos
- **Error Handling**: Provides detailed validation and API error messages

### Functions

#### `registerLikeness(userId, photos, consentPolicy, email?)`
Registers a user's likeness with 5-10 photos.

```typescript
import { registerLikeness, createDefaultConsentPolicy } from './services/registration-service';

const photos = [/* File objects */];
const policy = createDefaultConsentPolicy();

const response = await registerLikeness('user123', photos, policy, 'user@example.com');
console.log(response.likeness_id); // Generated likeness ID
```

#### `fileToBase64(file)` / `filesToBase64(files)`
Converts File objects to base64 strings.

```typescript
const base64 = await fileToBase64(imageFile);
const base64Array = await filesToBase64([file1, file2, file3]);
```

#### `validateImageFormat(file)` / `validateImageFiles(files)`
Validates image file formats and constraints.

```typescript
const isValid = validateImageFormat(file); // true/false

const validation = validateImageFiles(files);
if (!validation.valid) {
  console.error(validation.errors);
}
```

#### `createDefaultConsentPolicy()`
Creates a restrictive default consent policy.

```typescript
const policy = createDefaultConsentPolicy();
// Returns: { allow_self_edits: true, deny_third_party_edits: true, ... }
```

### Validation Rules

- **Photo Count**: 5-10 images required
- **File Formats**: JPEG, PNG, WebP only
- **File Size**: Maximum 10MB per file
- **Total Validation**: All files must pass format and size checks

### Testing

The registration service includes comprehensive unit tests covering:

- File-to-base64 conversion
- Multiple file conversion
- Image format validation
- File validation with various edge cases
- Registration API integration
- Error handling

Run tests with:

```bash
npm test -- registration-service.test.ts
```

## Next Steps

Additional service files will be added to this directory:

- `consent-service.ts`: Manages consent policies and checks
- `logs-service.ts`: Retrieves activity logs and violations
