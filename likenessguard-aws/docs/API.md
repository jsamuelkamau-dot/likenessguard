# LikenessGuard API Documentation

## Overview

The LikenessGuard API provides RESTful endpoints for likeness consent management and enforcement. All endpoints use HTTPS with TLS 1.2+ and require API key authentication.

**Base URL**: `https://{api-id}.execute-api.{region}.amazonaws.com/Prod`

**Authentication**: API Key in `x-api-key` header

**Content Type**: `application/json`

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [POST /register](#post-register)
   - [POST /consent/check](#post-consentcheck)
   - [PUT /consent/update](#put-consentupdate)
   - [DELETE /consent/revoke](#delete-consentrevoke)
   - [GET /evidence](#get-evidence)
3. [Data Models](#data-models)
4. [Error Codes](#error-codes)
5. [Rate Limiting](#rate-limiting)
6. [Examples](#examples)

## Authentication

All API requests require an API key passed in the `x-api-key` header.

```bash
curl -X POST https://api.likenessguard.example.com/consent/check \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reference_image": "...", "usage_type": "SELF_EDIT", "requester_id": "user@example.com"}'
```

### Obtaining an API Key

API keys are provisioned during deployment. Contact your system administrator for access.

**Production Recommendation**: Use AWS Cognito or IAM authentication instead of API keys.

## Endpoints

### POST /register

Register a new user with their likeness photos and consent policy.

#### Request

**URL**: `/register`

**Method**: `POST`

**Headers**:
- `x-api-key`: Your API key
- `Content-Type`: `application/json`

**Body**:
```json
{
  "user_id": "string (required)",
  "photo_keys": ["string (required, 5-10 items)"],
  "consent_policy": {
    "allow_self_edits": "boolean (required)",
    "deny_third_party_edits": "boolean (required)",
    "deny_face_swaps": "boolean (required)",
    "deny_sexualized_content": "boolean (required)",
    "deny_impersonation": "boolean (required)",
    "deny_political_use": "boolean (required)"
  }
}
```

**Parameters**:
- `user_id`: Unique identifier for the user (email, username, etc.)
- `photo_keys`: Array of S3 object keys for uploaded photos (5-10 photos required)
- `consent_policy`: Machine-readable consent policy defining permitted usage

#### Response

**Success (200 OK)**:
```json
{
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SUCCESS",
  "processed_photos": 7,
  "created_at": 1709481600,
  "message": "Registration successful"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "INVALID_PHOTO_COUNT",
  "message": "Photo count must be between 5 and 10",
  "request_id": "req-123456"
}
```

**Error (500 Internal Server Error)**:
```json
{
  "error": "PROCESSING_ERROR",
  "message": "Failed to process photos",
  "request_id": "req-123456"
}
```

#### Example

```bash
curl -X POST https://api.likenessguard.example.com/register \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "alice@example.com",
    "photo_keys": [
      "uploads/alice/photo1.jpg",
      "uploads/alice/photo2.jpg",
      "uploads/alice/photo3.jpg",
      "uploads/alice/photo4.jpg",
      "uploads/alice/photo5.jpg",
      "uploads/alice/photo6.jpg",
      "uploads/alice/photo7.jpg"
    ],
    "consent_policy": {
      "allow_self_edits": true,
      "deny_third_party_edits": true,
      "deny_face_swaps": true,
      "deny_sexualized_content": true,
      "deny_impersonation": true,
      "deny_political_use": true
    }
  }'
```

---

### POST /consent/check

Check if a generation request is permitted based on consent policies.

#### Request

**URL**: `/consent/check`

**Method**: `POST`

**Headers**:
- `x-api-key`: Your API key
- `Content-Type`: `application/json`

**Body**:
```json
{
  "reference_image": "string (required)",
  "usage_type": "string (required)",
  "requester_id": "string (required)",
  "metadata": "object (optional)"
}
```

**Parameters**:
- `reference_image`: Base64-encoded image or S3 object key
- `usage_type`: Type of usage requested (see [Usage Types](#usage-types))
- `requester_id`: Identifier of the requesting entity
- `metadata`: Optional additional context

#### Response

**Success (200 OK)**:
```json
{
  "decision": "ALLOW | DENY | UNKNOWN",
  "reason_code": "string",
  "likeness_id": "string (if matched)",
  "similarity_score": "number (if matched)",
  "timestamp": 1709481600,
  "request_id": "req-123456"
}
```

**Decisions**:
- `ALLOW`: Generation is permitted by consent policy
- `DENY`: Generation is prohibited by consent policy
- `UNKNOWN`: No matching likeness found (default-deny)

**Reason Codes**:
- `ALLOW_SELF_EDIT`: User is editing their own content
- `ALLOW_POLICY_PERMITS`: Policy explicitly allows this usage
- `DENY_THIRD_PARTY`: Policy denies third-party edits
- `DENY_FACE_SWAP`: Policy denies face swaps
- `DENY_SEXUALIZED_CONTENT`: Policy denies sexualized content
- `DENY_IMPERSONATION`: Policy denies impersonation
- `DENY_POLITICAL_USE`: Policy denies political use
- `DENY_POLICY_VIOLATION`: General policy violation
- `UNKNOWN_NO_MATCH`: No matching likeness found
- `UNKNOWN_NO_FACE`: No face detected in reference image

#### Example

```bash
curl -X POST https://api.likenessguard.example.com/consent/check \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_image": "iVBORw0KGgoAAAANSUhEUgAA...",
    "usage_type": "THIRD_PARTY_EDIT",
    "requester_id": "platform@example.com"
  }'
```

**Response**:
```json
{
  "decision": "DENY",
  "reason_code": "DENY_THIRD_PARTY",
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "similarity_score": 0.92,
  "timestamp": 1709481600,
  "request_id": "req-123456"
}
```

---

### PUT /consent/update

Update an existing consent policy.

#### Request

**URL**: `/consent/update`

**Method**: `PUT`

**Headers**:
- `x-api-key`: Your API key
- `Content-Type`: `application/json`

**Body**:
```json
{
  "likeness_id": "string (required)",
  "consent_policy": {
    "allow_self_edits": "boolean (required)",
    "deny_third_party_edits": "boolean (required)",
    "deny_face_swaps": "boolean (required)",
    "deny_sexualized_content": "boolean (required)",
    "deny_impersonation": "boolean (required)",
    "deny_political_use": "boolean (required)"
  }
}
```

#### Response

**Success (200 OK)**:
```json
{
  "status": "SUCCESS",
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "modified_at": 1709481600,
  "message": "Policy updated successfully"
}
```

**Error (404 Not Found)**:
```json
{
  "error": "LIKENESS_NOT_FOUND",
  "message": "No likeness found with the provided ID",
  "request_id": "req-123456"
}
```

#### Example

```bash
curl -X PUT https://api.likenessguard.example.com/consent/update \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
    "consent_policy": {
      "allow_self_edits": true,
      "deny_third_party_edits": false,
      "deny_face_swaps": true,
      "deny_sexualized_content": true,
      "deny_impersonation": true,
      "deny_political_use": false
    }
  }'
```

---

### DELETE /consent/revoke

Revoke all consent by setting a deny-all policy.

#### Request

**URL**: `/consent/revoke`

**Method**: `DELETE`

**Headers**:
- `x-api-key`: Your API key
- `Content-Type`: `application/json`

**Body**:
```json
{
  "likeness_id": "string (required)"
}
```

#### Response

**Success (200 OK)**:
```json
{
  "status": "SUCCESS",
  "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
  "revoked_at": 1709481600,
  "message": "Consent revoked successfully"
}
```

#### Example

```bash
curl -X DELETE https://api.likenessguard.example.com/consent/revoke \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "likeness_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### GET /evidence

Retrieve evidence records for consent violations.

#### Request

**URL**: `/evidence?likeness_id={likeness_id}&limit={limit}&start_key={start_key}`

**Method**: `GET`

**Headers**:
- `x-api-key`: Your API key

**Query Parameters**:
- `likeness_id` (required): Likeness ID to retrieve evidence for
- `limit` (optional): Maximum number of records to return (default: 50, max: 100)
- `start_key` (optional): Pagination token from previous response

#### Response

**Success (200 OK)**:
```json
{
  "evidence_records": [
    {
      "query_id": "req-123456",
      "timestamp": 1709481600,
      "decision": "DENY",
      "reason_code": "DENY_THIRD_PARTY",
      "usage_type": "THIRD_PARTY_EDIT",
      "requester_id": "platform@example.com",
      "similarity_score": 0.92,
      "metadata": {}
    }
  ],
  "count": 1,
  "next_key": "eyJxdWVyeV9pZCI6InJlcS0xMjM0NTYifQ=="
}
```

#### Example

```bash
curl -X GET "https://api.likenessguard.example.com/evidence?likeness_id=550e8400-e29b-41d4-a716-446655440000&limit=10" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Data Models

### Consent Policy

```json
{
  "allow_self_edits": boolean,
  "deny_third_party_edits": boolean,
  "deny_face_swaps": boolean,
  "deny_sexualized_content": boolean,
  "deny_impersonation": boolean,
  "deny_political_use": boolean
}
```

**Fields**:
- `allow_self_edits`: Allow user to edit their own content
- `deny_third_party_edits`: Deny third parties from editing
- `deny_face_swaps`: Deny face swap operations
- `deny_sexualized_content`: Deny sexualized content generation
- `deny_impersonation`: Deny impersonation or identity theft
- `deny_political_use`: Deny use in political content

### Usage Types

Valid values for `usage_type` parameter:

- `SELF_EDIT`: User editing their own content
- `THIRD_PARTY_EDIT`: Third party editing content
- `FACE_SWAP`: Face swap operation
- `SEXUALIZED_CONTENT`: Sexualized content generation
- `IMPERSONATION`: Impersonation or identity theft
- `POLITICAL_USE`: Use in political content
- `GENERAL`: General usage (evaluated against all policies)

### Decision Types

- `ALLOW`: Generation is permitted
- `DENY`: Generation is prohibited
- `UNKNOWN`: No matching likeness found (treat as deny)

## Error Codes

### Client Errors (4xx)

| Code | Error | Description |
|------|-------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request body |
| 400 | `INVALID_PHOTO_COUNT` | Photo count must be 5-10 |
| 400 | `INVALID_IMAGE_FORMAT` | Image must be JPEG or PNG |
| 400 | `MISSING_REQUIRED_FIELD` | Required field is missing |
| 400 | `INVALID_POLICY` | Consent policy is invalid |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 404 | `LIKENESS_NOT_FOUND` | Likeness ID not found |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |

### Server Errors (5xx)

| Code | Error | Description |
|------|-------|-------------|
| 500 | `INTERNAL_ERROR` | Internal server error |
| 500 | `PROCESSING_ERROR` | Failed to process request |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| 503 | `REKOGNITION_UNAVAILABLE` | Face detection service unavailable |
| 503 | `DATABASE_UNAVAILABLE` | Database service unavailable |

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "request_id": "req-123456",
  "timestamp": 1709481600
}
```

## Rate Limiting

**Limits**:
- 100 requests per second per API key
- 10,000 requests per day per API key (Free Tier)

**Headers**:
- `X-RateLimit-Limit`: Maximum requests per second
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets (Unix timestamp)

**Response (429 Too Many Requests)**:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please retry after 60 seconds.",
  "retry_after": 60,
  "request_id": "req-123456"
}
```

## Examples

### Complete Registration Flow

```python
import requests
import base64

# 1. Upload photos to S3 (not shown)
photo_keys = [
    "uploads/alice/photo1.jpg",
    "uploads/alice/photo2.jpg",
    # ... 5-10 photos total
]

# 2. Register user
response = requests.post(
    "https://api.likenessguard.example.com/register",
    headers={
        "x-api-key": "YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "user_id": "alice@example.com",
        "photo_keys": photo_keys,
        "consent_policy": {
            "allow_self_edits": True,
            "deny_third_party_edits": True,
            "deny_face_swaps": True,
            "deny_sexualized_content": True,
            "deny_impersonation": True,
            "deny_political_use": True
        }
    }
)

likeness_id = response.json()["likeness_id"]
print(f"Registered with Likeness ID: {likeness_id}")
```

### Consent Check Flow

```python
import requests
import base64

# 1. Load reference image
with open("reference.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

# 2. Check consent
response = requests.post(
    "https://api.likenessguard.example.com/consent/check",
    headers={
        "x-api-key": "YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "reference_image": image_data,
        "usage_type": "THIRD_PARTY_EDIT",
        "requester_id": "platform@example.com"
    }
)

result = response.json()
if result["decision"] == "ALLOW":
    print("Generation permitted")
elif result["decision"] == "DENY":
    print(f"Generation denied: {result['reason_code']}")
else:
    print("Unknown likeness (default deny)")
```

### Policy Update Flow

```python
import requests

# Update consent policy
response = requests.put(
    "https://api.likenessguard.example.com/consent/update",
    headers={
        "x-api-key": "YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "likeness_id": "550e8400-e29b-41d4-a716-446655440000",
        "consent_policy": {
            "allow_self_edits": True,
            "deny_third_party_edits": False,  # Changed
            "deny_face_swaps": True,
            "deny_sexualized_content": True,
            "deny_impersonation": True,
            "deny_political_use": False  # Changed
        }
    }
)

print(f"Policy updated at: {response.json()['modified_at']}")
```

## Best Practices

1. **Cache Decisions**: Cache ALLOW decisions for a short period (5-10 minutes) to reduce API calls
2. **Handle UNKNOWN as DENY**: Always treat UNKNOWN decisions as deny to protect unregistered individuals
3. **Retry Logic**: Implement exponential backoff for 5xx errors
4. **Timeout**: Set reasonable timeouts (5-10 seconds) for API calls
5. **Error Handling**: Handle all error codes gracefully
6. **Rate Limiting**: Implement client-side rate limiting to avoid 429 errors
7. **Logging**: Log all consent checks for audit purposes
8. **Security**: Never expose API keys in client-side code

## Support

For API support:
- Documentation: https://docs.likenessguard.example.com
- Issues: https://github.com/likenessguard/issues
- Email: support@likenessguard.example.com

## Changelog

### v1.0.0 (2024-03-01)
- Initial API release
- Registration, consent check, update, revoke endpoints
- Evidence retrieval endpoint
- API key authentication
- Rate limiting
