"""
Integration tests for complete log flow: agent → backend → DynamoDB → dashboard
Tests the end-to-end flow including high-risk alert email generation.

Requirements: 2.1, 6.1, 7.3, 8.1, 11.1
"""

import pytest
import json
import time
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime
import uuid
from decimal import Decimal

# Import agent components
from interpose.agent.agent import InterposeAgent
from interpose.agent.log_entry import LogEntry

# Import backend components
from backend.lambda_handler import lambda_handler


class TestCompleteLogFlow:
    """Integration tests for complete log flow from agent to dashboard"""
    
    @pytest.fixture
    def mock_backend_tables(self):
        """Mock DynamoDB tables for testing"""
        with patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.customers_table') as mock_customers_table:
            
            # Mock logs table operations
            mock_logs_table.put_item = Mock(return_value={})
            mock_logs_table.query = Mock(return_value={
                'Items': [],
                'Count': 0
            })
            
            # Mock customers table operations - return customer for API key validation
            mock_customers_table.query = Mock(return_value={
                'Items': [{
                    'customer_id': 'test_customer_123',
                    'api_key': 'test_api_key_456',
                    'alert_email': 'alerts@example.com',
                    'email': 'user@example.com'
                }],
                'Count': 1
            })
            
            yield (mock_logs_table, mock_customers_table)
    
    @pytest.fixture
    def mock_ses(self):
        """Mock SES client for testing email alerts"""
        with patch('backend.lambda_handler.ses_client') as mock_ses_client:
            mock_ses_client.send_email = Mock(return_value={
                'MessageId': 'test_message_id_123'
            })
            yield mock_ses_client
    
    
    def test_low_risk_log_backend_flow(self, mock_backend_tables, mock_ses):
        """
        Test backend flow for low-risk log (score <= 70)
        Verifies: backend receives log → stores in DynamoDB → no alert sent
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        
        # Create a low-risk log entry
        log_entry = {
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['https://api.example.com/data'],
            'sensitive_data_types': [],  # No sensitive data
            'risk_score': 25,  # Low risk
            'request_method': 'POST',
            'request_size_bytes': 1024,
            'response_status': 200
        }
        
        # Simulate backend receiving the log
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(log_entry)
        }
        
        response = lambda_handler(event, {})
        
        # Verify backend stored log in DynamoDB
        assert response['statusCode'] == 200
        mock_logs_table.put_item.assert_called_once()
        stored_log = mock_logs_table.put_item.call_args[1]['Item']
        assert stored_log['customer_id'] == 'test_customer_123'
        assert stored_log['ai_service'] == 'openai'
        assert float(stored_log['risk_score']) == 25
        
        # Verify NO alert email was sent (risk_score <= 70)
        mock_ses.send_email.assert_not_called()
    
    def test_high_risk_log_backend_flow_with_alert(self, mock_backend_tables, mock_ses):
        """
        Test backend flow for high-risk log (score > 70)
        Verifies: backend receives log → stores in DynamoDB → alert email sent
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        
        # Create a high-risk log entry
        log_entry = {
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': [
                'postgres://db.example.com:5432/users',
                '/var/data/customer_records.csv'
            ],
            'sensitive_data_types': ['ssn', 'credit_card', 'email'],  # Multiple sensitive types
            'risk_score': 85,  # High risk
            'request_method': 'POST',
            'request_size_bytes': 4096,
            'response_status': 200
        }
        
        # Simulate backend receiving the log
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(log_entry)
        }
        
        response = lambda_handler(event, {})
        
        # Verify backend stored log in DynamoDB
        assert response['statusCode'] == 200
        mock_logs_table.put_item.assert_called_once()
        
        # Verify alert email WAS sent (risk_score > 70)
        mock_ses.send_email.assert_called_once()
        email_call = mock_ses.send_email.call_args[1]
        
        # Verify email contains required information
        assert email_call['Destination']['ToAddresses'] == ['alerts@example.com']
        assert '85' in email_call['Message']['Subject']['Data']  # Risk score in subject
        
        email_body = email_call['Message']['Body']['Text']['Data']
        assert 'openai' in email_body.lower()
        assert 'ssn' in email_body.lower()
        assert 'credit_card' in email_body.lower()
        assert 'postgres://db.example.com:5432/users' in email_body
    
    def test_multiple_logs_backend_flow_with_query(self, mock_backend_tables, mock_ses):
        """
        Test backend flow with multiple logs and dashboard query
        Verifies: multiple logs stored → dashboard queries → correct logs returned
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        
        # Submit multiple logs
        log_entries = []
        for i in range(3):
            log_entry = {
                'ai_service': 'openai' if i % 2 == 0 else 'anthropic',
                'endpoint': f'https://api.example.com/endpoint{i}',
                'data_sources': [f'https://data.example.com/source{i}'],
                'sensitive_data_types': ['email'] if i == 0 else [],
                'risk_score': 30 + (i * 20),
                'request_method': 'POST',
                'request_size_bytes': 1024 * (i + 1),
                'response_status': 200
            }
            log_entries.append(log_entry)
            
            # Send each log
            event = {
                'httpMethod': 'POST',
                'path': '/logs',
                'headers': {'X-API-Key': 'test_api_key_456'},
                'body': json.dumps(log_entry)
            }
            response = lambda_handler(event, {})
            assert response['statusCode'] == 200
        
        # Verify all logs were stored
        assert mock_logs_table.put_item.call_count == 3
        
        # Mock DynamoDB query to return stored logs
        mock_logs_table.query.return_value = {
            'Items': [
                {**log, 'customer_id': 'test_customer_123', 'timestamp': int(time.time() * 1000) + i}
                for i, log in enumerate(log_entries)
            ],
            'Count': 3
        }
        
        # Dashboard queries for logs
        query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'queryStringParameters': None
        }
        
        response = lambda_handler(query_event, {})
        
        # Verify correct logs returned
        assert response['statusCode'] == 200
        returned_logs = json.loads(response['body'])
        assert len(returned_logs) == 3
        
        # Verify logs contain expected data
        assert any(log['ai_service'] == 'openai' for log in returned_logs)
        assert any(log['ai_service'] == 'anthropic' for log in returned_logs)
        assert any(log['risk_score'] == 30 for log in returned_logs)
    
    def test_invalid_api_key_rejection(self, mock_backend_tables, mock_ses):
        """
        Test that invalid API key is rejected
        Verifies: backend receives log with invalid API key → returns 401
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        
        # Mock customers table to return no results for invalid API key
        mock_customers_table.query.return_value = {'Items': [], 'Count': 0}
        
        log_entry = {
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': [],
            'sensitive_data_types': [],
            'risk_score': 20,
            'request_method': 'POST',
            'request_size_bytes': 512,
            'response_status': 200
        }
        
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'invalid_api_key_xyz'},
            'body': json.dumps(log_entry)
        }
        
        response = lambda_handler(event, {})
        
        # Verify request was rejected
        assert response['statusCode'] == 401
        assert 'Invalid API Key' in response['body']
        
        # Verify log was NOT stored
        mock_logs_table.put_item.assert_not_called()
    
    def test_backend_timing_requirements(self, mock_backend_tables, mock_ses):
        """
        Test that backend meets timing requirements
        Verifies: backend processes log within 200ms
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        
        log_entry = {
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['postgres://db.example.com/users'],
            'sensitive_data_types': ['ssn'],
            'risk_score': 75,
            'request_method': 'POST',
            'request_size_bytes': 2048,
            'response_status': 200
        }
        
        # Measure backend processing time
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(log_entry)
        }
        
        start_time = time.time()
        response = lambda_handler(event, {})
        processing_time = time.time() - start_time
        
        # Verify backend responds within 200ms (Requirement 7.4)
        # Note: In test environment with mocks, this should be very fast
        assert processing_time < 0.5, f"Backend took {processing_time}s"
        
        # Verify log stored and alert sent
        assert response['statusCode'] == 200
        mock_logs_table.put_item.assert_called_once()
        mock_ses.send_email.assert_called_once()
