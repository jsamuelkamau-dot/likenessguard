# Interpose API Reference

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Endpoints](#endpoints)
  - [POST /logs](#post-logs)
  - [GET /logs](#get-logs)
  - [POST /auth](#post-auth)
- [Data Models](#data-models)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

The Interpose API provides programmatic access to log submission, log querying, and authentication. All API requests must be made over HTTPS. Requests made over plain HTTP will fail.

**API Version**: v1  
**Base URL**: `https://api.interpose.io`  
**Protocol**: HTTPS only  
**Format**: JSON

## Authentication

The Interpose API uses API keys for authentication. Include your API key in the `X-API-Key` header for all authenticated requests.

### Getting Your API Key

1. Log in to the Interpose dashboard at https://dashboard.interpose.io
2. Navigate to Settings → API Keys
3. Copy your existing key or generate a new one

### Authentication Header

```http
X-API-Key: your_api_key_here
```

### Security Best Practices

- Never share your API key publicly
- Never commit API keys to version control
- Rotate keys regularly (every 90 days recommended)
- Use environment variables or secrets management
- Revoke compromised keys immediately

## Base URL

All API endpoints are relative to the base URL:

```
https://api.interpose.io
```

**Production**: `https://api.interpose.io`  
**Staging**: `https://staging-api.interpose.io` (if available)

## Endpoints

### POST /logs

Submit a log entry for an intercepted AI API call.

**Endpoint**: `POST /logs`  
**Authentication**: Required (X-API-Key header)  
**Content-Type**: `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ai_service` | string | Yes | AI service name: 'openai', 'anthropic', 'bedrock', 'local', or 'unknown' |
| `endpoint` | string | Yes | Full URL of the AI service endpoint |
| `data_sources` | array[string] | Yes | List of detected data source references (can be empty) |
| `sensitive_data_types` | array[string] | Yes | List of detected sensitive data types (can be empty) |
| `risk_score` | integer | Yes | Risk score from 0 to 100 |
| `request_method` | string | Yes | HTTP method: 'GET', 'POST', 'PUT', 'DELETE' |
| `request_size_bytes` | integer | Yes | Size of request payload in bytes |
| `response_status` | integer | No | HTTP status code from AI service (optional) |

#### Request Example

```json
{
  "ai_service": "openai",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "data_sources": [
    "postgres://db.example.com:5432/users",
    "/var/data/customer_records.csv"
  ],
  "sensitive_data_types": ["email", "ssn"],
  "risk_score": 75,
  "request_method": "POST",
  "request_size_bytes": 2048,
  "response_status": 200
}
```

#### Response

**Success (200 OK)**

```json
{
  "status": "success",
  "message": "Log received",
  "log_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Error (401 Unauthorized)**

```json
{
  "status": "error",
  "message": "Invalid API Key",
  "error_code": "AUTH_001"
}
```

**Error (400 Bad Request)**

```json
{
  "status": "error",
  "message": "Missing required field: ai_service",
  "error_code": "VAL_001"
}
```

#### cURL Example

```bash
curl -X POST https://api.interpose.io/logs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "ai_service": "openai",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "data_sources": ["postgres://db.example.com:5432/users"],
    "sensitive_data_types": ["email"],
    "risk_score": 45,
    "request_method": "POST",
    "request_size_bytes": 1024,
    "response_status": 200
  }'
```

#### Python Example

```python
import requests
import json

url = "https://api.interpose.io/logs"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "your_api_key_here"
}
data = {
    "ai_service": "openai",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "data_sources": ["postgres://db.example.com:5432/users"],
    "sensitive_data_types": ["email"],
    "risk_score": 45,
    "request_method": "POST",
    "request_size_bytes": 1024,
    "response_status": 200
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

#### JavaScript Example

```javascript
const url = 'https://api.interpose.io/logs';
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': 'your_api_key_here'
};
const data = {
  ai_service: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  data_sources: ['postgres://db.example.com:5432/users'],
  sensitive_data_types: ['email'],
  risk_score: 45,
  request_method: 'POST',
  request_size_bytes: 1024,
  response_status: 200
};

fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

---

### GET /logs

Query log entries for the authenticated customer.

**Endpoint**: `GET /logs`  
**Authentication**: Required (X-API-Key header)  
**Content-Type**: `application/json`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Maximum number of logs to return (default: 100, max: 1000) |
| `start_time` | integer | No | Unix timestamp in milliseconds (filter logs after this time) |
| `end_time` | integer | No | Unix timestamp in milliseconds (filter logs before this time) |
| `ai_service` | string | No | Filter by AI service: 'openai', 'anthropic', 'bedrock', 'local' |
| `min_risk_score` | integer | No | Filter logs with risk score >= this value (0-100) |
| `max_risk_score` | integer | No | Filter logs with risk score <= this value (0-100) |

#### Response

**Success (200 OK)**

```json
{
  "status": "success",
  "count": 2,
  "logs": [
    {
      "log_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "customer_id": "cust_xyz789",
      "timestamp": 1704067200000,
      "ai_service": "openai",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "data_sources": [
        "postgres://db.example.com:5432/users",
        "/var/data/customer_records.csv"
      ],
      "sensitive_data_types": ["email", "ssn"],
      "risk_score": 75,
      "request_method": "POST",
      "request_size_bytes": 2048,
      "response_status": 200
    },
    {
      "log_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "customer_id": "cust_xyz789",
      "timestamp": 1704067100000,
      "ai_service": "anthropic",
      "endpoint": "https://api.anthropic.com/v1/messages",
      "data_sources": [],
      "sensitive_data_types": [],
      "risk_score": 15,
      "request_method": "POST",
      "request_size_bytes": 512,
      "response_status": 200
    }
  ]
}
```

**Error (401 Unauthorized)**

```json
{
  "status": "error",
  "message": "Invalid API Key",
  "error_code": "AUTH_001"
}
```

#### cURL Example

```bash
# Get all logs (default limit 100)
curl -X GET https://api.interpose.io/logs \
  -H "X-API-Key: your_api_key_here"

# Get logs with filters
curl -X GET "https://api.interpose.io/logs?limit=50&ai_service=openai&min_risk_score=70" \
  -H "X-API-Key: your_api_key_here"

# Get logs in time range
curl -X GET "https://api.interpose.io/logs?start_time=1704067000000&end_time=1704070600000" \
  -H "X-API-Key: your_api_key_here"
```

#### Python Example

```python
import requests

url = "https://api.interpose.io/logs"
headers = {"X-API-Key": "your_api_key_here"}
params = {
    "limit": 50,
    "ai_service": "openai",
    "min_risk_score": 70
}

response = requests.get(url, headers=headers, params=params)
logs = response.json()

for log in logs['logs']:
    print(f"Risk Score: {log['risk_score']}, Service: {log['ai_service']}")
```

#### JavaScript Example

```javascript
const url = 'https://api.interpose.io/logs?limit=50&ai_service=openai&min_risk_score=70';
const headers = {
  'X-API-Key': 'your_api_key_here'
};

fetch(url, { headers: headers })
  .then(response => response.json())
  .then(data => {
    data.logs.forEach(log => {
      console.log(`Risk Score: ${log.risk_score}, Service: ${log.ai_service}`);
    });
  })
  .catch(error => console.error('Error:', error));
```

---

### POST /auth

Authenticate a user and retrieve their API key.

**Endpoint**: `POST /auth`  
**Authentication**: Not required  
**Content-Type**: `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

#### Request Example

```json
{
  "email": "admin@example.com",
  "password": "MySecurePassword123!"
}
```

#### Response

**Success (200 OK)**

```json
{
  "status": "success",
  "api_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer_id": "cust_xyz789",
  "email": "admin@example.com",
  "company_name": "Example Corp"
}
```

**Error (401 Unauthorized)**

```json
{
  "status": "error",
  "message": "Invalid email or password",
  "error_code": "AUTH_002"
}
```

**Error (400 Bad Request)**

```json
{
  "status": "error",
  "message": "Missing required field: email",
  "error_code": "VAL_001"
}
```

#### cURL Example

```bash
curl -X POST https://api.interpose.io/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "MySecurePassword123!"
  }'
```

#### Python Example

```python
import requests

url = "https://api.interpose.io/auth"
headers = {"Content-Type": "application/json"}
data = {
    "email": "admin@example.com",
    "password": "MySecurePassword123!"
}

response = requests.post(url, headers=headers, json=data)
auth_data = response.json()

if auth_data['status'] == 'success':
    api_key = auth_data['api_key']
    print(f"API Key: {api_key}")
else:
    print(f"Error: {auth_data['message']}")
```

#### JavaScript Example

```javascript
const url = 'https://api.interpose.io/auth';
const headers = {
  'Content-Type': 'application/json'
};
const data = {
  email: 'admin@example.com',
  password: 'MySecurePassword123!'
};

fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      console.log(`API Key: ${data.api_key}`);
    } else {
      console.error(`Error: ${data.message}`);
    }
  })
  .catch(error => console.error('Error:', error));
```

---

## Data Models

### LogEntry

Represents a single intercepted AI API call.

```typescript
interface LogEntry {
  log_id: string;              // UUID v4
  customer_id: string;         // Customer identifier
  timestamp: number;           // Unix timestamp in milliseconds
  ai_service: string;          // 'openai' | 'anthropic' | 'bedrock' | 'local' | 'unknown'
  endpoint: string;            // Full URL of AI service endpoint
  data_sources: string[];      // Array of detected data source references
  sensitive_data_types: string[]; // Array of detected sensitive data types
  risk_score: number;          // Integer 0-100
  request_method: string;      // 'GET' | 'POST' | 'PUT' | 'DELETE'
  request_size_bytes: number;  // Size of request payload
  response_status: number;     // HTTP status code from AI service
}
```

### Customer

Represents a customer account.

```typescript
interface Customer {
  customer_id: string;      // UUID v4
  email: string;            // Unique email address
  company_name: string;     // Organization name
  api_key: string;          // UUID v4 for authentication
  alert_email: string;      // Email for high-risk alerts
  created_at: number;       // Unix timestamp
  subscription_tier: string; // 'free' | 'pro' | 'enterprise'
}
```

### AuthResponse

Response from authentication endpoint.

```typescript
interface AuthResponse {
  status: string;           // 'success' | 'error'
  api_key?: string;         // API key (on success)
  customer_id?: string;     // Customer ID (on success)
  email?: string;           // Email (on success)
  company_name?: string;    // Company name (on success)
  message?: string;         // Error message (on error)
  error_code?: string;      // Error code (on error)
}
```

### ErrorResponse

Standard error response format.

```typescript
interface ErrorResponse {
  status: 'error';
  message: string;          // Human-readable error message
  error_code: string;       // Machine-readable error code
  details?: object;         // Additional error details (optional)
}
```

---

## Error Codes

### Authentication Errors (AUTH_xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `AUTH_001` | 401 | Invalid API Key | Verify API key is correct and active |
| `AUTH_002` | 401 | Invalid email or password | Check credentials and try again |
| `AUTH_003` | 401 | API key expired | Generate a new API key |
| `AUTH_004` | 403 | API key revoked | Contact support to restore access |
| `AUTH_005` | 401 | Missing X-API-Key header | Include X-API-Key header in request |

### Validation Errors (VAL_xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `VAL_001` | 400 | Missing required field | Include all required fields in request |
| `VAL_002` | 400 | Invalid field type | Ensure field types match specification |
| `VAL_003` | 400 | Invalid field value | Check field value constraints |
| `VAL_004` | 400 | Invalid JSON format | Verify JSON is well-formed |
| `VAL_005` | 400 | Risk score out of range | Risk score must be 0-100 |
| `VAL_006` | 400 | Invalid AI service | Use: openai, anthropic, bedrock, local, unknown |
| `VAL_007` | 400 | Invalid request method | Use: GET, POST, PUT, DELETE |

### Server Errors (SRV_xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `SRV_001` | 500 | Internal server error | Retry request, contact support if persists |
| `SRV_002` | 503 | Service unavailable | Wait and retry, check status page |
| `SRV_003` | 500 | Database error | Retry request, contact support if persists |
| `SRV_004` | 500 | Email sending failed | Alert logged but email not sent |

### Rate Limiting Errors (RATE_xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `RATE_001` | 429 | Too many requests | Wait and retry with exponential backoff |
| `RATE_002` | 429 | Daily quota exceeded | Upgrade plan or wait until quota resets |

---

## Rate Limiting

The Interpose API implements rate limiting to ensure fair usage and system stability.

### Rate Limits

| Tier | Requests per Second | Requests per Day | Burst Limit |
|------|---------------------|------------------|-------------|
| Free | 10 | 10,000 | 20 |
| Pro | 100 | 100,000 | 200 |
| Enterprise | 1,000 | 1,000,000 | 2,000 |

### Rate Limit Headers

All API responses include rate limit information in headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```

- `X-RateLimit-Limit`: Maximum requests per second
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Handling Rate Limits

When rate limited (HTTP 429), implement exponential backoff:

```python
import time
import requests

def make_request_with_retry(url, headers, data, max_retries=5):
    for attempt in range(max_retries):
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 2 ** attempt))
            print(f"Rate limited. Retrying after {retry_after} seconds...")
            time.sleep(retry_after)
            continue
        
        return response
    
    raise Exception("Max retries exceeded")
```

---

## Examples

### Complete Log Submission Workflow

```python
import requests
import json
import time

class InterposeClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.interpose.io"
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key
        }
    
    def submit_log(self, log_entry, max_retries=3):
        """Submit a log entry with retry logic"""
        url = f"{self.base_url}/logs"
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    url,
                    headers=self.headers,
                    json=log_entry,
                    timeout=5
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # Rate limited - exponential backoff
                    wait_time = 2 ** attempt
                    print(f"Rate limited. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"Error: {response.status_code} - {response.text}")
                    return None
            
            except requests.exceptions.RequestException as e:
                print(f"Request failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
        
        return None
    
    def get_logs(self, filters=None):
        """Query logs with optional filters"""
        url = f"{self.base_url}/logs"
        
        try:
            response = requests.get(
                url,
                headers=self.headers,
                params=filters,
                timeout=5
            )
            
            if response.status_code == 200:
                return response.json()['logs']
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None
        
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

# Usage
client = InterposeClient(api_key="your_api_key_here")

# Submit a log
log_entry = {
    "ai_service": "openai",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "data_sources": ["postgres://db.example.com:5432/users"],
    "sensitive_data_types": ["email"],
    "risk_score": 45,
    "request_method": "POST",
    "request_size_bytes": 1024,
    "response_status": 200
}

result = client.submit_log(log_entry)
print(f"Log submitted: {result}")

# Query logs
logs = client.get_logs(filters={"min_risk_score": 70, "limit": 10})
print(f"Found {len(logs)} high-risk logs")
```

### Batch Log Submission

```python
import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

def submit_log_batch(api_key, log_entries, max_workers=10):
    """Submit multiple logs concurrently"""
    url = "https://api.interpose.io/logs"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key
    }
    
    def submit_single(log_entry):
        try:
            response = requests.post(url, headers=headers, json=log_entry, timeout=5)
            return response.status_code == 200
        except:
            return False
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(submit_single, log) for log in log_entries]
        results = [future.result() for future in as_completed(futures)]
    
    success_count = sum(results)
    print(f"Submitted {success_count}/{len(log_entries)} logs successfully")
    return success_count

# Usage
logs = [
    {"ai_service": "openai", "endpoint": "...", "risk_score": 30, ...},
    {"ai_service": "anthropic", "endpoint": "...", "risk_score": 45, ...},
    # ... more logs
]

submit_log_batch("your_api_key_here", logs)
```

### Real-Time Log Monitoring

```python
import requests
import time

def monitor_logs(api_key, poll_interval=2):
    """Monitor logs in real-time"""
    url = "https://api.interpose.io/logs"
    headers = {"X-API-Key": api_key}
    last_timestamp = 0
    
    print("Monitoring logs... (Ctrl+C to stop)")
    
    try:
        while True:
            response = requests.get(
                url,
                headers=headers,
                params={"start_time": last_timestamp, "limit": 100}
            )
            
            if response.status_code == 200:
                logs = response.json()['logs']
                
                for log in logs:
                    if log['timestamp'] > last_timestamp:
                        last_timestamp = log['timestamp']
                        
                        # Print high-risk logs
                        if log['risk_score'] > 70:
                            print(f"⚠️  HIGH RISK: {log['ai_service']} - Score: {log['risk_score']}")
                        else:
                            print(f"✓ {log['ai_service']} - Score: {log['risk_score']}")
            
            time.sleep(poll_interval)
    
    except KeyboardInterrupt:
        print("\nMonitoring stopped")

# Usage
monitor_logs("your_api_key_here")
```

---

## Changelog

### v1.0.0 (2024-01)
- Initial API release
- POST /logs endpoint
- GET /logs endpoint
- POST /auth endpoint
- Rate limiting implementation

---

## Support

For API support:
- **Documentation**: https://docs.interpose.io
- **Email**: api-support@interpose.io
- **Status Page**: https://status.interpose.io

---

**Last Updated**: January 2024  
**API Version**: v1  
**License**: MIT
