"""
Property-Based Tests for Comprehensive Audit Logging

Feature: likenessguard-aws-prototype
Property 45: Comprehensive audit logging

Tests that all system events (consent check, policy modification, registration, error)
have complete audit log entries written to CloudWatch with all required metadata.

Validates: Requirements 12.1, 12.2, 12.3, 12.5
"""
import json
import logging
from unittest.mock import Mock, patch, MagicMock
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.strategies import composite

from shared.utils.structured_logger import StructuredLogger, EventType
from shared.models.data_models import ConsentPolicy, Decision, ReasonCode, UsageType


# Test data generators
@composite
def consent_policy_strategy(draw):
    """Generate random consent policies."""
    return ConsentPolicy(
        allow_self_edits=draw(st.booleans()),
        deny_third_party_edits=draw(st.booleans()),
        deny_face_swaps=draw(st.booleans()),
        deny_sexualized_content=draw(st.booleans()),
        deny_impersonation=draw(st.booleans()),
        deny_political_use=draw(st.booleans())
    )


@composite
def user_id_strategy(draw):
    """Generate random user IDs."""
    return draw(st.text(min_size=1, max_size=50, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd'),
        blacklist_characters='\x00'
    )))


@composite
def likeness_id_strategy(draw):
    """Generate random likeness IDs (UUID format)."""
    return draw(st.uuids()).hex


@composite
def decision_strategy(draw):
    """Generate random decisions."""
    return draw(st.sampled_from([Decision.ALLOW, Decision.DENY, Decision.UNKNOWN]))


@composite
def reason_code_strategy(draw):
    """Generate random reason codes."""
    return draw(st.sampled_from(list(ReasonCode)))


@composite
def usage_type_strategy(draw):
    """Generate random usage types."""
    return draw(st.sampled_from(list(UsageType)))


@composite
def error_type_strategy(draw):
    """Generate random error types."""
    return draw(st.sampled_from([
        'INVALID_REQUEST',
        'INVALID_IMAGE',
        'REKOGNITION_ERROR',
        'DYNAMODB_ERROR',
        'INTERNAL_ERROR',
        'NO_VALID_FACES',
        'INSUFFICIENT_PHOTOS'
    ]))


# Property 45: Comprehensive audit logging
# Validates: Requirements 12.1, 12.2, 12.3, 12.5

@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    user_id=user_id_strategy(),
    likeness_id=likeness_id_strategy(),
    photos_processed=st.integers(min_value=1, max_value=10),
    photos_total=st.integers(min_value=5, max_value=10),
    status=st.sampled_from(['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'])
)
def test_registration_event_logging_includes_required_metadata(
    user_id, likeness_id, photos_processed, photos_total, status
):
    """
    Property: Registration events are logged with all required metadata.
    
    For any registration event, the log entry should include:
    - timestamp
    - service name
    - event_type (REGISTRATION)
    - level (INFO)
    - message
    - metadata with user_id, likeness_id, photos_processed, photos_total, status
    - request_id (optional)
    
    Validates: Requirement 12.3
    """
    # Create mock logger
    mock_logger = Mock(spec=logging.Logger)
    structured_logger = StructuredLogger(mock_logger, 'registration')
    
    # Log registration event
    structured_logger.log_registration(
        user_id=user_id,
        likeness_id=likeness_id,
        photos_processed=photos_processed,
        photos_total=photos_total,
        status=status,
        request_id='test-request-id'
    )
    
    # Verify logger was called
    assert mock_logger.info.called, "Logger should be called for registration event"
    
    # Get the logged message
    log_message = mock_logger.info.call_args[0][0]
    log_entry = json.loads(log_message)
    
    # Verify required fields are present
    assert 'timestamp' in log_entry, "Log entry must include timestamp"
    assert 'service' in log_entry, "Log entry must include service name"
    assert 'event_type' in log_entry, "Log entry must include event_type"
    assert 'level' in log_entry, "Log entry must include level"
    assert 'message' in log_entry, "Log entry must include message"
    assert 'metadata' in log_entry, "Log entry must include metadata"
    assert 'request_id' in log_entry, "Log entry must include request_id"
    
    # Verify event type
    assert log_entry['event_type'] == 'REGISTRATION', "Event type should be REGISTRATION"
    
    # Verify metadata contains required fields
    metadata = log_entry['metadata']
    assert 'user_id' in metadata, "Metadata must include user_id"
    assert 'likeness_id' in metadata, "Metadata must include likeness_id"
    assert 'photos_processed' in metadata, "Metadata must include photos_processed"
    assert 'photos_total' in metadata, "Metadata must include photos_total"
    assert 'status' in metadata, "Metadata must include status"
    
    # Verify values match
    assert metadata['user_id'] == user_id
    assert metadata['likeness_id'] == likeness_id
    assert metadata['photos_processed'] == photos_processed
    assert metadata['photos_total'] == photos_total
    assert metadata['status'] == status


@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    decision=decision_strategy(),
    likeness_id=st.one_of(likeness_id_strategy(), st.none()),
    reason_code=reason_code_strategy(),
    similarity_score=st.one_of(st.floats(min_value=0.0, max_value=1.0), st.none()),
    requester_id=user_id_strategy(),
    usage_type=usage_type_strategy(),
    processing_time_ms=st.integers(min_value=10, max_value=5000)
)
def test_consent_check_logging_includes_required_metadata(
    decision, likeness_id, reason_code, similarity_score, requester_id, usage_type, processing_time_ms
):
    """
    Property: Consent check events are logged with all required metadata.
    
    For any consent check event, the log entry should include:
    - timestamp
    - service name
    - event_type (CONSENT_CHECK)
    - level (INFO)
    - message
    - metadata with decision, likeness_id, reason_code, similarity_score, requester_id, usage_type, processing_time_ms
    - request_id (optional)
    
    Validates: Requirement 12.1
    """
    # Create mock logger
    mock_logger = Mock(spec=logging.Logger)
    structured_logger = StructuredLogger(mock_logger, 'consent_check')
    
    # Log consent check event
    structured_logger.log_consent_check(
        decision=decision.value,
        likeness_id=likeness_id,
        reason_code=reason_code.value,
        similarity_score=similarity_score,
        requester_id=requester_id,
        usage_type=usage_type.value,
        processing_time_ms=processing_time_ms,
        request_id='test-request-id'
    )
    
    # Verify logger was called
    assert mock_logger.info.called, "Logger should be called for consent check event"
    
    # Get the logged message
    log_message = mock_logger.info.call_args[0][0]
    log_entry = json.loads(log_message)
    
    # Verify required fields are present
    assert 'timestamp' in log_entry
    assert 'service' in log_entry
    assert 'event_type' in log_entry
    assert 'level' in log_entry
    assert 'message' in log_entry
    assert 'metadata' in log_entry
    assert 'request_id' in log_entry
    
    # Verify event type
    assert log_entry['event_type'] == 'CONSENT_CHECK'
    
    # Verify metadata contains required fields
    metadata = log_entry['metadata']
    assert 'decision' in metadata
    assert 'likeness_id' in metadata
    assert 'reason_code' in metadata
    assert 'similarity_score' in metadata
    assert 'requester_id' in metadata
    assert 'usage_type' in metadata
    assert 'processing_time_ms' in metadata
    
    # Verify values match
    assert metadata['decision'] == decision.value
    assert metadata['likeness_id'] == likeness_id
    assert metadata['reason_code'] == reason_code.value
    assert metadata['similarity_score'] == similarity_score
    assert metadata['requester_id'] == requester_id
    assert metadata['usage_type'] == usage_type.value
    assert metadata['processing_time_ms'] == processing_time_ms


@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    likeness_id=likeness_id_strategy(),
    old_policy=consent_policy_strategy(),
    new_policy=consent_policy_strategy()
)
def test_policy_update_logging_includes_required_metadata(likeness_id, old_policy, new_policy):
    """
    Property: Policy update events are logged with all required metadata.
    
    For any policy update event, the log entry should include:
    - timestamp
    - service name
    - event_type (POLICY_UPDATE)
    - level (INFO)
    - message
    - metadata with likeness_id, old_policy, new_policy
    - request_id (optional)
    
    Validates: Requirement 12.2
    """
    # Create mock logger
    mock_logger = Mock(spec=logging.Logger)
    structured_logger = StructuredLogger(mock_logger, 'consent_update')
    
    # Log policy update event
    structured_logger.log_policy_update(
        likeness_id=likeness_id,
        old_policy=old_policy.to_dict(),
        new_policy=new_policy.to_dict(),
        request_id='test-request-id'
    )
    
    # Verify logger was called
    assert mock_logger.info.called, "Logger should be called for policy update event"
    
    # Get the logged message
    log_message = mock_logger.info.call_args[0][0]
    log_entry = json.loads(log_message)
    
    # Verify required fields are present
    assert 'timestamp' in log_entry
    assert 'service' in log_entry
    assert 'event_type' in log_entry
    assert 'level' in log_entry
    assert 'message' in log_entry
    assert 'metadata' in log_entry
    assert 'request_id' in log_entry
    
    # Verify event type
    assert log_entry['event_type'] == 'POLICY_UPDATE'
    
    # Verify metadata contains required fields
    metadata = log_entry['metadata']
    assert 'likeness_id' in metadata
    assert 'old_policy' in metadata
    assert 'new_policy' in metadata
    
    # Verify values match
    assert metadata['likeness_id'] == likeness_id
    assert metadata['old_policy'] == old_policy.to_dict()
    assert metadata['new_policy'] == new_policy.to_dict()


@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    error_type=error_type_strategy(),
    error_message=st.text(min_size=1, max_size=200),
    context=st.dictionaries(
        keys=st.text(min_size=1, max_size=20, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll'),
            blacklist_characters='\x00'
        )),
        values=st.text(min_size=0, max_size=100)
    )
)
def test_error_logging_includes_required_metadata(error_type, error_message, context):
    """
    Property: Error events are logged with all required metadata.
    
    For any error event, the log entry should include:
    - timestamp
    - service name
    - event_type (ERROR)
    - level (ERROR)
    - message
    - metadata with error_type, error_message, context
    - request_id (optional)
    
    Validates: Requirement 12.5
    """
    # Create mock logger
    mock_logger = Mock(spec=logging.Logger)
    structured_logger = StructuredLogger(mock_logger, 'test_service')
    
    # Log error event
    structured_logger.log_error(
        error_type=error_type,
        error_message=error_message,
        context=context,
        request_id='test-request-id'
    )
    
    # Verify logger was called with ERROR level
    assert mock_logger.error.called, "Logger should be called with ERROR level for error event"
    
    # Get the logged message
    log_message = mock_logger.error.call_args[0][0]
    log_entry = json.loads(log_message)
    
    # Verify required fields are present
    assert 'timestamp' in log_entry
    assert 'service' in log_entry
    assert 'event_type' in log_entry
    assert 'level' in log_entry
    assert 'message' in log_entry
    assert 'metadata' in log_entry
    assert 'request_id' in log_entry
    
    # Verify event type and level
    assert log_entry['event_type'] == 'ERROR'
    assert log_entry['level'] == 'ERROR'
    
    # Verify metadata contains required fields
    metadata = log_entry['metadata']
    assert 'error_type' in metadata
    assert 'error_message' in metadata
    assert 'context' in metadata
    
    # Verify values match
    assert metadata['error_type'] == error_type
    assert metadata['error_message'] == error_message
    assert metadata['context'] == context


@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    likeness_id=likeness_id_strategy(),
    old_policy=consent_policy_strategy()
)
def test_consent_revocation_logging_includes_required_metadata(likeness_id, old_policy):
    """
    Property: Consent revocation events are logged with all required metadata.
    
    For any consent revocation event, the log entry should include:
    - timestamp
    - service name
    - event_type (CONSENT_REVOCATION)
    - level (INFO)
    - message
    - metadata with likeness_id, old_policy, revoked flag
    - request_id (optional)
    
    Validates: Requirement 12.2
    """
    # Create mock logger
    mock_logger = Mock(spec=logging.Logger)
    structured_logger = StructuredLogger(mock_logger, 'consent_revoke')
    
    # Log consent revocation event
    structured_logger.log_consent_revocation(
        likeness_id=likeness_id,
        old_policy=old_policy.to_dict(),
        request_id='test-request-id'
    )
    
    # Verify logger was called
    assert mock_logger.info.called, "Logger should be called for consent revocation event"
    
    # Get the logged message
    log_message = mock_logger.info.call_args[0][0]
    log_entry = json.loads(log_message)
    
    # Verify required fields are present
    assert 'timestamp' in log_entry
    assert 'service' in log_entry
    assert 'event_type' in log_entry
    assert 'level' in log_entry
    assert 'message' in log_entry
    assert 'metadata' in log_entry
    assert 'request_id' in log_entry
    
    # Verify event type
    assert log_entry['event_type'] == 'CONSENT_REVOCATION'
    
    # Verify metadata contains required fields
    metadata = log_entry['metadata']
    assert 'likeness_id' in metadata
    assert 'old_policy' in metadata
    assert 'revoked' in metadata
    
    # Verify values match
    assert metadata['likeness_id'] == likeness_id
    assert metadata['old_policy'] == old_policy.to_dict()
    assert metadata['revoked'] is True


@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    event_type=st.sampled_from([
        EventType.REGISTRATION,
        EventType.CONSENT_CHECK,
        EventType.POLICY_UPDATE,
        EventType.CONSENT_REVOCATION,
        EventType.ERROR
    ])
)
def test_all_log_entries_are_valid_json(event_type):
    """
    Property: All log entries are valid JSON.
    
    For any log entry, the logged message should be valid JSON that can be parsed.
    This ensures logs can be processed by log aggregation tools.
    
    Validates: Requirement 12.1
    """
    # Create mock logger
    mock_logger = Mock(spec=logging.Logger)
    structured_logger = StructuredLogger(mock_logger, 'test_service')
    
    # Log different event types
    if event_type == EventType.REGISTRATION:
        structured_logger.log_registration(
            user_id='test-user',
            likeness_id='test-likeness',
            photos_processed=5,
            photos_total=10,
            status='SUCCESS'
        )
        log_message = mock_logger.info.call_args[0][0]
    elif event_type == EventType.CONSENT_CHECK:
        structured_logger.log_consent_check(
            decision='ALLOW',
            likeness_id='test-likeness',
            reason_code='ALLOW_SELF_EDIT',
            similarity_score=0.95,
            requester_id='test-requester',
            usage_type='SELF_EDIT'
        )
        log_message = mock_logger.info.call_args[0][0]
    elif event_type == EventType.POLICY_UPDATE:
        structured_logger.log_policy_update(
            likeness_id='test-likeness',
            old_policy={'allow_self_edits': True},
            new_policy={'allow_self_edits': False}
        )
        log_message = mock_logger.info.call_args[0][0]
    elif event_type == EventType.CONSENT_REVOCATION:
        structured_logger.log_consent_revocation(
            likeness_id='test-likeness',
            old_policy={'allow_self_edits': True}
        )
        log_message = mock_logger.info.call_args[0][0]
    elif event_type == EventType.ERROR:
        structured_logger.log_error(
            error_type='TEST_ERROR',
            error_message='Test error message'
        )
        log_message = mock_logger.error.call_args[0][0]
    
    # Verify the log message is valid JSON
    try:
        log_entry = json.loads(log_message)
        assert isinstance(log_entry, dict), "Log entry should be a dictionary"
    except json.JSONDecodeError as e:
        raise AssertionError(f"Log message is not valid JSON: {e}")
