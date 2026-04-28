"""
Shared data models for LikenessGuard AWS Prototype.

This module exports all data models, enums, and type definitions used
throughout the system.
"""

from .data_models import (
    # Enums
    UsageType,
    Decision,
    ReasonCode,
    
    # Data models
    ConsentPolicy,
    UserMetadata,
    ConsentRecord,
    AuditRecord,
    
    # API models
    ConsentCheckRequest,
    ConsentCheckResponse,
    RegistrationRequest,
    RegistrationResponse,
)

__all__ = [
    # Enums
    'UsageType',
    'Decision',
    'ReasonCode',
    
    # Data models
    'ConsentPolicy',
    'UserMetadata',
    'ConsentRecord',
    'AuditRecord',
    
    # API models
    'ConsentCheckRequest',
    'ConsentCheckResponse',
    'RegistrationRequest',
    'RegistrationResponse',
]
