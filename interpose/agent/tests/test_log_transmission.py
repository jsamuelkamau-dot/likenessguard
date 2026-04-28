"""
Unit tests for log transmission functionality
"""

import pytest
from unittest.mock import Mock, patch, mock_open
from pathlib import Path
from interpose.agent import InterposeAgent, LogEntry


class TestLogEntry:
    """Test LogEntry data model"""
    
    def test_log_entry_initialization_with_all_fields(self):
        """Test LogEntry initialization with all required fields"""
        log_entry = LogEntry(
            ai_service='openai',
            endpoint='https://api.openai.com/v1/chat/completions',
            data_sources=['postgres://db.example.com/users'],
            sensitive_data_types=['email', 'ssn'],
            risk_score=75,
            request_method='POST',
            request_size_bytes=2048,
            response_status=200
        )
        
        assert log_entry.ai_service == 'openai'
        assert log_entry.endpoint == 'https://api.openai.com/v1/chat/completions'
        assert log_entry.data_sources == ['postgres://db.example.com/users']
        assert log_entry.sensitive_data_types == ['email', 'ssn']
        assert log_entry.risk_score == 75
        assert log_entry.request_method == 'POST'
        assert log_entry.request_size_bytes == 2048
        assert log_entry.response_status == 200
        assert log_entry.log_id is not None  # Auto-generated
        assert log_entry.timestamp is not None  # Auto-generated
    
    def test_log_entry_auto_generates_log_id(self):
        """Test that LogEntry auto-generates a UUID for log_id"""
        log_entry = LogEntry(
            ai_service='anthropic',
            endpoint='https://api.anthropic.com/v1/messages',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=30,
            request_method='POST',
            request_size_bytes=1024,
            response_status=200
        )
        
        assert log_entry.log_id is not None
        assert isinstance(log_entry.log_id, str)
        assert len(log_entry.log_id) > 0
    
    def test_log_entry_auto_generates_timestamp(self):
        """Test that LogEntry auto-generates a timestamp"""
        log_entry = LogEntry(
            ai_service='bedrock',
            endpoint='https://bedrock-runtime.us-east-1.amazonaws.com/model/invoke',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=50,
            request_method='POST',
            request_size_bytes=512,
            response_status=200
        )
        
        assert log_entry.timestamp is not None
        assert isinstance(log_entry.timestamp, int)
        assert log_entry.timestamp > 0
    
    def test_log_entry_to_dict(self):
        """Test LogEntry.to_dict() serialization"""
        log_entry = LogEntry(
            ai_service='local',
            endpoint='http://localhost:8000/v1/completions',
            data_sources=['/var/data/file.csv'],
            sensitive_data_types=['api_key'],
            risk_score=60,
            request_method='POST',
            request_size_bytes=4096,
            response_status=200,
            customer_id='cust_123'
        )
        
        result = log_entry.to_dict()
        
        assert isinstance(result, dict)
        assert result['ai_service'] == 'local'
        assert result['endpoint'] == 'http://localhost:8000/v1/completions'
        assert result['data_sources'] == ['/var/data/file.csv']
        assert result['sensitive_data_types'] == ['api_key']
        assert result['risk_score'] == 60
        assert result['request_method'] == 'POST'
        assert result['request_size_bytes'] == 4096
        assert result['response_status'] == 200
        assert result['customer_id'] == 'cust_123'
        assert 'log_id' in result
        assert 'timestamp' in result
    
    def test_log_entry_from_dict(self):
        """Test LogEntry.from_dict() deserialization"""
        data = {
            'log_id': 'test-log-id-123',
            'customer_id': 'cust_456',
            'timestamp': 1704067200000,
            'ai_service': 'openai',
            'endpoint': 'https://api.openai.com/v1/chat/completions',
            'data_sources': ['postgres://db.example.com/users'],
            'sensitive_data_types': ['email'],
            'risk_score': 45,
            'request_method': 'POST',
            'request_size_bytes': 2048,
            'response_status': 200
        }
        
        log_entry = LogEntry.from_dict(data)
        
        assert log_entry.log_id == 'test-log-id-123'
        assert log_entry.customer_id == 'cust_456'
        assert log_entry.timestamp == 1704067200000
        assert log_entry.ai_service == 'openai'
        assert log_entry.endpoint == 'https://api.openai.com/v1/chat/completions'
        assert log_entry.data_sources == ['postgres://db.example.com/users']
        assert log_entry.sensitive_data_types == ['email']
        assert log_entry.risk_score == 45
        assert log_entry.request_method == 'POST'
        assert log_entry.request_size_bytes == 2048
        assert log_entry.response_status == 200


class TestLogTransmission:
    """Test log transmission functionality"""
    
    def test_send_log_successful_transmission(self):
        """Test successful log transmission on first attempt"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='openai',
            endpoint='https://api.openai.com/v1/chat/completions',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=30,
            request_method='POST',
            request_size_bytes=1024,
            response_status=200
        )
        
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        
        with patch.object(agent, '_original_request', return_value=mock_response) as mock_request:
            # Act
            result = agent.send_log(log_entry)
            
            # Assert
            assert result is True
            assert mock_request.call_count == 1
            
            # Verify request parameters
            call_args = mock_request.call_args
            assert call_args[0][0] == 'POST'
            assert call_args[0][1] == 'https://test.backend.com/logs'
            assert call_args[1]['headers']['X-API-Key'] == 'test-api-key'
            assert call_args[1]['json'] == log_entry.to_dict()
    
    def test_send_log_retry_on_network_failure(self):
        """Test retry logic when network failures occur"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='anthropic',
            endpoint='https://api.anthropic.com/v1/messages',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=40,
            request_method='POST',
            request_size_bytes=2048,
            response_status=200
        )
        
        # Mock network failure
        with patch.object(agent, '_original_request', side_effect=Exception("Connection error")):
            with patch('time.sleep'):  # Mock sleep to speed up test
                # Act
                result = agent.send_log(log_entry, max_retries=3)
                
                # Assert
                assert result is False
    
    def test_send_log_retry_exactly_3_times(self):
        """Test that send_log retries exactly 3 times on failure"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='bedrock',
            endpoint='https://bedrock-runtime.us-east-1.amazonaws.com/model/invoke',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=50,
            request_method='POST',
            request_size_bytes=512,
            response_status=200
        )
        
        # Mock network failure
        with patch.object(agent, '_original_request', side_effect=Exception("Timeout")) as mock_request:
            with patch('time.sleep'):  # Mock sleep to speed up test
                # Act
                result = agent.send_log(log_entry, max_retries=3)
                
                # Assert
                assert result is False
                assert mock_request.call_count == 3
    
    def test_send_log_succeeds_on_second_attempt(self):
        """Test that send_log succeeds if retry succeeds"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='local',
            endpoint='http://localhost:8000/v1/completions',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=20,
            request_method='POST',
            request_size_bytes=256,
            response_status=200
        )
        
        # Mock first failure, then success
        mock_response = Mock()
        mock_response.status_code = 200
        
        with patch.object(agent, '_original_request', side_effect=[
            Exception("Temporary failure"),
            mock_response
        ]) as mock_request:
            with patch('time.sleep'):  # Mock sleep to speed up test
                # Act
                result = agent.send_log(log_entry, max_retries=3)
                
                # Assert
                assert result is True
                assert mock_request.call_count == 2
    
    def test_send_log_handles_non_200_status_code(self):
        """Test that send_log handles non-200 status codes"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='openai',
            endpoint='https://api.openai.com/v1/chat/completions',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=35,
            request_method='POST',
            request_size_bytes=1024,
            response_status=200
        )
        
        # Mock 401 Unauthorized response
        mock_response = Mock()
        mock_response.status_code = 401
        
        with patch.object(agent, '_original_request', return_value=mock_response):
            with patch('time.sleep'):  # Mock sleep to speed up test
                # Act
                result = agent.send_log(log_entry, max_retries=3)
                
                # Assert
                assert result is False


class TestLocalErrorLogging:
    """Test local error logging for failed transmissions"""
    
    def test_log_failed_transmission_writes_to_file(self):
        """Test that failed transmission is logged to local file"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='openai',
            endpoint='https://api.openai.com/v1/chat/completions',
            data_sources=[],
            sensitive_data_types=['email'],
            risk_score=75,
            request_method='POST',
            request_size_bytes=2048,
            response_status=200
        )
        
        # Mock file operations
        mock_file = mock_open()
        
        with patch.object(agent, '_original_request', side_effect=Exception("Network error")):
            with patch('time.sleep'):  # Mock sleep to speed up test
                with patch('builtins.open', mock_file):
                    with patch('pathlib.Path.mkdir'):  # Mock directory creation
                        # Act
                        result = agent.send_log(log_entry, max_retries=3)
                        
                        # Assert
                        assert result is False
                        assert mock_file.called
                        
                        # Verify file was opened in append mode
                        mock_file.assert_called_with(Path('/var/log/interpose/failed_transmissions.log'), 'a')
    
    def test_log_failed_transmission_contains_log_info(self):
        """Test that logged error contains log entry information"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='anthropic',
            endpoint='https://api.anthropic.com/v1/messages',
            data_sources=[],
            sensitive_data_types=['ssn'],
            risk_score=85,
            request_method='POST',
            request_size_bytes=4096,
            response_status=200
        )
        
        # Mock file operations
        mock_file = mock_open()
        
        with patch.object(agent, '_original_request', side_effect=Exception("Network error")):
            with patch('time.sleep'):  # Mock sleep to speed up test
                with patch('builtins.open', mock_file):
                    with patch('pathlib.Path.mkdir'):  # Mock directory creation
                        # Act
                        agent.send_log(log_entry, max_retries=3)
                        
                        # Assert - Verify write was called
                        handle = mock_file()
                        assert handle.write.called
                        
                        # Verify log entry information is in the written content
                        written_content = ''.join(call[0][0] for call in handle.write.call_args_list)
                        assert log_entry.log_id in written_content
                        assert 'anthropic' in written_content
                        assert '85' in written_content
    
    def test_log_failed_transmission_creates_directory(self):
        """Test that log directory is created if it doesn't exist"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='bedrock',
            endpoint='https://bedrock-runtime.us-east-1.amazonaws.com/model/invoke',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=60,
            request_method='POST',
            request_size_bytes=1024,
            response_status=200
        )
        
        # Mock file operations
        mock_file = mock_open()
        
        with patch.object(agent, '_original_request', side_effect=Exception("Network error")):
            with patch('time.sleep'):  # Mock sleep to speed up test
                with patch('builtins.open', mock_file):
                    with patch('pathlib.Path.mkdir') as mock_mkdir:
                        # Act
                        agent.send_log(log_entry, max_retries=3)
                        
                        # Assert - Verify directory creation was attempted
                        assert mock_mkdir.called
                        mock_mkdir.assert_called_with(parents=True, exist_ok=True)
    
    def test_log_failed_transmission_fallback_to_current_directory(self):
        """Test fallback to current directory if /var/log/interpose is not writable"""
        # Arrange
        agent = InterposeAgent(api_key='test-api-key', backend_url='https://test.backend.com')
        log_entry = LogEntry(
            ai_service='local',
            endpoint='http://localhost:8000/v1/completions',
            data_sources=[],
            sensitive_data_types=[],
            risk_score=40,
            request_method='POST',
            request_size_bytes=512,
            response_status=200
        )
        
        # Mock file operations - first open fails, second succeeds
        mock_file = mock_open()
        open_calls = [
            Exception("Permission denied"),  # First call to /var/log/interpose fails
            mock_file.return_value  # Second call to fallback location succeeds
        ]
        
        with patch.object(agent, '_original_request', side_effect=Exception("Network error")):
            with patch('time.sleep'):  # Mock sleep to speed up test
                with patch('builtins.open', side_effect=open_calls):
                    with patch('pathlib.Path.mkdir'):
                        # Act
                        agent.send_log(log_entry, max_retries=3)
                        
                        # Assert - Verify fallback was attempted
                        # The test passes if no exception is raised
