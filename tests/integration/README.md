# Integration Tests for Interpose SaaS Platform

This directory contains end-to-end integration tests that verify the complete system flow from agent interception through backend storage to dashboard visualization.

## Test Suites

### 1. Complete Log Flow Tests (`test_complete_log_flow.py`)

Tests the complete journey of a log entry through the system:
- Agent intercepts AI API call
- Agent sends log to backend via HTTPS
- Backend validates API key
- Backend stores log in DynamoDB
- Backend sends high-risk alert via SES (when risk_score > 70)
- Dashboard queries and displays logs

**Requirements Validated:** 2.1, 6.1, 7.3, 8.1, 11.1

**Test Cases:**
- `test_low_risk_log_flow_no_alert`: Verifies low-risk logs are stored without alerts
- `test_high_risk_log_flow_with_alert`: Verifies high-risk logs trigger email alerts
- `test_multiple_logs_flow_with_query`: Verifies multiple logs can be stored and queried
- `test_agent_retry_on_backend_failure`: Verifies agent retry logic on network failures
- `test_complete_flow_with_timing_requirements`: Verifies system meets latency requirements

### 2. Authentication & Authorization Tests (`test_authentication_authorization.py`)

Tests security and access control:
- User login with email/password
- API key validation for log submission and queries
- Customer data isolation (customers only see their own logs)
- Invalid API key rejection

**Requirements Validated:** 10.1, 10.2, 10.4, 7.2

**Test Cases:**
- `test_successful_login_flow`: Verifies valid credentials return API key
- `test_failed_login_invalid_password`: Verifies invalid password is rejected
- `test_failed_login_nonexistent_email`: Verifies unknown email is rejected
- `test_customer_data_isolation`: Verifies customers cannot see each other's logs
- `test_invalid_api_key_rejection_log_submission`: Verifies invalid API keys are rejected for log submission
- `test_invalid_api_key_rejection_log_query`: Verifies invalid API keys are rejected for queries
- `test_missing_api_key_rejection`: Verifies requests without API keys are rejected
- `test_complete_auth_flow_with_log_access`: Verifies complete login → query flow
- `test_api_key_cannot_access_other_customer_data`: Verifies API keys are customer-specific

### 3. Real-Time Updates Tests (`test_realtime_updates.py`)

Tests real-time dashboard behavior:
- Dashboard receives new logs within 2 seconds
- System map updates with new AI services and data sources
- Multiple rapid log submissions are handled correctly
- Polling behavior simulates real dashboard usage

**Requirements Validated:** 11.2, 13.6, 7.2

**Test Cases:**
- `test_dashboard_updates_within_2_seconds`: Verifies logs appear in dashboard < 2s after submission
- `test_multiple_rapid_log_submissions`: Verifies multiple rapid submissions are handled correctly
- `test_system_map_updates_with_new_nodes`: Verifies system map data includes new AI services and data sources
- `test_system_map_edge_updates`: Verifies system map connections (edges) update correctly
- `test_polling_simulation_real_time_behavior`: Simulates dashboard polling every 2 seconds

## Running the Tests

### Prerequisites

1. Install test dependencies:
```bash
pip install pytest pytest-mock hypothesis
```

2. Ensure agent and backend code is available:
```bash
# Agent should be in: interpose/agent/
# Backend should be in: backend/
```

### Run All Integration Tests

```bash
# From project root
pytest tests/integration/ -v
```

### Run Specific Test Suite

```bash
# Complete log flow tests
pytest tests/integration/test_complete_log_flow.py -v

# Authentication tests
pytest tests/integration/test_authentication_authorization.py -v

# Real-time updates tests
pytest tests/integration/test_realtime_updates.py -v
```

### Run Specific Test Case

```bash
pytest tests/integration/test_complete_log_flow.py::TestCompleteLogFlow::test_high_risk_log_flow_with_alert -v
```

### Run with Coverage

```bash
pytest tests/integration/ --cov=interpose.agent --cov=backend --cov-report=html
```

## Test Architecture

### Mocking Strategy

The integration tests use mocking for external dependencies:

- **DynamoDB**: Mocked using `unittest.mock` to simulate table operations without AWS
- **SES**: Mocked to verify email sending without actually sending emails
- **HTTP Requests**: Mocked to simulate agent-backend communication

### Test Data

Tests use realistic but synthetic data:
- Customer IDs: `test_customer_123`, `cust_001`, `cust_002`
- API Keys: `test_api_key_456`, `api_key_customer1`, `api_key_customer2`
- Email addresses: `user@example.com`, `alerts@example.com`
- AI services: `openai`, `anthropic`, `bedrock`, `local`

### Timing Tests

Some tests verify latency requirements:
- Backend response time < 200ms (Requirement 7.4)
- Dashboard update latency < 2 seconds (Requirement 11.2)
- Alert sending < 5 seconds (Requirement 8.4)

## Test Environment Variables

The tests use the following environment variables (set automatically in test fixtures):

```bash
LOGS_TABLE=AIObserveLogs
CUSTOMERS_TABLE=Customers
ALERT_EMAIL_SOURCE=alerts@interpose.io
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    pip install -r requirements.txt
    pytest tests/integration/ -v --junitxml=test-results.xml
```

## Troubleshooting

### Import Errors

If you see import errors, ensure the project root is in PYTHONPATH:

```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
pytest tests/integration/ -v
```

### Mock Not Working

If mocks aren't being applied, check that patches are targeting the correct module:

```python
# Correct: patch where the object is used
with patch('backend.lambda_handler.dynamodb') as mock_db:

# Incorrect: patch where the object is defined
with patch('boto3.client') as mock_db:
```

### Timing Test Failures

Timing tests may fail on slow systems. Adjust thresholds if needed:

```python
# Increase timeout for slower systems
assert processing_time < 0.5  # Instead of 0.2
```

## Future Enhancements

Potential additions to integration tests:

1. **Load Testing**: Test system behavior under high log volume
2. **Failure Recovery**: Test system recovery from DynamoDB/SES failures
3. **Data Retention**: Test log TTL and cleanup
4. **Multi-Region**: Test cross-region replication
5. **Performance**: Test query performance with large datasets

## Contributing

When adding new integration tests:

1. Follow existing test structure and naming conventions
2. Use descriptive test names that explain what is being tested
3. Add docstrings explaining the test flow
4. Mock external dependencies (DynamoDB, SES, HTTP)
5. Verify requirements being validated in docstring
6. Update this README with new test cases
