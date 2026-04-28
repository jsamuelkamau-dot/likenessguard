"""
Integration tests for authentication and authorization flows
Tests login flow, customer data isolation, and invalid API key rejection.

Requirements: 10.1, 10.2, 10.4, 7.2
"""

import pytest
import json
import bcrypt
from unittest.mock import Mock, patch
from datetime import datetime

from backend.lambda_handler import lambda_handler


class TestAuthenticationAuthorization:
    """Integration tests for authentication and authorization"""
    
    @pytest.fixture
    def mock_backend_tables(self):
        """Mock DynamoDB tables with customer data"""
        with patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.customers_table') as mock_customers_table:
            
            # Store customer data for testing
            self.customers = {
                'customer1@example.com': {
                    'customer_id': 'cust_001',
                    'email': 'customer1@example.com',
                    'password_hash': bcrypt.hashpw('password123'.encode(), bcrypt.gensalt()).decode(),
                    'api_key': 'api_key_customer1',
                    'alert_email': 'alerts1@example.com',
                    'company_name': 'Company One'
                },
                'customer2@example.com': {
                    'customer_id': 'cust_002',
                    'email': 'customer2@example.com',
                    'password_hash': bcrypt.hashpw('password456'.encode(), bcrypt.gensalt()).decode(),
                    'api_key': 'api_key_customer2',
                    'alert_email': 'alerts2@example.com',
                    'company_name': 'Company Two'
                }
            }
            
            # Store logs for each customer
            self.logs = {
                'cust_001': [
                    {
                        'log_id': 'log_001_1',
                        'customer_id': 'cust_001',
                        'timestamp': 1704067200000,
                        'ai_service': 'openai',
                        'endpoint': 'https://api.openai.com/v1/chat/completions',
                        'data_sources': ['https://api.example.com/data1'],
                        'sensitive_data_types': ['email'],
                        'risk_score': 35,
                        'request_method': 'POST',
                        'request_size_bytes': 1024,
                        'response_status': 200
                    },
                    {
                        'log_id': 'log_001_2',
                        'customer_id': 'cust_001',
                        'timestamp': 1704067300000,
                        'ai_service': 'anthropic',
                        'endpoint': 'https://api.anthropic.com/v1/messages',
                        'data_sources': ['postgres://db.example.com/users'],
                        'sensitive_data_types': [],
                        'risk_score': 20,
                        'request_method': 'POST',
                        'request_size_bytes': 2048,
                        'response_status': 200
                    }
                ],
                'cust_002': [
                    {
                        'log_id': 'log_002_1',
                        'customer_id': 'cust_002',
                        'timestamp': 1704067400000,
                        'ai_service': 'bedrock',
                        'endpoint': 'https://bedrock-runtime.us-east-1.amazonaws.com',
                        'data_sources': ['/var/data/files.csv'],
                        'sensitive_data_types': ['ssn'],
                        'risk_score': 65,
                        'request_method': 'POST',
                        'request_size_bytes': 3072,
                        'response_status': 200
                    }
                ]
            }
            
            def mock_customers_query(IndexName=None, KeyConditionExpression=None, ExpressionAttributeValues=None, **kwargs):
                """Mock customers table query operation"""
                if IndexName == 'EmailIndex':
                    email = ExpressionAttributeValues.get(':email')
                    if email in self.customers:
                        return {'Items': [self.customers[email]], 'Count': 1}
                    return {'Items': [], 'Count': 0}
                
                if IndexName == 'ApiKeyIndex':
                    api_key = ExpressionAttributeValues.get(':key')
                    for customer in self.customers.values():
                        if customer['api_key'] == api_key:
                            return {'Items': [customer], 'Count': 1}
                    return {'Items': [], 'Count': 0}
                
                return {'Items': [], 'Count': 0}
            
            def mock_logs_query(KeyConditionExpression=None, ExpressionAttributeValues=None, **kwargs):
                """Mock logs table query operation"""
                customer_id = ExpressionAttributeValues.get(':cid')
                if customer_id in self.logs:
                    return {'Items': self.logs[customer_id], 'Count': len(self.logs[customer_id])}
                return {'Items': [], 'Count': 0}
            
            def mock_put_item(Item):
                """Mock logs table put_item operation"""
                customer_id = Item['customer_id']
                if customer_id not in self.logs:
                    self.logs[customer_id] = []
                self.logs[customer_id].append(Item)
                return {}
            
            mock_customers_table.query = Mock(side_effect=mock_customers_query)
            mock_logs_table.query = Mock(side_effect=mock_logs_query)
            mock_logs_table.put_item = Mock(side_effect=mock_put_item)
            
            yield (mock_logs_table, mock_customers_table)
    
    @pytest.fixture
    def mock_ses(self):
        """Mock SES client"""
        with patch('backend.lambda_handler.ses_client') as mock_ses_client:
            mock_ses_client.send_email = Mock(return_value={'MessageId': 'test_msg_id'})
            yield mock_ses_client
    
    def test_successful_login_flow(self, mock_backend_tables, mock_ses):
        """
        Test successful login with valid credentials
        Verifies: user provides email/password → backend validates → returns API key
        Requirement 10.1, 10.2
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        # Step 1: User submits login credentials
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'headers': {},
            'body': json.dumps({
                'email': 'customer1@example.com',
                'password': 'password123'
            })
        }
        
        # Step 2: Backend processes authentication
        response = lambda_handler(event, {})
        
        # Step 3: Verify successful authentication
        assert response['statusCode'] == 200
        
        response_body = json.loads(response['body'])
        assert 'api_key' in response_body
        assert 'customer_id' in response_body
        assert response_body['api_key'] == 'api_key_customer1'
        assert response_body['customer_id'] == 'cust_001'
    
    def test_failed_login_invalid_password(self, mock_backend_tables, mock_ses):
        """
        Test login failure with invalid password
        Verifies: user provides wrong password → backend rejects → returns 401
        Requirement 10.2, 10.3
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'headers': {},
            'body': json.dumps({
                'email': 'customer1@example.com',
                'password': 'wrong_password'
            })
        }
        
        response = lambda_handler(event, {})
        
        # Verify authentication failed
        assert response['statusCode'] == 401
        assert 'Invalid credentials' in response['body']
    
    def test_failed_login_nonexistent_email(self, mock_backend_tables, mock_ses):
        """
        Test login failure with non-existent email
        Verifies: user provides unknown email → backend rejects → returns 401
        Requirement 10.2, 10.3
        """
        event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'headers': {},
            'body': json.dumps({
                'email': 'nonexistent@example.com',
                'password': 'password123'
            })
        }
        
        response = lambda_handler(event, {})
        
        # Verify authentication failed
        assert response['statusCode'] == 401
        assert 'Invalid credentials' in response['body']
    
    def test_customer_data_isolation(self, mock_backend_tables, mock_ses):
        """
        Test that customers can only access their own logs
        Verifies: customer1 queries logs → only receives customer1's logs (not customer2's)
        Requirement 10.4
        """
        # Step 1: Customer 1 queries their logs
        event_customer1 = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'api_key_customer1'},
            'queryStringParameters': None
        }
        
        response1 = lambda_handler(event_customer1, {})
        
        # Step 2: Verify customer 1 only sees their logs
        assert response1['statusCode'] == 200
        logs1 = json.loads(response1['body'])
        assert len(logs1) == 2  # Customer 1 has 2 logs
        assert all(log['customer_id'] == 'cust_001' for log in logs1)
        assert any(log['ai_service'] == 'openai' for log in logs1)
        assert any(log['ai_service'] == 'anthropic' for log in logs1)
        
        # Step 3: Customer 2 queries their logs
        event_customer2 = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'api_key_customer2'},
            'queryStringParameters': None
        }
        
        response2 = lambda_handler(event_customer2, {})
        
        # Step 4: Verify customer 2 only sees their logs
        assert response2['statusCode'] == 200
        logs2 = json.loads(response2['body'])
        assert len(logs2) == 1  # Customer 2 has 1 log
        assert all(log['customer_id'] == 'cust_002' for log in logs2)
        assert logs2[0]['ai_service'] == 'bedrock'
        
        # Step 5: Verify no overlap between customer logs
        log_ids_1 = {log['log_id'] for log in logs1}
        log_ids_2 = {log['log_id'] for log in logs2}
        assert len(log_ids_1.intersection(log_ids_2)) == 0, "Customers should not see each other's logs"
    
    def test_invalid_api_key_rejection_log_submission(self, mock_backend_tables, mock_ses):
        """
        Test that invalid API key is rejected for log submission
        Verifies: agent sends log with invalid API key → backend rejects → returns 401
        Requirement 7.2
        """
        event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'invalid_api_key_xyz'},
            'body': json.dumps({
                'ai_service': 'openai',
                'endpoint': 'https://api.openai.com/v1/chat/completions',
                'data_sources': [],
                'sensitive_data_types': [],
                'risk_score': 10,
                'request_method': 'POST',
                'request_size_bytes': 512,
                'response_status': 200
            })
        }
        
        response = lambda_handler(event, {})
        
        # Verify request was rejected
        assert response['statusCode'] == 401
        assert 'Invalid API Key' in response['body']
        
        # Verify log was NOT stored
        mock_logs_table, mock_customers_table = mock_backend_tables
        mock_logs_table.put_item.assert_not_called()
    
    def test_invalid_api_key_rejection_log_query(self, mock_backend_tables, mock_ses):
        """
        Test that invalid API key is rejected for log query
        Verifies: dashboard queries with invalid API key → backend rejects → returns 401
        Requirement 7.2, 10.4
        """
        event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'invalid_api_key_xyz'},
            'queryStringParameters': None
        }
        
        response = lambda_handler(event, {})
        
        # Verify request was rejected
        assert response['statusCode'] == 401
        assert 'Invalid API Key' in response['body']
    
    def test_missing_api_key_rejection(self, mock_backend_tables, mock_ses):
        """
        Test that missing API key is rejected
        Verifies: request without API key header → backend rejects → returns 401
        Requirement 7.2
        """
        # Test log submission without API key
        event_submit = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {},  # No X-API-Key header
            'body': json.dumps({
                'ai_service': 'openai',
                'endpoint': 'https://api.openai.com/v1/chat/completions',
                'data_sources': [],
                'sensitive_data_types': [],
                'risk_score': 10,
                'request_method': 'POST',
                'request_size_bytes': 512,
                'response_status': 200
            })
        }
        
        response_submit = lambda_handler(event_submit, {})
        assert response_submit['statusCode'] == 401
        
        # Test log query without API key
        event_query = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {},  # No X-API-Key header
            'queryStringParameters': None
        }
        
        response_query = lambda_handler(event_query, {})
        assert response_query['statusCode'] == 401
    
    def test_complete_auth_flow_with_log_access(self, mock_backend_tables, mock_ses):
        """
        Test complete authentication flow followed by log access
        Verifies: login → receive API key → use API key to query logs → success
        Requirement 10.1, 10.2, 10.4
        """
        # Step 1: User logs in
        auth_event = {
            'httpMethod': 'POST',
            'path': '/auth',
            'headers': {},
            'body': json.dumps({
                'email': 'customer1@example.com',
                'password': 'password123'
            })
        }
        
        auth_response = lambda_handler(auth_event, {})
        assert auth_response['statusCode'] == 200
        
        # Step 2: Extract API key from auth response
        auth_data = json.loads(auth_response['body'])
        api_key = auth_data['api_key']
        customer_id = auth_data['customer_id']
        
        # Step 3: Use API key to query logs
        query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': api_key},
            'queryStringParameters': None
        }
        
        query_response = lambda_handler(query_event, {})
        assert query_response['statusCode'] == 200
        
        # Step 4: Verify logs belong to authenticated customer
        logs = json.loads(query_response['body'])
        assert len(logs) > 0
        assert all(log['customer_id'] == customer_id for log in logs)
    
    def test_api_key_cannot_access_other_customer_data(self, mock_backend_tables, mock_ses):
        """
        Test that API key is tied to specific customer and cannot access other customer's data
        Verifies: customer1's API key cannot retrieve customer2's logs
        Requirement 10.4
        """
        # Customer 1 tries to query logs (should only see their own)
        event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'api_key_customer1'},
            'queryStringParameters': None
        }
        
        response = lambda_handler(event, {})
        assert response['statusCode'] == 200
        
        logs = json.loads(response['body'])
        
        # Verify no logs from customer 2 are returned
        assert all(log['customer_id'] == 'cust_001' for log in logs)
        assert not any(log['customer_id'] == 'cust_002' for log in logs)
        assert not any(log['log_id'] == 'log_002_1' for log in logs)
