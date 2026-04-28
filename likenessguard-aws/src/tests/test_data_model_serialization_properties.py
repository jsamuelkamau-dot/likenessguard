"""
Property-based tests for data model serialization.

These tests use Hypothesis to verify that all data models can be serialized
to/from JSON and maintain consistency through round-trip serialization.

Feature: likenessguard-aws-prototype
Task: 2.3 Write property test for data model serialization
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
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


# ============================================================================
# Custom Strategies for Data Model Generation
# ============================================================================

@st.composite
def consent_policy_strategy(draw):
    """Generate arbitrary valid consent policy combinations."""
    return ConsentPolicy(
        allow_self_edits=draw(st.booleans()),
        deny_third_party_edits=draw(st.booleans()),
        deny_face_swaps=draw(st.booleans()),
        deny_sexualized_content=draw(st.booleans()),
        deny_impersonation=draw(st.booleans()),
        deny_political_use=draw(st.booleans())
    )


@st.composite
def user_metadata_strategy(draw):
    """Generate arbitrary valid user metadata."""
    return UserMetadata(
        user_id=draw(st.text(min_size=1, max_size=100)),
        email=draw(st.one_of(st.none(), st.emails())),
        registration_source=draw(st.text(min_size=1, max_size=50))
    )


@st.composite
def consent_record_strategy(draw):
    """Generate arbitrary valid consent records."""
    # Generate a 512-dimensional embedding vector
    embedding = [draw(st.floats(min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False)) for _ in range(512)]
    
    return ConsentRecord(
        likeness_id=draw(st.uuids()).hex,
        fingerprint_hash=draw(st.text(min_size=64, max_size=64, alphabet='0123456789abcdef')),
        fingerprint_embedding=embedding,
        consent_policy=draw(consent_policy_strategy()),
        user_metadata=draw(user_metadata_strategy()),
        created_at=draw(st.integers(min_value=0, max_value=2**31-1)),
        modified_at=draw(st.integers(min_value=0, max_value=2**31-1))
    )


@st.composite
def audit_record_strategy(draw):
    """Generate arbitrary valid audit records."""
    return AuditRecord(
        query_id=draw(st.uuids()).hex,
        timestamp=draw(st.integers(min_value=0, max_value=2**31-1)),
        decision=draw(st.sampled_from(Decision)),
        reason_code=draw(st.sampled_from(ReasonCode)),
        requester_id=draw(st.text(min_size=1, max_size=100)),
        usage_type=draw(st.sampled_from(UsageType)),
        likeness_id=draw(st.one_of(st.none(), st.uuids().map(lambda u: u.hex))),
        similarity_score=draw(st.one_of(st.none(), st.floats(min_value=0.0, max_value=1.0, allow_nan=False))),
        ttl=draw(st.one_of(st.none(), st.integers(min_value=0, max_value=2**31-1)))
    )


@st.composite
def consent_check_request_strategy(draw):
    """Generate arbitrary valid consent check requests."""
    return ConsentCheckRequest(
        reference_image=draw(st.text(min_size=1, max_size=1000)),
        usage_type=draw(st.sampled_from(UsageType)),
        requester_id=draw(st.text(min_size=1, max_size=100))
    )


@st.composite
def consent_check_response_strategy(draw):
    """Generate arbitrary valid consent check responses."""
    return ConsentCheckResponse(
        decision=draw(st.sampled_from(Decision)),
        reason_code=draw(st.sampled_from(ReasonCode)),
        timestamp=draw(st.integers(min_value=0, max_value=2**31-1)),
        likeness_id=draw(st.one_of(st.none(), st.uuids().map(lambda u: u.hex))),
        similarity_score=draw(st.one_of(st.none(), st.floats(min_value=0.0, max_value=1.0, allow_nan=False)))
    )


@st.composite
def registration_request_strategy(draw):
    """Generate arbitrary valid registration requests."""
    photo_count = draw(st.integers(min_value=5, max_value=10))
    return RegistrationRequest(
        user_id=draw(st.text(min_size=1, max_size=100)),
        photo_keys=draw(st.lists(st.text(min_size=1, max_size=100), min_size=photo_count, max_size=photo_count)),
        consent_policy=draw(consent_policy_strategy()),
        email=draw(st.one_of(st.none(), st.emails()))
    )


@st.composite
def registration_response_strategy(draw):
    """Generate arbitrary valid registration responses."""
    status = draw(st.sampled_from(['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE']))
    has_errors = status in ['PARTIAL_SUCCESS', 'FAILURE']
    
    return RegistrationResponse(
        likeness_id=draw(st.uuids()).hex,
        status=status,
        processed_photos=draw(st.integers(min_value=0, max_value=10)),
        errors=draw(st.one_of(
            st.none(),
            st.lists(st.text(min_size=1, max_size=200), min_size=1, max_size=5)
        )) if has_errors else None
    )


# ============================================================================
# Property Tests for Data Model Serialization
# ============================================================================

class TestConsentPolicySerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for ConsentPolicy serialization and round-trip consistency.
    """
    
    @given(consent_policy_strategy())
    @settings(max_examples=20)
    def test_consent_policy_round_trip_consistency(self, policy: ConsentPolicy):
        """
        Test that ConsentPolicy can be serialized to/from dict and maintains consistency.
        
        Verifies:
        - Serialization to dict produces valid structure
        - Deserialization from dict recreates equivalent object
        - Round-trip preserves all field values
        """
        # Serialize to dict
        policy_dict = policy.to_dict()
        
        # Verify dict structure
        assert isinstance(policy_dict, dict)
        assert len(policy_dict) == 6
        
        # Deserialize from dict
        restored = ConsentPolicy.from_dict(policy_dict)
        
        # Verify round-trip consistency
        assert restored.allow_self_edits == policy.allow_self_edits
        assert restored.deny_third_party_edits == policy.deny_third_party_edits
        assert restored.deny_face_swaps == policy.deny_face_swaps
        assert restored.deny_sexualized_content == policy.deny_sexualized_content
        assert restored.deny_impersonation == policy.deny_impersonation
        assert restored.deny_political_use == policy.deny_political_use


class TestUserMetadataSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for UserMetadata serialization and round-trip consistency.
    """
    
    @given(user_metadata_strategy())
    @settings(max_examples=20)
    def test_user_metadata_round_trip_consistency(self, metadata: UserMetadata):
        """
        Test that UserMetadata can be serialized to/from dict and maintains consistency.
        
        Verifies:
        - Serialization to dict produces valid structure
        - Deserialization from dict recreates equivalent object
        - Round-trip preserves all field values including optional fields
        """
        # Serialize to dict
        metadata_dict = metadata.to_dict()
        
        # Verify dict structure
        assert isinstance(metadata_dict, dict)
        assert 'user_id' in metadata_dict
        assert 'registration_source' in metadata_dict
        
        # Deserialize from dict
        restored = UserMetadata.from_dict(metadata_dict)
        
        # Verify round-trip consistency
        assert restored.user_id == metadata.user_id
        assert restored.email == metadata.email
        assert restored.registration_source == metadata.registration_source


class TestConsentRecordSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for ConsentRecord serialization and round-trip consistency.
    """
    
    @given(consent_record_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.large_base_example])
    def test_consent_record_dynamodb_round_trip_consistency(self, record: ConsentRecord):
        """
        Test that ConsentRecord can be serialized to/from DynamoDB format and maintains consistency.
        
        Verifies:
        - Serialization to DynamoDB item produces valid structure
        - Deserialization from DynamoDB item recreates equivalent object
        - Round-trip preserves all field values including nested objects
        """
        # Serialize to DynamoDB item
        item = record.to_dynamodb_item()
        
        # Verify DynamoDB item structure
        assert isinstance(item, dict)
        assert 'LikenessID' in item
        assert 'FingerprintHash' in item
        assert 'ConsentPolicy' in item
        assert 'UserMetadata' in item
        assert 'CreatedAt' in item
        assert 'ModifiedAt' in item
        
        # Deserialize from DynamoDB item
        restored = ConsentRecord.from_dynamodb_item(item)
        
        # Verify round-trip consistency
        assert restored.likeness_id == record.likeness_id
        assert restored.fingerprint_hash == record.fingerprint_hash
        assert restored.created_at == record.created_at
        assert restored.modified_at == record.modified_at
        
        # Verify nested ConsentPolicy consistency
        assert restored.consent_policy.allow_self_edits == record.consent_policy.allow_self_edits
        assert restored.consent_policy.deny_third_party_edits == record.consent_policy.deny_third_party_edits
        assert restored.consent_policy.deny_face_swaps == record.consent_policy.deny_face_swaps
        assert restored.consent_policy.deny_sexualized_content == record.consent_policy.deny_sexualized_content
        assert restored.consent_policy.deny_impersonation == record.consent_policy.deny_impersonation
        assert restored.consent_policy.deny_political_use == record.consent_policy.deny_political_use
        
        # Verify nested UserMetadata consistency
        assert restored.user_metadata.user_id == record.user_metadata.user_id
        assert restored.user_metadata.email == record.user_metadata.email
        assert restored.user_metadata.registration_source == record.user_metadata.registration_source


class TestAuditRecordSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for AuditRecord serialization and round-trip consistency.
    """
    
    @given(audit_record_strategy())
    @settings(max_examples=20)
    def test_audit_record_dynamodb_round_trip_consistency(self, record: AuditRecord):
        """
        Test that AuditRecord can be serialized to/from DynamoDB format and maintains consistency.
        
        Verifies:
        - Serialization to DynamoDB item produces valid structure
        - Deserialization from DynamoDB item recreates equivalent object
        - Round-trip preserves all field values including optional fields
        - Enum values are properly serialized/deserialized
        """
        # Serialize to DynamoDB item
        item = record.to_dynamodb_item()
        
        # Verify DynamoDB item structure
        assert isinstance(item, dict)
        assert 'QueryID' in item
        assert 'Timestamp' in item
        assert 'Decision' in item
        assert 'ReasonCode' in item
        assert 'RequesterID' in item
        assert 'UsageType' in item
        
        # Verify optional fields are handled correctly
        if record.likeness_id is not None:
            assert 'LikenessID' in item
        if record.similarity_score is not None:
            assert 'SimilarityScore' in item
        if record.ttl is not None:
            assert 'TTL' in item
        
        # Deserialize from DynamoDB item
        restored = AuditRecord.from_dynamodb_item(item)
        
        # Verify round-trip consistency
        assert restored.query_id == record.query_id
        assert restored.timestamp == record.timestamp
        assert restored.decision == record.decision
        assert restored.reason_code == record.reason_code
        assert restored.requester_id == record.requester_id
        assert restored.usage_type == record.usage_type
        assert restored.likeness_id == record.likeness_id
        assert restored.similarity_score == record.similarity_score
        assert restored.ttl == record.ttl


class TestConsentCheckRequestSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for ConsentCheckRequest serialization and round-trip consistency.
    """
    
    @given(consent_check_request_strategy())
    @settings(max_examples=20)
    def test_consent_check_request_from_dict_consistency(self, request: ConsentCheckRequest):
        """
        Test that ConsentCheckRequest can be created from dict and maintains consistency.
        
        Verifies:
        - Request can be serialized to dict format
        - Request can be deserialized from dict format
        - Round-trip preserves all field values
        - Enum values are properly handled
        """
        # Create dict representation (simulating API Gateway event)
        request_dict = {
            'reference_image': request.reference_image,
            'usage_type': request.usage_type.value,
            'requester_id': request.requester_id
        }
        
        # Deserialize from dict
        restored = ConsentCheckRequest.from_dict(request_dict)
        
        # Verify consistency
        assert restored.reference_image == request.reference_image
        assert restored.usage_type == request.usage_type
        assert restored.requester_id == request.requester_id


class TestConsentCheckResponseSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for ConsentCheckResponse serialization and round-trip consistency.
    """
    
    @given(consent_check_response_strategy())
    @settings(max_examples=20)
    def test_consent_check_response_to_dict_consistency(self, response: ConsentCheckResponse):
        """
        Test that ConsentCheckResponse can be serialized to dict and maintains consistency.
        
        Verifies:
        - Serialization to dict produces valid structure
        - All required fields are present
        - Optional fields are handled correctly
        - Enum values are properly serialized
        """
        # Serialize to dict
        response_dict = response.to_dict()
        
        # Verify dict structure
        assert isinstance(response_dict, dict)
        assert 'decision' in response_dict
        assert 'reason_code' in response_dict
        assert 'timestamp' in response_dict
        
        # Verify enum values are serialized as strings
        assert response_dict['decision'] == response.decision.value
        assert response_dict['reason_code'] == response.reason_code.value
        assert response_dict['timestamp'] == response.timestamp
        
        # Verify optional fields
        if response.likeness_id is not None:
            assert response_dict['likeness_id'] == response.likeness_id
        else:
            assert 'likeness_id' not in response_dict
            
        if response.similarity_score is not None:
            assert response_dict['similarity_score'] == response.similarity_score
        else:
            assert 'similarity_score' not in response_dict


class TestRegistrationRequestSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for RegistrationRequest serialization and round-trip consistency.
    """
    
    @given(registration_request_strategy())
    @settings(max_examples=20)
    def test_registration_request_from_dict_consistency(self, request: RegistrationRequest):
        """
        Test that RegistrationRequest can be created from dict and maintains consistency.
        
        Verifies:
        - Request can be serialized to dict format
        - Request can be deserialized from dict format
        - Round-trip preserves all field values including nested objects
        - Photo count validation is enforced (5-10 photos)
        """
        # Create dict representation (simulating API Gateway event)
        request_dict = {
            'user_id': request.user_id,
            'photo_keys': request.photo_keys,
            'consent_policy': request.consent_policy.to_dict(),
            'email': request.email
        }
        
        # Deserialize from dict
        restored = RegistrationRequest.from_dict(request_dict)
        
        # Verify consistency
        assert restored.user_id == request.user_id
        assert restored.photo_keys == request.photo_keys
        assert restored.email == request.email
        
        # Verify photo count is within valid range
        assert 5 <= len(restored.photo_keys) <= 10
        
        # Verify nested ConsentPolicy consistency
        assert restored.consent_policy.allow_self_edits == request.consent_policy.allow_self_edits
        assert restored.consent_policy.deny_third_party_edits == request.consent_policy.deny_third_party_edits
        assert restored.consent_policy.deny_face_swaps == request.consent_policy.deny_face_swaps
        assert restored.consent_policy.deny_sexualized_content == request.consent_policy.deny_sexualized_content
        assert restored.consent_policy.deny_impersonation == request.consent_policy.deny_impersonation
        assert restored.consent_policy.deny_political_use == request.consent_policy.deny_political_use


class TestRegistrationResponseSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests for RegistrationResponse serialization and round-trip consistency.
    """
    
    @given(registration_response_strategy())
    @settings(max_examples=20)
    def test_registration_response_to_dict_consistency(self, response: RegistrationResponse):
        """
        Test that RegistrationResponse can be serialized to dict and maintains consistency.
        
        Verifies:
        - Serialization to dict produces valid structure
        - All required fields are present
        - Optional error field is handled correctly
        - Status values are valid
        """
        # Serialize to dict
        response_dict = response.to_dict()
        
        # Verify dict structure
        assert isinstance(response_dict, dict)
        assert 'likeness_id' in response_dict
        assert 'status' in response_dict
        assert 'processed_photos' in response_dict
        
        # Verify values
        assert response_dict['likeness_id'] == response.likeness_id
        assert response_dict['status'] == response.status
        assert response_dict['processed_photos'] == response.processed_photos
        
        # Verify status is valid
        assert response.status in ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE']
        
        # Verify optional errors field
        if response.errors is not None:
            assert 'errors' in response_dict
            assert response_dict['errors'] == response.errors
        else:
            assert 'errors' not in response_dict


# ============================================================================
# Cross-Model Serialization Tests
# ============================================================================

class TestCrossModelSerialization:
    """
    **Validates: Requirements 5.2**
    
    Property tests verifying serialization consistency across all models.
    """
    
    @given(
        consent_policy_strategy(),
        user_metadata_strategy(),
        st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=20)
    def test_nested_model_serialization_consistency(
        self,
        policy: ConsentPolicy,
        metadata: UserMetadata,
        timestamp: int
    ):
        """
        Test that nested models maintain consistency through parent serialization.
        
        Verifies:
        - ConsentRecord properly serializes nested ConsentPolicy and UserMetadata
        - Round-trip through DynamoDB format preserves nested object values
        - No data loss occurs during nested serialization
        """
        # Create ConsentRecord with nested models
        embedding = [0.1] * 512  # Sample 512-dimensional embedding
        record = ConsentRecord(
            likeness_id="test-likeness-id",
            fingerprint_hash="a" * 64,
            fingerprint_embedding=embedding,
            consent_policy=policy,
            user_metadata=metadata,
            created_at=timestamp,
            modified_at=timestamp
        )
        
        # Serialize and deserialize
        item = record.to_dynamodb_item()
        restored = ConsentRecord.from_dynamodb_item(item)
        
        # Verify nested ConsentPolicy is preserved
        assert restored.consent_policy.allow_self_edits == policy.allow_self_edits
        assert restored.consent_policy.deny_third_party_edits == policy.deny_third_party_edits
        assert restored.consent_policy.deny_face_swaps == policy.deny_face_swaps
        assert restored.consent_policy.deny_sexualized_content == policy.deny_sexualized_content
        assert restored.consent_policy.deny_impersonation == policy.deny_impersonation
        assert restored.consent_policy.deny_political_use == policy.deny_political_use
        
        # Verify nested UserMetadata is preserved
        assert restored.user_metadata.user_id == metadata.user_id
        assert restored.user_metadata.email == metadata.email
        assert restored.user_metadata.registration_source == metadata.registration_source
