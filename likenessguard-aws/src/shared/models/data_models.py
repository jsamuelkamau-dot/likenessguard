"""
Data models for LikenessGuard AWS Prototype.

This module defines all core data structures used throughout the system,
including consent policies, database records, API request/response models,
and enums for type safety.

Requirements:
- 5.1: Consent policy definition with all policy options
- 7.1: Consent registry storage schema
- 10.2: Consent check decision types
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime


class UsageType(str, Enum):
    """
    Types of AI generation usage that can be requested.
    
    Requirements: 5.1
    """
    SELF_EDIT = "SELF_EDIT"
    THIRD_PARTY_EDIT = "THIRD_PARTY_EDIT"
    FACE_SWAP = "FACE_SWAP"
    GENERAL_GENERATION = "GENERAL_GENERATION"


class Decision(str, Enum):
    """
    Possible consent check decisions.
    
    Requirements: 10.2
    """
    ALLOW = "ALLOW"
    DENY = "DENY"
    UNKNOWN = "UNKNOWN"


class ReasonCode(str, Enum):
    """
    Reason codes explaining consent check decisions.
    
    Requirements: 10.6
    """
    # ALLOW reasons
    ALLOW_SELF_EDIT = "ALLOW_SELF_EDIT"
    ALLOW_POLICY_PERMITS = "ALLOW_POLICY_PERMITS"
    
    # DENY reasons
    DENY_POLICY_VIOLATION = "DENY_POLICY_VIOLATION"
    DENY_THIRD_PARTY = "DENY_THIRD_PARTY"
    DENY_FACE_SWAP = "DENY_FACE_SWAP"
    DENY_SEXUALIZED_CONTENT = "DENY_SEXUALIZED_CONTENT"
    DENY_IMPERSONATION = "DENY_IMPERSONATION"
    DENY_POLITICAL_USE = "DENY_POLITICAL_USE"
    
    # UNKNOWN reasons
    UNKNOWN_NO_MATCH = "UNKNOWN_NO_MATCH"
    UNKNOWN_NO_FACE = "UNKNOWN_NO_FACE"
    UNKNOWN_SERVICE_ERROR = "UNKNOWN_SERVICE_ERROR"


@dataclass
class ConsentPolicy:
    """
    Machine-readable consent policy defining how a likeness may be used.
    
    All fields are boolean flags indicating whether specific usage types
    are allowed or denied.
    
    Requirements: 5.1, 5.2
    """
    allow_self_edits: bool = False
    deny_third_party_edits: bool = True
    deny_face_swaps: bool = True
    deny_sexualized_content: bool = True
    deny_impersonation: bool = True
    deny_political_use: bool = True
    
    def to_dict(self) -> Dict[str, bool]:
        """Convert policy to dictionary for DynamoDB storage."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, bool]) -> 'ConsentPolicy':
        """Create policy from dictionary (e.g., from DynamoDB)."""
        return cls(**data)
    
    def is_deny_all(self) -> bool:
        """Check if this is a deny-all policy (revoked consent)."""
        return (
            not self.allow_self_edits and
            self.deny_third_party_edits and
            self.deny_face_swaps and
            self.deny_sexualized_content and
            self.deny_impersonation and
            self.deny_political_use
        )


@dataclass
class UserMetadata:
    """
    User metadata associated with a likeness registration.
    
    Requirements: 7.1
    """
    user_id: str
    email: Optional[str] = None
    registration_source: str = "api"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary for DynamoDB storage."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserMetadata':
        """Create metadata from dictionary (e.g., from DynamoDB)."""
        return cls(**data)


@dataclass
class ConsentRecord:
    """
    Complete consent record stored in DynamoDB ConsentRegistry table.
    
    This is the primary data structure for the consent registry, containing
    the likeness fingerprint, consent policy, and metadata.
    
    Note: For the prototype, we store both the fingerprint_hash (for privacy)
    and the fingerprint_embedding (for similarity matching). In production,
    the embedding would be encrypted at rest.
    
    Requirements: 7.1
    """
    likeness_id: str  # Partition key (UUID)
    fingerprint_hash: str  # SHA-256 hash of face embedding
    fingerprint_embedding: List[float]  # Normalized embedding for similarity matching
    consent_policy: ConsentPolicy
    user_metadata: UserMetadata
    created_at: int  # Unix timestamp
    modified_at: int  # Unix timestamp
    
    def to_dynamodb_item(self) -> Dict[str, Any]:
        """
        Convert record to DynamoDB item format.
        
        Returns dictionary with proper attribute names matching DynamoDB schema.
        """
        return {
            'LikenessID': self.likeness_id,
            'FingerprintHash': self.fingerprint_hash,
            'FingerprintEmbedding': self.fingerprint_embedding,
            'ConsentPolicy': self.consent_policy.to_dict(),
            'UserMetadata': self.user_metadata.to_dict(),
            'CreatedAt': self.created_at,
            'ModifiedAt': self.modified_at
        }
    
    @classmethod
    def from_dynamodb_item(cls, item: Dict[str, Any]) -> 'ConsentRecord':
        """
        Create record from DynamoDB item.
        
        Args:
            item: DynamoDB item with attribute names
            
        Returns:
            ConsentRecord instance
        """
        return cls(
            likeness_id=item['LikenessID'],
            fingerprint_hash=item['FingerprintHash'],
            fingerprint_embedding=item['FingerprintEmbedding'],
            consent_policy=ConsentPolicy.from_dict(item['ConsentPolicy']),
            user_metadata=UserMetadata.from_dict(item['UserMetadata']),
            created_at=item['CreatedAt'],
            modified_at=item['ModifiedAt']
        )


@dataclass
class AuditRecord:
    """
    Audit log record for consent check history.
    
    Stored in DynamoDB AuditLog table with TTL for automatic deletion
    after 180 days.
    
    Requirements: 12.1, 13.1
    """
    query_id: str  # Partition key (UUID)
    timestamp: int  # Sort key (Unix timestamp)
    decision: Decision
    reason_code: ReasonCode
    requester_id: str
    usage_type: UsageType
    likeness_id: Optional[str] = None  # Present if match found
    similarity_score: Optional[float] = None  # Present if match found
    ttl: Optional[int] = None  # Auto-delete timestamp (180 days)
    
    def to_dynamodb_item(self) -> Dict[str, Any]:
        """
        Convert record to DynamoDB item format.
        
        Returns dictionary with proper attribute names matching DynamoDB schema.
        """
        item = {
            'QueryID': self.query_id,
            'Timestamp': self.timestamp,
            'Decision': self.decision.value,
            'ReasonCode': self.reason_code.value,
            'RequesterID': self.requester_id,
            'UsageType': self.usage_type.value
        }
        
        # Add optional fields if present
        if self.likeness_id is not None:
            item['LikenessID'] = self.likeness_id
        if self.similarity_score is not None:
            item['SimilarityScore'] = self.similarity_score
        if self.ttl is not None:
            item['TTL'] = self.ttl
            
        return item
    
    @classmethod
    def from_dynamodb_item(cls, item: Dict[str, Any]) -> 'AuditRecord':
        """
        Create record from DynamoDB item.
        
        Args:
            item: DynamoDB item with attribute names
            
        Returns:
            AuditRecord instance
        """
        return cls(
            query_id=item['QueryID'],
            timestamp=item['Timestamp'],
            decision=Decision(item['Decision']),
            reason_code=ReasonCode(item['ReasonCode']),
            requester_id=item['RequesterID'],
            usage_type=UsageType(item['UsageType']),
            likeness_id=item.get('LikenessID'),
            similarity_score=item.get('SimilarityScore'),
            ttl=item.get('TTL')
        )


@dataclass
class ConsentCheckRequest:
    """
    Request model for consent check API.
    
    Requirements: 8.1, 11.3
    """
    reference_image: str  # Base64 encoded image or S3 key
    usage_type: UsageType
    requester_id: str
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConsentCheckRequest':
        """
        Create request from dictionary (e.g., from API Gateway event).
        
        Args:
            data: Dictionary with request parameters
            
        Returns:
            ConsentCheckRequest instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if 'reference_image' not in data:
            raise ValueError("Missing required field: reference_image")
        if 'usage_type' not in data:
            raise ValueError("Missing required field: usage_type")
        if 'requester_id' not in data:
            raise ValueError("Missing required field: requester_id")
        
        try:
            usage_type = UsageType(data['usage_type'])
        except ValueError:
            raise ValueError(f"Invalid usage_type: {data['usage_type']}")
        
        return cls(
            reference_image=data['reference_image'],
            usage_type=usage_type,
            requester_id=data['requester_id']
        )


@dataclass
class ConsentCheckResponse:
    """
    Response model for consent check API.
    
    Requirements: 10.2, 10.6
    """
    decision: Decision
    reason_code: ReasonCode
    timestamp: int
    likeness_id: Optional[str] = None
    similarity_score: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert response to dictionary for API Gateway response.
        
        Returns:
            Dictionary with response data
        """
        response = {
            'decision': self.decision.value,
            'reason_code': self.reason_code.value,
            'timestamp': self.timestamp
        }
        
        # Add optional fields if present
        if self.likeness_id is not None:
            response['likeness_id'] = self.likeness_id
        if self.similarity_score is not None:
            response['similarity_score'] = self.similarity_score
            
        return response


@dataclass
class RegistrationRequest:
    """
    Request model for likeness registration.
    
    Requirements: 2.1, 5.1
    """
    user_id: str
    photo_keys: list[str]  # S3 object keys
    consent_policy: ConsentPolicy
    email: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RegistrationRequest':
        """
        Create request from dictionary (e.g., from API Gateway event).
        
        Args:
            data: Dictionary with request parameters
            
        Returns:
            RegistrationRequest instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if 'user_id' not in data:
            raise ValueError("Missing required field: user_id")
        if 'photo_keys' not in data:
            raise ValueError("Missing required field: photo_keys")
        if 'consent_policy' not in data:
            raise ValueError("Missing required field: consent_policy")
        
        # Validate photo count
        photo_keys = data['photo_keys']
        if not isinstance(photo_keys, list):
            raise ValueError("photo_keys must be a list")
        if len(photo_keys) < 5 or len(photo_keys) > 10:
            raise ValueError(f"photo_keys must contain 5-10 items, got {len(photo_keys)}")
        
        # Parse consent policy
        consent_policy = ConsentPolicy.from_dict(data['consent_policy'])
        
        return cls(
            user_id=data['user_id'],
            photo_keys=photo_keys,
            consent_policy=consent_policy,
            email=data.get('email')
        )


@dataclass
class RegistrationResponse:
    """
    Response model for likeness registration.
    
    Requirements: 1.1
    """
    likeness_id: str
    status: str  # 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'
    processed_photos: int
    errors: Optional[list[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert response to dictionary for API Gateway response.
        
        Returns:
            Dictionary with response data
        """
        response = {
            'likeness_id': self.likeness_id,
            'status': self.status,
            'processed_photos': self.processed_photos
        }
        
        if self.errors:
            response['errors'] = self.errors
            
        return response


@dataclass
class ConsentUpdateRequest:
    """
    Request model for consent policy updates.
    
    Requirements: 6.1
    """
    likeness_id: str
    new_policy: ConsentPolicy
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConsentUpdateRequest':
        """
        Create request from dictionary (API Gateway request body).
        
        Args:
            data: Dictionary with request data
            
        Returns:
            ConsentUpdateRequest instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        if 'likeness_id' not in data:
            raise ValueError("Missing required field: likeness_id")
        
        if 'new_policy' not in data:
            raise ValueError("Missing required field: new_policy")
        
        # Parse consent policy
        try:
            new_policy = ConsentPolicy.from_dict(data['new_policy'])
        except Exception as e:
            raise ValueError(f"Invalid consent policy: {str(e)}")
        
        return cls(
            likeness_id=data['likeness_id'],
            new_policy=new_policy
        )


@dataclass
class ConsentUpdateResponse:
    """
    Response model for consent policy updates.
    
    Requirements: 6.1, 6.3
    """
    likeness_id: str
    status: str  # 'SUCCESS', 'FAILURE'
    message: str
    modified_at: int  # Unix timestamp
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert response to dictionary for API Gateway response.
        
        Returns:
            Dictionary with response data
        """
        return {
            'likeness_id': self.likeness_id,
            'status': self.status,
            'message': self.message,
            'modified_at': self.modified_at
        }


@dataclass
class ConsentRevokeRequest:
    """
    Request model for consent revocation.
    
    Requirements: 6.2
    """
    likeness_id: str
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConsentRevokeRequest':
        """
        Create request from dictionary (API Gateway request body).
        
        Args:
            data: Dictionary with request data
            
        Returns:
            ConsentRevokeRequest instance
            
        Raises:
            ValueError: If required fields are missing
        """
        if 'likeness_id' not in data:
            raise ValueError("Missing required field: likeness_id")
        
        return cls(likeness_id=data['likeness_id'])


@dataclass
class ConsentRevokeResponse:
    """
    Response model for consent revocation.
    
    Requirements: 6.2
    """
    likeness_id: str
    status: str  # 'SUCCESS', 'FAILURE'
    message: str
    revoked_at: int  # Unix timestamp
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert response to dictionary for API Gateway response.
        
        Returns:
            Dictionary with response data
        """
        return {
            'likeness_id': self.likeness_id,
            'status': self.status,
            'message': self.message,
            'revoked_at': self.revoked_at
        }


@dataclass
class EvidenceRetrievalRequest:
    """
    Request model for evidence retrieval.

    Requirements: 13.3
    """
    likeness_id: Optional[str] = None  # Made optional to support retrieving all records
    limit: Optional[int] = 50  # Max records to return
    last_evaluated_key: Optional[str] = None  # For pagination

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EvidenceRetrievalRequest':
        """
        Create request from dictionary (API Gateway request body or query params).

        Args:
            data: Dictionary with request data

        Returns:
            EvidenceRetrievalRequest instance

        Raises:
            ValueError: If required fields are missing
        """
        # likeness_id is now optional - if not provided, retrieve all records
        return cls(
            likeness_id=data.get('likeness_id'),
            limit=data.get('limit', 50),
            last_evaluated_key=data.get('last_evaluated_key')
        )



@dataclass
class EvidenceRecord:
    """
    Evidence record for a consent check decision.
    
    This is essentially an AuditRecord but formatted for user-facing evidence retrieval.
    
    Requirements: 13.1, 13.4
    """
    query_id: str
    timestamp: int  # Unix timestamp
    decision: str  # ALLOW, DENY, UNKNOWN
    reason_code: str
    similarity_score: Optional[float]
    requester_id: str
    usage_type: str
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert evidence record to dictionary for API response.
        
        Returns:
            Dictionary with evidence data
        """
        return {
            'query_id': self.query_id,
            'timestamp': self.timestamp,
            'decision': self.decision,
            'reason_code': self.reason_code,
            'similarity_score': self.similarity_score,
            'requester_id': self.requester_id,
            'usage_type': self.usage_type
        }
    
    @classmethod
    def from_audit_record(cls, audit_record: 'AuditRecord') -> 'EvidenceRecord':
        """
        Create evidence record from audit record.
        
        Args:
            audit_record: AuditRecord instance
            
        Returns:
            EvidenceRecord instance
        """
        return cls(
            query_id=audit_record.query_id,
            timestamp=audit_record.timestamp,
            decision=audit_record.decision.value if isinstance(audit_record.decision, Decision) else audit_record.decision,
            reason_code=audit_record.reason_code.value if isinstance(audit_record.reason_code, ReasonCode) else audit_record.reason_code,
            similarity_score=audit_record.similarity_score,
            requester_id=audit_record.requester_id,
            usage_type=audit_record.usage_type
        )


@dataclass
class EvidenceRetrievalResponse:
    """
    Response model for evidence retrieval.
    
    Requirements: 13.3
    """
    likeness_id: str
    evidence_records: List[EvidenceRecord]
    count: int
    last_evaluated_key: Optional[str] = None  # For pagination
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert response to dictionary for API Gateway response.
        
        Returns:
            Dictionary with response data
        """
        result = {
            'likeness_id': self.likeness_id,
            'evidence_records': [record.to_dict() for record in self.evidence_records],
            'count': self.count
        }
        
        if self.last_evaluated_key:
            result['last_evaluated_key'] = self.last_evaluated_key
        
        return result
