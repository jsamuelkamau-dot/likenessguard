"""
Unit tests for error handling in the backend Lambda handler
Tests invalid JSON, missing fields, DynamoDB failures, and SES failures
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from decimal import Decimal
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from lambda_handler import (
    handle_log_submission,
    handle_log_query,
    handle_auth,
    validate_api_key,
    send_alert
)


class TestInvalidJSONHandling:
    """Test handling of invalid JSON in requests"""
    
    def test_log_submission_invalid_json(self):
        """Log submission should return 400 for invalid JSON"""
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'valid-key'},
            'body': 'invalid json {'
        }
        
        with patch('lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = {'customer_id': 'test-customer'}
            
            response = handle_log_submission(event)
            
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'Invalid JSON' in body['error']
    
    def test_auth_invalid_json(self):
        """Auth should return 400 for invalid JSON"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'body': 'invalid json {'
        }
        
        response = handle_auth(event)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'Invalid JSON' in body['error']


class TestMissingFieldsHandling:
    """Test handling of missing required fields"""
    
    def test_log_submission_missing_fields(self):
        """Log submission should return 400 for missing required fields"""
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'valid-key'},
            'body': json.dumps({
                'ai_service': 'openai'
                # Missing 'endpoint' and 'risk_score'
            })
        }
        
        with patch('lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = {'customer_id': 'test-customer'}
            
            response = handle_log_submission(event)
            
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'Missing required fields' in body['error']
            assert 'missing_fields' in body
    
    def test_auth_missing_email(self):
        """Auth should return 400 when email is missing"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'body': json.dumps({
                'password': 'test123'
                # Missing 'email'
            })
        }
        
        response = handle_auth(event)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'Email and password required' in body['error']
    
    def test_auth_missing_password(self):
        """Auth should return 400 when password is missing"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'body': json.dumps({
                'email': 'test@example.com'
                # Missing 'password'
            })
        }
        
        response = handle_auth(event)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'Email and password required' in body['error']


class TestDynamoDBFailureHandling:
    """Test handling of DynamoDB failures"""
    
    def test_log_submission_dynamodb_put_failure(self):
        """Log submission should return 500 when DynamoDB put fails"""
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'valid-key'},
            'body': json.dumps({
                'ai_service': 'openai',
                'endpoint': 'https://api.openai.com/v1/chat/completions',
                'risk_score': 50,
                'data_sources': [],
                'sensitive_data_types': []
            })
        }
        
        with patch('lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = {'customer_id': 'test-customer'}
            
            with patch('lambda_handler.logs_table') as mock_table:
                mock_table.put_item.side_effect = Exception("DynamoDB error")
                
                response = handle_log_submission(event)
                
                assert response['statusCode'] == 500
                body = json.loads(response['body'])
                assert 'Failed to store log entry' in body['error']
    
    def test_log_query_dynamodb_query_failure(self):
        """Log query should return 500 when DynamoDB query fails"""
        event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'valid-key'}
        }
        
        with patch('lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = {'customer_id': 'test-customer'}
            
            with patch('lambda_handler.logs_table') as mock_table:
                mock_table.query.side_effect = Exception("DynamoDB error")
                
                response = handle_log_query(event)
                
                assert response['statusCode'] == 500
                body = json.loads(response['body'])
                assert 'Failed to query logs' in body['error']
    
    def test_auth_dynamodb_query_failure(self):
        """Auth should return 500 when DynamoDB query fails"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'body': json.dumps({
                'email': 'test@example.com',
                'password': 'test123'
            })
        }
        
        with patch('lambda_handler.customers_table') as mock_table:
            mock_table.query.side_effect = Exception("DynamoDB error")
            
            response = handle_auth(event)
            
            assert response['statusCode'] == 500
            body = json.loads(response['body'])
            assert 'error' in body


class TestSESFailureHandling:
    """Test handling of SES failures (should not block log storage)"""
    
    def test_log_submission_ses_failure_does_not_block(self):
        """Log submission should succeed even if SES fails"""
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'valid-key'},
            'body': json.dumps({
                'ai_service': 'openai',
                'endpoint': 'https://api.openai.com/v1/chat/completions',
                'risk_score': 80,  # High risk, will trigger alert
                'data_sources': [],
                'sensitive_data_types': []
            })
        }
        
        with patch('lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = {
                'customer_id': 'test-customer',
                'alert_email': 'test@example.com'
            }
            
            with patch('lambda_handler.logs_table') as mock_table:
                mock_table.put_item.return_value = None
                
                with patch('lambda_handler.ses_client') as mock_ses:
                    mock_ses.send_email.side_effect = Exception("SES error")
                    
                    response = handle_log_submission(event)
                    
                    # Should still return 200 even though SES failed
                    assert response['statusCode'] == 200
                    body = json.loads(response['body'])
                    assert body['message'] == 'Log received'
    
    def test_send_alert_handles_ses_failure(self):
        """send_alert should handle SES failures gracefully"""
        customer = {
            'customer_id': 'test-customer',
            'alert_email': 'test@example.com'
        }
        log_entry = {
            'risk_score': Decimal('80'),
            'ai_service': 'openai',
            'timestamp': 1234567890,
            'sensitive_data_types': ['ssn'],
            'data_sources': ['postgres://db']
        }
        
        with patch('lambda_handler.ses_client') as mock_ses:
            mock_ses.send_email.side_effect = Exception("SES error")
            
            # Should not raise exception
            send_alert(customer, log_entry)


class TestDataConversionErrors:
    """Test handling of data conversion errors"""
    
    def test_log_query_handles_conversion_errors(self):
        """Log query should handle Decimal conversion errors gracefully"""
        event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'valid-key'}
        }
        
        with patch('lambda_handler.validate_api_key') as mock_validate:
            mock_validate.return_value = {'customer_id': 'test-customer'}
            
            with patch('lambda_handler.logs_table') as mock_table:
                # Return items with unconvertible values
                mock_table.query.return_value = {
                    'Items': [
                        {
                            'log_id': 'test-log',
                            'risk_score': 'invalid',  # Not a Decimal
                            'request_size_bytes': 'invalid'
                        }
                    ]
                }
                
                response = handle_log_query(event)
                
                # Should still return 200
                assert response['statusCode'] == 200


class TestAPIKeyValidation:
    """Test API key validation error handling"""
    
    def test_validate_api_key_handles_dynamodb_error(self):
        """validate_api_key should return None on DynamoDB error"""
        with patch('lambda_handler.customers_table') as mock_table:
            mock_table.query.side_effect = Exception("DynamoDB error")
            
            result = validate_api_key('test-key')
            
            assert result is None
    
    def test_validate_api_key_handles_missing_key(self):
        """validate_api_key should return None for missing key"""
        result = validate_api_key(None)
        assert result is None
        
        result = validate_api_key('')
        assert result is None


class TestPasswordVerificationErrors:
    """Test password verification error handling"""
    
    def test_auth_handles_bcrypt_error(self):
        """Auth should return 500 when bcrypt verification fails"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'body': json.dumps({
                'email': 'test@example.com',
                'password': 'test123'
            })
        }
        
        with patch('lambda_handler.customers_table') as mock_table:
            mock_table.query.return_value = {
                'Items': [{
                    'customer_id': 'test-customer',
                    'api_key': 'test-key',
                    'password_hash': 'invalid-hash'  # Will cause bcrypt error
                }]
            }
            
            with patch('lambda_handler.bcrypt') as mock_bcrypt:
                mock_bcrypt.checkpw.side_effect = Exception("bcrypt error")
                
                response = handle_auth(event)
                
                assert response['statusCode'] == 500
                body = json.loads(response['body'])
                assert 'error' in body


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
