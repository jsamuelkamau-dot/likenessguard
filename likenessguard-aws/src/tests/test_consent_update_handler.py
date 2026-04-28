"""
Unit tests for consent update Lambda handler.

Tests cover:
- Valid policy update requests
- Invalid requests (missing fields, invalid policy)
- Likeness not found scenarios
- DynamoDB errors
- Policy change logging
"""

import pytest
import json
import time
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

from src.shared.models.data_models import (
    ConsentPolicy,
    ConsentRecord,
    UserMetadata,
    ConsentUpdateRequest,
    ConsentUpdateResponse
)
from src.lambdas.consent_update.handler import lambda_handler


@pytest.fixture
def sample_consent_policy():
    """Create a sample consent policy."""
    return ConsentPolicy(
        allow_self_edits=True,
        deny_third_party_edits=True,
        deny_face_swaps=True,
        deny_sexualized_content=True,
        deny_impersonation=True,
        deny_political_use=True
    )


@pytest.fixture
def sample_consent_record(sample_consent_policy):
    """Create a sample consent record."""
    return ConsentRecord(
        likeness_id='likeness123',
        fingerprint_hash='abc123def456',
        fingerprint_embedding=[0.1] * 512,
        consent_policy=sample_consent_policy,
        user_metadata=UserMetadata(
            user_id='user123',
            email='test@example.com',
            registration_source='api'
        ),
        created_at=int(time.time()),
        modified_at=int(time.time())
    )


class TestConsentUpdateHandler:
    """Test suite for consent update Lambda handler."""
    
    def test_valid_update_request(self, sample_consent_record):
        """Test successful consent policy update."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client') as mock_dynamodb:
            # Configure mock
            mock_dynamodb.get_consent_record.return_value = sample_consent_record
            mock_dynamodb.update_consent_policy.return_value = None
            
            # Create new policy (different from existing)
            new_policy = ConsentPolicy(
                allow_self_edits=False,  # Changed
                deny_third_party_edits=True,
                deny_face_swaps=True,
                deny_sexualized_content=True,
                deny_impersonation=True,
                deny_political_use=True
            )
            
            # Create Lambda event
            event = {
                'body': json.dumps({
                    'likeness_id': 'likeness123',
                    'new_policy': new_policy.to_dict()
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify response
            assert response['statusCode'] == 200
            body = json.loads(response['body'])
            assert body['likeness_id'] == 'likeness123'
            assert body['status'] == 'SUCCESS'
            assert 'modified_at' in body
            
            # Verify DynamoDB was called
            mock_dynamodb.get_consent_record.assert_called_once_with('likeness123')
            mock_dynamodb.update_consent_policy.assert_called_once()
    
    def test_missing_likeness_id(self):
        """Test update request with missing likeness_id."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client'):
            # Create Lambda event without likeness_id
            event = {
                'body': json.dumps({
                    'new_policy': {
                        'allow_self_edits': True,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert body['error']['code'] == 'INVALID_REQUEST'
            assert 'likeness_id' in body['error']['message']
    
    def test_missing_new_policy(self):
        """Test update request with missing new_policy."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client'):
            # Create Lambda event without new_policy
            event = {
                'body': json.dumps({
                    'likeness_id': 'likeness123'
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert body['error']['code'] == 'INVALID_REQUEST'
            assert 'new_policy' in body['error']['message']
    
    def test_invalid_policy_structure(self):
        """Test update request with invalid policy structure."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client'):
            # Create Lambda event with invalid policy
            event = {
                'body': json.dumps({
                    'likeness_id': 'likeness123',
                    'new_policy': {
                        'invalid_field': True
                        # Missing required fields
                    }
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert body['error']['code'] in ['INVALID_REQUEST', 'INVALID_POLICY']
    
    def test_likeness_not_found(self):
        """Test update request for non-existent likeness."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client') as mock_dynamodb:
            # Configure mock to return None (not found)
            mock_dynamodb.get_consent_record.return_value = None
            
            # Create Lambda event
            event = {
                'body': json.dumps({
                    'likeness_id': 'nonexistent',
                    'new_policy': {
                        'allow_self_edits': True,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 404
            body = json.loads(response['body'])
            assert body['error']['code'] == 'LIKENESS_NOT_FOUND'
    
    def test_dynamodb_get_error(self, sample_consent_record):
        """Test handling of DynamoDB get errors."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client') as mock_dynamodb:
            # Configure mock to raise ClientError
            mock_dynamodb.get_consent_record.side_effect = ClientError(
                {'Error': {'Code': 'ServiceUnavailable', 'Message': 'Service unavailable'}},
                'GetItem'
            )
            
            # Create Lambda event
            event = {
                'body': json.dumps({
                    'likeness_id': 'likeness123',
                    'new_policy': {
                        'allow_self_edits': True,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 500
            body = json.loads(response['body'])
            assert body['error']['code'] == 'DATABASE_ERROR'
    
    def test_dynamodb_update_error(self, sample_consent_record):
        """Test handling of DynamoDB update errors."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client') as mock_dynamodb:
            # Configure mock
            mock_dynamodb.get_consent_record.return_value = sample_consent_record
            mock_dynamodb.update_consent_policy.side_effect = ClientError(
                {'Error': {'Code': 'ServiceUnavailable', 'Message': 'Service unavailable'}},
                'UpdateItem'
            )
            
            # Create Lambda event
            event = {
                'body': json.dumps({
                    'likeness_id': 'likeness123',
                    'new_policy': {
                        'allow_self_edits': False,
                        'deny_third_party_edits': True,
                        'deny_face_swaps': True,
                        'deny_sexualized_content': True,
                        'deny_impersonation': True,
                        'deny_political_use': True
                    }
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 500
            body = json.loads(response['body'])
            assert body['error']['code'] == 'DATABASE_ERROR'
    
    def test_invalid_json(self):
        """Test handling of invalid JSON in request body."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client'):
            # Create Lambda event with invalid JSON
            event = {
                'body': 'this is not valid JSON {{{',
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert body['error']['code'] == 'INVALID_JSON'
    
    def test_policy_change_logging(self, sample_consent_record):
        """Test that policy changes are logged to CloudWatch."""
        with patch('src.lambdas.consent_update.handler.dynamodb_client') as mock_dynamodb, \
             patch('src.lambdas.consent_update.handler.logger') as mock_logger:
            
            # Configure mock
            mock_dynamodb.get_consent_record.return_value = sample_consent_record
            mock_dynamodb.update_consent_policy.return_value = None
            
            # Create new policy
            new_policy = ConsentPolicy(
                allow_self_edits=False,
                deny_third_party_edits=True,
                deny_face_swaps=True,
                deny_sexualized_content=True,
                deny_impersonation=True,
                deny_political_use=True
            )
            
            # Create Lambda event
            event = {
                'body': json.dumps({
                    'likeness_id': 'likeness123',
                    'new_policy': new_policy.to_dict()
                }),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify response
            assert response['statusCode'] == 200
            
            # Verify logging was called with policy change event
            log_calls = [str(call) for call in mock_logger.info.call_args_list]
            policy_update_logged = any('POLICY_UPDATE_EVENT' in str(call) for call in log_calls)
            assert policy_update_logged, "Policy update event should be logged"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
