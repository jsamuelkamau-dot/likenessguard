"""
Service detector for identifying AI service providers from request URLs
"""


class ServiceDetector:
    """
    Detects AI service type from request URL and headers.
    
    Supports detection of OpenAI, Anthropic, AWS Bedrock, and local LLM services.
    """
    
    SERVICE_PATTERNS = {
        'openai': ['api.openai.com', 'openai.azure.com'],
        'anthropic': ['api.anthropic.com'],
        'bedrock': ['bedrock-runtime', 'bedrock.amazonaws.com'],
        'local': ['localhost', '127.0.0.1', '0.0.0.0']
    }
    
    def detect(self, url: str) -> str:
        """
        Detect AI service from request URL.
        
        Args:
            url: The request URL to analyze
            
        Returns:
            Service name ('openai', 'anthropic', 'bedrock', 'local', or 'unknown')
        """
        if not url:
            return 'unknown'
            
        url_lower = url.lower()
        
        # Special handling for Bedrock URLs with regional endpoints
        # e.g., bedrock.us-east-1.amazonaws.com or bedrock-runtime.us-west-2.amazonaws.com
        if 'bedrock' in url_lower and 'amazonaws.com' in url_lower:
            return 'bedrock'
        
        for service, patterns in self.SERVICE_PATTERNS.items():
            if any(pattern in url_lower for pattern in patterns):
                return service
                
        return 'unknown'
