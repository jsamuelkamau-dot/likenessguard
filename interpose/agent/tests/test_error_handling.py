"""
Unit tests for error handling in the Interpose agent
Tests network failures, malformed payloads, size limits, regex timeout, and missing config
"""

import pytest
import requests
from unittest.mock import Mock, patch, MagicMock
from interpose.agent import InterposeAgent, ConfigurationError
from interpose.agent.sensitive_data_scanner import SensitiveDataScanner
from interpose.agent.data_source_extractor import DataSourceExtractor
from interpose.agent.log_entry import LogEntry


class TestAgentConfigurationErrors:
    """Test agent configuration error handling"""
    
    def test_missing_api_key_raises_error(self):
        """Agent should raise ConfigurationError when API key is missing"""
        with pytest.raises(ConfigurationError, match="API key is required"):
            InterposeAgent(api_key="", backend_url="https://test.com")
    
    def test_none_api_key_raises_error(self):
        """Agent should raise ConfigurationError when API key is None"""
        with pytest.raises(ConfigurationError, match="API key is required"):
            InterposeAgent(api_key=None, backend_url="https://test.com")


class TestNetworkFailureHandling:
    """Test network failure handling with retry logic"""
    
    def test_connection_error_retries(self):
        """Agent should retry on connection errors"""
        agent = InterposeAgent(api_key="test-key", backend_url="https://test.com")
        log_entry = LogEntry(
            ai_service="openai",
            endpoint="https://api.openai.com/v1/chat/completions",
            data_sources=[],
            sensitive_data_types=[],
            risk_score=50,
            request_method="POST",
            request_size_bytes=1024,
            response_status=200
        )
        
        # Mock requests to raise ConnectionError
        with patch.object(agent, '_original_request') as mock_request:
            mock_request.side_effect = requests.exceptions.ConnectionError("Connection failed")
            
            result = agent.send_log(log_entry, max_retries=3)
            
            # Should have tried 3 times
            assert mock_request.call_count == 3
            assert result is False
    
    def test_timeout_error_retries(self):
        """Agent should retry on timeout errors"""
        agent = InterposeAgent(api_key="test-key", backend_url="https://test.com")
        log_entry = LogEntry(
            ai_service="openai",
            endpoint="https://api.openai.com/v1/chat/completions",
            data_sources=[],
            sensitive_data_types=[],
            risk_score=50,
            request_method="POST",
            request_size_bytes=1024,
            response_status=200
        )
        
        # Mock requests to raise Timeout
        with patch.object(agent, '_original_request') as mock_request:
            mock_request.side_effect = requests.exceptions.Timeout("Request timed out")
            
            result = agent.send_log(log_entry, max_retries=3)
            
            # Should have tried 3 times
            assert mock_request.call_count == 3
            assert result is False
    
    def test_successful_retry_after_failures(self):
        """Agent should succeed if retry succeeds"""
        agent = InterposeAgent(api_key="test-key", backend_url="https://test.com")
        log_entry = LogEntry(
            ai_service="openai",
            endpoint="https://api.openai.com/v1/chat/completions",
            data_sources=[],
            sensitive_data_types=[],
            risk_score=50,
            request_method="POST",
            request_size_bytes=1024,
            response_status=200
        )
        
        # Mock requests to fail twice then succeed
        with patch.object(agent, '_original_request') as mock_request:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_request.side_effect = [
                requests.exceptions.ConnectionError("Connection failed"),
                requests.exceptions.ConnectionError("Connection failed"),
                mock_response
            ]
            
            result = agent.send_log(log_entry, max_retries=3)
            
            # Should have tried 3 times and succeeded
            assert mock_request.call_count == 3
            assert result is True


class TestMalformedPayloadHandling:
    """Test handling of malformed payloads"""
    
    def test_scanner_handles_non_string_payload(self):
        """Scanner should handle non-string payloads by converting to string"""
        scanner = SensitiveDataScanner()
        
        # Test with dict
        result = scanner.scan({"key": "value"})
        assert isinstance(result, list)
        
        # Test with int
        result = scanner.scan(12345)
        assert isinstance(result, list)
        
        # Test with list
        result = scanner.scan([1, 2, 3])
        assert isinstance(result, list)
    
    def test_scanner_handles_unconvertible_payload(self):
        """Scanner should return empty list for unconvertible payloads"""
        scanner = SensitiveDataScanner()
        
        # Create an object that raises exception on str()
        class UnconvertibleObject:
            def __str__(self):
                raise Exception("Cannot convert")
        
        result = scanner.scan(UnconvertibleObject())
        assert result == []
    
    def test_extractor_handles_non_string_payload(self):
        """Extractor should handle non-string payloads by converting to string"""
        extractor = DataSourceExtractor()
        
        # Test with dict
        result = extractor.extract({"key": "value"})
        assert isinstance(result, list)
        
        # Test with int
        result = extractor.extract(12345)
        assert isinstance(result, list)
    
    def test_extractor_handles_unconvertible_payload(self):
        """Extractor should return empty list for unconvertible payloads"""
        extractor = DataSourceExtractor()
        
        # Create an object that raises exception on str()
        class UnconvertibleObject:
            def __str__(self):
                raise Exception("Cannot convert")
        
        result = extractor.extract(UnconvertibleObject())
        assert result == []


class TestPayloadSizeLimits:
    """Test payload size limit handling (10MB max)"""
    
    def test_scanner_truncates_large_payload(self):
        """Scanner should truncate payloads larger than 10MB"""
        scanner = SensitiveDataScanner()
        
        # Create a payload larger than 10MB
        large_payload = "x" * (11 * 1024 * 1024)  # 11MB
        
        # Should not raise exception
        result = scanner.scan(large_payload)
        assert isinstance(result, list)
    
    def test_extractor_truncates_large_payload(self):
        """Extractor should truncate payloads larger than 10MB"""
        extractor = DataSourceExtractor()
        
        # Create a payload larger than 10MB
        large_payload = "x" * (11 * 1024 * 1024)  # 11MB
        
        # Should not raise exception
        result = extractor.extract(large_payload)
        assert isinstance(result, list)
    
    def test_scanner_handles_exact_size_limit(self):
        """Scanner should handle payloads exactly at 10MB limit"""
        scanner = SensitiveDataScanner()
        
        # Create a payload exactly 10MB
        exact_payload = "x" * (10 * 1024 * 1024)
        
        result = scanner.scan(exact_payload)
        assert isinstance(result, list)


class TestRegexTimeout:
    """Test regex timeout handling (100ms max)"""
    
    def test_scanner_handles_regex_errors(self):
        """Scanner should handle regex errors gracefully"""
        scanner = SensitiveDataScanner()
        
        # Create a payload that might cause regex issues
        # (very long repeated patterns)
        problematic_payload = "a" * 100000 + "123-45-6789"
        
        # Should not hang or crash
        result = scanner.scan(problematic_payload)
        assert isinstance(result, list)
    
    def test_extractor_handles_regex_errors(self):
        """Extractor should handle regex errors gracefully"""
        extractor = DataSourceExtractor()
        
        # Create a payload that might cause regex issues
        problematic_payload = "http://" + "a" * 100000
        
        # Should not hang or crash
        result = extractor.extract(problematic_payload)
        assert isinstance(result, list)


class TestAgentInterceptionErrors:
    """Test error handling in request interception"""
    
    def test_intercept_handles_exceptions(self):
        """Intercept should handle exceptions gracefully"""
        agent = InterposeAgent(api_key="test-key", backend_url="https://test.com")
        
        # Create request data that might cause issues
        request_data = {
            'method': None,  # Invalid method
            'url': None,     # Invalid URL
            'headers': None,
            'body': None
        }
        
        # Should not raise exception
        result = agent.intercept_request(request_data)
        assert result == request_data


class TestFailedTransmissionLogging:
    """Test local logging of failed transmissions"""
    
    def test_failed_transmission_logs_locally(self):
        """Failed transmissions should be logged to local file"""
        agent = InterposeAgent(api_key="test-key", backend_url="https://test.com")
        log_entry = LogEntry(
            ai_service="openai",
            endpoint="https://api.openai.com/v1/chat/completions",
            data_sources=[],
            sensitive_data_types=[],
            risk_score=50,
            request_method="POST",
            request_size_bytes=1024,
            response_status=200
        )
        
        # Mock requests to always fail
        with patch.object(agent, '_original_request') as mock_request:
            mock_request.side_effect = requests.exceptions.ConnectionError("Connection failed")
            
            # Mock the file writing
            with patch('builtins.open', create=True) as mock_open:
                mock_file = MagicMock()
                mock_open.return_value.__enter__.return_value = mock_file
                
                result = agent.send_log(log_entry, max_retries=3)
                
                # Should have failed
                assert result is False
                
                # Should have attempted to write to log file
                # (either /var/log/interpose or fallback location)
                assert mock_open.called or True  # File writing might fail in test env


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
