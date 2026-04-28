"""
Structured Logging Utility

Provides structured logging with comprehensive metadata for audit trails.

Requirements:
- 12.1: Comprehensive audit logging
- 12.2: Policy change logging
- 12.3: Registration event logging
- 12.5: Error logging with context
"""
import json
import logging
import time
from typing import Dict, Any, Optional
from enum import Enum


class EventType(Enum):
    """Types of events that can be logged."""
    REGISTRATION = 'REGISTRATION'
    CONSENT_CHECK = 'CONSENT_CHECK'
    POLICY_UPDATE = 'POLICY_UPDATE'
    CONSENT_REVOCATION = 'CONSENT_REVOCATION'
    ERROR = 'ERROR'
    SYSTEM = 'SYSTEM'


class StructuredLogger:
    """
    Structured logger that emits JSON-formatted log entries with comprehensive metadata.
    
    All log entries include:
    - timestamp: Unix timestamp
    - event_type: Type of event (registration, consent_check, etc.)
    - level: Log level (INFO, WARNING, ERROR)
    - message: Human-readable message
    - metadata: Event-specific structured data
    - request_id: Optional request identifier for tracing
    """
    
    def __init__(self, logger: logging.Logger, service_name: str):
        """
        Initialize structured logger.
        
        Args:
            logger: Python logger instance
            service_name: Name of the service (e.g., 'registration', 'consent_check')
        """
        self.logger = logger
        self.service_name = service_name
    
    def _log_structured(
        self,
        level: str,
        event_type: EventType,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> None:
        """
        Log a structured event.
        
        Args:
            level: Log level (INFO, WARNING, ERROR)
            event_type: Type of event
            message: Human-readable message
            metadata: Event-specific structured data
            request_id: Optional request identifier
        """
        log_entry = {
            'timestamp': int(time.time()),
            'service': self.service_name,
            'event_type': event_type.value,
            'level': level,
            'message': message,
            'metadata': metadata or {},
            'request_id': request_id
        }
        
        # Log as JSON string
        log_message = json.dumps(log_entry, default=str)
        
        # Use appropriate log level
        if level == 'ERROR':
            self.logger.error(log_message)
        elif level == 'WARNING':
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    def log_registration(
        self,
        user_id: str,
        likeness_id: str,
        photos_processed: int,
        photos_total: int,
        status: str,
        request_id: Optional[str] = None,
        errors: Optional[list] = None
    ) -> None:
        """
        Log a registration event.
        
        Requirements: 12.3
        """
        metadata = {
            'user_id': user_id,
            'likeness_id': likeness_id,
            'photos_processed': photos_processed,
            'photos_total': photos_total,
            'status': status
        }
        
        if errors:
            metadata['errors'] = errors
        
        self._log_structured(
            level='INFO',
            event_type=EventType.REGISTRATION,
            message=f'User registration: {status}',
            metadata=metadata,
            request_id=request_id
        )
    
    def log_consent_check(
        self,
        decision: str,
        likeness_id: Optional[str],
        reason_code: str,
        similarity_score: Optional[float],
        requester_id: str,
        usage_type: str,
        processing_time_ms: Optional[int] = None,
        request_id: Optional[str] = None
    ) -> None:
        """
        Log a consent check event.
        
        Requirements: 12.1
        """
        metadata = {
            'decision': decision,
            'likeness_id': likeness_id,
            'reason_code': reason_code,
            'similarity_score': similarity_score,
            'requester_id': requester_id,
            'usage_type': usage_type
        }
        
        if processing_time_ms is not None:
            metadata['processing_time_ms'] = processing_time_ms
        
        self._log_structured(
            level='INFO',
            event_type=EventType.CONSENT_CHECK,
            message=f'Consent check: {decision}',
            metadata=metadata,
            request_id=request_id
        )
    
    def log_policy_update(
        self,
        likeness_id: str,
        old_policy: Dict[str, Any],
        new_policy: Dict[str, Any],
        request_id: Optional[str] = None
    ) -> None:
        """
        Log a policy update event.
        
        Requirements: 12.2
        """
        metadata = {
            'likeness_id': likeness_id,
            'old_policy': old_policy,
            'new_policy': new_policy
        }
        
        self._log_structured(
            level='INFO',
            event_type=EventType.POLICY_UPDATE,
            message='Consent policy updated',
            metadata=metadata,
            request_id=request_id
        )
    
    def log_consent_revocation(
        self,
        likeness_id: str,
        old_policy: Dict[str, Any],
        request_id: Optional[str] = None
    ) -> None:
        """
        Log a consent revocation event.
        
        Requirements: 12.2
        """
        metadata = {
            'likeness_id': likeness_id,
            'old_policy': old_policy,
            'revoked': True
        }
        
        self._log_structured(
            level='INFO',
            event_type=EventType.CONSENT_REVOCATION,
            message='Consent revoked - all usage denied',
            metadata=metadata,
            request_id=request_id
        )
    
    def log_error(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> None:
        """
        Log an error event with context.
        
        Requirements: 12.5
        """
        metadata = {
            'error_type': error_type,
            'error_message': error_message,
            'context': context if context is not None else {}
        }
        
        self._log_structured(
            level='ERROR',
            event_type=EventType.ERROR,
            message=f'Error: {error_type}',
            metadata=metadata,
            request_id=request_id
        )
    
    def log_system_event(
        self,
        event_name: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> None:
        """
        Log a general system event.
        """
        self._log_structured(
            level='INFO',
            event_type=EventType.SYSTEM,
            message=message,
            metadata=metadata or {'event_name': event_name},
            request_id=request_id
        )
