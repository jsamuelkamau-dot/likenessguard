"""
Main Interpose Agent class for intercepting and logging AI API calls
"""

from typing import Optional, Dict, Any
import logging
from logging.handlers import TimedRotatingFileHandler
import requests
import time
import os
from pathlib import Path

from .exceptions import ConfigurationError
from .log_entry import LogEntry


class InterposeAgent:
    """
    Main agent class that orchestrates interception and logging of AI API calls.
    
    The agent intercepts HTTP requests to AI services, extracts metadata,
    scans for sensitive data, calculates risk scores, and transmits logs
    to the backend API.
    """
    
    def __init__(self, api_key: str, backend_url: str = "https://api.interpose.io", log_level: str = "INFO"):
        """
        Initialize the Interpose agent.
        
        Args:
            api_key: Customer API key for backend authentication (required)
            backend_url: Backend API endpoint URL (optional, defaults to https://api.interpose.io)
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            
        Raises:
            ConfigurationError: If api_key is missing or empty
        """
        # Validate that api_key is provided
        if not api_key:
            raise ConfigurationError("API key is required")
            
        self.api_key = api_key
        self.backend_url = backend_url
        self.log_level = log_level
        
        # Store original requests.request for monkey-patching
        self._original_request = requests.request
        self._interception_active = False
        
        # Set up logging with rotation
        self._setup_logging()
        
        # Initialize component instances (to be implemented in later tasks)
        # self.detector = ServiceDetector()
        # self.scanner = SensitiveDataScanner()
        # self.extractor = DataSourceExtractor()
        # self.risk_calculator = RiskCalculator()
        
        self.logger.info(f"InterposeAgent initialized with backend: {self.backend_url}")
        
    def _setup_logging(self):
        """
        Set up Python logging with file rotation for the agent.
        
        Logs to /var/log/interpose/agent.log with daily rotation, keeping 7 days of logs.
        Falls back to ./agent.log if /var/log/interpose is not writable.
        """
        self.logger = logging.getLogger(__name__)
        
        # Only add handlers if none exist to avoid duplicate logs
        if not self.logger.handlers:
            # Set log level from configuration
            level = getattr(logging, self.log_level.upper(), logging.INFO)
            self.logger.setLevel(level)
            
            # Create formatter
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            
            # Try to set up file handler with rotation
            log_file = None
            try:
                # Try /var/log/interpose/agent.log
                log_dir = Path('/var/log/interpose')
                log_dir.mkdir(parents=True, exist_ok=True)
                log_file = log_dir / 'agent.log'
                
                # Create rotating file handler (daily rotation, keep 7 days)
                file_handler = TimedRotatingFileHandler(
                    log_file,
                    when='midnight',
                    interval=1,
                    backupCount=7,
                    encoding='utf-8'
                )
                file_handler.setFormatter(formatter)
                file_handler.setLevel(level)
                self.logger.addHandler(file_handler)
                
            except (PermissionError, OSError) as e:
                # Fall back to current directory if /var/log/interpose is not writable
                log_file = Path('./agent.log')
                file_handler = TimedRotatingFileHandler(
                    log_file,
                    when='midnight',
                    interval=1,
                    backupCount=7,
                    encoding='utf-8'
                )
                file_handler.setFormatter(formatter)
                file_handler.setLevel(level)
                self.logger.addHandler(file_handler)
            
            # Also add console handler for immediate feedback
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            console_handler.setLevel(level)
            self.logger.addHandler(console_handler)
            
            self.logger.info(f"Logging configured: level={self.log_level}, file={log_file}")
        
    def start(self):
        """Start the agent and begin intercepting requests"""
        if not self._interception_active:
            self._activate_monkey_patch()
            self._interception_active = True
            self.logger.info(f"Interpose agent started with backend: {self.backend_url}")
        else:
            self.logger.warning("Agent is already active")
    
    def stop(self):
        """Stop the agent and restore original request behavior"""
        if self._interception_active:
            self._deactivate_monkey_patch()
            self._interception_active = False
            self.logger.info("Interpose agent stopped")
        else:
            self.logger.warning("Agent is not active")
    
    def _activate_monkey_patch(self):
        """Activate monkey-patching of requests.request"""
        def intercepted_request(method, url, **kwargs):
            # Extract request data
            request_data = {
                'method': method,
                'url': url,
                'headers': kwargs.get('headers', {}),
                'body': kwargs.get('json') or kwargs.get('data')
            }
            
            # Process with agent
            self.intercept_request(request_data)
            
            # Forward to original destination
            return self._original_request(method, url, **kwargs)
        
        # Replace requests.request with intercepted version
        requests.request = intercepted_request
        self.logger.debug("Monkey-patch activated")
    
    def _deactivate_monkey_patch(self):
        """Restore original requests.request"""
        requests.request = self._original_request
        self.logger.debug("Monkey-patch deactivated")
    
    def intercept_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Intercept and process an HTTP request.
        
        Extracts request metadata (method, url, headers, body) and logs the interception.
        This method will be extended in later tasks to perform service detection,
        sensitive data scanning, and risk calculation.
        
        Args:
            request_data: Dictionary containing request metadata with keys:
                - method: HTTP method (GET, POST, etc.)
                - url: Request URL
                - headers: Request headers dictionary
                - body: Request body (JSON or data)
        
        Returns:
            Dictionary containing the processed request data
        """
        try:
            # Log interception event
            self.logger.info(
                f"Intercepted request: method={request_data['method']}, "
                f"url={request_data['url']}"
            )
            
            # Log request details at debug level
            self.logger.debug(f"Request headers: {request_data['headers']}")
            if request_data['body']:
                body_type = type(request_data['body']).__name__
                body_size = len(str(request_data['body'])) if request_data['body'] else 0
                self.logger.debug(f"Request body: type={body_type}, size={body_size} bytes")
            
            # Return the request data for further processing in later tasks
            # (service detection, scanning, etc. will be added in subsequent tasks)
            return request_data
        except Exception as e:
            self.logger.error(f"Error intercepting request: {e}", exc_info=True)
            return request_data
    
    def send_log(self, log_entry: LogEntry, max_retries: int = 3) -> bool:
        """
        Transmit log entry to backend API with exponential backoff retry logic.
        
        Sends the log entry to the backend API via HTTPS POST with the customer
        API key in the X-API-Key header. If transmission fails, retries up to
        max_retries times with exponential backoff (2^attempt seconds delay).
        
        If all retries fail, logs the error to /var/log/interpose/failed_transmissions.log
        
        Handles network failures, connection timeouts, and HTTP errors gracefully.
        
        Args:
            log_entry: LogEntry instance to transmit
            max_retries: Maximum number of retry attempts (default: 3)
        
        Returns:
            True if transmission succeeded, False if all retries failed
        """
        self.logger.debug(
            f"Attempting to transmit log: log_id={log_entry.log_id}, "
            f"ai_service={log_entry.ai_service}, risk_score={log_entry.risk_score}"
        )
        
        for attempt in range(max_retries):
            try:
                # Send POST request to backend with API key header
                response = self._original_request(
                    'POST',
                    f"{self.backend_url}/logs",
                    json=log_entry.to_dict(),
                    headers={'X-API-Key': self.api_key},
                    timeout=5
                )
                
                # Check if request was successful
                if response.status_code == 200:
                    self.logger.info(
                        f"Successfully transmitted log: log_id={log_entry.log_id}, "
                        f"attempt={attempt + 1}/{max_retries}"
                    )
                    return True
                else:
                    self.logger.warning(
                        f"Backend returned status {response.status_code} for log {log_entry.log_id}, "
                        f"attempt={attempt + 1}/{max_retries}"
                    )
                    
            except requests.exceptions.Timeout as e:
                self.logger.warning(
                    f"Transmission timeout for log {log_entry.log_id}, "
                    f"attempt={attempt + 1}/{max_retries}: {e}"
                )
            except requests.exceptions.ConnectionError as e:
                self.logger.warning(
                    f"Connection error for log {log_entry.log_id}, "
                    f"attempt={attempt + 1}/{max_retries}: {e}"
                )
            except requests.exceptions.RequestException as e:
                self.logger.warning(
                    f"Request exception for log {log_entry.log_id}, "
                    f"attempt={attempt + 1}/{max_retries}: {e}"
                )
            except Exception as e:
                self.logger.error(
                    f"Unexpected error transmitting log {log_entry.log_id}, "
                    f"attempt={attempt + 1}/{max_retries}: {e}",
                    exc_info=True
                )
            
            # If this is not the last attempt, wait with exponential backoff
            if attempt < max_retries - 1:
                delay = 2 ** attempt
                self.logger.debug(f"Waiting {delay} seconds before retry...")
                time.sleep(delay)
        
        # All retries failed - log to local file
        self.logger.error(
            f"Failed to transmit log after {max_retries} attempts: "
            f"log_id={log_entry.log_id}, ai_service={log_entry.ai_service}, "
            f"risk_score={log_entry.risk_score}"
        )
        self._log_failed_transmission(log_entry)
        return False
    
    def _log_failed_transmission(self, log_entry: LogEntry) -> None:
        """
        Log failed transmission to local file.
        
        Writes error information to /var/log/interpose/failed_transmissions.log
        Creates the directory if it doesn't exist.
        
        Args:
            log_entry: LogEntry that failed to transmit
        """
        log_dir = Path('/var/log/interpose')
        log_file = log_dir / 'failed_transmissions.log'
        
        try:
            # Create directory if it doesn't exist
            log_dir.mkdir(parents=True, exist_ok=True)
            
            # Write error to log file
            with open(log_file, 'a') as f:
                timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
                f.write(
                    f"[{timestamp}] Failed to transmit log {log_entry.log_id} "
                    f"(ai_service={log_entry.ai_service}, risk_score={log_entry.risk_score})\n"
                )
            
            self.logger.info(f"Logged failed transmission to {log_file}")
            
        except Exception as e:
            # If we can't write to /var/log/interpose, try a fallback location
            self.logger.error(f"Failed to write to {log_file}: {e}")
            
            # Try writing to current directory as fallback
            try:
                fallback_file = Path('./failed_transmissions.log')
                with open(fallback_file, 'a') as f:
                    timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
                    f.write(
                        f"[{timestamp}] Failed to transmit log {log_entry.log_id} "
                        f"(ai_service={log_entry.ai_service}, risk_score={log_entry.risk_score})\n"
                    )
                self.logger.info(f"Logged failed transmission to fallback location: {fallback_file}")
            except Exception as fallback_error:
                self.logger.error(f"Failed to write to fallback location: {fallback_error}")
