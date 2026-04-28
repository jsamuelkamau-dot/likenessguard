"""
LogEntry data model for representing intercepted AI API calls
"""

import uuid
import time
from typing import List, Dict, Any, Optional


class LogEntry:
    """
    Represents a single intercepted AI API call with metadata and risk analysis.
    
    This model contains all required fields for logging AI service interactions,
    including service detection, data source references, sensitive data types,
    and calculated risk scores.
    """
    
    def __init__(
        self,
        ai_service: str,
        endpoint: str,
        data_sources: List[str],
        sensitive_data_types: List[str],
        risk_score: int,
        request_method: str,
        request_size_bytes: int,
        response_status: int,
        customer_id: Optional[str] = None,
        log_id: Optional[str] = None,
        timestamp: Optional[int] = None
    ):
        """
        Initialize a LogEntry.
        
        Args:
            ai_service: AI service name ('openai', 'anthropic', 'bedrock', 'local', 'unknown')
            endpoint: Full URL of AI service endpoint
            data_sources: List of detected data source references
            sensitive_data_types: List of detected sensitive data types (not values)
            risk_score: Calculated risk score (0-100)
            request_method: HTTP method ('GET', 'POST', 'PUT', 'DELETE')
            request_size_bytes: Size of request payload in bytes
            response_status: HTTP status code from AI service
            customer_id: Customer identifier (optional, set by backend)
            log_id: Unique log identifier (auto-generated if not provided)
            timestamp: Unix timestamp in milliseconds (auto-generated if not provided)
        """
        self.log_id = log_id or str(uuid.uuid4())
        self.customer_id = customer_id
        self.timestamp = timestamp or int(time.time() * 1000)
        self.ai_service = ai_service
        self.endpoint = endpoint
        self.data_sources = data_sources
        self.sensitive_data_types = sensitive_data_types
        self.risk_score = risk_score
        self.request_method = request_method
        self.request_size_bytes = request_size_bytes
        self.response_status = response_status
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert LogEntry to dictionary for JSON serialization.
        
        Returns:
            Dictionary containing all log entry fields
        """
        return {
            'log_id': self.log_id,
            'customer_id': self.customer_id,
            'timestamp': self.timestamp,
            'ai_service': self.ai_service,
            'endpoint': self.endpoint,
            'data_sources': self.data_sources,
            'sensitive_data_types': self.sensitive_data_types,
            'risk_score': self.risk_score,
            'request_method': self.request_method,
            'request_size_bytes': self.request_size_bytes,
            'response_status': self.response_status
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogEntry':
        """
        Create LogEntry from dictionary.
        
        Args:
            data: Dictionary containing log entry fields
            
        Returns:
            LogEntry instance
        """
        return cls(
            log_id=data.get('log_id'),
            customer_id=data.get('customer_id'),
            timestamp=data.get('timestamp'),
            ai_service=data['ai_service'],
            endpoint=data['endpoint'],
            data_sources=data['data_sources'],
            sensitive_data_types=data['sensitive_data_types'],
            risk_score=data['risk_score'],
            request_method=data['request_method'],
            request_size_bytes=data['request_size_bytes'],
            response_status=data['response_status']
        )
    
    def __repr__(self) -> str:
        """String representation of LogEntry"""
        return (
            f"LogEntry(log_id={self.log_id}, ai_service={self.ai_service}, "
            f"risk_score={self.risk_score}, timestamp={self.timestamp})"
        )
