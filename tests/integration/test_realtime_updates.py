"""
Integration tests for real-time updates
Tests that dashboard updates within 2 seconds when new logs arrive,
and system map updates with new nodes.

Requirements: 11.2, 13.6, 7.2
"""

import pytest
import json
import time
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import asyncio

from backend.lambda_handler import lambda_handler
from interpose.agent.agent import InterposeAgent
from interpose.agent.log_entry import LogEntry


class TestRealtimeUpdates:
    """Integration tests for real-time dashboard updates"""
    
    @pytest.fixture
    def mock_backend_tables(self):
        """Mock DynamoDB tables with real-time log storage"""
        with patch('backend.lambda_handler.logs_table') as mock_logs_table, \
             patch('backend.lambda_handler.customers_table') as mock_customers_table:
            
            # Store logs in memory to simulate real-time updates
            self.stored_logs = []
            self.customer = {
                'customer_id': 'test_customer_123',
                'api_key': 'test_api_key_456',
                'alert_email': 'alerts@example.com',
                'email': 'test@example.com'
            }
            
            def mock_put_item(Item):
                """Store log and simulate real-time availability"""
                self.stored_logs.append(Item)
                return {}
            
            def mock_logs_query(KeyConditionExpression=None, ExpressionAttributeValues=None, **kwargs):
                """Return all stored logs for customer"""
                customer_id = ExpressionAttributeValues.get(':cid')
                if customer_id:
                    # Filter logs by customer_id
                    customer_logs = [
                        log for log in self.stored_logs 
                        if log.get('customer_id') == customer_id
                    ]
                    # Sort by timestamp descending
                    customer_logs.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
                    return {'Items': customer_logs, 'Count': len(customer_logs)}
                return {'Items': [], 'Count': 0}
            
            def mock_customers_query(IndexName=None, KeyConditionExpression=None, ExpressionAttributeValues=None, **kwargs):
                """Mock customer validation"""
                if IndexName == 'ApiKeyIndex':
                    api_key = ExpressionAttributeValues.get(':key')
                    if api_key == self.customer['api_key']:
                        return {'Items': [self.customer], 'Count': 1}
                return {'Items': [], 'Count': 0}
            
            mock_logs_table.put_item = Mock(side_effect=mock_put_item)
            mock_logs_table.query = Mock(side_effect=mock_logs_query)
            mock_customers_table.query = Mock(side_effect=mock_customers_query)
            
            yield (mock_logs_table, mock_customers_table)
    
    @pytest.fixture
    def mock_ses(self):
        """Mock SES client"""
        with patch('backend.lambda_handler.ses_client') as mock_ses_client:
            mock_ses_client.send_email = Mock(return_value={'MessageId': 'test_msg_id'})
            yield mock_ses_client
    
    def test_dashboard_updates_within_2_seconds(self, mock_backend_tables, mock_ses):
        """
        Test that dashboard receives new log within 2 seconds of submission
        Verifies: agent submits log → backend stores → dashboard queries → log appears < 2s
        Requirement 11.2
        """
        mock_logs_table, mock_customers_table = mock_backend_tables
        # Step 1: Dashboard queries initially (no logs)
        initial_query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'queryStringParameters': None
        }
        
        initial_response = lambda_handler(initial_query_event, {})
        assert initial_response['statusCode'] == 200
        initial_logs = json.loads(initial_response['body'])
        initial_count = len(initial_logs)
        
        # Step 2: Record time and submit new log
        submission_time = time.time()
        
        new_log = {
            'customer_id': 'test_customer_123',
            'timestamp': int(submission_time * 1000),
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['https://api.example.com/data'],
            'sensitive_data_types': ['email'],
            'risk_score': 45,
            'request_method': 'POST',
            'request_size_bytes': 2048,
            'response_status': 200
        }
        
        submit_event = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(new_log)
        }
        
        submit_response = lambda_handler(submit_event, {})
        assert submit_response['statusCode'] == 200
        
        # Step 3: Dashboard queries again (simulating polling)
        query_time = time.time()
        
        updated_query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'queryStringParameters': None
        }
        
        updated_response = lambda_handler(updated_query_event, {})
        assert updated_response['statusCode'] == 200
        
        updated_logs = json.loads(updated_response['body'])
        
        # Step 4: Verify new log appears in results
        assert len(updated_logs) == initial_count + 1
        
        # Find the new log
        new_log_found = any(
            log['ai_service'] == 'openai' and 
            log['risk_score'] == 45 and
            abs(log['timestamp'] - new_log['timestamp']) < 1000  # Within 1 second
            for log in updated_logs
        )
        assert new_log_found, "New log should appear in query results"
        
        # Step 5: Verify latency is under 2 seconds
        latency = query_time - submission_time
        assert latency < 2.0, f"Dashboard update latency {latency}s exceeds 2 second requirement"
    
    def test_multiple_rapid_log_submissions(self, mock_backend_tables, mock_ses):
        """
        Test dashboard updates correctly with multiple rapid log submissions
        Verifies: multiple logs submitted quickly → all appear in dashboard query
        Requirement 11.2
        """
        # Submit 5 logs rapidly
        submitted_logs = []
        start_time = time.time()
        
        for i in range(5):
            log = {
                'customer_id': 'test_customer_123',
                'timestamp': int((start_time + i * 0.1) * 1000),
                'ai_service': ['openai', 'anthropic', 'bedrock', 'local', 'openai'][i],
                'endpoint': f'https://api.example.com/endpoint{i}',
                'data_sources': [f'https://data.example.com/source{i}'],
                'sensitive_data_types': ['email'] if i % 2 == 0 else [],
                'risk_score': 20 + (i * 10),
                'request_method': 'POST',
                'request_size_bytes': 1024 * (i + 1),
                'response_status': 200
            }
            submitted_logs.append(log)
            
            event = {
                'httpMethod': 'POST',
                'path': '/logs',
                'headers': {'X-API-Key': 'test_api_key_456'},
                'body': json.dumps(log)
            }
            
            response = lambda_handler(event, {})
            assert response['statusCode'] == 200
        
        # Query logs
        query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'queryStringParameters': None
        }
        
        query_response = lambda_handler(query_event, {})
        assert query_response['statusCode'] == 200
        
        retrieved_logs = json.loads(query_response['body'])
        
        # Verify all logs are present
        assert len(retrieved_logs) >= 5
        
        # Verify logs are in descending chronological order (most recent first)
        timestamps = [log['timestamp'] for log in retrieved_logs[:5]]
        assert timestamps == sorted(timestamps, reverse=True), "Logs should be in descending order"
    
    def test_system_map_updates_with_new_nodes(self, mock_backend_tables, mock_ses):
        """
        Test that system map data updates when new AI services and data sources appear
        Verifies: new log with new AI service → query returns updated data → system map can render new nodes
        Requirement 13.6
        """
        # Step 1: Submit initial log with OpenAI
        initial_log = {
            'customer_id': 'test_customer_123',
            'timestamp': int(time.time() * 1000),
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['postgres://db.example.com/users'],
            'sensitive_data_types': [],
            'risk_score': 30,
            'request_method': 'POST',
            'request_size_bytes': 1024,
            'response_status': 200
        }
        
        event1 = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(initial_log)
        }
        
        lambda_handler(event1, {})
        
        # Query and extract unique AI services and data sources
        query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'queryStringParameters': None
        }
        
        response1 = lambda_handler(query_event, {})
        logs1 = json.loads(response1['body'])
        
        ai_services_1 = set(log['ai_service'] for log in logs1)
        data_sources_1 = set()
        for log in logs1:
            data_sources_1.update(log['data_sources'])
        
        assert 'openai' in ai_services_1
        assert 'postgres://db.example.com/users' in data_sources_1
        
        # Step 2: Submit new log with different AI service and data source
        new_log = {
            'customer_id': 'test_customer_123',
            'timestamp': int(time.time() * 1000) + 1000,
            'ai_service': 'anthropic',  # NEW AI service
            'endpoint': 'https://api.anthropic.com/v1/messages',
            'data_sources': [
                '/var/data/customer_records.csv',  # NEW data source
                'https://api.newservice.com/data'   # NEW data source
            ],
            'sensitive_data_types': ['email'],
            'risk_score': 50,
            'request_method': 'POST',
            'request_size_bytes': 2048,
            'response_status': 200
        }
        
        event2 = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(new_log)
        }
        
        lambda_handler(event2, {})
        
        # Step 3: Query again and verify new nodes appear
        response2 = lambda_handler(query_event, {})
        logs2 = json.loads(response2['body'])
        
        ai_services_2 = set(log['ai_service'] for log in logs2)
        data_sources_2 = set()
        for log in logs2:
            data_sources_2.update(log['data_sources'])
        
        # Verify new AI service appears
        assert 'anthropic' in ai_services_2
        assert 'openai' in ai_services_2  # Old service still present
        
        # Verify new data sources appear
        assert '/var/data/customer_records.csv' in data_sources_2
        assert 'https://api.newservice.com/data' in data_sources_2
        assert 'postgres://db.example.com/users' in data_sources_2  # Old source still present
        
        # Verify system map would have correct node count
        # System map should show: 1 system node + 2 AI service nodes + 3 data source nodes = 6 nodes
        total_unique_services = len(ai_services_2)
        total_unique_sources = len(data_sources_2)
        
        assert total_unique_services == 2, "Should have 2 unique AI services"
        assert total_unique_sources == 3, "Should have 3 unique data sources"
    
    def test_system_map_edge_updates(self, mock_backend_tables, mock_ses):
        """
        Test that system map edges (connections) update correctly
        Verifies: new log creates new connections → edges appear in system map data
        Requirement 13.6
        """
        # Submit logs that create specific connections
        logs_to_submit = [
            {
                'customer_id': 'test_customer_123',
                'timestamp': int(time.time() * 1000),
                'ai_service': 'openai',
                'endpoint': 'https://api.openai.com/v1/chat/completions',
                'data_sources': ['postgres://db.example.com/users'],
                'sensitive_data_types': [],
                'risk_score': 25,
                'request_method': 'POST',
                'request_size_bytes': 1024,
                'response_status': 200
            },
            {
                'customer_id': 'test_customer_123',
                'timestamp': int(time.time() * 1000) + 1000,
                'ai_service': 'openai',
                'endpoint': 'https://api.openai.com/v1/chat/completions',
                'data_sources': ['/var/data/files.csv'],  # Same service, different source
                'sensitive_data_types': [],
                'risk_score': 30,
                'request_method': 'POST',
                'request_size_bytes': 1024,
                'response_status': 200
            },
            {
                'customer_id': 'test_customer_123',
                'timestamp': int(time.time() * 1000) + 2000,
                'ai_service': 'anthropic',
                'endpoint': 'https://api.anthropic.com/v1/messages',
                'data_sources': ['postgres://db.example.com/users'],  # Different service, same source
                'sensitive_data_types': [],
                'risk_score': 35,
                'request_method': 'POST',
                'request_size_bytes': 2048,
                'response_status': 200
            }
        ]
        
        # Submit all logs
        for log in logs_to_submit:
            event = {
                'httpMethod': 'POST',
                'path': '/logs',
                'headers': {'X-API-Key': 'test_api_key_456'},
                'body': json.dumps(log)
            }
            response = lambda_handler(event, {})
            assert response['statusCode'] == 200
        
        # Query logs
        query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'queryStringParameters': None
        }
        
        response = lambda_handler(query_event, {})
        logs = json.loads(response['body'])
        
        # Build edge set (connections) from logs
        edges = set()
        for log in logs:
            ai_service = log['ai_service']
            for data_source in log['data_sources']:
                # Edge from system to AI service
                edges.add(('system', ai_service))
                # Edge from AI service to data source
                edges.add((ai_service, data_source))
        
        # Verify expected edges exist
        expected_edges = {
            ('system', 'openai'),
            ('system', 'anthropic'),
            ('openai', 'postgres://db.example.com/users'),
            ('openai', '/var/data/files.csv'),
            ('anthropic', 'postgres://db.example.com/users')
        }
        
        assert expected_edges.issubset(edges), "All expected edges should be present"
        
        # Verify edge count
        assert len(edges) >= 5, "Should have at least 5 edges in system map"
    
    def test_polling_simulation_real_time_behavior(self, mock_backend_tables, mock_ses):
        """
        Test simulated polling behavior (dashboard queries every 2 seconds)
        Verifies: logs submitted between polls → appear in next poll
        Requirement 11.2
        """
        poll_interval = 2.0  # Dashboard polls every 2 seconds
        
        # Initial poll (no logs)
        query_event = {
            'httpMethod': 'GET',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'queryStringParameters': None
        }
        
        response_poll1 = lambda_handler(query_event, {})
        logs_poll1 = json.loads(response_poll1['body'])
        count_poll1 = len(logs_poll1)
        
        # Submit log after first poll
        log1 = {
            'customer_id': 'test_customer_123',
            'timestamp': int(time.time() * 1000),
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['https://api.example.com/data1'],
            'sensitive_data_types': [],
            'risk_score': 20,
            'request_method': 'POST',
            'request_size_bytes': 1024,
            'response_status': 200
        }
        
        event1 = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(log1)
        }
        lambda_handler(event1, {})
        
        # Second poll (should see new log)
        response_poll2 = lambda_handler(query_event, {})
        logs_poll2 = json.loads(response_poll2['body'])
        count_poll2 = len(logs_poll2)
        
        assert count_poll2 == count_poll1 + 1, "Second poll should show 1 new log"
        
        # Submit another log
        log2 = {
            'customer_id': 'test_customer_123',
            'timestamp': int(time.time() * 1000) + 1000,
            'ai_service': 'anthropic',
            'endpoint': 'https://api.anthropic.com/v1/messages',
            'data_sources': ['postgres://db.example.com/users'],
            'sensitive_data_types': ['email'],
            'risk_score': 55,
            'request_method': 'POST',
            'request_size_bytes': 2048,
            'response_status': 200
        }
        
        event2 = {
            'httpMethod': 'POST',
            'path': '/logs',
            'headers': {'X-API-Key': 'test_api_key_456'},
            'body': json.dumps(log2)
        }
        lambda_handler(event2, {})
        
        # Third poll (should see both logs)
        response_poll3 = lambda_handler(query_event, {})
        logs_poll3 = json.loads(response_poll3['body'])
        count_poll3 = len(logs_poll3)
        
        assert count_poll3 == count_poll1 + 2, "Third poll should show 2 new logs total"
        
        # Verify most recent log appears first (descending order)
        assert logs_poll3[0]['ai_service'] == 'anthropic', "Most recent log should be first"
        assert logs_poll3[1]['ai_service'] == 'openai', "Older log should be second"
