"""
Interpose Agent - Universal AI Access Intelligence Agent

This package provides the core monitoring agent that intercepts AI API calls,
extracts metadata, scans for sensitive data, and transmits logs to the backend.
"""

__version__ = "1.0.0"

from .agent import InterposeAgent
from .service_detector import ServiceDetector
from .sensitive_data_scanner import SensitiveDataScanner
from .data_source_extractor import DataSourceExtractor
from .risk_calculator import RiskCalculator
from .log_entry import LogEntry
from .exceptions import ConfigurationError

__all__ = [
    "InterposeAgent",
    "ServiceDetector",
    "SensitiveDataScanner",
    "DataSourceExtractor",
    "RiskCalculator",
    "LogEntry",
    "ConfigurationError",
]


def init(api_key: str, backend_url: str = "https://api.interpose.io"):
    """
    Initialize the Interpose agent with the provided API key and backend URL.
    
    Args:
        api_key: Customer API key for backend authentication
        backend_url: Backend API endpoint URL
    """
    agent = InterposeAgent(api_key, backend_url)
    agent.start()
    return agent
