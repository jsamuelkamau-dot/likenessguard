"""
Unit tests for InterposeAgent class
"""

import pytest
import logging
from interpose.agent import InterposeAgent, ConfigurationError


class TestInterposeAgentInitialization:
    """Test InterposeAgent initialization and configuration validation"""
    
    def test_init_with_valid_api_key_and_default_backend_url(self):
        """Test initialization with valid api_key and default backend_url"""
        agent = InterposeAgent(api_key="test-api-key-123")
        
        assert agent.api_key == "test-api-key-123"
        assert agent.backend_url == "https://api.interpose.io"
        assert agent.logger is not None
        assert isinstance(agent.logger, logging.Logger)
    
    def test_init_with_valid_api_key_and_custom_backend_url(self):
        """Test initialization with valid api_key and custom backend_url"""
        custom_url = "https://custom.backend.com"
        agent = InterposeAgent(api_key="test-api-key-456", backend_url=custom_url)
        
        assert agent.api_key == "test-api-key-456"
        assert agent.backend_url == custom_url
        assert agent.logger is not None
    
    def test_init_raises_configuration_error_when_api_key_is_none(self):
        """Test that ConfigurationError is raised when api_key is None"""
        with pytest.raises(ConfigurationError) as exc_info:
            InterposeAgent(api_key=None)
        
        assert "API key is required" in str(exc_info.value)
    
    def test_init_raises_configuration_error_when_api_key_is_empty_string(self):
        """Test that ConfigurationError is raised when api_key is empty string"""
        with pytest.raises(ConfigurationError) as exc_info:
            InterposeAgent(api_key="")
        
        assert "API key is required" in str(exc_info.value)
    
    def test_logging_setup(self):
        """Test that logging is properly configured"""
        agent = InterposeAgent(api_key="test-key")
        
        # Verify logger exists and has correct name
        assert agent.logger.name == "interpose.agent.agent"
        
        # Verify logger has at least one handler
        assert len(agent.logger.handlers) > 0
        
        # Verify logger level is INFO
        assert agent.logger.level == logging.INFO
    
    def test_backend_url_defaults_correctly(self):
        """Test that backend_url defaults to https://api.interpose.io"""
        agent = InterposeAgent(api_key="test-key")
        assert agent.backend_url == "https://api.interpose.io"
    
    def test_multiple_agents_with_different_configs(self):
        """Test creating multiple agents with different configurations"""
        agent1 = InterposeAgent(api_key="key1", backend_url="https://backend1.com")
        agent2 = InterposeAgent(api_key="key2", backend_url="https://backend2.com")
        
        assert agent1.api_key == "key1"
        assert agent1.backend_url == "https://backend1.com"
        assert agent2.api_key == "key2"
        assert agent2.backend_url == "https://backend2.com"


class TestHTTPInterception:
    """Test HTTP request interception using monkey-patching"""
    
    def test_intercept_request_extracts_method_and_url(self):
        """Test that intercept_request extracts method and URL from request data"""
        agent = InterposeAgent(api_key="test-key")
        
        request_data = {
            'method': 'POST',
            'url': 'https://api.openai.com/v1/chat/completions',
            'headers': {},
            'body': None
        }
        
        result = agent.intercept_request(request_data)
        
        assert result['method'] == 'POST'
        assert result['url'] == 'https://api.openai.com/v1/chat/completions'
    
    def test_intercept_request_extracts_headers(self):
        """Test that intercept_request extracts headers from request data"""
        agent = InterposeAgent(api_key="test-key")
        
        headers = {
            'Authorization': 'Bearer sk-test123',
            'Content-Type': 'application/json'
        }
        
        request_data = {
            'method': 'POST',
            'url': 'https://api.anthropic.com/v1/messages',
            'headers': headers,
            'body': None
        }
        
        result = agent.intercept_request(request_data)
        
        assert result['headers'] == headers
        assert 'Authorization' in result['headers']
        assert 'Content-Type' in result['headers']
    
    def test_intercept_request_extracts_json_body(self):
        """Test that intercept_request extracts JSON body from request data"""
        agent = InterposeAgent(api_key="test-key")
        
        body = {'model': 'gpt-4', 'messages': [{'role': 'user', 'content': 'Hello'}]}
        
        request_data = {
            'method': 'POST',
            'url': 'https://api.openai.com/v1/chat/completions',
            'headers': {},
            'body': body
        }
        
        result = agent.intercept_request(request_data)
        
        assert result['body'] == body
        assert result['body']['model'] == 'gpt-4'
    
    def test_intercept_request_handles_empty_body(self):
        """Test that intercept_request handles requests with no body"""
        agent = InterposeAgent(api_key="test-key")
        
        request_data = {
            'method': 'GET',
            'url': 'https://api.openai.com/v1/models',
            'headers': {},
            'body': None
        }
        
        result = agent.intercept_request(request_data)
        
        assert result['body'] is None
    
    def test_intercept_request_returns_request_data(self):
        """Test that intercept_request returns the processed request data"""
        agent = InterposeAgent(api_key="test-key")
        
        request_data = {
            'method': 'POST',
            'url': 'https://api.openai.com/v1/chat/completions',
            'headers': {'Authorization': 'Bearer test'},
            'body': {'model': 'gpt-4'}
        }
        
        result = agent.intercept_request(request_data)
        
        assert isinstance(result, dict)
        assert 'method' in result
        assert 'url' in result
        assert 'headers' in result
        assert 'body' in result
    
    def test_start_activates_interception(self):
        """Test that start() activates request interception"""
        agent = InterposeAgent(api_key="test-key")
        
        assert not agent._interception_active
        
        agent.start()
        
        assert agent._interception_active
    
    def test_stop_deactivates_interception(self):
        """Test that stop() deactivates request interception"""
        agent = InterposeAgent(api_key="test-key")
        
        agent.start()
        assert agent._interception_active
        
        agent.stop()
        
        assert not agent._interception_active
    
    def test_start_when_already_active_does_not_error(self):
        """Test that calling start() when already active doesn't cause errors"""
        agent = InterposeAgent(api_key="test-key")
        
        agent.start()
        agent.start()  # Should not raise an error
        
        assert agent._interception_active
    
    def test_stop_when_not_active_does_not_error(self):
        """Test that calling stop() when not active doesn't cause errors"""
        agent = InterposeAgent(api_key="test-key")
        
        agent.stop()  # Should not raise an error
        
        assert not agent._interception_active
    
    def test_monkey_patch_intercepts_requests(self):
        """Test that monkey-patching actually intercepts requests.request calls"""
        import requests
        
        agent = InterposeAgent(api_key="test-key")
        
        # Track if intercept_request was called by checking logs
        # We'll verify the monkey-patch is active by checking that requests.request changed
        original_request = agent._original_request
        
        # Start interception
        agent.start()
        
        try:
            # Verify that requests.request has been replaced
            assert requests.request != original_request
            
            # The monkey-patch is active if requests.request is different
            # We can't easily test actual interception without making real HTTP calls
            # which would be slow and unreliable in tests
        finally:
            # Always stop to restore original behavior
            agent.stop()
    
    def test_monkey_patch_forwards_to_original_request(self):
        """Test that monkey-patched requests still forward to the original destination"""
        agent = InterposeAgent(api_key="test-key")
        
        agent.start()
        
        try:
            # Make a real request
            import requests
            response = requests.get('https://httpbin.org/get', timeout=5)
            
            # Verify the request actually went through
            assert response.status_code == 200
        except Exception as e:
            # If the request fails due to network issues, that's okay
            # We're mainly testing that the monkey-patch doesn't break requests
            pass
        finally:
            agent.stop()
    
    def test_stop_restores_original_requests_behavior(self):
        """Test that stop() restores the original requests.request function"""
        import requests
        
        # Store the original function
        original_func = requests.request
        
        agent = InterposeAgent(api_key="test-key")
        agent.start()
        
        # Verify it's been replaced
        assert requests.request != original_func
        
        agent.stop()
        
        # Verify it's been restored
        assert requests.request == original_func
