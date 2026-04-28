"""
Property-Based Tests for Evidence Recording System

Feature: likenessguard-aws-prototype
Property 46: DENY decisions record evidence
Property 49: Evidence includes required metadata

Tests that DENY decisions record evidence with all required metadata
(timestamp, similarity score, decision, reason code, requester ID).

Validates: Requirements 13.1, 13.4
"""
import time
import os
from unittest.mock import Mock, patch, MagicMock
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.strategies import composite

from shared.models.data_models import (
    ConsentPolicy, Decision, ReasonCode, UsageType,
    ConsentCheckResponse, AuditRecord
)


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
def deny_reason_code_strategy(draw):
    """Generate random DENY reason codes."""
    return draw(st.sampled_from([
        ReasonCode.DENY_POLICY_VIOLATION,
        ReasonCode.DENY_THIRD_PARTY,
        ReasonCode.DENY_FACE_SWAP,
        ReasonCode.DENY_SEXUALIZED_CONTENT,
        ReasonCode.DENY_IMPERSONATION,
        ReasonCode.DENY_POLITICAL_USE
    ]))


@composite
def usage_type_strategy(draw):
    """Generate random usage types."""
    return draw(st.sampled_from(list(UsageType)))


@composite
def similarity_score_strategy(draw):
    """Generate random similarity scores above threshold."""
    return draw(st.floats(min_value=0.85, max_value=1.0))


# Property 46: DENY decisions record evidence
# Validates: Requirement 13.1

@settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
@given(
    likeness_id=likeness_id_strategy(),
    reason_code=deny_reason_code_strategy(),
    similarity_score=similarity_score_strategy(),
    requester_id=user_id_strategy(),
    usage_type=usage_type_strategy(),
    processing_time_ms=st.integers(min_value=10, max_value=5000)
)
@patch.dict('os.environ', {'AWS_DEFAULT_REGION': 'us-east-1'})
def test_deny_decisions_record_evidence_in_audit_log(
    likeness_id, reason_code, similarity_score, requester_id, usage_type, processing_time_ms
):
    """
    Property: DENY decisions record evidence in audit log.
    
    For any consent check that returns DENY, the system should record evidence
    by storing an audit record in DynamoDB with all required metadata.
    
    The audit record serves as evidence and includes:
    - query_id (unique identifier)
    - timestamp
    - likeness_id
    - decision (DENY)
    - similarity_score
    - reason_code
    - requester_id
    - usage_type
    - ttl (180 days retention)
    
    Validates: Requirement 13.1
    """
    from lambdas.consent_check.handler import log_decision_and_record_evidence
    
    # Create DENY response
    timestamp = int(time.time())
    response = ConsentCheckResponse(
        decision=Decision.DENY,
        likeness_id=likeness_id,
        reason_code=reason_code,
        similarity_score=similarity_score,
        timestamp=timestamp
    )
    
    # Mock DynamoDB client
    mock_dynamodb = Mock()
    mock_dynamodb.store_audit_record = Mock()
    
    # Mock structured logger
    mock_structured_logger = Mock()
    mock_structured_logger.log_consent_check = Mock()
    mock_structured_logger.log_error = Mock()
    
    # Mock metrics
    mock_metrics = Mock()
    mock_metrics.record_decision = Mock()
    mock_metrics.record_processing_time = Mock()
    
    # Patch dependencies
    with patch('lambdas.consent_check.handler.get_dynamodb_client', return_value=mock_dynamodb), \
         patch('lambdas.consent_check.handler.structured_logger', mock_structured_logger), \
         patch('lambdas.consent_check.handler.metrics', mock_metrics):
        
        # Log decision and record evidence
        log_decision_and_record_evidence(
            response=response,
            requester_id=requester_id,
            usage_type=usage_type,
            processing_time_ms=processing_time_ms,
            request_id='test-request-id'
        )
    
    # Verify audit record was stored
    assert mock_dynamodb.store_audit_record.called, \
        "Audit record should be stored for DENY decision"
    
    # Get the stored audit record
    stored_record = mock_dynamodb.store_audit_record.call_args[0][0]
    
    # Verify it's an AuditRecord instance (check type name since isinstance can fail with mocking)
    assert type(stored_record).__name__ == 'AuditRecord', \
        f"Stored record should be an AuditRecord instance, got {type(stored_record)}"
    
    # Verify evidence includes required metadata
    assert stored_record.query_id is not None, "Evidence must include query_id"
    assert stored_record.timestamp == timestamp, "Evidence must include timestamp"
    assert stored_record.likeness_id == likeness_id, "Evidence must include likeness_id"
    assert stored_record.decision == Decision.DENY, "Evidence must record DENY decision"
    assert stored_record.similarity_score == similarity_score, "Evidence must include similarity_score"
    assert stored_record.reason_code == reason_code, "Evidence must include reason_code"
    assert stored_record.requester_id == requester_id, "Evidence must include requester_id"
    assert stored_record.usage_type == usage_type.value, "Evidence must include usage_type"
    assert stored_record.ttl == timestamp + (180 * 24 * 60 * 60), \
        "Evidence must have 180-day TTL"


@settings(max_examples=5, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    likeness_id=likeness_id_strategy(),
    similarity_score=similarity_score_strategy(),
    requester_id=user_id_strategy(),
    usage_type=usage_type_strategy(),
    processing_time_ms=st.integers(min_value=10, max_value=5000)
)
@patch.dict('os.environ', {'AWS_DEFAULT_REGION': 'us-east-1'})
def test_allow_decisions_also_record_audit_log(
    likeness_id, similarity_score, requester_id, usage_type, processing_time_ms
):
    """
    Property: ALLOW decisions also record audit log (not just DENY).
    
    For any consent check that returns ALLOW, the system should also record
    an audit log entry for accountability and transparency.
    
    Validates: Requirement 12.1
    """
    from lambdas.consent_check.handler import log_decision_and_record_evidence
    
    # Create ALLOW response
    timestamp = int(time.time())
    response = ConsentCheckResponse(
        decision=Decision.ALLOW,
        likeness_id=likeness_id,
        reason_code=ReasonCode.ALLOW_SELF_EDIT,
        similarity_score=similarity_score,
        timestamp=timestamp
    )
    
    # Mock DynamoDB client
    mock_dynamodb = Mock()
    mock_dynamodb.store_audit_record = Mock()
    
    # Mock structured logger
    mock_structured_logger = Mock()
    mock_structured_logger.log_consent_check = Mock()
    
    # Mock metrics
    mock_metrics = Mock()
    mock_metrics.record_decision = Mock()
    mock_metrics.record_processing_time = Mock()
    
    # Patch dependencies
    with patch('lambdas.consent_check.handler.get_dynamodb_client', return_value=mock_dynamodb), \
         patch('lambdas.consent_check.handler.structured_logger', mock_structured_logger), \
         patch('lambdas.consent_check.handler.metrics', mock_metrics):
        
        # Log decision and record evidence
        log_decision_and_record_evidence(
            response=response,
            requester_id=requester_id,
            usage_type=usage_type,
            processing_time_ms=processing_time_ms,
            request_id='test-request-id'
        )
    
    # Verify audit record was stored for ALLOW decision too
    assert mock_dynamodb.store_audit_record.called, \
        "Audit record should be stored for ALLOW decision"
    
    stored_record = mock_dynamodb.store_audit_record.call_args[0][0]
    assert stored_record.decision == Decision.ALLOW


@settings(max_examples=5, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
@given(
    requester_id=user_id_strategy(),
    usage_type=usage_type_strategy(),
    processing_time_ms=st.integers(min_value=10, max_value=5000)
)
@patch.dict('os.environ', {'AWS_DEFAULT_REGION': 'us-east-1'})
def test_unknown_decisions_record_audit_log_without_likeness_id(
    requester_id, usage_type, processing_time_ms
):
    """
    Property: UNKNOWN decisions record audit log without likeness_id.
    
    For any consent check that returns UNKNOWN (no match found), the system
    should record an audit log entry with likeness_id=None.
    
    Validates: Requirement 12.1
    """
    from lambdas.consent_check.handler import log_decision_and_record_evidence
    
    # Create UNKNOWN response (no match)
    timestamp = int(time.time())
    response = ConsentCheckResponse(
        decision=Decision.UNKNOWN,
        likeness_id=None,
        reason_code=ReasonCode.UNKNOWN_NO_MATCH,
        similarity_score=None,
        timestamp=timestamp
    )
    
    # Mock DynamoDB client
    mock_dynamodb = Mock()
    mock_dynamodb.store_audit_record = Mock()
    
    # Mock structured logger
    mock_structured_logger = Mock()
    mock_structured_logger.log_consent_check = Mock()
    
    # Mock metrics
    mock_metrics = Mock()
    mock_metrics.record_decision = Mock()
    mock_metrics.record_processing_time = Mock()
    
    # Patch dependencies
    with patch('lambdas.consent_check.handler.get_dynamodb_client', return_value=mock_dynamodb), \
         patch('lambdas.consent_check.handler.structured_logger', mock_structured_logger), \
         patch('lambdas.consent_check.handler.metrics', mock_metrics):
        
        # Log decision and record evidence
        log_decision_and_record_evidence(
            response=response,
            requester_id=requester_id,
            usage_type=usage_type,
            processing_time_ms=processing_time_ms,
            request_id='test-request-id'
        )
    
    # Verify audit record was stored
    assert mock_dynamodb.store_audit_record.called
    
    stored_record = mock_dynamodb.store_audit_record.call_args[0][0]
    assert stored_record.decision == Decision.UNKNOWN
    assert stored_record.likeness_id is None
    assert stored_record.similarity_score is None


# Property 49: Evidence includes required metadata
# Validates: Requirement 13.4

@settings(max_examples=5, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    likeness_id=likeness_id_strategy(),
    reason_code=deny_reason_code_strategy(),
    similarity_score=similarity_score_strategy(),
    requester_id=user_id_strategy(),
    usage_type=usage_type_strategy()
)
def test_evidence_includes_all_required_metadata(
    likeness_id, reason_code, similarity_score, requester_id, usage_type
):
    """
    Property: Evidence includes all required metadata.
    
    For any evidence record, it must include all required metadata:
    - timestamp (when the decision was made)
    - similarity_score (how similar the query was to registered likeness)
    - decision (ALLOW/DENY/UNKNOWN)
    - reason_code (explanation for the decision)
    - requester_id (who made the request)
    - usage_type (what type of usage was requested)
    - likeness_id (which likeness was matched, if any)
    - query_id (unique identifier for this check)
    - ttl (when the record should be deleted)
    
    Validates: Requirement 13.4
    """
    # Create audit record (evidence)
    timestamp = int(time.time())
    audit_record = AuditRecord(
        query_id='test-query-id',
        timestamp=timestamp,
        likeness_id=likeness_id,
        decision=Decision.DENY,
        similarity_score=similarity_score,
        reason_code=reason_code,
        requester_id=requester_id,
        usage_type=usage_type.value,
        ttl=timestamp + (180 * 24 * 60 * 60)
    )
    
    # Verify all required metadata is present
    assert audit_record.query_id is not None, "Evidence must include query_id"
    assert audit_record.timestamp is not None, "Evidence must include timestamp"
    assert audit_record.likeness_id == likeness_id, "Evidence must include likeness_id"
    assert audit_record.decision == Decision.DENY, "Evidence must include decision"
    assert audit_record.similarity_score == similarity_score, \
        "Evidence must include similarity_score"
    assert audit_record.reason_code == reason_code, "Evidence must include reason_code"
    assert audit_record.requester_id == requester_id, "Evidence must include requester_id"
    assert audit_record.usage_type == usage_type.value, "Evidence must include usage_type"
    assert audit_record.ttl is not None, "Evidence must include TTL"
    
    # Verify TTL is set to 180 days
    expected_ttl = timestamp + (180 * 24 * 60 * 60)
    assert audit_record.ttl == expected_ttl, "Evidence TTL must be 180 days"


@settings(max_examples=5, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    likeness_id=likeness_id_strategy(),
    reason_code=deny_reason_code_strategy(),
    similarity_score=similarity_score_strategy(),
    requester_id=user_id_strategy(),
    usage_type=usage_type_strategy()
)
def test_evidence_can_be_serialized_to_dynamodb_format(
    likeness_id, reason_code, similarity_score, requester_id, usage_type
):
    """
    Property: Evidence can be serialized to DynamoDB format.
    
    For any evidence record, it should be serializable to DynamoDB format
    (dictionary with proper types) for storage.
    
    Validates: Requirement 13.1
    """
    # Create audit record
    timestamp = int(time.time())
    audit_record = AuditRecord(
        query_id='test-query-id',
        timestamp=timestamp,
        likeness_id=likeness_id,
        decision=Decision.DENY,
        similarity_score=similarity_score,
        reason_code=reason_code,
        requester_id=requester_id,
        usage_type=usage_type,  # Pass UsageType enum directly
        ttl=timestamp + (180 * 24 * 60 * 60)
    )
    
    # Serialize to dictionary
    record_dict = audit_record.to_dynamodb_item()
    
    # Verify it's a dictionary
    assert isinstance(record_dict, dict), "Evidence should be serializable to dict"
    
    # Verify all fields are present
    assert 'QueryID' in record_dict
    assert 'Timestamp' in record_dict
    assert 'LikenessID' in record_dict
    assert 'Decision' in record_dict
    assert 'SimilarityScore' in record_dict
    assert 'ReasonCode' in record_dict
    assert 'RequesterID' in record_dict
    assert 'UsageType' in record_dict
    assert 'TTL' in record_dict
    
    # Verify types are DynamoDB-compatible
    assert isinstance(record_dict['QueryID'], str)
    assert isinstance(record_dict['Timestamp'], int)
    assert isinstance(record_dict['LikenessID'], str)
    assert isinstance(record_dict['Decision'], str)
    assert isinstance(record_dict['SimilarityScore'], float)
    assert isinstance(record_dict['ReasonCode'], str)
    assert isinstance(record_dict['RequesterID'], str)
    assert isinstance(record_dict['UsageType'], str)
    assert isinstance(record_dict['TTL'], int)


@settings(max_examples=5, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    likeness_id=likeness_id_strategy(),
    reason_code=deny_reason_code_strategy(),
    similarity_score=similarity_score_strategy(),
    requester_id=user_id_strategy(),
    usage_type=usage_type_strategy()
)
def test_evidence_timestamp_is_accurate(
    likeness_id, reason_code, similarity_score, requester_id, usage_type
):
    """
    Property: Evidence timestamp is accurate.
    
    For any evidence record, the timestamp should be close to the current time
    (within a reasonable margin, e.g., 5 seconds).
    
    Validates: Requirement 13.4
    """
    # Record current time
    before_time = int(time.time())
    
    # Create audit record
    audit_record = AuditRecord(
        query_id='test-query-id',
        timestamp=int(time.time()),
        likeness_id=likeness_id,
        decision=Decision.DENY,
        similarity_score=similarity_score,
        reason_code=reason_code,
        requester_id=requester_id,
        usage_type=usage_type.value,
        ttl=int(time.time()) + (180 * 24 * 60 * 60)
    )
    
    # Record time after creation
    after_time = int(time.time())
    
    # Verify timestamp is within reasonable range
    assert before_time <= audit_record.timestamp <= after_time + 1, \
        "Evidence timestamp should be close to current time"
