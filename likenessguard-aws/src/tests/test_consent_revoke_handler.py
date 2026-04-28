"""
Unit tests for consent revocation Lambda handler.

Requirements:
- 6.2: Consent revocation
"""
import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from lambdas.consent_revoke.handler import lambda_handler
from shared.models.data_models import ConsentPolicy, ConsentRecord


@pytest.fixture
def mock_dynamodb_client():
    """Mock DynamoDB client for testing."""
    with patch('lambdas.consent_revoke.handler.dynamodb_client') as mock:
        yield mock


@pytest.fixture
def sample_existing_record():
    """Sample existing consent record."""
    return ConsentRecord(
        likeness_id='test-likeness-123',
        fingerprint_hash='abc123',
        fingerprint_embedding=[0.1] * 512,
        consent_policy=ConsentPolicy(
            allow_self_edits=True,
            deny_third_party_edits=False,
            deny_face_swaps=False,
            deny_sexualized_content=True,
            deny_impersonation=True,
            deny_political_use=False
        ),
        user_metadata={'user_id': 'user-456'},
        created_at=1234567890,
        modified_at=1234567890
    )


def test_successful_revocation(mock_dynamodb_client, sample_existing_record):
    """Test successful consent revocation."""
    # Setup
    mock_dynamodb_client.get_consent_record.return_value = sample_existing_record
    mock_dynamodb_client.update_consent_policy.return_value = None
    
    event = {
        'body': json.dumps({
            'likeness_id': 'test-likeness-123'
        })
    }
    
    # Execute
    response = lambda_handler(event, None)
    
    # Verify
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['status'] == 'SUCCESS'
    assert body['likeness_id'] == 'test-likeness-123'
    assert 'revoked_at' in body
    assert 'all usage types now denied' in body['message']
    
    # Verify deny-all policy was created and applied
    mock_dynamodb_client.update_consent_policy.assert_called_once()
    call_args = mock_dynamodb_client.update_consent_policy.call_args
    assert call_args[0][0] == 'test-likeness-123'
    
    # Verify the policy is deny-all
    deny_all_policy = call_args[0][1]
    assert deny_all_policy.allow_self_edits is False
    assert deny_all_policy.deny_third_party_edits is True
    assert deny_all_policy.deny_face_swaps is True
    assert deny_all_policy.deny_sexualized_content is True
    assert deny_all_policy.deny_impersonation is True
    assert deny_all_policy.deny_political_use is True


def test_missing_likeness_id(mock_dynamodb_client):
    """Test revocation with missing likeness_id."""
    event = {
        'body': json.dumps({})
    }
    
    response = lambda_handler(event, None)
    
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error']['code'] == 'INVALID_REQUEST'
    assert 'likeness_id' in body['error']['message']


def test_likeness_not_found(mock_dynamodb_client):
    """Test revocation when likeness doesn't exist."""
    mock_dynamodb_client.get_consent_record.return_value = None
    
    event = {
        'body': json.dumps({
            'likeness_id': 'nonexistent-likeness'
        })
    }
    
    response = lambda_handler(event, None)
    
    assert response['statusCode'] == 404
    body = json.loads(response['body'])
    assert body['error']['code'] == 'LIKENESS_NOT_FOUND'
    assert 'nonexistent-likeness' in body['error']['message']


def test_dynamodb_get_error(mock_dynamodb_client):
    """Test handling of DynamoDB errors during record retrieval."""
    mock_dynamodb_client.get_consent_record.side_effect = ClientError(
        {'Error': {'Code': 'ServiceUnavailable', 'Message': 'Service unavailable'}},
        'GetItem'
    )
    
    event = {
        'body': json.dumps({
            'likeness_id': 'test-likeness-123'
        })
    }
    
    response = lambda_handler(event, None)
    
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error']['code'] == 'DATABASE_ERROR'
    assert 'retrieve' in body['error']['message'].lower()


def test_dynamodb_update_error(mock_dynamodb_client, sample_existing_record):
    """Test handling of DynamoDB errors during policy update."""
    mock_dynamodb_client.get_consent_record.return_value = sample_existing_record
    mock_dynamodb_client.update_consent_policy.side_effect = ClientError(
        {'Error': {'Code': 'ServiceUnavailable', 'Message': 'Service unavailable'}},
        'UpdateItem'
    )
    
    event = {
        'body': json.dumps({
            'likeness_id': 'test-likeness-123'
        })
    }
    
    response = lambda_handler(event, None)
    
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['error']['code'] == 'DATABASE_ERROR'
    assert 'revoke' in body['error']['message'].lower()


def test_invalid_json(mock_dynamodb_client):
    """Test handling of invalid JSON in request body."""
    event = {
        'body': 'invalid json {'
    }
    
    response = lambda_handler(event, None)
    
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['error']['code'] == 'INVALID_JSON'


def test_revocation_logging(mock_dynamodb_client, sample_existing_record):
    """Test that revocation events are logged properly."""
    mock_dynamodb_client.get_consent_record.return_value = sample_existing_record
    mock_dynamodb_client.update_consent_policy.return_value = None
    
    event = {
        'body': json.dumps({
            'likeness_id': 'test-likeness-123'
        })
    }
    
    with patch('lambdas.consent_revoke.handler.logger') as mock_logger:
        response = lambda_handler(event, None)
        
        # Verify logging occurred
        assert response['statusCode'] == 200
        
        # Check that revocation event was logged
        log_calls = [str(call) for call in mock_logger.info.call_args_list]
        revocation_logged = any('CONSENT_REVOCATION_EVENT' in call for call in log_calls)
        assert revocation_logged, "Revocation event should be logged"


def test_response_headers(mock_dynamodb_client, sample_existing_record):
    """Test that response includes proper headers."""
    mock_dynamodb_client.get_consent_record.return_value = sample_existing_record
    mock_dynamodb_client.update_consent_policy.return_value = None
    
    event = {
        'body': json.dumps({
            'likeness_id': 'test-likeness-123'
        })
    }
    
    response = lambda_handler(event, None)
    
    assert 'headers' in response
    assert response['headers']['Content-Type'] == 'application/json'
    assert response['headers']['Access-Control-Allow-Origin'] == '*'
