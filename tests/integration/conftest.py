"""
Shared fixtures and configuration for integration tests

This module provides common fixtures used across all integration test suites.
"""

import pytest
import os
import sys
from pathlib import Path

# Add project root to Python path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """
    Set up test environment variables for all integration tests
    This fixture runs once per test session
    """
    # Set environment variables for backend Lambda function
    os.environ['LOGS_TABLE'] = 'AIObserveLogs'
    os.environ['CUSTOMERS_TABLE'] = 'Customers'
    os.environ['ALERT_EMAIL_SOURCE'] = 'alerts@interpose.io'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
    
    # Disable actual AWS calls in tests
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    
    yield
    
    # Cleanup after all tests
    for key in ['LOGS_TABLE', 'CUSTOMERS_TABLE', 'ALERT_EMAIL_SOURCE']:
        os.environ.pop(key, None)


@pytest.fixture
def sample_log_entry():
    """
    Provides a sample log entry for testing
    """
    return {
        'customer_id': 'test_customer_123',
        'timestamp': 1704067200000,
        'ai_service': 'openai',
        'endpoint': 'https://api.openai.com/v1/chat/completions',
        'data_sources': ['https://api.example.com/data'],
        'sensitive_data_types': ['email'],
        'risk_score': 45,
        'request_method': 'POST',
        'request_size_bytes': 2048,
        'response_status': 200
    }


@pytest.fixture
def sample_customer():
    """
    Provides a sample customer record for testing
    """
    return {
        'customer_id': 'test_customer_123',
        'email': 'user@example.com',
        'password_hash': '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEiUM2',  # 'password123'
        'api_key': 'test_api_key_456',
        'alert_email': 'alerts@example.com',
        'company_name': 'Test Company',
        'created_at': 1704067200000,
        'subscription_tier': 'pro'
    }


@pytest.fixture
def high_risk_log_entry():
    """
    Provides a high-risk log entry (risk_score > 70) for testing alerts
    """
    return {
        'customer_id': 'test_customer_123',
        'timestamp': 1704067200000,
        'ai_service': 'openai',
        'endpoint': 'https://api.openai.com/v1/chat/completions',
        'data_sources': [
            'postgres://db.example.com:5432/users',
            '/var/data/customer_records.csv'
        ],
        'sensitive_data_types': ['ssn', 'credit_card', 'email'],
        'risk_score': 85,
        'request_method': 'POST',
        'request_size_bytes': 4096,
        'response_status': 200
    }


@pytest.fixture
def low_risk_log_entry():
    """
    Provides a low-risk log entry (risk_score <= 70) for testing
    """
    return {
        'customer_id': 'test_customer_123',
        'timestamp': 1704067200000,
        'ai_service': 'openai',
        'endpoint': 'https://api.openai.com/v1/chat/completions',
        'data_sources': ['https://api.example.com/data'],
        'sensitive_data_types': [],
        'risk_score': 25,
        'request_method': 'POST',
        'request_size_bytes': 1024,
        'response_status': 200
    }


@pytest.fixture
def api_gateway_event():
    """
    Provides a sample API Gateway event structure
    """
    def _create_event(method='GET', path='/logs', headers=None, body=None, query_params=None):
        return {
            'httpMethod': method,
            'path': path,
            'headers': headers or {},
            'body': body,
            'queryStringParameters': query_params,
            'requestContext': {
                'requestId': 'test-request-id',
                'requestTime': '01/Jan/2024:00:00:00 +0000',
                'requestTimeEpoch': 1704067200000
            }
        }
    return _create_event


@pytest.fixture
def lambda_context():
    """
    Provides a mock Lambda context object
    """
    class MockLambdaContext:
        def __init__(self):
            self.function_name = 'test-function'
            self.function_version = '$LATEST'
            self.invoked_function_arn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
            self.memory_limit_in_mb = 512
            self.aws_request_id = 'test-request-id'
            self.log_group_name = '/aws/lambda/test-function'
            self.log_stream_name = '2024/01/01/[$LATEST]test-stream'
            
        def get_remaining_time_in_millis(self):
            return 30000  # 30 seconds
    
    return MockLambdaContext()


# Pytest hooks for custom behavior

def pytest_configure(config):
    """
    Custom pytest configuration
    """
    # Register custom markers
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "requires_aws: mark test as requiring AWS services"
    )


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection to add markers automatically
    """
    for item in items:
        # Add integration marker to all tests in this directory
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Add slow marker to tests with "timing" or "multiple" in name
        if "timing" in item.name or "multiple" in item.name:
            item.add_marker(pytest.mark.slow)
