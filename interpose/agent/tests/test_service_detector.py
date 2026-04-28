"""
Unit tests for ServiceDetector class - Edge Cases

Tests cover malformed URLs, missing protocols, custom ports, Azure OpenAI endpoints,
unknown service URLs, empty/None URLs, and case sensitivity.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
"""

import pytest
from interpose.agent.service_detector import ServiceDetector


class TestServiceDetectorEdgeCases:
    """Test edge cases for service detection"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.detector = ServiceDetector()
    
    # Malformed URLs
    
    def test_detect_url_without_protocol(self):
        """Test detection with URL missing protocol (no https://)"""
        url = "api.openai.com/v1/chat/completions"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_url_with_invalid_format(self):
        """Test detection with malformed URL structure but valid domain"""
        url = "ht!tp://api.openai.com"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_url_with_only_domain(self):
        """Test detection with just domain name, no path"""
        url = "api.anthropic.com"
        result = self.detector.detect(url)
        assert result == 'anthropic'
    
    def test_detect_url_with_trailing_slashes(self):
        """Test detection with multiple trailing slashes"""
        url = "https://api.openai.com///"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_url_with_special_characters(self):
        """Test detection with special characters in URL"""
        url = "https://api.openai.com/v1/chat?param=value&other=123"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    # Missing protocols
    
    def test_detect_anthropic_without_protocol(self):
        """Test Anthropic detection without protocol"""
        url = "api.anthropic.com/v1/messages"
        result = self.detector.detect(url)
        assert result == 'anthropic'
    
    def test_detect_bedrock_without_protocol(self):
        """Test Bedrock detection without protocol"""
        url = "bedrock-runtime.us-east-1.amazonaws.com"
        result = self.detector.detect(url)
        assert result == 'bedrock'
    
    def test_detect_localhost_without_protocol(self):
        """Test local LLM detection without protocol"""
        url = "localhost:8080/v1/completions"
        result = self.detector.detect(url)
        assert result == 'local'
    
    # Custom ports
    
    def test_detect_openai_with_custom_port(self):
        """Test OpenAI detection with custom port"""
        url = "https://api.openai.com:8443/v1/chat/completions"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_anthropic_with_custom_port(self):
        """Test Anthropic detection with custom port"""
        url = "https://api.anthropic.com:9000/v1/messages"
        result = self.detector.detect(url)
        assert result == 'anthropic'
    
    def test_detect_localhost_with_port_8000(self):
        """Test local LLM detection with port 8000"""
        url = "http://localhost:8000/api/generate"
        result = self.detector.detect(url)
        assert result == 'local'
    
    def test_detect_localhost_with_port_11434(self):
        """Test local LLM detection with Ollama default port"""
        url = "http://localhost:11434/api/chat"
        result = self.detector.detect(url)
        assert result == 'local'
    
    def test_detect_127_0_0_1_with_custom_port(self):
        """Test local LLM detection with 127.0.0.1 and custom port"""
        url = "http://127.0.0.1:5000/v1/completions"
        result = self.detector.detect(url)
        assert result == 'local'
    
    # Azure OpenAI endpoints
    
    def test_detect_azure_openai_standard_format(self):
        """Test Azure OpenAI detection with standard format"""
        url = "https://my-resource.openai.azure.com/openai/deployments/gpt-4/chat/completions"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_azure_openai_without_protocol(self):
        """Test Azure OpenAI detection without protocol"""
        url = "my-resource.openai.azure.com/openai/deployments/gpt-35-turbo/completions"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_azure_openai_with_custom_port(self):
        """Test Azure OpenAI detection with custom port"""
        url = "https://my-resource.openai.azure.com:8443/openai/deployments/gpt-4"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_azure_openai_different_resource_names(self):
        """Test Azure OpenAI detection with various resource names"""
        urls = [
            "https://prod-ai.openai.azure.com/openai/deployments/model",
            "https://dev-openai.openai.azure.com/openai/deployments/model",
            "https://test123.openai.azure.com/openai/deployments/model"
        ]
        for url in urls:
            result = self.detector.detect(url)
            assert result == 'openai', f"Failed for URL: {url}"
    
    # Unknown service URLs
    
    def test_detect_unknown_service_google(self):
        """Test detection returns 'unknown' for Google AI"""
        url = "https://generativelanguage.googleapis.com/v1/models"
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_unknown_service_huggingface(self):
        """Test detection returns 'unknown' for HuggingFace"""
        url = "https://api-inference.huggingface.co/models/gpt2"
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_unknown_service_cohere(self):
        """Test detection returns 'unknown' for Cohere"""
        url = "https://api.cohere.ai/v1/generate"
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_unknown_service_random_domain(self):
        """Test detection returns 'unknown' for random domain"""
        url = "https://random-ai-service.com/api/chat"
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_unknown_service_custom_llm_server(self):
        """Test detection returns 'unknown' for custom LLM server (not localhost)"""
        url = "https://my-llm-server.company.com/v1/completions"
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    # Empty or None URLs
    
    def test_detect_empty_string(self):
        """Test detection with empty string returns 'unknown'"""
        url = ""
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_none_value(self):
        """Test detection with None returns 'unknown'"""
        url = None
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_whitespace_only(self):
        """Test detection with whitespace-only string"""
        url = "   "
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_newline_characters(self):
        """Test detection with newline characters"""
        url = "\n\n"
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    # Case sensitivity
    
    def test_detect_openai_uppercase(self):
        """Test OpenAI detection with uppercase URL"""
        url = "HTTPS://API.OPENAI.COM/V1/CHAT/COMPLETIONS"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_anthropic_mixed_case(self):
        """Test Anthropic detection with mixed case URL"""
        url = "https://API.Anthropic.COM/v1/messages"
        result = self.detector.detect(url)
        assert result == 'anthropic'
    
    def test_detect_bedrock_uppercase(self):
        """Test Bedrock detection with uppercase URL"""
        url = "HTTPS://BEDROCK-RUNTIME.US-EAST-1.AMAZONAWS.COM"
        result = self.detector.detect(url)
        assert result == 'bedrock'
    
    def test_detect_localhost_uppercase(self):
        """Test local LLM detection with uppercase LOCALHOST"""
        url = "http://LOCALHOST:8080/api/chat"
        result = self.detector.detect(url)
        assert result == 'local'
    
    def test_detect_azure_openai_mixed_case(self):
        """Test Azure OpenAI detection with mixed case"""
        url = "https://My-Resource.OpenAI.Azure.COM/openai/deployments/gpt-4"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    # Bedrock regional endpoints
    
    def test_detect_bedrock_us_east_1(self):
        """Test Bedrock detection with us-east-1 region"""
        url = "https://bedrock-runtime.us-east-1.amazonaws.com"
        result = self.detector.detect(url)
        assert result == 'bedrock'
    
    def test_detect_bedrock_us_west_2(self):
        """Test Bedrock detection with us-west-2 region"""
        url = "https://bedrock-runtime.us-west-2.amazonaws.com"
        result = self.detector.detect(url)
        assert result == 'bedrock'
    
    def test_detect_bedrock_eu_central_1(self):
        """Test Bedrock detection with eu-central-1 region"""
        url = "https://bedrock-runtime.eu-central-1.amazonaws.com"
        result = self.detector.detect(url)
        assert result == 'bedrock'
    
    def test_detect_bedrock_without_runtime_suffix(self):
        """Test Bedrock detection with bedrock.amazonaws.com (no runtime)"""
        url = "https://bedrock.us-east-1.amazonaws.com"
        result = self.detector.detect(url)
        assert result == 'bedrock'
    
    def test_detect_bedrock_with_path(self):
        """Test Bedrock detection with full path"""
        url = "https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke"
        result = self.detector.detect(url)
        assert result == 'bedrock'
    
    # Local LLM variations
    
    def test_detect_0_0_0_0_address(self):
        """Test local LLM detection with 0.0.0.0 address"""
        url = "http://0.0.0.0:8080/v1/completions"
        result = self.detector.detect(url)
        assert result == 'local'
    
    def test_detect_localhost_without_port(self):
        """Test local LLM detection with localhost without port"""
        url = "http://localhost/api/generate"
        result = self.detector.detect(url)
        assert result == 'local'
    
    def test_detect_127_0_0_1_without_port(self):
        """Test local LLM detection with 127.0.0.1 without port"""
        url = "http://127.0.0.1/v1/chat"
        result = self.detector.detect(url)
        assert result == 'local'
    
    # Edge cases with query parameters and fragments
    
    def test_detect_with_query_parameters(self):
        """Test detection with query parameters"""
        url = "https://api.openai.com/v1/chat/completions?api-version=2023-05-15"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    def test_detect_with_fragment(self):
        """Test detection with URL fragment"""
        url = "https://api.anthropic.com/v1/messages#section"
        result = self.detector.detect(url)
        assert result == 'anthropic'
    
    def test_detect_with_username_password(self):
        """Test detection with username:password in URL"""
        url = "https://user:pass@api.openai.com/v1/chat/completions"
        result = self.detector.detect(url)
        assert result == 'openai'
    
    # Partial matches that should not be detected
    
    def test_detect_subdomain_containing_openai_but_not_openai(self):
        """Test that subdomain containing 'openai' but not actual OpenAI is unknown"""
        url = "https://fake-api.openai-clone.com/v1/chat"
        result = self.detector.detect(url)
        assert result == 'unknown'
    
    def test_detect_path_containing_anthropic_but_not_anthropic_service(self):
        """Test that path containing 'anthropic' but not actual Anthropic is unknown"""
        url = "https://example.com/anthropic/api"
        result = self.detector.detect(url)
        assert result == 'unknown'
