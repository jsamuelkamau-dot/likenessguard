"""
Unit tests for data models.

These tests verify that data models can be created, serialized, and
deserialized correctly.
"""

import pytest
from datetime import datetime
from src.shared.models import (
    UsageType,
    Decision,
    ReasonCode,
    ConsentPolicy,
    UserMetadata,
    ConsentRecord,
    AuditRecord,
    ConsentCheckRequest,
    ConsentCheckResponse,
    RegistrationRequest,
    RegistrationResponse,
)


class TestEnums:
    """Test enum definitions."""
    
    def test_usage_type_values(self):
        """Verify UsageType enum has all required values."""
        assert UsageType.SELF_EDIT.value == "SELF_EDIT"
        assert UsageType.THIRD_PARTY_EDIT.value == "THIRD_PARTY_EDIT"
        assert UsageType.FACE_SWAP.value == "FACE_SWAP"
        assert UsageType.GENERAL_GENERATION.value == "GENERAL_GENERATION"
    
    def test_decision_values(self):
        """Verify Decision enum has all required values."""
        assert Decision.ALLOW.value == "ALLOW"
        assert Decision.DENY.value == "DENY"
        assert Decision.UNKNOWN.value == "UNKNOWN"
    
    def test_reason_code_values(self):
        """Verify ReasonCode enum has required values."""
        # ALLOW reasons
        assert ReasonCode.ALLOW_SELF_EDIT.value == "ALLOW_SELF_EDIT"
        assert ReasonCode.ALLOW_POLICY_PERMITS.value == "ALLOW_POLICY_PERMITS"
        
        # DENY reasons
        assert ReasonCode.DENY_POLICY_VIOLATION.value == "DENY_POLICY_VIOLATION"
        assert ReasonCode.DENY_THIRD_PARTY.value == "DENY_THIRD_PARTY"
        assert ReasonCode.DENY_FACE_SWAP.value == "DENY_FACE_SWAP"
        
        # UNKNOWN reasons
        assert ReasonCode.UNKNOWN_NO_MATCH.value == "UNKNOWN_NO_MATCH"
        assert ReasonCode.UNKNOWN_NO_FACE.value == "UNKNOWN_NO_FACE"


class TestConsentPolicy:
    """Test ConsentPolicy data model."""
    
    def test_default_policy_is_restrictive(self):
        """Default policy should deny most usage."""
        policy = ConsentPolicy()
        assert policy.allow_self_edits is False
        assert policy.deny_third_party_edits is True
        assert policy.deny_face_swaps is True
        assert policy.deny_sexualized_content is True
        assert policy.deny_impersonation is True
        assert policy.deny_political_use is True
    
    def test_policy_to_dict(self):
        """Policy should serialize to dictionary."""
        policy = ConsentPolicy(allow_self_edits=True, deny_face_swaps=False)
        data = policy.to_dict()
        
        assert isinstance(data, dict)
        assert data['allow_self_edits'] is True
        assert data['deny_face_swaps'] is False
        assert data['deny_third_party_edits'] is True
    
    def test_policy_from_dict(self):
        """Policy should deserialize from dictionary."""
        data = {
            'allow_self_edits': True,
            'deny_third_party_edits': False,
            'deny_face_swaps': True,
            'deny_sexualized_content': True,
            'deny_impersonation': False,
            'deny_political_use': True
        }
        policy = ConsentPolicy.from_dict(data)
        
        assert policy.allow_self_edits is True
        assert policy.deny_third_party_edits is False
        assert policy.deny_impersonation is False
    
    def test_policy_round_trip(self):
        """Policy should survive serialization round trip."""
        original = ConsentPolicy(
            allow_self_edits=True,
            deny_third_party_edits=False,
            deny_face_swaps=True,
            deny_sexualized_content=False,
            deny_impersonation=True,
            deny_political_use=False
        )
        
        data = original.to_dict()
        restored = ConsentPolicy.from_dict(data)
        
        assert restored.allow_self_edits == original.allow_self_edits
        assert restored.deny_third_party_edits == original.deny_third_party_edits
        assert restored.deny_face_swaps == original.deny_face_swaps
        assert restored.deny_sexualized_content == original.deny_sexualized_content
        assert restored.deny_impersonation == original.deny_impersonation
        assert restored.deny_political_use == original.deny_political_use
    
    def test_is_deny_all(self):
        """Should correctly identify deny-all policies."""
        deny_all = ConsentPolicy()  # Default is deny-all
        assert deny_all.is_deny_all() is True
        
        permissive = ConsentPolicy(allow_self_edits=True)
        assert permissive.is_deny_all() is False
        
        partial = ConsentPolicy(deny_face_swaps=False)
        assert partial.is_deny_all() is False


class TestUserMetadata:
    """Test UserMetadata data model."""
    
    def test_metadata_creation(self):
        """Metadata should be created with required fields."""
        metadata = UserMetadata(user_id="user123", email="test@example.com")
        assert metadata.user_id == "user123"
        assert metadata.email == "test@example.com"
        assert metadata.registration_source == "api"
    
    def test_metadata_round_trip(self):
        """Metadata should survive serialization round trip."""
        original = UserMetadata(
            user_id="user456",
            email="user@test.com",
            registration_source="web"
        )
        
        data = original.to_dict()
        restored = UserMetadata.from_dict(data)
        
        assert restored.user_id == original.user_id
        assert restored.email == original.email
        assert restored.registration_source == original.registration_source


class TestConsentRecord:
    """Test ConsentRecord data model."""
    
    def test_record_creation(self):
        """Record should be created with all required fields."""
        policy = ConsentPolicy(allow_self_edits=True)
        metadata = UserMetadata(user_id="user123")
        timestamp = int(datetime.now().timestamp())
        embedding = [0.1] * 512  # Sample 512-dimensional embedding
        
        record = ConsentRecord(
            likeness_id="likeness-123",
            fingerprint_hash="abc123hash",
            fingerprint_embedding=embedding,
            consent_policy=policy,
            user_metadata=metadata,
            created_at=timestamp,
            modified_at=timestamp
        )
        
        assert record.likeness_id == "likeness-123"
        assert record.fingerprint_hash == "abc123hash"
        assert record.fingerprint_embedding == embedding
        assert record.consent_policy.allow_self_edits is True
        assert record.user_metadata.user_id == "user123"
    
    def test_record_to_dynamodb_item(self):
        """Record should convert to DynamoDB item format."""
        policy = ConsentPolicy(allow_self_edits=True)
        metadata = UserMetadata(user_id="user123")
        timestamp = int(datetime.now().timestamp())
        embedding = [0.1] * 512  # Sample 512-dimensional embedding
        
        record = ConsentRecord(
            likeness_id="likeness-123",
            fingerprint_hash="abc123hash",
            fingerprint_embedding=embedding,
            consent_policy=policy,
            user_metadata=metadata,
            created_at=timestamp,
            modified_at=timestamp
        )
        
        item = record.to_dynamodb_item()
        
        assert item['LikenessID'] == "likeness-123"
        assert item['FingerprintHash'] == "abc123hash"
        assert 'FingerprintEmbedding' in item
        assert isinstance(item['ConsentPolicy'], dict)
        assert isinstance(item['UserMetadata'], dict)
        assert item['CreatedAt'] == timestamp
        assert item['ModifiedAt'] == timestamp
    
    def test_record_from_dynamodb_item(self):
        """Record should be created from DynamoDB item."""
        timestamp = int(datetime.now().timestamp())
        embedding = [0.1] * 512  # Sample 512-dimensional embedding
        item = {
            'LikenessID': 'likeness-456',
            'FingerprintHash': 'def456hash',
            'FingerprintEmbedding': embedding,
            'ConsentPolicy': {
                'allow_self_edits': True,
                'deny_third_party_edits': False,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            },
            'UserMetadata': {
                'user_id': 'user456',
                'email': 'test@example.com',
                'registration_source': 'api'
            },
            'CreatedAt': timestamp,
            'ModifiedAt': timestamp
        }
        
        record = ConsentRecord.from_dynamodb_item(item)
        
        assert record.likeness_id == 'likeness-456'
        assert record.fingerprint_hash == 'def456hash'
        assert record.fingerprint_embedding == embedding
        assert record.consent_policy.allow_self_edits is True
        assert record.user_metadata.user_id == 'user456'


class TestAuditRecord:
    """Test AuditRecord data model."""
    
    def test_audit_record_creation(self):
        """Audit record should be created with required fields."""
        timestamp = int(datetime.now().timestamp())
        
        record = AuditRecord(
            query_id="query-123",
            timestamp=timestamp,
            decision=Decision.ALLOW,
            reason_code=ReasonCode.ALLOW_SELF_EDIT,
            requester_id="requester-123",
            usage_type=UsageType.SELF_EDIT,
            likeness_id="likeness-123",
            similarity_score=0.92
        )
        
        assert record.query_id == "query-123"
        assert record.decision == Decision.ALLOW
        assert record.reason_code == ReasonCode.ALLOW_SELF_EDIT
        assert record.similarity_score == 0.92
    
    def test_audit_record_to_dynamodb_item(self):
        """Audit record should convert to DynamoDB item format."""
        timestamp = int(datetime.now().timestamp())
        
        record = AuditRecord(
            query_id="query-123",
            timestamp=timestamp,
            decision=Decision.DENY,
            reason_code=ReasonCode.DENY_FACE_SWAP,
            requester_id="requester-123",
            usage_type=UsageType.FACE_SWAP,
            likeness_id="likeness-123",
            similarity_score=0.88,
            ttl=timestamp + 15552000  # 180 days
        )
        
        item = record.to_dynamodb_item()
        
        assert item['QueryID'] == "query-123"
        assert item['Decision'] == "DENY"
        assert item['ReasonCode'] == "DENY_FACE_SWAP"
        assert item['LikenessID'] == "likeness-123"
        assert item['SimilarityScore'] == 0.88
        assert 'TTL' in item


class TestConsentCheckRequest:
    """Test ConsentCheckRequest data model."""
    
    def test_request_from_dict(self):
        """Request should be created from dictionary."""
        data = {
            'reference_image': 'base64encodedimage',
            'usage_type': 'SELF_EDIT',
            'requester_id': 'requester-123'
        }
        
        request = ConsentCheckRequest.from_dict(data)
        
        assert request.reference_image == 'base64encodedimage'
        assert request.usage_type == UsageType.SELF_EDIT
        assert request.requester_id == 'requester-123'
    
    def test_request_missing_fields(self):
        """Request should raise error for missing fields."""
        with pytest.raises(ValueError, match="Missing required field: reference_image"):
            ConsentCheckRequest.from_dict({'usage_type': 'SELF_EDIT', 'requester_id': 'req'})
        
        with pytest.raises(ValueError, match="Missing required field: usage_type"):
            ConsentCheckRequest.from_dict({'reference_image': 'img', 'requester_id': 'req'})
    
    def test_request_invalid_usage_type(self):
        """Request should raise error for invalid usage type."""
        data = {
            'reference_image': 'img',
            'usage_type': 'INVALID_TYPE',
            'requester_id': 'req'
        }
        
        with pytest.raises(ValueError, match="Invalid usage_type"):
            ConsentCheckRequest.from_dict(data)


class TestConsentCheckResponse:
    """Test ConsentCheckResponse data model."""
    
    def test_response_to_dict(self):
        """Response should convert to dictionary."""
        timestamp = int(datetime.now().timestamp())
        
        response = ConsentCheckResponse(
            decision=Decision.ALLOW,
            reason_code=ReasonCode.ALLOW_SELF_EDIT,
            timestamp=timestamp,
            likeness_id="likeness-123",
            similarity_score=0.91
        )
        
        data = response.to_dict()
        
        assert data['decision'] == 'ALLOW'
        assert data['reason_code'] == 'ALLOW_SELF_EDIT'
        assert data['timestamp'] == timestamp
        assert data['likeness_id'] == "likeness-123"
        assert data['similarity_score'] == 0.91


class TestRegistrationRequest:
    """Test RegistrationRequest data model."""
    
    def test_registration_request_from_dict(self):
        """Registration request should be created from dictionary."""
        data = {
            'user_id': 'user123',
            'photo_keys': ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg'],
            'consent_policy': {
                'allow_self_edits': True,
                'deny_third_party_edits': True,
                'deny_face_swaps': True,
                'deny_sexualized_content': True,
                'deny_impersonation': True,
                'deny_political_use': True
            },
            'email': 'user@example.com'
        }
        
        request = RegistrationRequest.from_dict(data)
        
        assert request.user_id == 'user123'
        assert len(request.photo_keys) == 5
        assert request.consent_policy.allow_self_edits is True
        assert request.email == 'user@example.com'
    
    def test_registration_request_photo_count_validation(self):
        """Registration request should validate photo count."""
        # Too few photos
        data = {
            'user_id': 'user123',
            'photo_keys': ['photo1.jpg', 'photo2.jpg'],
            'consent_policy': {'allow_self_edits': False, 'deny_third_party_edits': True,
                             'deny_face_swaps': True, 'deny_sexualized_content': True,
                             'deny_impersonation': True, 'deny_political_use': True}
        }
        
        with pytest.raises(ValueError, match="photo_keys must contain 5-10 items"):
            RegistrationRequest.from_dict(data)
        
        # Too many photos
        data['photo_keys'] = [f'photo{i}.jpg' for i in range(15)]
        
        with pytest.raises(ValueError, match="photo_keys must contain 5-10 items"):
            RegistrationRequest.from_dict(data)


class TestRegistrationResponse:
    """Test RegistrationResponse data model."""
    
    def test_registration_response_to_dict(self):
        """Registration response should convert to dictionary."""
        response = RegistrationResponse(
            likeness_id='likeness-123',
            status='SUCCESS',
            processed_photos=5,
            errors=None
        )
        
        data = response.to_dict()
        
        assert data['likeness_id'] == 'likeness-123'
        assert data['status'] == 'SUCCESS'
        assert data['processed_photos'] == 5
        assert 'errors' not in data
    
    def test_registration_response_with_errors(self):
        """Registration response should include errors if present."""
        response = RegistrationResponse(
            likeness_id='likeness-123',
            status='PARTIAL_SUCCESS',
            processed_photos=3,
            errors=['Photo 4 had no face detected', 'Photo 5 was invalid format']
        )
        
        data = response.to_dict()
        
        assert data['status'] == 'PARTIAL_SUCCESS'
        assert len(data['errors']) == 2
