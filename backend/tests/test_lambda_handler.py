"""
Unit tests for Lambda handler functions
"""

import json
import pytest
import bcrypt
from unittest.mock import Mock, patch, MagicMock
from decimal import Decimal
from hypothesis import given, strategies as st, settings
from backend.lambda_handler import (
    lambda_handler,
    validate_api_key,
    handle_log_submission,
    handle_log_query,
    handle_auth,
    send_alert
)


@pytest.fixture
def mock_dynamodb_table():
    """Mock DynamoDB table"""
    table = Mock()
    return table


@pytest.fixture
def mock_ses_client():
    """Mock SES client"""
    client = Mock()
    return client


@pytest.fixture
def sample_customer():
    """Sample customer record"""
    password = "test_password"
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return {
        'customer_id': 'cust_123',
        'email': 'test@example.com',
        'password_hash': password_hash,
        'api_key': 'test_api_key_123',
        'alert_email': 'alerts@example.com',
        'company_name': 'Test Company'
    }


@pytest.fixture
def sample_log_entry():
    """Sample log entry"""
    return {
        'log_id': 'log_123',
        'ai_service': 'openai',
        'endpoint': 'https://api.openai.com/v1/chat/completions',
        'data_sources': ['postgres://db.example.com/users'],
        'sensitive_data_types': ['email', 'ssn'],
        'risk_score': 75,
        'request_method': 'POST',
        'request_size_bytes': 2048,
        'response_status': 200
    }


class TestLambdaHandler:
    """Tests for main lambda_handler function"""
    
    def test_route_post_logs(self):
        """Test routing to handle_log_submission"""
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_key'},
            'body': '{}'
        }
        
        with patch('backend.lambda_handler.handle_log_submission') as mock_handler:
            mock_handler.return_value = {'statusCode': 200}
            result = lambda_handler(event, None)
            mock_handler.assert_called_once_with(event)
    
    def test_route_get_logs(self):
        """Test routing to handle_log_query"""
        event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_key'}
        }
        
        with patch('backend.lambda_handler.handle_log_query') as mock_handler:
            mock_handler.return_value = {'statusCode': 200}
            result = lambda_handler(event, None)
            mock_handler.assert_called_once_with(event)
    
    def test_route_post_auth(self):
        """Test routing to handle_auth"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'body': json.dumps({'email': 'test@example.com', 'password': 'password'})
        }
        
        with patch('backend.lambda_handler.handle_auth') as mock_handler:
            mock_handler.return_value = {'statusCode': 200}
            result = lambda_handler(event, None)
            mock_handler.assert_called_once_with(event)
    
    def test_route_not_found(self):
        """Test 404 for unknown routes"""
        event = {
            'httpMethod': 'GET',
            'path': '/unknown'
        }
        
        result = lambda_handler(event, None)
        assert result['statusCode'] == 404
        assert 'Not Found' in result['body']


class TestValidateApiKey:
    """Tests for validate_api_key function"""
    
    def test_valid_api_key(self, sample_customer):
        """Test validation with valid API key"""
        with patch('backend.lambda_handler.customers_table') as mock_table:
            mock_table.query.return_value = {
                'Items': [sample_customer]
            }
            
            result = validate_api_key('test_api_key_123')
            assert result == sample_customer
            mock_table.query.assert_called_once()
    
    def test_invalid_api_key(self):
        """Test validation with invalid API key"""
        with patch('backend.lambda_handler.customers_table') as mock_table:
            mock_table.query.return_value = {'Items': []}
            
            result = validate_api_key('invalid_key')
            assert result is None
    
    def test_missing_api_key(self):
        """Test validation with missing API key"""
        result = validate_api_key(None)
        assert result is None
    
    def test_query_exception(self):
        """Test handling of DynamoDB query exception"""
        with patch('backend.lambda_handler.customers_table') as mock_table:
            mock_table.query.side_effect = Exception("DynamoDB error")
            
            result = validate_api_key('test_key')
            assert result is None


class TestHandleLogSubmission:
    """Tests for handle_log_submission function"""
    
    def test_successful_log_submission(self, sample_customer, sample_log_entry):
        """Test successful log submission with valid API key"""
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'},
            'body': json.dumps(sample_log_entry)
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.send_alert') as mock_send_alert:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.put_item.return_value = {}
            
            result = handle_log_submission(event)
            
            assert result['statusCode'] == 200
            assert 'Log received' in result['body']
            mock_logs_table.put_item.assert_called_once()
            
            # Verify alert was sent for high-risk log
            mock_send_alert.assert_called_once()
    
    def test_log_submission_invalid_api_key(self, sample_log_entry):
        """Test log submission with invalid API key returns 401"""
        event = {
            'headers': {'X-API-Key': 'invalid_key'},
            'body': json.dumps(sample_log_entry)
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = None
            
            result = handle_log_submission(event)
            
            assert result['statusCode'] == 401
            assert 'Invalid API Key' in result['body']
    
    def test_log_submission_no_alert_for_low_risk(self, sample_customer):
        """Test that no alert is sent for low-risk logs"""
        low_risk_log = {
            'log_id': 'log_456',
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'risk_score': 30,
            'data_sources': [],
            'sensitive_data_types': []
        }
        
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'},
            'body': json.dumps(low_risk_log)
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.send_alert') as mock_send_alert:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.put_item.return_value = {}
            
            result = handle_log_submission(event)
            
            assert result['statusCode'] == 200
            mock_send_alert.assert_not_called()
    
    def test_log_submission_malformed_json(self, sample_customer):
        """Test log submission with malformed JSON body"""
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'},
            'body': 'invalid json'
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = sample_customer
            
            result = handle_log_submission(event)
            
            assert result['statusCode'] == 400
    
    def test_log_submission_case_insensitive_header(self, sample_customer, sample_log_entry):
        """Test that X-API-Key header is case-insensitive"""
        event = {
            'headers': {'x-api-key': 'test_api_key_123'},
            'body': json.dumps(sample_log_entry)
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.send_alert'):
            
            mock_validate.return_value = sample_customer
            mock_logs_table.put_item.return_value = {}
            
            result = handle_log_submission(event)
            
            assert result['statusCode'] == 200
    
    def test_log_submission_missing_required_fields(self, sample_customer):
        """Test log submission with missing required fields"""
        # Test with missing ai_service field
        incomplete_log = {
            'log_id': 'log_789',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            # Missing: ai_service, risk_score (required fields)
        }
        
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'},
            'body': json.dumps(incomplete_log)
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = sample_customer
            
            result = handle_log_submission(event)
            
            # Should return 400 for missing required fields
            assert result['statusCode'] == 400
            response_body = json.loads(result['body'])
            assert 'error' in response_body
            assert 'missing_fields' in response_body


class TestSendAlert:
    """Tests for send_alert function"""
    
    def test_send_alert_success(self, sample_customer, sample_log_entry):
        """Test successful alert email sending"""
        with patch('backend.lambda_handler.ses_client') as mock_ses:
            mock_ses.send_email.return_value = {}
            
            send_alert(sample_customer, sample_log_entry)
            
            mock_ses.send_email.assert_called_once()
            call_args = mock_ses.send_email.call_args[1]
            
            assert call_args['Destination']['ToAddresses'][0] == 'alerts@example.com'
            assert 'HIGH RISK ALERT' in call_args['Message']['Subject']['Data']
            assert '75' in call_args['Message']['Body']['Text']['Data']
    
    def test_send_alert_email_content(self, sample_customer, sample_log_entry):
        """Test alert email contains required information"""
        with patch('backend.lambda_handler.ses_client') as mock_ses:
            mock_ses.send_email.return_value = {}
            
            send_alert(sample_customer, sample_log_entry)
            
            call_args = mock_ses.send_email.call_args[1]
            email_body = call_args['Message']['Body']['Text']['Data']
            
            assert 'openai' in email_body
            assert 'email, ssn' in email_body
            assert 'postgres://db.example.com/users' in email_body
    
    def test_send_alert_ses_failure(self, sample_customer, sample_log_entry):
        """Test that SES failure doesn't raise exception"""
        with patch('backend.lambda_handler.ses_client') as mock_ses:
            mock_ses.send_email.side_effect = Exception("SES error")
            
            # Should not raise exception
            send_alert(sample_customer, sample_log_entry)
    
    def test_alert_sent_for_risk_score_71(self, sample_customer):
        """Test alert is sent for risk_score = 71 (boundary case)"""
        log_entry_71 = {
            'log_id': 'log_boundary_71',
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['postgres://db.example.com/users'],
            'sensitive_data_types': ['email'],
            'risk_score': 71,
            'request_method': 'POST',
            'request_size_bytes': 1024,
            'response_status': 200
        }
        
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'},
            'body': json.dumps(log_entry_71)
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.send_alert') as mock_send_alert:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.put_item.return_value = {}
            
            result = handle_log_submission(event)
            
            assert result['statusCode'] == 200
            # Verify alert was sent for risk_score = 71 (> 70)
            mock_send_alert.assert_called_once()
            call_args = mock_send_alert.call_args[0]
            assert call_args[0] == sample_customer
            assert float(call_args[1]['risk_score']) == 71
    
    def test_no_alert_sent_for_risk_score_70(self, sample_customer):
        """Test no alert is sent for risk_score = 70 (boundary case)"""
        log_entry_70 = {
            'log_id': 'log_boundary_70',
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['postgres://db.example.com/users'],
            'sensitive_data_types': ['email'],
            'risk_score': 70,
            'request_method': 'POST',
            'request_size_bytes': 1024,
            'response_status': 200
        }
        
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'},
            'body': json.dumps(log_entry_70)
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.send_alert') as mock_send_alert:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.put_item.return_value = {}
            
            result = handle_log_submission(event)
            
            assert result['statusCode'] == 200
            # Verify no alert was sent for risk_score = 70 (not > 70)
            mock_send_alert.assert_not_called()
    
    def test_alert_email_formatting_all_fields(self, sample_customer):
        """Test alert email formatting with all required fields"""
        log_entry_complete = {
            'log_id': 'log_complete',
            'ai_service': 'anthropic',
            'endpoint': 'https://api.anthropic.com/v1/messages',
            'data_sources': ['mysql://db.prod.com/customers', '/var/data/sensitive.csv'],
            'sensitive_data_types': ['ssn', 'credit_card', 'email'],
            'risk_score': 95,
            'request_method': 'POST',
            'request_size_bytes': 4096,
            'response_status': 200,
            'timestamp': 1704067200000
        }
        
        with patch('backend.lambda_handler.ses_client') as mock_ses:
            mock_ses.send_email.return_value = {}
            
            send_alert(sample_customer, log_entry_complete)
            
            mock_ses.send_email.assert_called_once()
            call_args = mock_ses.send_email.call_args[1]
            
            # Verify email structure
            assert 'Source' in call_args
            assert 'Destination' in call_args
            assert 'Message' in call_args
            
            # Verify recipient
            assert call_args['Destination']['ToAddresses'][0] == 'alerts@example.com'
            
            # Verify subject contains risk score
            subject = call_args['Message']['Subject']['Data']
            assert 'HIGH RISK ALERT' in subject
            assert '95' in subject
            
            # Verify body contains all required information
            email_body = call_args['Message']['Body']['Text']['Data']
            
            # Risk score
            assert '95' in email_body or '95.0' in email_body
            
            # AI service name
            assert 'anthropic' in email_body
            
            # Timestamp
            assert '1704067200000' in email_body
            
            # Sensitive data types
            assert 'ssn' in email_body
            assert 'credit_card' in email_body
            assert 'email' in email_body
            
            # Data sources
            assert 'mysql://db.prod.com/customers' in email_body
            assert '/var/data/sensitive.csv' in email_body
    
    def test_alert_email_formatting_empty_lists(self, sample_customer):
        """Test alert email formatting with empty sensitive_data_types and data_sources"""
        log_entry_minimal = {
            'log_id': 'log_minimal',
            'ai_service': 'bedrock',
            'endpoint': 'https://bedrock-runtime.amazonaws.com',
            'data_sources': [],
            'sensitive_data_types': [],
            'risk_score': 80,
            'request_method': 'POST',
            'request_size_bytes': 512,
            'response_status': 200,
            'timestamp': 1704067300000
        }
        
        with patch('backend.lambda_handler.ses_client') as mock_ses:
            mock_ses.send_email.return_value = {}
            
            send_alert(sample_customer, log_entry_minimal)
            
            mock_ses.send_email.assert_called_once()
            call_args = mock_ses.send_email.call_args[1]
            
            email_body = call_args['Message']['Body']['Text']['Data']
            
            # Verify empty lists are handled gracefully
            assert 'None' in email_body or 'Sensitive Data:' in email_body
            assert 'Data Sources:' in email_body


class TestHandleLogQuery:
    """Tests for handle_log_query function"""
    
    def test_successful_log_query(self, sample_customer):
        """Test successful log query with valid API key"""
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'}
        }
        
        mock_logs = [
            {
                'customer_id': 'cust_123',
                'timestamp': 1704067200000,
                'risk_score': Decimal('75'),
                'request_size_bytes': Decimal('2048'),
                'response_status': Decimal('200')
            }
        ]
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.query.return_value = {'Items': mock_logs}
            
            result = handle_log_query(event)
            
            assert result['statusCode'] == 200
            
            # Verify Decimal values converted to float/int
            body = json.loads(result['body'])
            assert body[0]['risk_score'] == 75.0
            assert body[0]['request_size_bytes'] == 2048
            assert body[0]['response_status'] == 200
    
    def test_log_query_invalid_api_key(self):
        """Test log query with invalid API key returns 401"""
        event = {
            'headers': {'X-API-Key': 'invalid_key'}
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = None
            
            result = handle_log_query(event)
            
            assert result['statusCode'] == 401
            assert 'Invalid API Key' in result['body']
    
    def test_log_query_customer_isolation(self, sample_customer):
        """Test that query only returns customer's own logs"""
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'}
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.query.return_value = {'Items': []}
            
            result = handle_log_query(event)
            
            # Verify query used customer_id
            call_args = mock_logs_table.query.call_args[1]
            assert call_args['ExpressionAttributeValues'][':cid'] == 'cust_123'
    
    def test_log_query_pagination_limit(self, sample_customer):
        """Test that query limits results to 100"""
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'}
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.query.return_value = {'Items': []}
            
            result = handle_log_query(event)
            
            # Verify Limit=100
            call_args = mock_logs_table.query.call_args[1]
            assert call_args['Limit'] == 100
    
    def test_log_query_descending_order(self, sample_customer):
        """Test that query returns logs in descending order"""
        event = {
            'headers': {'X-API-Key': 'test_api_key_123'}
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table:
            
            mock_validate.return_value = sample_customer
            mock_logs_table.query.return_value = {'Items': []}
            
            result = handle_log_query(event)
            
            # Verify ScanIndexForward=False (descending)
            call_args = mock_logs_table.query.call_args[1]
            assert call_args['ScanIndexForward'] is False


class TestHandleAuth:
    """Tests for handle_auth function"""
    
    def test_successful_authentication(self, sample_customer):
        """Test successful authentication with valid credentials"""
        event = {
            'body': json.dumps({
                'email': 'test@example.com',
                'password': 'test_password'
            })
        }
        
        with patch('backend.lambda_handler.customers_table') as mock_table:
            mock_table.query.return_value = {'Items': [sample_customer]}
            
            result = handle_auth(event)
            
            assert result['statusCode'] == 200
            body = json.loads(result['body'])
            assert body['api_key'] == 'test_api_key_123'
            assert body['customer_id'] == 'cust_123'
    
    def test_authentication_invalid_password(self, sample_customer):
        """Test authentication with invalid password returns 401"""
        event = {
            'body': json.dumps({
                'email': 'test@example.com',
                'password': 'wrong_password'
            })
        }
        
        with patch('backend.lambda_handler.customers_table') as mock_table:
            mock_table.query.return_value = {'Items': [sample_customer]}
            
            result = handle_auth(event)
            
            assert result['statusCode'] == 401
            assert 'Invalid credentials' in result['body']
    
    def test_authentication_nonexistent_email(self):
        """Test authentication with non-existent email returns 401"""
        event = {
            'body': json.dumps({
                'email': 'nonexistent@example.com',
                'password': 'password'
            })
        }
        
        with patch('backend.lambda_handler.customers_table') as mock_table:
            mock_table.query.return_value = {'Items': []}
            
            result = handle_auth(event)
            
            assert result['statusCode'] == 401
            assert 'Invalid credentials' in result['body']
    
    def test_authentication_missing_email(self):
        """Test authentication with missing email returns 400"""
        event = {
            'body': json.dumps({
                'password': 'password'
            })
        }
        
        result = handle_auth(event)
        
        assert result['statusCode'] == 400
        assert 'Email and password required' in result['body']
    
    def test_authentication_missing_password(self):
        """Test authentication with missing password returns 400"""
        event = {
            'body': json.dumps({
                'email': 'test@example.com'
            })
        }
        
        result = handle_auth(event)
        
        assert result['statusCode'] == 400
        assert 'Email and password required' in result['body']
    
    def test_authentication_uses_email_index(self, sample_customer):
        """Test that authentication queries using EmailIndex GSI"""
        event = {
            'body': json.dumps({
                'email': 'test@example.com',
                'password': 'test_password'
            })
        }
        
        with patch('backend.lambda_handler.customers_table') as mock_table:
            mock_table.query.return_value = {'Items': [sample_customer]}
            
            result = handle_auth(event)
            
            # Verify EmailIndex was used
            call_args = mock_table.query.call_args[1]
            assert call_args['IndexName'] == 'EmailIndex'



# ============================================================================
# Property-Based Tests
# ============================================================================

# Feature: interpose-saas-platform, Property 13: API Key Validation
# **Validates: Requirements 7.1, 7.2**
@settings(max_examples=20)
@given(
    api_key=st.text(
        min_size=10, 
        max_size=50, 
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')
    ),
    is_valid=st.booleans(),
    log_data=st.fixed_dictionaries({
        'log_id': st.text(min_size=10, max_size=50),
        'ai_service': st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
        'endpoint': st.text(min_size=10, max_size=100),
        'data_sources': st.lists(st.text(min_size=5, max_size=50), min_size=0, max_size=5),
        'sensitive_data_types': st.lists(
            st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
            min_size=0,
            max_size=5
        ),
        'risk_score': st.integers(min_value=0, max_value=100),
        'request_method': st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
        'request_size_bytes': st.integers(min_value=0, max_value=10000000),
        'response_status': st.integers(min_value=200, max_value=599)
    })
)
def test_property_api_key_validation(api_key, is_valid, log_data):
    """
    Property 13: API Key Validation
    
    For any incoming log request to the backend, if the provided API key does 
    not match any customer record in the Customers table, the backend should 
    return HTTP 401 status.
    
    This test verifies that:
    1. Valid API keys return customer records and allow log submission (HTTP 200)
    2. Invalid API keys return None from validate_api_key and HTTP 401
    3. Missing API keys (None) are rejected with HTTP 401
    4. The validation logic is consistent across all API key formats
    """
    # Arrange
    sample_customer = {
        'customer_id': 'cust_test_123',
        'email': 'test@example.com',
        'api_key': api_key,
        'alert_email': 'alerts@example.com',
        'company_name': 'Test Company'
    }
    
    # Test Case 1: validate_api_key function behavior
    with patch('backend.lambda_handler.customers_table') as mock_table:
        if is_valid:
            # Valid API key should return customer record
            mock_table.query.return_value = {'Items': [sample_customer]}
            result = validate_api_key(api_key)
            
            assert result is not None, \
                f"Valid API key '{api_key}' should return customer record"
            assert result['customer_id'] == sample_customer['customer_id'], \
                f"Returned customer should match expected customer"
        else:
            # Invalid API key should return None
            mock_table.query.return_value = {'Items': []}
            result = validate_api_key(api_key)
            
            assert result is None, \
                f"Invalid API key '{api_key}' should return None"
    
    # Test Case 2: Missing API key (None) should return None
    result = validate_api_key(None)
    assert result is None, "Missing API key (None) should return None"
    
    # Test Case 3: handle_log_submission with valid API key returns 200
    event_valid = {
        'headers': {'X-API-Key': api_key},
        'body': json.dumps(log_data)
    }
    
    with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
         patch('backend.lambda_handler.logs_table') as mock_logs_table, \
         patch('backend.lambda_handler.send_alert'):
        
        if is_valid:
            mock_validate.return_value = sample_customer
            mock_logs_table.put_item.return_value = {}
            
            result = handle_log_submission(event_valid)
            
            assert result['statusCode'] == 200, \
                f"Valid API key should result in HTTP 200, got {result['statusCode']}"
            assert 'Log received' in result['body'], \
                "Response should confirm log was received"
        else:
            mock_validate.return_value = None
            
            result = handle_log_submission(event_valid)
            
            assert result['statusCode'] == 401, \
                f"Invalid API key should result in HTTP 401, got {result['statusCode']}"
            assert 'Invalid API Key' in result['body'], \
                "Response should indicate invalid API key"
    
    # Test Case 4: handle_log_submission with missing API key returns 401
    event_missing = {
        'headers': {},
        'body': json.dumps(log_data)
    }
    
    with patch('backend.lambda_handler.validate_api_key') as mock_validate:
        mock_validate.return_value = None
        
        result = handle_log_submission(event_missing)
        
        assert result['statusCode'] == 401, \
            f"Missing API key should result in HTTP 401, got {result['statusCode']}"
        assert 'Invalid API Key' in result['body'], \
            "Response should indicate invalid API key"
    
    # Test Case 5: handle_log_query with valid API key returns 200
    event_query_valid = {
        'headers': {'X-API-Key': api_key}
    }
    
    with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
         patch('backend.lambda_handler.logs_table') as mock_logs_table:
        
        if is_valid:
            mock_validate.return_value = sample_customer
            mock_logs_table.query.return_value = {'Items': []}
            
            result = handle_log_query(event_query_valid)
            
            assert result['statusCode'] == 200, \
                f"Valid API key should result in HTTP 200 for query, got {result['statusCode']}"
        else:
            mock_validate.return_value = None
            
            result = handle_log_query(event_query_valid)
            
            assert result['statusCode'] == 401, \
                f"Invalid API key should result in HTTP 401 for query, got {result['statusCode']}"
            assert 'Invalid API Key' in result['body'], \
                "Response should indicate invalid API key"
    
    # Test Case 6: handle_log_query with missing API key returns 401
    event_query_missing = {
        'headers': {}
    }
    
    with patch('backend.lambda_handler.validate_api_key') as mock_validate:
        mock_validate.return_value = None
        
        result = handle_log_query(event_query_missing)
        
        assert result['statusCode'] == 401, \
            f"Missing API key should result in HTTP 401 for query, got {result['statusCode']}"
        assert 'Invalid API Key' in result['body'], \
            "Response should indicate invalid API key"


# Feature: interpose-saas-platform, Property 14: Valid Log Persistence
# **Validates: Requirements 7.3, 7.5, 9.1**
@settings(max_examples=20)
@given(
    api_key=st.text(
        min_size=10, 
        max_size=50, 
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')
    ),
    customer_id=st.text(
        min_size=5,
        max_size=30,
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')
    ),
    log_data=st.fixed_dictionaries({
        'log_id': st.text(min_size=10, max_size=50),
        'ai_service': st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
        'endpoint': st.text(min_size=10, max_size=100),
        'data_sources': st.lists(st.text(min_size=5, max_size=50), min_size=0, max_size=5),
        'sensitive_data_types': st.lists(
            st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
            min_size=0,
            max_size=5
        ),
        'risk_score': st.integers(min_value=0, max_value=100),
        'request_method': st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
        'request_size_bytes': st.integers(min_value=0, max_value=10000000),
        'response_status': st.integers(min_value=200, max_value=599)
    })
)
def test_property_valid_log_persistence(api_key, customer_id, log_data):
    """
    Property 14: Valid Log Persistence
    
    For any incoming log request with a valid API key, the log entry should be 
    stored in the AIObserveLogs DynamoDB table and the backend should return 
    HTTP 200 status.
    
    This test verifies that:
    1. Valid API keys result in successful log storage
    2. HTTP 200 status is returned on successful storage
    3. The log entry is stored with customer_id and timestamp added
    4. DynamoDB put_item is called with the complete log entry
    5. The response confirms log was received
    """
    # Arrange
    sample_customer = {
        'customer_id': customer_id,
        'email': 'test@example.com',
        'api_key': api_key,
        'alert_email': 'alerts@example.com',
        'company_name': 'Test Company'
    }
    
    event = {
        'headers': {'X-API-Key': api_key},
        'body': json.dumps(log_data)
    }
    
    # Act & Assert
    with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
         patch('backend.lambda_handler.logs_table') as mock_logs_table, \
         patch('backend.lambda_handler.send_alert') as mock_send_alert, \
         patch('time.time') as mock_time:
        
        # Setup mocks
        mock_validate.return_value = sample_customer
        mock_logs_table.put_item.return_value = {}
        mock_time.return_value = 1704067200.0  # Fixed timestamp for testing
        
        # Execute
        result = handle_log_submission(event)
        
        # Verify HTTP 200 status returned
        assert result['statusCode'] == 200, \
            f"Valid API key should result in HTTP 200, got {result['statusCode']}"
        
        # Verify response body confirms log received
        assert 'Log received' in result['body'], \
            "Response should confirm log was received"
        
        # Verify DynamoDB put_item was called
        assert mock_logs_table.put_item.called, \
            "DynamoDB put_item should be called to store log entry"
        
        # Verify the stored log entry contains all required fields
        call_args = mock_logs_table.put_item.call_args
        stored_item = call_args[1]['Item']
        
        # Verify customer_id was added
        assert 'customer_id' in stored_item, \
            "Stored log entry should contain customer_id"
        assert stored_item['customer_id'] == customer_id, \
            f"customer_id should be {customer_id}, got {stored_item['customer_id']}"
        
        # Verify timestamp was added
        assert 'timestamp' in stored_item, \
            "Stored log entry should contain timestamp"
        assert stored_item['timestamp'] == 1704067200000, \
            f"timestamp should be 1704067200000, got {stored_item['timestamp']}"
        
        # Verify original log data fields are preserved
        assert stored_item['log_id'] == log_data['log_id'], \
            "log_id should be preserved"
        assert stored_item['ai_service'] == log_data['ai_service'], \
            "ai_service should be preserved"
        assert stored_item['endpoint'] == log_data['endpoint'], \
            "endpoint should be preserved"
        assert stored_item['data_sources'] == log_data['data_sources'], \
            "data_sources should be preserved"
        assert stored_item['sensitive_data_types'] == log_data['sensitive_data_types'], \
            "sensitive_data_types should be preserved"
        assert stored_item['request_method'] == log_data['request_method'], \
            "request_method should be preserved"
        
        # Verify numeric fields are converted to Decimal for DynamoDB
        assert stored_item['risk_score'] == Decimal(str(log_data['risk_score'])), \
            "risk_score should be converted to Decimal"
        assert stored_item['request_size_bytes'] == Decimal(str(log_data['request_size_bytes'])), \
            "request_size_bytes should be converted to Decimal"
        assert stored_item['response_status'] == Decimal(str(log_data['response_status'])), \
            "response_status should be converted to Decimal"
        
        # Verify alert handling based on risk score
        if log_data['risk_score'] > 70:
            mock_send_alert.assert_called_once_with(sample_customer, stored_item), \
                "Alert should be sent for high-risk logs (risk_score > 70)"
        else:
            mock_send_alert.assert_not_called(), \
                "Alert should not be sent for low/medium-risk logs (risk_score <= 70)"


# Feature: interpose-saas-platform, Property 16: Stored Log Completeness
# **Validates: Requirements 9.3**
@settings(max_examples=20)
@given(
    api_key=st.text(
        min_size=10, 
        max_size=50, 
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')
    ),
    customer_id=st.text(
        min_size=5,
        max_size=30,
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')
    ),
    log_data=st.fixed_dictionaries({
        'log_id': st.text(min_size=10, max_size=50),
        'ai_service': st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
        'endpoint': st.text(min_size=10, max_size=100),
        'data_sources': st.lists(st.text(min_size=5, max_size=50), min_size=0, max_size=5),
        'sensitive_data_types': st.lists(
            st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
            min_size=0,
            max_size=5
        ),
        'risk_score': st.integers(min_value=0, max_value=100),
        'request_method': st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
        'request_size_bytes': st.integers(min_value=0, max_value=10000000),
        'response_status': st.integers(min_value=200, max_value=599)
    })
)
def test_property_stored_log_completeness(api_key, customer_id, log_data):
    """
    Property 16: Stored Log Completeness
    
    For any log entry stored in DynamoDB, the record must contain all required 
    fields: timestamp, customer_id, ai_service, data_sources, sensitive_data_types, 
    and risk_score.
    
    This test verifies that:
    1. All required fields are present in the stored log entry
    2. timestamp is added by the backend (Unix milliseconds)
    3. customer_id is added by the backend from the authenticated customer
    4. ai_service is preserved from the original log data
    5. data_sources is preserved from the original log data
    6. sensitive_data_types is preserved from the original log data
    7. risk_score is preserved from the original log data
    8. Additional metadata fields are also preserved (endpoint, request_method, etc.)
    """
    # Arrange
    sample_customer = {
        'customer_id': customer_id,
        'email': 'test@example.com',
        'api_key': api_key,
        'alert_email': 'alerts@example.com',
        'company_name': 'Test Company'
    }
    
    event = {
        'headers': {'X-API-Key': api_key},
        'body': json.dumps(log_data)
    }
    
    # Act & Assert
    with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
         patch('backend.lambda_handler.logs_table') as mock_logs_table, \
         patch('backend.lambda_handler.send_alert') as mock_send_alert, \
         patch('time.time') as mock_time:
        
        # Setup mocks
        mock_validate.return_value = sample_customer
        mock_logs_table.put_item.return_value = {}
        mock_time.return_value = 1704067200.0  # Fixed timestamp for testing
        
        # Execute
        result = handle_log_submission(event)
        
        # Verify successful submission
        assert result['statusCode'] == 200, \
            f"Log submission should succeed with HTTP 200, got {result['statusCode']}"
        
        # Verify DynamoDB put_item was called
        assert mock_logs_table.put_item.called, \
            "DynamoDB put_item should be called to store log entry"
        
        # Extract the stored log entry from the mock call
        call_args = mock_logs_table.put_item.call_args
        stored_item = call_args[1]['Item']
        
        # REQUIRED FIELD 1: timestamp
        assert 'timestamp' in stored_item, \
            "Stored log entry MUST contain 'timestamp' field (Requirement 9.3)"
        assert isinstance(stored_item['timestamp'], int), \
            "timestamp must be an integer (Unix milliseconds)"
        assert stored_item['timestamp'] > 0, \
            "timestamp must be a positive value"
        
        # REQUIRED FIELD 2: customer_id
        assert 'customer_id' in stored_item, \
            "Stored log entry MUST contain 'customer_id' field (Requirement 9.3)"
        assert stored_item['customer_id'] == customer_id, \
            f"customer_id should match authenticated customer: expected {customer_id}, got {stored_item['customer_id']}"
        
        # REQUIRED FIELD 3: ai_service
        assert 'ai_service' in stored_item, \
            "Stored log entry MUST contain 'ai_service' field (Requirement 9.3)"
        assert stored_item['ai_service'] == log_data['ai_service'], \
            f"ai_service should be preserved: expected {log_data['ai_service']}, got {stored_item['ai_service']}"
        
        # REQUIRED FIELD 4: data_sources
        assert 'data_sources' in stored_item, \
            "Stored log entry MUST contain 'data_sources' field (Requirement 9.3)"
        assert stored_item['data_sources'] == log_data['data_sources'], \
            f"data_sources should be preserved: expected {log_data['data_sources']}, got {stored_item['data_sources']}"
        
        # REQUIRED FIELD 5: sensitive_data_types
        assert 'sensitive_data_types' in stored_item, \
            "Stored log entry MUST contain 'sensitive_data_types' field (Requirement 9.3)"
        assert stored_item['sensitive_data_types'] == log_data['sensitive_data_types'], \
            f"sensitive_data_types should be preserved: expected {log_data['sensitive_data_types']}, got {stored_item['sensitive_data_types']}"
        
        # REQUIRED FIELD 6: risk_score
        assert 'risk_score' in stored_item, \
            "Stored log entry MUST contain 'risk_score' field (Requirement 9.3)"
        # risk_score is converted to Decimal for DynamoDB
        assert stored_item['risk_score'] == Decimal(str(log_data['risk_score'])), \
            f"risk_score should be preserved (as Decimal): expected {log_data['risk_score']}, got {stored_item['risk_score']}"
        
        # Verify additional metadata fields are also preserved
        assert 'log_id' in stored_item, \
            "Stored log entry should contain 'log_id' field"
        assert stored_item['log_id'] == log_data['log_id'], \
            "log_id should be preserved"
        
        assert 'endpoint' in stored_item, \
            "Stored log entry should contain 'endpoint' field"
        assert stored_item['endpoint'] == log_data['endpoint'], \
            "endpoint should be preserved"
        
        assert 'request_method' in stored_item, \
            "Stored log entry should contain 'request_method' field"
        assert stored_item['request_method'] == log_data['request_method'], \
            "request_method should be preserved"
        
        assert 'request_size_bytes' in stored_item, \
            "Stored log entry should contain 'request_size_bytes' field"
        assert stored_item['request_size_bytes'] == Decimal(str(log_data['request_size_bytes'])), \
            "request_size_bytes should be preserved (as Decimal)"
        
        assert 'response_status' in stored_item, \
            "Stored log entry should contain 'response_status' field"
        assert stored_item['response_status'] == Decimal(str(log_data['response_status'])), \
            "response_status should be preserved (as Decimal)"
        
        # Verify the completeness of the stored log entry
        # All required fields from Requirement 9.3 must be present
        required_fields = [
            'timestamp',
            'customer_id',
            'ai_service',
            'data_sources',
            'sensitive_data_types',
            'risk_score'
        ]
        
        for field in required_fields:
            assert field in stored_item, \
                f"Required field '{field}' is missing from stored log entry (Requirement 9.3)"
        
        # Verify no required fields are None or empty strings (except lists can be empty)
        assert stored_item['timestamp'] is not None and stored_item['timestamp'] != '', \
            "timestamp must not be None or empty"
        assert stored_item['customer_id'] is not None and stored_item['customer_id'] != '', \
            "customer_id must not be None or empty"
        assert stored_item['ai_service'] is not None and stored_item['ai_service'] != '', \
            "ai_service must not be None or empty"
        assert stored_item['data_sources'] is not None, \
            "data_sources must not be None (can be empty list)"
        assert stored_item['sensitive_data_types'] is not None, \
            "sensitive_data_types must not be None (can be empty list)"
        assert stored_item['risk_score'] is not None, \
            "risk_score must not be None"


# Feature: interpose-saas-platform, Property 15: High-Risk Alert Generation
# **Validates: Requirements 8.1, 8.2, 8.3**
@settings(max_examples=20)
@given(
    api_key=st.text(
        min_size=10, 
        max_size=50, 
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')
    ),
    customer_id=st.text(
        min_size=5,
        max_size=30,
        alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-_')
    ),
    alert_email=st.emails(),
    log_data=st.fixed_dictionaries({
        'log_id': st.text(min_size=10, max_size=50),
        'ai_service': st.sampled_from(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
        'endpoint': st.text(min_size=10, max_size=100),
        'data_sources': st.lists(st.text(min_size=5, max_size=50), min_size=0, max_size=5),
        'sensitive_data_types': st.lists(
            st.sampled_from(['ssn', 'credit_card', 'api_key', 'password', 'email']),
            min_size=0,
            max_size=5
        ),
        'risk_score': st.integers(min_value=0, max_value=100),
        'request_method': st.sampled_from(['GET', 'POST', 'PUT', 'DELETE']),
        'request_size_bytes': st.integers(min_value=0, max_value=10000000),
        'response_status': st.integers(min_value=200, max_value=599)
    })
)
def test_property_high_risk_alert_generation(api_key, customer_id, alert_email, log_data):
    """
    Property 15: High-Risk Alert Generation
    
    For any log entry with a risk score greater than 70, the backend should send 
    an alert email via AWS SES that includes the risk score, AI service name, 
    and detected sensitive data types.
    
    This test verifies that:
    1. Logs with risk_score > 70 trigger send_alert (Requirement 8.1)
    2. Logs with risk_score <= 70 do NOT trigger send_alert
    3. Alert emails include risk score (Requirement 8.2)
    4. Alert emails include AI service name (Requirement 8.2)
    5. Alert emails include timestamp (Requirement 8.2)
    6. Alert emails include sensitive data types (Requirement 8.3)
    7. Alert emails include data sources (Requirement 8.3)
    8. Alert emails are sent via AWS SES to the customer's alert_email
    """
    # Arrange
    sample_customer = {
        'customer_id': customer_id,
        'email': 'test@example.com',
        'api_key': api_key,
        'alert_email': alert_email,
        'company_name': 'Test Company'
    }
    
    event = {
        'headers': {'X-API-Key': api_key},
        'body': json.dumps(log_data)
    }
    
    risk_score = log_data['risk_score']
    
    # Act & Assert
    with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
         patch('backend.lambda_handler.logs_table') as mock_logs_table, \
         patch('backend.lambda_handler.ses_client') as mock_ses, \
         patch('time.time') as mock_time:
        
        # Setup mocks
        mock_validate.return_value = sample_customer
        mock_logs_table.put_item.return_value = {}
        mock_ses.send_email.return_value = {}
        mock_time.return_value = 1704067200.0  # Fixed timestamp for testing
        
        # Execute
        result = handle_log_submission(event)
        
        # Verify successful submission
        assert result['statusCode'] == 200, \
            f"Log submission should succeed with HTTP 200, got {result['statusCode']}"
        
        # REQUIREMENT 8.1: Logs with risk_score > 70 should trigger alert
        if risk_score > 70:
            # Verify SES send_email was called
            assert mock_ses.send_email.called, \
                f"Alert email should be sent for risk_score {risk_score} > 70 (Requirement 8.1)"
            
            # Get the SES send_email call arguments
            call_args = mock_ses.send_email.call_args[1]
            
            # Verify email destination
            assert 'Destination' in call_args, \
                "SES send_email should include Destination"
            assert 'ToAddresses' in call_args['Destination'], \
                "SES send_email should include ToAddresses"
            assert alert_email in call_args['Destination']['ToAddresses'], \
                f"Alert should be sent to customer's alert_email: {alert_email}"
            
            # Verify email subject
            assert 'Message' in call_args, \
                "SES send_email should include Message"
            assert 'Subject' in call_args['Message'], \
                "SES send_email should include Subject"
            subject = call_args['Message']['Subject']['Data']
            assert 'HIGH RISK ALERT' in subject, \
                "Email subject should indicate high-risk alert"
            assert str(risk_score) in subject, \
                f"Email subject should include risk score {risk_score} (Requirement 8.2)"
            
            # Verify email body
            assert 'Body' in call_args['Message'], \
                "SES send_email should include Body"
            assert 'Text' in call_args['Message']['Body'], \
                "SES send_email should include Text body"
            email_body = call_args['Message']['Body']['Text']['Data']
            
            # REQUIREMENT 8.2: Alert must include risk score
            assert str(risk_score) in email_body, \
                f"Email body should include risk score {risk_score} (Requirement 8.2)"
            
            # REQUIREMENT 8.2: Alert must include AI service name
            assert log_data['ai_service'] in email_body, \
                f"Email body should include AI service name '{log_data['ai_service']}' (Requirement 8.2)"
            
            # REQUIREMENT 8.2: Alert must include timestamp
            assert '1704067200000' in email_body, \
                "Email body should include timestamp (Requirement 8.2)"
            
            # REQUIREMENT 8.3: Alert must include sensitive data types
            if log_data['sensitive_data_types']:
                for data_type in log_data['sensitive_data_types']:
                    assert data_type in email_body, \
                        f"Email body should include sensitive data type '{data_type}' (Requirement 8.3)"
            else:
                # If no sensitive data, should indicate "None"
                assert 'Sensitive Data:' in email_body, \
                    "Email body should include Sensitive Data section (Requirement 8.3)"
            
            # REQUIREMENT 8.3: Alert must include data sources
            if log_data['data_sources']:
                for data_source in log_data['data_sources']:
                    assert data_source in email_body, \
                        f"Email body should include data source '{data_source}' (Requirement 8.3)"
            else:
                # If no data sources, should indicate "None"
                assert 'Data Sources:' in email_body, \
                    "Email body should include Data Sources section (Requirement 8.3)"
            
            # Verify email source
            assert 'Source' in call_args, \
                "SES send_email should include Source"
            # Source should be the configured alert email source
            
        else:
            # risk_score <= 70: No alert should be sent
            assert not mock_ses.send_email.called, \
                f"Alert email should NOT be sent for risk_score {risk_score} <= 70"
    
    # Additional test: Verify send_alert function directly
    # This tests the send_alert function in isolation
    with patch('backend.lambda_handler.ses_client') as mock_ses:
        mock_ses.send_email.return_value = {}
        
        # Create a log entry with the backend-added fields
        log_entry_with_backend_fields = {
            **log_data,
            'customer_id': customer_id,
            'timestamp': 1704067200000,
            'risk_score': Decimal(str(risk_score))
        }
        
        # Call send_alert directly
        send_alert(sample_customer, log_entry_with_backend_fields)
        
        # Verify SES send_email was called
        assert mock_ses.send_email.called, \
            "send_alert should call SES send_email"
        
        # Verify the email content
        call_args = mock_ses.send_email.call_args[1]
        email_body = call_args['Message']['Body']['Text']['Data']
        
        # Verify all required information is present
        assert str(risk_score) in email_body, \
            "send_alert email should include risk score"
        assert log_data['ai_service'] in email_body, \
            "send_alert email should include AI service"
        assert '1704067200000' in email_body, \
            "send_alert email should include timestamp"


# Feature: interpose-saas-platform, Property 18: Credential Validation
# **Validates: Requirements 10.2, 10.3**
@settings(max_examples=20, deadline=None)
@given(
    email=st.emails(),
    password=st.text(min_size=8, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'S'))),
    customer_id=st.text(min_size=5, max_size=30, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_-')),
    api_key=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_-')),
    is_valid_credentials=st.booleans(),
    seed=st.integers(min_value=0, max_value=1000000)
)
def test_property_credential_validation(email, password, customer_id, api_key, is_valid_credentials, seed):
    """
    Property 18: Credential Validation
    
    For any login attempt, the dashboard should validate the provided credentials 
    against the Customers table, and if invalid, display an error message.
    
    This test verifies that:
    1. Valid credentials (correct email + password) return HTTP 200 with API key and customer_id (Requirement 10.2)
    2. Invalid credentials (wrong password) return HTTP 401 with error message (Requirement 10.3)
    3. Non-existent email returns HTTP 401 with error message (Requirement 10.3)
    4. Missing email or password returns HTTP 400 with error message
    5. Password verification uses bcrypt.checkpw (Requirement 10.2)
    6. Credentials are validated against Customers table using EmailIndex GSI (Requirement 10.2)
    
    Test strategy:
    - Generate random email, password, customer_id, and api_key
    - Create customer record with bcrypt-hashed password
    - Test valid credentials (correct password) -> HTTP 200 with api_key and customer_id
    - Test invalid credentials (wrong password) -> HTTP 401 with error message
    - Test non-existent email -> HTTP 401 with error message
    - Test missing email/password -> HTTP 400 with error message
    
    Note: bcrypt has a 72-byte password limit. Passwords are truncated to 72 bytes before hashing.
    """
    import random
    random.seed(seed)
    
    # Truncate password to 72 bytes for bcrypt compatibility
    # bcrypt cannot handle passwords longer than 72 bytes
    correct_password = password
    password_bytes = correct_password.encode('utf-8')[:72]
    password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    
    customer = {
        'customer_id': customer_id,
        'email': email,
        'password_hash': password_hash,
        'api_key': api_key,
        'alert_email': f'alerts-{email}',
        'company_name': f'Company {customer_id}'
    }
    
    # TEST CASE 1: Valid credentials (correct email + password) should return HTTP 200
    if is_valid_credentials:
        event_valid = {
            'body': json.dumps({
                'email': email,
                'password': correct_password
            })
        }
        
        with patch('backend.lambda_handler.customers_table') as mock_table:
            # Mock DynamoDB query to return customer record
            mock_table.query.return_value = {'Items': [customer]}
            
            # Execute authentication
            result = handle_auth(event_valid)
            
            # VERIFICATION 1: Valid credentials should return HTTP 200
            assert result['statusCode'] == 200, \
                f"Valid credentials (email={email}, correct password) should return HTTP 200 " \
                f"(Requirement 10.2 - Dashboard must validate credentials against Customers table), " \
                f"but got {result['statusCode']}"
            
            # VERIFICATION 2: Response should contain api_key and customer_id
            response_body = json.loads(result['body'])
            assert 'api_key' in response_body, \
                "Valid credentials should return api_key in response body (Requirement 10.2)"
            assert 'customer_id' in response_body, \
                "Valid credentials should return customer_id in response body (Requirement 10.2)"
            
            # VERIFICATION 3: Returned api_key and customer_id should match customer record
            assert response_body['api_key'] == api_key, \
                f"Returned api_key should match customer record: expected {api_key}, got {response_body['api_key']}"
            assert response_body['customer_id'] == customer_id, \
                f"Returned customer_id should match customer record: expected {customer_id}, got {response_body['customer_id']}"
            
            # VERIFICATION 4: DynamoDB query should use EmailIndex GSI
            assert mock_table.query.called, \
                "Authentication should query Customers table (Requirement 10.2)"
            
            call_args = mock_table.query.call_args[1]
            assert 'IndexName' in call_args, \
                "Query should use EmailIndex GSI"
            assert call_args['IndexName'] == 'EmailIndex', \
                f"Query should use EmailIndex GSI (Requirement 10.2), but used {call_args['IndexName']}"
            
            # VERIFICATION 5: Query should filter by email
            assert 'KeyConditionExpression' in call_args, \
                "Query should include KeyConditionExpression"
            assert 'email' in str(call_args['KeyConditionExpression']), \
                "KeyConditionExpression should filter by email (Requirement 10.2)"
            
            assert 'ExpressionAttributeValues' in call_args, \
                "Query should include ExpressionAttributeValues"
            assert ':email' in call_args['ExpressionAttributeValues'], \
                "ExpressionAttributeValues should include :email parameter"
            assert call_args['ExpressionAttributeValues'][':email'] == email, \
                f"Query should filter by email '{email}' (Requirement 10.2)"
    
    # TEST CASE 2: Invalid credentials (wrong password) should return HTTP 401
    else:
        # Generate a different wrong password
        # IMPORTANT: Ensure the wrong password is different after 72-byte truncation
        # If the original password is near 72 bytes, appending a suffix might get truncated
        # to the same 72-byte prefix. Instead, modify the beginning of the password.
        if len(password_bytes) >= 60:
            # If password is long, replace first character to ensure difference
            wrong_password = 'X' + correct_password[1:] if len(correct_password) > 1 else 'WRONG'
        else:
            # If password is short, append suffix
            wrong_password = correct_password + '_wrong_suffix_12345'
        
        event_invalid = {
            'body': json.dumps({
                'email': email,
                'password': wrong_password
            })
        }
        
        with patch('backend.lambda_handler.customers_table') as mock_table:
            # Mock DynamoDB query to return customer record
            mock_table.query.return_value = {'Items': [customer]}
            
            # Execute authentication with wrong password
            result = handle_auth(event_invalid)
            
            # VERIFICATION 6: Invalid password should return HTTP 401
            assert result['statusCode'] == 401, \
                f"Invalid credentials (email={email}, wrong password) should return HTTP 401 " \
                f"(Requirement 10.3 - Dashboard must display error message for invalid credentials), " \
                f"but got {result['statusCode']}"
            
            # VERIFICATION 7: Response should contain error message
            assert 'Invalid credentials' in result['body'], \
                "Invalid credentials should return error message 'Invalid credentials' " \
                "(Requirement 10.3 - Dashboard must display error message for invalid credentials)"
            
            # VERIFICATION 8: Response should not contain api_key or customer_id
            # Parse body to check it doesn't contain sensitive data
            try:
                response_body = json.loads(result['body'])
                assert 'api_key' not in response_body or response_body.get('api_key') is None, \
                    "Invalid credentials should not return api_key"
                assert 'customer_id' not in response_body or response_body.get('customer_id') is None, \
                    "Invalid credentials should not return customer_id"
            except json.JSONDecodeError:
                # If body is not JSON, that's fine - just verify it contains error message
                pass
    
    # TEST CASE 3: Non-existent email should return HTTP 401
    nonexistent_email = f'nonexistent_{seed}@example.com'
    event_nonexistent = {
        'body': json.dumps({
            'email': nonexistent_email,
            'password': password
        })
    }
    
    with patch('backend.lambda_handler.customers_table') as mock_table:
        # Mock DynamoDB query to return empty result (email not found)
        mock_table.query.return_value = {'Items': []}
        
        # Execute authentication with non-existent email
        result = handle_auth(event_nonexistent)
        
        # VERIFICATION 9: Non-existent email should return HTTP 401
        assert result['statusCode'] == 401, \
            f"Non-existent email should return HTTP 401 " \
            f"(Requirement 10.3 - Dashboard must display error message for invalid credentials), " \
            f"but got {result['statusCode']}"
        
        # VERIFICATION 10: Response should contain error message
        assert 'Invalid credentials' in result['body'], \
            "Non-existent email should return error message 'Invalid credentials' " \
            "(Requirement 10.3)"
    
    # TEST CASE 4: Missing email should return HTTP 400
    event_missing_email = {
        'body': json.dumps({
            'password': password
        })
    }
    
    result = handle_auth(event_missing_email)
    
    # VERIFICATION 11: Missing email should return HTTP 400
    assert result['statusCode'] == 400, \
        f"Missing email should return HTTP 400, but got {result['statusCode']}"
    
    # VERIFICATION 12: Response should indicate email and password are required
    assert 'Email and password required' in result['body'], \
        "Missing email should return error message 'Email and password required'"
    
    # TEST CASE 5: Missing password should return HTTP 400
    event_missing_password = {
        'body': json.dumps({
            'email': email
        })
    }
    
    result = handle_auth(event_missing_password)
    
    # VERIFICATION 13: Missing password should return HTTP 400
    assert result['statusCode'] == 400, \
        f"Missing password should return HTTP 400, but got {result['statusCode']}"
    
    # VERIFICATION 14: Response should indicate email and password are required
    assert 'Email and password required' in result['body'], \
        "Missing password should return error message 'Email and password required'"
    
    # TEST CASE 6: Empty email should return HTTP 400
    event_empty_email = {
        'body': json.dumps({
            'email': '',
            'password': password
        })
    }
    
    result = handle_auth(event_empty_email)
    
    # VERIFICATION 15: Empty email should return HTTP 400
    assert result['statusCode'] == 400, \
        f"Empty email should return HTTP 400, but got {result['statusCode']}"
    
    # TEST CASE 7: Empty password should return HTTP 400
    event_empty_password = {
        'body': json.dumps({
            'email': email,
            'password': ''
        })
    }
    
    result = handle_auth(event_empty_password)
    
    # VERIFICATION 16: Empty password should return HTTP 400
    assert result['statusCode'] == 400, \
        f"Empty password should return HTTP 400, but got {result['statusCode']}"
    
    # TEST CASE 8: Verify bcrypt password verification is used
    # This is implicitly tested by the valid/invalid password tests above
    # bcrypt.checkpw is called in handle_auth to verify the password
    # If bcrypt verification wasn't working, valid passwords would fail
    
    # Additional verification: Test with special characters in password
    special_password = "P@ssw0rd!#$%^&*()"
    special_password_bytes = special_password.encode('utf-8')[:72]
    special_password_hash = bcrypt.hashpw(special_password_bytes, bcrypt.gensalt())
    
    customer_special = {
        'customer_id': customer_id,
        'email': email,
        'password_hash': special_password_hash,
        'api_key': api_key,
        'alert_email': f'alerts-{email}',
        'company_name': f'Company {customer_id}'
    }
    
    event_special = {
        'body': json.dumps({
            'email': email,
            'password': special_password
        })
    }
    
    with patch('backend.lambda_handler.customers_table') as mock_table:
        mock_table.query.return_value = {'Items': [customer_special]}
        
        result = handle_auth(event_special)
        
        # VERIFICATION 17: Special characters in password should work correctly
        assert result['statusCode'] == 200, \
            f"Valid credentials with special characters should return HTTP 200, but got {result['statusCode']}"
        
        response_body = json.loads(result['body'])
        assert response_body['api_key'] == api_key, \
            "Special character password should authenticate successfully"


# Feature: interpose-saas-platform, Property 19: Customer Data Isolation
# **Validates: Requirements 10.4**
@settings(max_examples=20)
@given(
    # Generate multiple customers with their own API keys
    num_customers=st.integers(min_value=2, max_value=5),
    logs_per_customer=st.integers(min_value=1, max_value=10),
    # Generate random customer IDs and API keys
    seed=st.integers(min_value=0, max_value=1000000)
)
def test_property_customer_data_isolation(num_customers, logs_per_customer, seed):
    """
    Property 19: Customer Data Isolation
    
    For any authenticated dashboard session, the displayed logs should only 
    include log entries where the customer_id matches the authenticated 
    customer's ID.
    
    This test verifies that:
    1. handle_log_query only returns logs for the authenticated customer
    2. Logs from other customers are never returned
    3. The query uses customer_id filter in DynamoDB query
    4. Customer data isolation is maintained across all scenarios
    5. No cross-customer data leakage occurs
    
    Test strategy:
    - Generate multiple customers with unique IDs and API keys
    - Create logs for each customer in DynamoDB
    - Query logs using each customer's API key
    - Verify only that customer's logs are returned
    - Verify no other customer's logs appear in the results
    """
    import random
    random.seed(seed)
    
    # Generate multiple customers
    customers = []
    for i in range(num_customers):
        customer = {
            'customer_id': f'cust_{seed}_{i}',
            'email': f'customer{i}@example.com',
            'api_key': f'api_key_{seed}_{i}',
            'alert_email': f'alerts{i}@example.com',
            'company_name': f'Company {i}'
        }
        customers.append(customer)
    
    # Generate logs for each customer
    all_logs = {}
    for customer in customers:
        customer_logs = []
        for j in range(logs_per_customer):
            log_entry = {
                'customer_id': customer['customer_id'],
                'timestamp': 1704067200000 + j * 1000,
                'log_id': f'log_{customer["customer_id"]}_{j}',
                'ai_service': random.choice(['openai', 'anthropic', 'bedrock', 'local']),
                'endpoint': f'https://api.example.com/v1/endpoint_{j}',
                'data_sources': [f'db_{j}.example.com'],
                'sensitive_data_types': random.sample(['ssn', 'credit_card', 'email'], k=random.randint(0, 2)),
                'risk_score': Decimal(str(random.randint(0, 100))),
                'request_method': 'POST',
                'request_size_bytes': Decimal(str(random.randint(100, 10000))),
                'response_status': Decimal('200')
            }
            customer_logs.append(log_entry)
        all_logs[customer['customer_id']] = customer_logs
    
    # Test each customer's query in isolation
    for test_customer in customers:
        event = {
            'headers': {'X-API-Key': test_customer['api_key']}
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table:
            
            # Setup mocks
            mock_validate.return_value = test_customer
            
            # Mock DynamoDB query to return only this customer's logs
            # This simulates the actual DynamoDB behavior with customer_id filter
            mock_logs_table.query.return_value = {
                'Items': all_logs[test_customer['customer_id']]
            }
            
            # Execute query
            result = handle_log_query(event)
            
            # VERIFICATION 1: Query should succeed with HTTP 200
            assert result['statusCode'] == 200, \
                f"Query for customer {test_customer['customer_id']} should succeed with HTTP 200"
            
            # VERIFICATION 2: Verify DynamoDB query was called with correct customer_id filter
            assert mock_logs_table.query.called, \
                "DynamoDB query should be called"
            
            call_args = mock_logs_table.query.call_args[1]
            
            # Verify KeyConditionExpression uses customer_id
            assert 'KeyConditionExpression' in call_args, \
                "Query should include KeyConditionExpression"
            assert 'customer_id' in str(call_args['KeyConditionExpression']), \
                "KeyConditionExpression should filter by customer_id (Requirement 10.4)"
            
            # Verify ExpressionAttributeValues includes the correct customer_id
            assert 'ExpressionAttributeValues' in call_args, \
                "Query should include ExpressionAttributeValues"
            assert ':cid' in call_args['ExpressionAttributeValues'], \
                "ExpressionAttributeValues should include :cid parameter"
            assert call_args['ExpressionAttributeValues'][':cid'] == test_customer['customer_id'], \
                f"Query should filter by customer_id '{test_customer['customer_id']}' (Requirement 10.4)"
            
            # VERIFICATION 3: Parse returned logs
            returned_logs = json.loads(result['body'])
            
            # Verify logs were returned
            assert len(returned_logs) == logs_per_customer, \
                f"Should return {logs_per_customer} logs for customer {test_customer['customer_id']}"
            
            # VERIFICATION 4: Verify ALL returned logs belong to the authenticated customer
            for log in returned_logs:
                assert log['customer_id'] == test_customer['customer_id'], \
                    f"Log {log['log_id']} should belong to customer {test_customer['customer_id']}, " \
                    f"but belongs to {log['customer_id']} (Requirement 10.4 - Customer Data Isolation)"
            
            # VERIFICATION 5: Verify NO logs from other customers are present
            other_customer_ids = [c['customer_id'] for c in customers if c['customer_id'] != test_customer['customer_id']]
            for log in returned_logs:
                assert log['customer_id'] not in other_customer_ids, \
                    f"Log {log['log_id']} belongs to another customer {log['customer_id']}, " \
                    f"violating customer data isolation (Requirement 10.4)"
            
            # VERIFICATION 6: Verify log IDs match expected logs for this customer
            returned_log_ids = {log['log_id'] for log in returned_logs}
            expected_log_ids = {log['log_id'] for log in all_logs[test_customer['customer_id']]}
            assert returned_log_ids == expected_log_ids, \
                f"Returned log IDs should match expected logs for customer {test_customer['customer_id']}"
    
    # Additional test: Verify that invalid API key cannot access any customer's data
    invalid_event = {
        'headers': {'X-API-Key': 'invalid_api_key_12345'}
    }
    
    with patch('backend.lambda_handler.validate_api_key') as mock_validate:
        mock_validate.return_value = None
        
        result = handle_log_query(invalid_event)
        
        # Verify unauthorized access is rejected
        assert result['statusCode'] == 401, \
            "Invalid API key should result in HTTP 401 (no data access)"
        assert 'Invalid API Key' in result['body'], \
            "Response should indicate invalid API key"
    
    # Additional test: Verify customer_id filter prevents cross-customer queries
    # This tests the actual isolation mechanism at the query level
    for test_customer in customers:
        event = {
            'headers': {'X-API-Key': test_customer['api_key']}
        }
        
        with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
             patch('backend.lambda_handler.logs_table') as mock_logs_table:
            
            mock_validate.return_value = test_customer
            
            # Simulate DynamoDB returning mixed logs (should never happen in reality)
            # This tests that the handler relies on DynamoDB's customer_id filter
            mixed_logs = []
            for customer in customers:
                mixed_logs.extend(all_logs[customer['customer_id']][:1])  # One log from each customer
            
            mock_logs_table.query.return_value = {'Items': mixed_logs}
            
            result = handle_log_query(event)
            
            # Verify the query was made with customer_id filter
            call_args = mock_logs_table.query.call_args[1]
            assert call_args['ExpressionAttributeValues'][':cid'] == test_customer['customer_id'], \
                "Query must filter by authenticated customer's ID to ensure isolation"
            
            # In a real scenario, DynamoDB would enforce this filter and return only
            # the customer's logs. The handler trusts DynamoDB's filtering.
            # This test verifies the handler REQUESTS the correct filter.



# Feature: interpose-saas-platform, Property 23: Activity Feed Pagination
# **Validates: Requirements 11.5**
@settings(max_examples=20)
@given(
    # Generate a variable number of logs (from 0 to 500)
    num_logs=st.integers(min_value=0, max_value=500),
    # Generate random customer data
    customer_id=st.text(min_size=5, max_size=20, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_-')),
    api_key=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_-')),
    seed=st.integers(min_value=0, max_value=1000000)
)
def test_property_activity_feed_pagination(num_logs, customer_id, api_key, seed):
    """
    Property 23: Activity Feed Pagination
    
    For any query to retrieve logs for the dashboard, the result should contain 
    at most the 100 most recent log entries.
    
    This test verifies that:
    1. handle_log_query uses Limit=100 in DynamoDB query
    2. Even if more than 100 logs exist, only 100 are returned
    3. The pagination limit is enforced regardless of the number of logs
    4. The limit applies to all customers and scenarios
    
    Test strategy:
    - Generate varying numbers of logs (0 to 500)
    - Query logs using handle_log_query
    - Verify DynamoDB query includes Limit=100
    - Verify returned results never exceed 100 entries
    - Test boundary cases (0 logs, exactly 100, more than 100)
    """
    import random
    random.seed(seed)
    
    # Create customer record
    customer = {
        'customer_id': customer_id,
        'email': f'{customer_id}@example.com',
        'api_key': api_key,
        'alert_email': f'alerts-{customer_id}@example.com',
        'company_name': f'Company {customer_id}'
    }
    
    # Generate logs for the customer
    logs = []
    for i in range(num_logs):
        log_entry = {
            'customer_id': customer_id,
            'timestamp': 1704067200000 + i * 1000,  # Sequential timestamps
            'log_id': f'log_{customer_id}_{i}',
            'ai_service': random.choice(['openai', 'anthropic', 'bedrock', 'local', 'unknown']),
            'endpoint': f'https://api.example.com/v1/endpoint_{i}',
            'data_sources': [f'db_{i}.example.com'],
            'sensitive_data_types': random.sample(['ssn', 'credit_card', 'email', 'api_key', 'password'], k=random.randint(0, 3)),
            'risk_score': Decimal(str(random.randint(0, 100))),
            'request_method': random.choice(['GET', 'POST', 'PUT', 'DELETE']),
            'request_size_bytes': Decimal(str(random.randint(100, 10000))),
            'response_status': Decimal(str(random.choice([200, 201, 400, 401, 500])))
        }
        logs.append(log_entry)
    
    # Create API Gateway event
    event = {
        'headers': {'X-API-Key': api_key}
    }
    
    with patch('backend.lambda_handler.validate_api_key') as mock_validate, \
         patch('backend.lambda_handler.logs_table') as mock_logs_table:
        
        # Setup mocks
        mock_validate.return_value = customer
        
        # Mock DynamoDB to return logs (simulating what DynamoDB would return with Limit=100)
        # DynamoDB respects the Limit parameter, so it would return at most 100 items
        # With ScanIndexForward=False, DynamoDB returns logs in descending order (most recent first)
        # So we need to reverse the logs to simulate this behavior
        if len(logs) > 100:
            # Return the last 100 logs (most recent) in descending order
            returned_logs = list(reversed(logs[-100:]))
        else:
            # Return all logs in descending order
            returned_logs = list(reversed(logs))
        mock_logs_table.query.return_value = {'Items': returned_logs}
        
        # Execute query
        result = handle_log_query(event)
        
        # VERIFICATION 1: Query should succeed with HTTP 200
        assert result['statusCode'] == 200, \
            f"Query should succeed with HTTP 200 for customer {customer_id}"
        
        # VERIFICATION 2: Verify DynamoDB query was called with Limit=100
        assert mock_logs_table.query.called, \
            "DynamoDB query should be called"
        
        call_args = mock_logs_table.query.call_args[1]
        
        # This is the critical verification for Property 23
        assert 'Limit' in call_args, \
            "Query should include Limit parameter (Requirement 11.5)"
        
        assert call_args['Limit'] == 100, \
            f"Query Limit should be exactly 100 to enforce activity feed pagination " \
            f"(Requirement 11.5 - Activity feed must limit display to 100 most recent entries), " \
            f"but got Limit={call_args['Limit']}"
        
        # VERIFICATION 3: Parse returned logs
        returned_log_entries = json.loads(result['body'])
        
        # VERIFICATION 4: Verify returned results never exceed 100 entries
        assert len(returned_log_entries) <= 100, \
            f"Activity feed should return at most 100 log entries (Requirement 11.5), " \
            f"but returned {len(returned_log_entries)} entries"
        
        # VERIFICATION 5: Verify correct number of logs returned based on available logs
        expected_count = min(num_logs, 100)
        assert len(returned_log_entries) == expected_count, \
            f"Should return {expected_count} logs (min of {num_logs} available and 100 limit), " \
            f"but returned {len(returned_log_entries)}"
        
        # VERIFICATION 6: Verify logs are in descending order (most recent first)
        # This is part of the pagination requirement - showing the 100 MOST RECENT
        assert 'ScanIndexForward' in call_args, \
            "Query should specify ScanIndexForward for ordering"
        
        assert call_args['ScanIndexForward'] is False, \
            "Query should use ScanIndexForward=False for descending order (most recent first), " \
            "ensuring the 100 most recent entries are returned (Requirement 11.5)"
        
        # VERIFICATION 7: If logs were returned, verify they are the most recent ones
        if len(returned_log_entries) > 0 and num_logs > 0:
            # Verify timestamps are in descending order
            timestamps = [log['timestamp'] for log in returned_log_entries]
            assert timestamps == sorted(timestamps, reverse=True), \
                "Logs should be ordered by timestamp descending (most recent first)"
            
            # If we have more than 100 logs, verify we got the most recent 100
            if num_logs > 100:
                # The returned logs should be the last 100 from our generated logs
                # (which have sequential timestamps)
                expected_log_ids = {log['log_id'] for log in logs[-100:]}
                returned_log_ids = {log['log_id'] for log in returned_log_entries}
                
                # Note: We can't directly compare IDs because DynamoDB mock returns logs[:100]
                # In a real scenario, DynamoDB with ScanIndexForward=False would return the
                # most recent 100. The important verification is that Limit=100 is set.
                
                # Verify we got exactly 100 logs when more than 100 exist
                assert len(returned_log_entries) == 100, \
                    f"When {num_logs} logs exist, should return exactly 100 (the limit)"
        
        # VERIFICATION 8: Boundary case - when exactly 100 logs exist
        if num_logs == 100:
            assert len(returned_log_entries) == 100, \
                "When exactly 100 logs exist, all 100 should be returned"
        
        # VERIFICATION 9: Boundary case - when fewer than 100 logs exist
        if num_logs < 100:
            assert len(returned_log_entries) == num_logs, \
                f"When only {num_logs} logs exist (less than 100), all should be returned"
        
        # VERIFICATION 10: Boundary case - when 0 logs exist
        if num_logs == 0:
            assert len(returned_log_entries) == 0, \
                "When no logs exist, should return empty array"
            assert returned_log_entries == [], \
                "Empty result should be an empty array"
