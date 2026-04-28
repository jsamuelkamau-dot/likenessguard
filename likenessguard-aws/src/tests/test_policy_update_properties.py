"""
Property-based tests for consent policy updates.

These tests use Hypothesis to verify that policy updates correctly replace
old policies and maintain data integrity in the consent registry.

Feature: likenessguard-aws-prototype
Task: 4.3 Write property test for policy updates
"""

import pytest
import time
from hypothesis import given, strategies as st, settings, HealthCheck
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

from src.shared.models import (
    ConsentPolicy,
    ConsentRecord,
    UserMetadata
)
from src.shared.services.dynamodb_client import DynamoDBClient


# ============================================================================
# Custom Strategies for Policy Update Testing
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
        created_at=draw(st.integers(min_value=1000000000, max_value=2**31-1)),
        modified_at=draw(st.integers(min_value=1000000000, max_value=2**31-1))
    )


# ============================================================================
# Fixtures for DynamoDB Testing
# ============================================================================

@pytest.fixture
def mock_dynamodb():
    """Create mock DynamoDB resource and tables."""
    with patch('boto3.resource') as mock_resource:
        mock_db = MagicMock()
        mock_consent_table = MagicMock()
        mock_audit_table = MagicMock()
        
        mock_db.Table.side_effect = lambda name: (
            mock_consent_table if 'Consent' in name else mock_audit_table
        )
        mock_resource.return_value = mock_db
        
        yield {
            'resource': mock_resource,
            'db': mock_db,
            'consent_table': mock_consent_table,
            'audit_table': mock_audit_table
        }


@pytest.fixture
def dynamodb_client(mock_dynamodb):
    """Create DynamoDB client with mocked tables."""
    return DynamoDBClient(
        consent_table_name='TestConsentRegistry',
        audit_table_name='TestAuditLog',
        region_name='us-east-1'
    )


# ============================================================================
# Property Tests for Policy Updates
# ============================================================================

class TestPolicyUpdateProperties:
    """
    **Validates: Requirements 6.1**
    
    Property 21: Policy updates replace old policies
    
    For any consent policy update, the old policy should be completely
    replaced with the new policy.
    """
    
    @given(
        initial_record=consent_record_strategy(),
        new_policy=consent_policy_strategy()
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_21_policy_updates_replace_old_policies(
        self,
        mock_dynamodb,
        initial_record: ConsentRecord,
        new_policy: ConsentPolicy
    ):
        """
        **Validates: Requirements 6.1**
        
        Property 21: Policy updates replace old policies
        
        For any consent policy update, verify that:
        1. The old policy is completely replaced (not merged)
        2. All fields of the new policy are stored correctly
        3. No fields from the old policy remain
        4. The modification timestamp is updated
        5. Other record attributes (likeness_id, fingerprint_hash, etc.) remain unchanged
        
        This test ensures that policy updates are atomic replacements,
        not partial updates or merges, which is critical for consent
        enforcement accuracy.
        """
        # Create client with mocked tables
        client = DynamoDBClient(
            consent_table_name='TestConsentRegistry',
            audit_table_name='TestAuditLog',
            region_name='us-east-1'
        )
        
        mock_table = mock_dynamodb['consent_table']
        
        # Mock the initial store operation
        mock_table.put_item.return_value = {}
        
        # Mock the get operation to return the initial record
        initial_item = initial_record.to_dynamodb_item()
        mock_table.get_item.return_value = {'Item': initial_item}
        
        # Store the initial record
        client.store_consent_record(initial_record)
        
        # Capture the original policy values
        original_policy = initial_record.consent_policy
        original_modified_at = initial_record.modified_at
        
        # Mock the update operation
        mock_table.update_item.return_value = {'Attributes': {}}
        
        # Update the consent policy
        with patch('time.time', return_value=original_modified_at + 10):
            client.update_consent_policy(
                likeness_id=initial_record.likeness_id,
                policy=new_policy
            )
        
        # Verify update_item was called with correct parameters
        assert mock_table.update_item.called
        call_args = mock_table.update_item.call_args
        
        # Verify the key is correct
        assert call_args.kwargs['Key'] == {'LikenessID': initial_record.likeness_id}
        
        # Verify the update expression includes both policy and timestamp
        assert 'ConsentPolicy' in call_args.kwargs['UpdateExpression']
        assert 'ModifiedAt' in call_args.kwargs['UpdateExpression']
        
        # Verify the new policy values are in the update
        policy_value = call_args.kwargs['ExpressionAttributeValues'][':policy']
        assert policy_value['allow_self_edits'] == new_policy.allow_self_edits
        assert policy_value['deny_third_party_edits'] == new_policy.deny_third_party_edits
        assert policy_value['deny_face_swaps'] == new_policy.deny_face_swaps
        assert policy_value['deny_sexualized_content'] == new_policy.deny_sexualized_content
        assert policy_value['deny_impersonation'] == new_policy.deny_impersonation
        assert policy_value['deny_political_use'] == new_policy.deny_political_use
        
        # Verify the timestamp was updated
        new_timestamp = call_args.kwargs['ExpressionAttributeValues'][':modified']
        assert new_timestamp > original_modified_at
        
        # Verify condition expression checks for existence
        assert 'attribute_exists(LikenessID)' in call_args.kwargs['ConditionExpression']
    
    @given(
        initial_record=consent_record_strategy(),
        new_policy=consent_policy_strategy()
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_policy_update_is_atomic(
        self,
        mock_dynamodb,
        initial_record: ConsentRecord,
        new_policy: ConsentPolicy
    ):
        """
        Verify that policy updates are atomic operations.
        
        This ensures that:
        - Either the entire policy is updated, or none of it is
        - No partial updates occur
        - The policy is always in a consistent state
        """
        # Reset mock for this iteration
        mock_table = mock_dynamodb['consent_table']
        mock_table.reset_mock()
        
        client = DynamoDBClient(
            consent_table_name='TestConsentRegistry',
            audit_table_name='TestAuditLog',
            region_name='us-east-1'
        )
        
        mock_table.update_item.return_value = {'Attributes': {}}
        
        # Update the policy
        client.update_consent_policy(
            likeness_id=initial_record.likeness_id,
            policy=new_policy
        )
        
        # Verify the update was atomic (single update_item call)
        assert mock_table.update_item.call_count == 1
        
        # Verify all policy fields are updated in a single operation
        call_args = mock_table.update_item.call_args
        policy_value = call_args.kwargs['ExpressionAttributeValues'][':policy']
        
        # All fields should be present in the update
        assert 'allow_self_edits' in policy_value
        assert 'deny_third_party_edits' in policy_value
        assert 'deny_face_swaps' in policy_value
        assert 'deny_sexualized_content' in policy_value
        assert 'deny_impersonation' in policy_value
        assert 'deny_political_use' in policy_value
    
    @given(
        initial_record=consent_record_strategy(),
        new_policy=consent_policy_strategy()
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_policy_update_preserves_non_policy_fields(
        self,
        mock_dynamodb,
        initial_record: ConsentRecord,
        new_policy: ConsentPolicy
    ):
        """
        Verify that policy updates only modify the policy and timestamp.
        
        All other fields (likeness_id, fingerprint_hash, user_metadata,
        created_at) should remain unchanged.
        """
        client = DynamoDBClient(
            consent_table_name='TestConsentRegistry',
            audit_table_name='TestAuditLog',
            region_name='us-east-1'
        )
        
        mock_table = mock_dynamodb['consent_table']
        mock_table.update_item.return_value = {'Attributes': {}}
        
        # Update the policy
        client.update_consent_policy(
            likeness_id=initial_record.likeness_id,
            policy=new_policy
        )
        
        # Verify only ConsentPolicy and ModifiedAt are in the update expression
        call_args = mock_table.update_item.call_args
        update_expr = call_args.kwargs['UpdateExpression']
        
        assert 'ConsentPolicy' in update_expr
        assert 'ModifiedAt' in update_expr
        
        # Verify other fields are NOT in the update expression
        assert 'FingerprintHash' not in update_expr
        assert 'UserMetadata' not in update_expr
        assert 'CreatedAt' not in update_expr
        assert 'LikenessID' not in update_expr
    
    @given(new_policy=consent_policy_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_policy_update_fails_for_nonexistent_likeness(
        self,
        mock_dynamodb,
        new_policy: ConsentPolicy
    ):
        """
        Verify that updating a policy for a non-existent likeness fails.
        
        This ensures data integrity by preventing updates to records
        that don't exist.
        """
        client = DynamoDBClient(
            consent_table_name='TestConsentRegistry',
            audit_table_name='TestAuditLog',
            region_name='us-east-1'
        )
        
        mock_table = mock_dynamodb['consent_table']
        
        # Mock conditional check failure (item doesn't exist)
        mock_table.update_item.side_effect = ClientError(
            {'Error': {'Code': 'ConditionalCheckFailedException', 'Message': 'Item not found'}},
            'UpdateItem'
        )
        
        # Generate a random likeness ID that doesn't exist
        nonexistent_id = "nonexistent-likeness-id-12345"
        
        # Attempt to update policy for non-existent likeness
        with pytest.raises(ValueError, match="does not exist"):
            client.update_consent_policy(
                likeness_id=nonexistent_id,
                policy=new_policy
            )
    
    @given(
        initial_record=consent_record_strategy(),
        first_policy=consent_policy_strategy(),
        second_policy=consent_policy_strategy()
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_multiple_policy_updates_are_sequential(
        self,
        mock_dynamodb,
        initial_record: ConsentRecord,
        first_policy: ConsentPolicy,
        second_policy: ConsentPolicy
    ):
        """
        Verify that multiple policy updates work correctly in sequence.
        
        Each update should completely replace the previous policy,
        and the final state should reflect only the last update.
        """
        # Reset mock for this iteration
        mock_table = mock_dynamodb['consent_table']
        mock_table.reset_mock()
        
        client = DynamoDBClient(
            consent_table_name='TestConsentRegistry',
            audit_table_name='TestAuditLog',
            region_name='us-east-1'
        )
        
        mock_table.update_item.return_value = {'Attributes': {}}
        
        # First update
        with patch('time.time', return_value=1000):
            client.update_consent_policy(
                likeness_id=initial_record.likeness_id,
                policy=first_policy
            )
        
        # Second update
        with patch('time.time', return_value=2000):
            client.update_consent_policy(
                likeness_id=initial_record.likeness_id,
                policy=second_policy
            )
        
        # Verify both updates were called
        assert mock_table.update_item.call_count == 2
        
        # Verify the second update has the correct policy
        second_call_args = mock_table.update_item.call_args_list[1]
        second_policy_value = second_call_args.kwargs['ExpressionAttributeValues'][':policy']
        
        assert second_policy_value['allow_self_edits'] == second_policy.allow_self_edits
        assert second_policy_value['deny_third_party_edits'] == second_policy.deny_third_party_edits
        assert second_policy_value['deny_face_swaps'] == second_policy.deny_face_swaps
        assert second_policy_value['deny_sexualized_content'] == second_policy.deny_sexualized_content
        assert second_policy_value['deny_impersonation'] == second_policy.deny_impersonation
        assert second_policy_value['deny_political_use'] == second_policy.deny_political_use
        
        # Verify timestamps are different
        first_timestamp = mock_table.update_item.call_args_list[0].kwargs['ExpressionAttributeValues'][':modified']
        second_timestamp = mock_table.update_item.call_args_list[1].kwargs['ExpressionAttributeValues'][':modified']
        assert second_timestamp > first_timestamp
