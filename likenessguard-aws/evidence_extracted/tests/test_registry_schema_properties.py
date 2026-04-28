"""
Property-based tests for registry schema validation.

These tests use Hypothesis to verify that all ConsentRecord objects stored
in DynamoDB contain the required attributes defined in the schema.

Feature: likenessguard-aws-prototype
Task: 4.2 Write property test for registry schema
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from src.shared.models import (
    ConsentRecord,
    ConsentPolicy,
    UserMetadata
)


# ============================================================================
# Custom Strategies for Registry Schema Testing
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
    """
    Generate arbitrary valid consent records.
    
    This strategy creates ConsentRecord instances with all required attributes
    to test that the schema validation works correctly.
    """
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


# ============================================================================
# Property Tests for Registry Schema
# ============================================================================

class TestRegistrySchemaProperties:
    """
    **Validates: Requirements 7.1**
    
    Property 25: Registry records contain required attributes
    
    For any record in the Consent_Registry, it should contain all required
    attributes: Likeness_ID, FingerprintHash, ConsentPolicy, UserMetadata,
    CreatedAt, ModifiedAt.
    """
    
    @given(consent_record_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.large_base_example])
    def test_property_25_registry_records_contain_required_attributes(
        self,
        record: ConsentRecord
    ):
        """
        **Validates: Requirements 7.1**
        
        Property 25: Registry records contain required attributes
        
        For any ConsentRecord object that would be stored in DynamoDB,
        verify that it contains all required attributes as defined in
        the schema:
        - Likeness_ID (partition key)
        - FingerprintHash (SHA-256 hash of face embedding)
        - ConsentPolicy (machine-readable policy)
        - UserMetadata (user information)
        - CreatedAt (creation timestamp)
        - ModifiedAt (modification timestamp)
        
        This test ensures that:
        1. All required attributes are present in the record
        2. All attributes have the correct types
        3. The record can be serialized to DynamoDB format
        4. The DynamoDB item contains all required attribute names
        5. Nested objects (ConsentPolicy, UserMetadata) are properly structured
        """
        # Verify the ConsentRecord object has all required attributes
        assert hasattr(record, 'likeness_id'), "Record missing likeness_id attribute"
        assert hasattr(record, 'fingerprint_hash'), "Record missing fingerprint_hash attribute"
        assert hasattr(record, 'consent_policy'), "Record missing consent_policy attribute"
        assert hasattr(record, 'user_metadata'), "Record missing user_metadata attribute"
        assert hasattr(record, 'created_at'), "Record missing created_at attribute"
        assert hasattr(record, 'modified_at'), "Record missing modified_at attribute"
        
        # Verify attribute types
        assert isinstance(record.likeness_id, str), "likeness_id must be a string"
        assert isinstance(record.fingerprint_hash, str), "fingerprint_hash must be a string"
        assert isinstance(record.consent_policy, ConsentPolicy), "consent_policy must be ConsentPolicy instance"
        assert isinstance(record.user_metadata, UserMetadata), "user_metadata must be UserMetadata instance"
        assert isinstance(record.created_at, int), "created_at must be an integer (Unix timestamp)"
        assert isinstance(record.modified_at, int), "modified_at must be an integer (Unix timestamp)"
        
        # Verify likeness_id is not empty (required for partition key)
        assert len(record.likeness_id) > 0, "likeness_id cannot be empty"
        
        # Verify fingerprint_hash format (SHA-256 produces 64 hex characters)
        assert len(record.fingerprint_hash) == 64, "fingerprint_hash must be 64 characters (SHA-256)"
        assert all(c in '0123456789abcdef' for c in record.fingerprint_hash), \
            "fingerprint_hash must contain only hex characters"
        
        # Verify timestamps are non-negative
        assert record.created_at >= 0, "created_at must be non-negative"
        assert record.modified_at >= 0, "modified_at must be non-negative"
        
        # Verify the record can be serialized to DynamoDB format
        dynamodb_item = record.to_dynamodb_item()
        assert isinstance(dynamodb_item, dict), "to_dynamodb_item() must return a dictionary"
        
        # Verify DynamoDB item contains all required attribute names
        # (using DynamoDB naming convention with PascalCase)
        required_attributes = [
            'LikenessID',
            'FingerprintHash',
            'ConsentPolicy',
            'UserMetadata',
            'CreatedAt',
            'ModifiedAt'
        ]
        
        for attr in required_attributes:
            assert attr in dynamodb_item, f"DynamoDB item missing required attribute: {attr}"
        
        # Verify DynamoDB attribute values match record values
        assert dynamodb_item['LikenessID'] == record.likeness_id
        assert dynamodb_item['FingerprintHash'] == record.fingerprint_hash
        assert dynamodb_item['CreatedAt'] == record.created_at
        assert dynamodb_item['ModifiedAt'] == record.modified_at
        
        # Verify ConsentPolicy is properly structured in DynamoDB format
        consent_policy_dict = dynamodb_item['ConsentPolicy']
        assert isinstance(consent_policy_dict, dict), "ConsentPolicy must be a dictionary in DynamoDB"
        
        required_policy_fields = [
            'allow_self_edits',
            'deny_third_party_edits',
            'deny_face_swaps',
            'deny_sexualized_content',
            'deny_impersonation',
            'deny_political_use'
        ]
        
        for field in required_policy_fields:
            assert field in consent_policy_dict, f"ConsentPolicy missing required field: {field}"
            assert isinstance(consent_policy_dict[field], bool), \
                f"ConsentPolicy field {field} must be boolean"
        
        # Verify UserMetadata is properly structured in DynamoDB format
        user_metadata_dict = dynamodb_item['UserMetadata']
        assert isinstance(user_metadata_dict, dict), "UserMetadata must be a dictionary in DynamoDB"
        
        assert 'user_id' in user_metadata_dict, "UserMetadata missing required field: user_id"
        assert isinstance(user_metadata_dict['user_id'], str), "UserMetadata user_id must be string"
        assert len(user_metadata_dict['user_id']) > 0, "UserMetadata user_id cannot be empty"
        
        assert 'registration_source' in user_metadata_dict, \
            "UserMetadata missing required field: registration_source"
        assert isinstance(user_metadata_dict['registration_source'], str), \
            "UserMetadata registration_source must be string"
    
    @given(consent_record_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.large_base_example])
    def test_registry_record_round_trip_preserves_all_attributes(
        self,
        record: ConsentRecord
    ):
        """
        Verify that serializing and deserializing a registry record preserves
        all required attributes.
        
        This ensures that records stored in DynamoDB can be retrieved without
        data loss, maintaining the integrity of all required schema attributes.
        """
        # Serialize to DynamoDB format
        dynamodb_item = record.to_dynamodb_item()
        
        # Deserialize back to ConsentRecord
        restored_record = ConsentRecord.from_dynamodb_item(dynamodb_item)
        
        # Verify all required attributes are preserved
        assert restored_record.likeness_id == record.likeness_id
        assert restored_record.fingerprint_hash == record.fingerprint_hash
        assert restored_record.created_at == record.created_at
        assert restored_record.modified_at == record.modified_at
        
        # Verify ConsentPolicy attributes are preserved
        assert restored_record.consent_policy.allow_self_edits == record.consent_policy.allow_self_edits
        assert restored_record.consent_policy.deny_third_party_edits == record.consent_policy.deny_third_party_edits
        assert restored_record.consent_policy.deny_face_swaps == record.consent_policy.deny_face_swaps
        assert restored_record.consent_policy.deny_sexualized_content == record.consent_policy.deny_sexualized_content
        assert restored_record.consent_policy.deny_impersonation == record.consent_policy.deny_impersonation
        assert restored_record.consent_policy.deny_political_use == record.consent_policy.deny_political_use
        
        # Verify UserMetadata attributes are preserved
        assert restored_record.user_metadata.user_id == record.user_metadata.user_id
        assert restored_record.user_metadata.email == record.user_metadata.email
        assert restored_record.user_metadata.registration_source == record.user_metadata.registration_source
    
    @given(consent_record_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.large_base_example])
    def test_registry_record_has_valid_partition_key(
        self,
        record: ConsentRecord
    ):
        """
        Verify that every registry record has a valid partition key (Likeness_ID).
        
        The partition key is critical for DynamoDB operations and must:
        - Be present in every record
        - Be a non-empty string
        - Be properly mapped to LikenessID in DynamoDB format
        """
        # Verify likeness_id exists and is valid
        assert record.likeness_id is not None, "Partition key (likeness_id) cannot be None"
        assert isinstance(record.likeness_id, str), "Partition key must be a string"
        assert len(record.likeness_id) > 0, "Partition key cannot be empty"
        
        # Verify it's properly mapped in DynamoDB format
        dynamodb_item = record.to_dynamodb_item()
        assert 'LikenessID' in dynamodb_item, "DynamoDB item must contain LikenessID partition key"
        assert dynamodb_item['LikenessID'] == record.likeness_id, \
            "LikenessID in DynamoDB must match likeness_id in record"
    
    @given(consent_record_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.large_base_example])
    def test_registry_record_timestamps_are_valid(
        self,
        record: ConsentRecord
    ):
        """
        Verify that registry records have valid timestamps.
        
        Timestamps must:
        - Be non-negative integers (Unix timestamps)
        - Be present in both CreatedAt and ModifiedAt fields
        - Be properly serialized to DynamoDB
        """
        # Verify created_at is valid
        assert isinstance(record.created_at, int), "created_at must be an integer"
        assert record.created_at >= 0, "created_at must be non-negative"
        
        # Verify modified_at is valid
        assert isinstance(record.modified_at, int), "modified_at must be an integer"
        assert record.modified_at >= 0, "modified_at must be non-negative"
        
        # Verify timestamps are in DynamoDB format
        dynamodb_item = record.to_dynamodb_item()
        assert 'CreatedAt' in dynamodb_item, "DynamoDB item must contain CreatedAt"
        assert 'ModifiedAt' in dynamodb_item, "DynamoDB item must contain ModifiedAt"
        assert dynamodb_item['CreatedAt'] == record.created_at
        assert dynamodb_item['ModifiedAt'] == record.modified_at
    
    @given(consent_record_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.large_base_example])
    def test_registry_record_fingerprint_format(
        self,
        record: ConsentRecord
    ):
        """
        Verify that registry records have properly formatted fingerprint hashes.
        
        Fingerprint hashes must:
        - Be exactly 64 characters (SHA-256 hex output)
        - Contain only hexadecimal characters (0-9, a-f)
        - Be properly stored in DynamoDB
        """
        # Verify fingerprint_hash format
        assert isinstance(record.fingerprint_hash, str), "fingerprint_hash must be a string"
        assert len(record.fingerprint_hash) == 64, \
            f"fingerprint_hash must be 64 characters, got {len(record.fingerprint_hash)}"
        
        # Verify hex format
        valid_hex_chars = set('0123456789abcdef')
        assert all(c in valid_hex_chars for c in record.fingerprint_hash), \
            "fingerprint_hash must contain only hexadecimal characters (0-9, a-f)"
        
        # Verify it's properly stored in DynamoDB
        dynamodb_item = record.to_dynamodb_item()
        assert 'FingerprintHash' in dynamodb_item, "DynamoDB item must contain FingerprintHash"
        assert dynamodb_item['FingerprintHash'] == record.fingerprint_hash
