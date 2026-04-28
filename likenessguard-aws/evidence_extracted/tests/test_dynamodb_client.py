"""
Unit tests for DynamoDB client wrapper.

Tests cover:
- Storing and retrieving consent records
- Updating consent policies
- Querying fingerprints
- Storing audit records
- Error handling and retries
"""

import pytest
import time
from decimal import Decimal
from unittest.mock import Mock, MagicMock, patch
from botocore.exceptions import ClientError

from src.shared.services.dynamodb_client import DynamoDBClient
from src.shared.models.data_models import (
    ConsentRecord,
    ConsentPolicy,
    UserMetadata,
    AuditRecord,
    Decision,
    ReasonCode,
    UsageType
)


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


@pytest.fixture
def sample_consent_record():
    """Create a sample consent record for testing."""
    policy = ConsentPolicy(
        allow_self_edits=True,
        deny_third_party_edits=True,
        deny_face_swaps=True,
        deny_sexualized_content=True,
        deny_impersonation=True,
        deny_political_use=True
    )
    
    metadata = UserMetadata(
        user_id='user123',
        email='test@example.com',
        registration_source='api'
    )
    
    # Create a sample 512-dimensional embedding
    sample_embedding = [0.1] * 512
    
    return ConsentRecord(
        likeness_id='likeness123',
        fingerprint_hash='abc123def456',
        fingerprint_embedding=sample_embedding,
        consent_policy=policy,
        user_metadata=metadata,
        created_at=int(time.time()),
        modified_at=int(time.time())
    )


@pytest.fixture
def sample_audit_record():
    """Create a sample audit record for testing."""
    return AuditRecord(
        query_id='query123',
        timestamp=int(time.time()),
        decision=Decision.DENY,
        reason_code=ReasonCode.DENY_FACE_SWAP,
        requester_id='requester123',
        usage_type=UsageType.FACE_SWAP,
        likeness_id='likeness123',
        similarity_score=0.92,
        ttl=int(time.time()) + (180 * 24 * 60 * 60)  # 180 days
    )


class TestDynamoDBClient:
    """Test suite for DynamoDB client operations."""
    
    def test_store_consent_record(self, dynamodb_client, mock_dynamodb, sample_consent_record):
        """Test storing a consent record."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        
        # Act
        dynamodb_client.store_consent_record(sample_consent_record)
        
        # Assert
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args
        item = call_args.kwargs['Item']
        
        assert item['LikenessID'] == 'likeness123'
        assert item['FingerprintHash'] == 'abc123def456'
        assert 'ConsentPolicy' in item
        assert 'UserMetadata' in item
    
    def test_get_consent_record_found(self, dynamodb_client, mock_dynamodb, sample_consent_record):
        """Test retrieving an existing consent record."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        mock_table.get_item.return_value = {
            'Item': sample_consent_record.to_dynamodb_item()
        }
        
        # Act
        result = dynamodb_client.get_consent_record('likeness123')
        
        # Assert
        assert result is not None
        assert result.likeness_id == 'likeness123'
        assert result.fingerprint_hash == 'abc123def456'
        assert result.consent_policy.allow_self_edits is True
        
        mock_table.get_item.assert_called_once_with(
            Key={'LikenessID': 'likeness123'}
        )
    
    def test_get_consent_record_not_found(self, dynamodb_client, mock_dynamodb):
        """Test retrieving a non-existent consent record."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        mock_table.get_item.return_value = {}
        
        # Act
        result = dynamodb_client.get_consent_record('nonexistent')
        
        # Assert
        assert result is None
    
    def test_update_consent_policy(self, dynamodb_client, mock_dynamodb):
        """Test updating a consent policy."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        mock_table.update_item.return_value = {'Attributes': {}}
        
        new_policy = ConsentPolicy(
            allow_self_edits=False,
            deny_third_party_edits=True,
            deny_face_swaps=True,
            deny_sexualized_content=True,
            deny_impersonation=True,
            deny_political_use=True
        )
        
        # Act
        dynamodb_client.update_consent_policy('likeness123', new_policy)
        
        # Assert
        mock_table.update_item.assert_called_once()
        call_args = mock_table.update_item.call_args
        
        assert call_args.kwargs['Key'] == {'LikenessID': 'likeness123'}
        assert 'ConsentPolicy' in call_args.kwargs['UpdateExpression']
        assert 'ModifiedAt' in call_args.kwargs['UpdateExpression']
    
    def test_update_consent_policy_not_found(self, dynamodb_client, mock_dynamodb):
        """Test updating a non-existent consent policy."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        mock_table.update_item.side_effect = ClientError(
            {'Error': {'Code': 'ConditionalCheckFailedException', 'Message': 'Item not found'}},
            'UpdateItem'
        )
        
        new_policy = ConsentPolicy()
        
        # Act & Assert
        with pytest.raises(ValueError, match="does not exist"):
            dynamodb_client.update_consent_policy('nonexistent', new_policy)
    
    def test_query_all_fingerprints(self, dynamodb_client, mock_dynamodb):
        """Test querying all fingerprints for matching."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        mock_table.scan.return_value = {
            'Items': [
                {
                    'LikenessID': 'likeness1',
                    'FingerprintHash': 'hash1',
                    'ConsentPolicy': {
                        'allow_self_edits': True,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                },
                {
                    'LikenessID': 'likeness2',
                    'FingerprintHash': 'hash2',
                    'ConsentPolicy': {
                        'allow_self_edits': False,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                }
            ]
        }
        
        # Act
        result = dynamodb_client.query_all_fingerprints()
        
        # Assert
        assert len(result) == 2
        assert result[0]['likeness_id'] == 'likeness1'
        assert result[0]['fingerprint_hash'] == 'hash1'
        assert isinstance(result[0]['consent_policy'], ConsentPolicy)
        assert result[1]['likeness_id'] == 'likeness2'
        
        mock_table.scan.assert_called_once()
    
    def test_query_all_fingerprints_with_pagination(self, dynamodb_client, mock_dynamodb):
        """Test querying fingerprints with pagination."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        
        # First page
        first_response = {
            'Items': [
                {
                    'LikenessID': 'likeness1',
                    'FingerprintHash': 'hash1',
                    'ConsentPolicy': {
                        'allow_self_edits': True,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                }
            ],
            'LastEvaluatedKey': {'LikenessID': 'likeness1'}
        }
        
        # Second page
        second_response = {
            'Items': [
                {
                    'LikenessID': 'likeness2',
                    'FingerprintHash': 'hash2',
                    'ConsentPolicy': {
                        'allow_self_edits': False,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                }
            ]
        }
        
        mock_table.scan.side_effect = [first_response, second_response]
        
        # Act
        result = dynamodb_client.query_all_fingerprints()
        
        # Assert
        assert len(result) == 2
        assert mock_table.scan.call_count == 2
    
    def test_store_audit_record(self, dynamodb_client, mock_dynamodb, sample_audit_record):
        """Test storing an audit record."""
        # Arrange
        mock_table = mock_dynamodb['audit_table']
        
        # Act
        dynamodb_client.store_audit_record(sample_audit_record)
        
        # Assert
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args
        item = call_args.kwargs['Item']
        
        assert item['QueryID'] == 'query123'
        assert item['Decision'] == 'DENY'
        assert item['ReasonCode'] == 'DENY_FACE_SWAP'
        assert item['LikenessID'] == 'likeness123'
    
    def test_get_audit_records_by_likeness(self, dynamodb_client, mock_dynamodb):
        """Test retrieving audit records for a likeness."""
        # Arrange
        mock_table = mock_dynamodb['audit_table']
        timestamp1 = int(time.time())
        timestamp2 = timestamp1 - 3600  # 1 hour earlier
        
        mock_table.scan.return_value = {
            'Items': [
                {
                    'QueryID': 'query1',
                    'Timestamp': timestamp1,
                    'Decision': 'DENY',
                    'ReasonCode': 'DENY_FACE_SWAP',
                    'RequesterID': 'req1',
                    'UsageType': 'FACE_SWAP',
                    'LikenessID': 'likeness123',
                    'SimilarityScore': Decimal('0.92')
                },
                {
                    'QueryID': 'query2',
                    'Timestamp': timestamp2,
                    'Decision': 'ALLOW',
                    'ReasonCode': 'ALLOW_SELF_EDIT',
                    'RequesterID': 'req2',
                    'UsageType': 'SELF_EDIT',
                    'LikenessID': 'likeness123'
                }
            ]
        }
        
        # Act
        result = dynamodb_client.get_audit_records_by_likeness('likeness123')
        
        # Assert
        assert len(result) == 2
        # Should be sorted by timestamp (newest first)
        assert result[0].timestamp == timestamp1
        assert result[1].timestamp == timestamp2
        assert result[0].decision == Decision.DENY
        assert result[1].decision == Decision.ALLOW
    
    def test_convert_floats_to_decimal(self, dynamodb_client):
        """Test float to Decimal conversion for DynamoDB."""
        # Arrange
        data = {
            'score': 0.92,
            'nested': {
                'value': 1.5
            },
            'list': [0.1, 0.2, 0.3]
        }
        
        # Act
        result = dynamodb_client._convert_floats_to_decimal(data)
        
        # Assert
        assert isinstance(result['score'], Decimal)
        assert isinstance(result['nested']['value'], Decimal)
        assert all(isinstance(x, Decimal) for x in result['list'])
    
    def test_convert_decimals_to_float(self, dynamodb_client):
        """Test Decimal to float conversion from DynamoDB."""
        # Arrange
        data = {
            'score': Decimal('0.92'),
            'nested': {
                'value': Decimal('1.5')
            },
            'list': [Decimal('0.1'), Decimal('0.2')]
        }
        
        # Act
        result = dynamodb_client._convert_decimals_to_float(data)
        
        # Assert
        assert isinstance(result['score'], float)
        assert isinstance(result['nested']['value'], float)
        assert all(isinstance(x, float) for x in result['list'])
    
    def test_retry_with_backoff_success(self, dynamodb_client, mock_dynamodb):
        """Test retry logic succeeds after transient failure."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        
        # Fail once, then succeed
        mock_table.get_item.side_effect = [
            ClientError(
                {'Error': {'Code': 'ThrottlingException', 'Message': 'Throttled'}},
                'GetItem'
            ),
            {
                'Item': {
                    'LikenessID': 'test',
                    'FingerprintHash': 'hash123',
                    'ConsentPolicy': {
                        'allow_self_edits': True,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    },
                    'UserMetadata': {
                        'user_id': 'user123',
                        'registration_source': 'api'
                    },
                    'FingerprintEmbedding': [0.1] * 512,  # Sample embedding
                    'CreatedAt': int(time.time()),
                    'ModifiedAt': int(time.time())
                }
            }
        ]
        
        # Act
        with patch('time.sleep'):  # Mock sleep to speed up test
            result = dynamodb_client.get_consent_record('test')
        
        # Assert
        assert mock_table.get_item.call_count == 2
        assert result is not None
        assert result.likeness_id == 'test'
    
    def test_retry_with_backoff_permanent_failure(self, dynamodb_client, mock_dynamodb):
        """Test retry logic fails on permanent error."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        
        # Permanent error (not retryable)
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'ValidationException', 'Message': 'Invalid'}},
            'GetItem'
        )
        
        # Act & Assert
        with pytest.raises(ClientError):
            dynamodb_client.get_consent_record('test')
        
        # Should not retry permanent errors
        assert mock_table.get_item.call_count == 1
    
    def test_retry_with_backoff_max_retries(self, dynamodb_client, mock_dynamodb):
        """Test retry logic exhausts max retries."""
        # Arrange
        mock_table = mock_dynamodb['consent_table']
        
        # Always fail with retryable error
        mock_table.get_item.side_effect = ClientError(
            {'Error': {'Code': 'ThrottlingException', 'Message': 'Throttled'}},
            'GetItem'
        )
        
        # Act & Assert
        with patch('time.sleep'):  # Mock sleep to speed up test
            with pytest.raises(ClientError):
                dynamodb_client.get_consent_record('test')
        
        # Should retry max_retries times
        assert mock_table.get_item.call_count == dynamodb_client.max_retries
