"""
Data source extractor for identifying database connections and file references
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


class DataSourceExtractor:
    """
    Extracts data source references from request payload.
    
    Detects database connection strings, file paths, API endpoints, and SQL queries.
    Handles malformed payloads, size limits (10MB), and regex timeouts (100ms).
    """
    
    MAX_PAYLOAD_SIZE = 10 * 1024 * 1024  # 10MB
    REGEX_TIMEOUT_MS = 100  # 100ms timeout for regex matching
    
    DATA_SOURCE_PATTERNS = {
        'database': r'(postgres|mysql|mongodb|redis)://[^\s]+',
        'file_path': r'(/[a-zA-Z0-9_\-./]+|[A-Z]:\\[a-zA-Z0-9_\-.\\]+)',
        'api_endpoint': r'https?://[^\s]+',
        'sql_query': r'\b(SELECT|INSERT|UPDATE|DELETE)\b.*?\bFROM\b'
    }
    
    def extract(self, payload: str) -> List[str]:
        """
        Extract data source references from payload.
        
        Handles malformed payloads by treating them as plain text.
        Enforces 10MB size limit and 100ms regex timeout.
        
        Args:
            payload: The request payload to analyze
            
        Returns:
            List of detected data sources
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
        
        data_sources = []
        
        for source_type, pattern in self.DATA_SOURCE_PATTERNS.items():
            try:
                # Set timeout for regex matching (Unix-like systems only)
                # On Windows, this will be skipped
                try:
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.setitimer(signal.ITIMER_REAL, self.REGEX_TIMEOUT_MS / 1000.0)
                except (AttributeError, ValueError):
                    # signal.SIGALRM not available on Windows
                    pass
                
                # Use re.finditer to get full match objects
                for match in re.finditer(pattern, payload, re.IGNORECASE):
                    # For patterns with groups, get the full match (group 0)
                    data_sources.append(match.group(0))
                
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
                
        return list(set(data_sources))  # Remove duplicates
