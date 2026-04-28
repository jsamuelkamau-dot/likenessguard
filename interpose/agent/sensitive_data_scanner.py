"""
Sensitive data scanner for detecting PII and credentials in request payloads
"""

import re
import signal
from typing import List


class TimeoutError(Exception):
    """Raised when regex matching exceeds timeout"""
    pass


def timeout_handler(signum, frame):
    """Signal handler for regex timeout"""
    raise TimeoutError("Regex matching timed out")


class SensitiveDataScanner:
    """
    Scans request payload for sensitive data patterns.
    
    Detects SSNs, credit cards, API keys, passwords, and email addresses.
    Only records data types, never the actual sensitive values.
    
    Handles malformed payloads, size limits (10MB), and regex timeouts (100ms).
    """
    
    MAX_PAYLOAD_SIZE = 10 * 1024 * 1024  # 10MB
    REGEX_TIMEOUT_MS = 100  # 100ms timeout for regex matching
    
    PATTERNS = {
        'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
        'credit_card': r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b',
        'api_key': r'(api[_-]?key|apikey|api[_-]?token)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-]{20,})',
        'password': r'(password|passwd|pwd)["\']?\s*[:=]\s*["\']?([^\s"\']{8,})',
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    }
    
    def scan(self, payload: str) -> List[str]:
        """
        Scan payload for sensitive data patterns.
        
        Handles malformed payloads by treating them as plain text.
        Enforces 10MB size limit and 100ms regex timeout.
        
        Args:
            payload: The request payload to scan
            
        Returns:
            List of detected data types (e.g., ['ssn', 'email'])
        """
        if not payload:
            return []
        
        # Handle malformed payloads - convert to string if not already
        try:
            if not isinstance(payload, str):
                payload = str(payload)
        except Exception:
            # If conversion fails, treat as empty payload
            return []
        
        # Check payload size limit (10MB)
        if len(payload) > self.MAX_PAYLOAD_SIZE:
            # Truncate to max size
            payload = payload[:self.MAX_PAYLOAD_SIZE]
        
        detected_types = []
        
        for data_type, pattern in self.PATTERNS.items():
            try:
                # Set timeout for regex matching (Unix-like systems only)
                # On Windows, this will be skipped
                try:
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.setitimer(signal.ITIMER_REAL, self.REGEX_TIMEOUT_MS / 1000.0)
                except (AttributeError, ValueError):
                    # signal.SIGALRM not available on Windows
                    pass
                
                # Perform regex search
                if re.search(pattern, payload):
                    detected_types.append(data_type)
                
                # Cancel timeout
                try:
                    signal.setitimer(signal.ITIMER_REAL, 0)
                except (AttributeError, ValueError):
                    pass
                    
            except TimeoutError:
                # Regex timed out - skip this pattern
                try:
                    signal.setitimer(signal.ITIMER_REAL, 0)
                except (AttributeError, ValueError):
                    pass
                continue
            except Exception:
                # Any other error - skip this pattern
                try:
                    signal.setitimer(signal.ITIMER_REAL, 0)
                except (AttributeError, ValueError):
                    pass
                continue
                
        return detected_types
