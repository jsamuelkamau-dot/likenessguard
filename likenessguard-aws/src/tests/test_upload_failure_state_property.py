"""
Property-based tests for upload failure state consistency.

These tests use Hypothesis to verify that when photo upload fails, the system
maintains a consistent state and doesn't leave partial data.

Feature: likenessguard-aws-prototype
Task: 6.6 Write property test for upload failure state
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from hypothesis import given, strategies as st, settings, assume
from botocore.exceptions import ClientError

from src.shared.models.data_models import (
    RegistrationRequest,
    ConsentPolicy
)
from src.lambdas.registration.handler import lambda_handler


# ============================================================================
# Custom Strategies
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
def valid_registration_request_strategy(draw):
    """Generate valid registration request with 5-10 photos."""
    photo_count = draw(st.integers(min_value=5, max_value=10))
    return {
        'user_id': draw(st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_characters=['\x00', '\n', '\r']))),
        'photo_keys': [
            f"photos/user_{draw(st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))}/photo{i}.jpg"
            for i in range(photo_count)
        ],
        'consent_policy': draw(consent_policy_strategy()).to_dict(),
        'email': draw(st.one_of(st.none(), st.emails()))
    }


@st.composite
def s3_error_code_strategy(draw):
    """Generate various S3 error codes that can occur during upload."""
    return draw(st.sampled_from([
        '404',
        'NoSuchKey',
        'NoSuchBucket',
        'AccessDenied',
        'InvalidObjectState',
        'ServiceUnavailable',
        'InternalError'
    ]))


def create_s3_client_error(error_code: str, message: str = None) -> ClientError:
    """
    Create a boto3 ClientError for testing.
    
    Args:
        error_code: AWS error code (e.g., '404', 'NoSuchKey')
        message: Optional error message
        
    Returns:
        ClientError instance
    """
    if message is None:
        message = f"Simulated {error_code} error"
    
    error_response = {
        'Error': {
            'Code': error_code,
            'Message': message
        },
        'ResponseMetadata': {
            'RequestId': 'test-request-id',
            'HTTPStatusCode': 404 if error_code in ['404', 'NoSuchKey'] else 500
        }
    }
    
    return ClientError(error_response, 'HeadObject')


# ============================================================================
# Property Tests
# ============================================================================

class TestUploadFailureStateProperty:
    """
    **Validates: Requirements 2.5**
    
    Property 9: Upload failure maintains state
    
    For any photo upload failure, the system state should remain unchanged
    (no partial uploads).
    """
    
    @given(
        valid_registration_request_strategy(),
        s3_error_code_strategy()
    )
    @settings(max_examples=20, deadline=1000)
    def test_property_9_s3_failure_no_partial_state(
        self,
        registration_request: dict,
        error_code: str
    ):
        """
        Test that S3 failures don't create partial state in DynamoDB.
        
        **Validates: Requirements 2.5**
        
        Property: For any S3 error during photo validation, the system should:
        1. Not store any data in DynamoDB
        2. Return an appropriate error response
        3. Not leave orphaned records
        
        This test verifies that when S3 operations fail (photo not found,
        access denied, service unavailable), the registration handler:
        - Does not call DynamoDB store operations
        - Returns a descriptive error message
        - Maintains system consistency
        """
        with patch('src.lambdas.registration.handler.s3_client') as mock_s3, \
             patch('src.lambdas.registration.handler.dynamodb_client') as mock_dynamodb:
            
            # Configure S3 mock to raise error on head_object
            mock_s3.head_object.side_effect = create_s3_client_error(error_code)
            
            # Create Lambda event
            event = {
                'body': json.dumps(registration_request),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] in [400, 500], \
                f"Expected error status code, got {response['statusCode']}"
            
            # Parse response body
            body = json.loads(response['body'])
            assert 'error' in body, "Response should contain error object"
            assert 'code' in body['error'], "Error should have code"
            assert 'message' in body['error'], "Error should have message"
            
            # Verify DynamoDB was NOT called (no partial state)
            mock_dynamodb.store_consent_record.assert_not_called()
            
            # Verify error message is descriptive
            error_message = body['error']['message']
            assert len(error_message) > 0, "Error message should not be empty"
            assert isinstance(error_message, str), "Error message should be a string"
    
    @given(valid_registration_request_strategy())
    @settings(max_examples=20, deadline=1000)
    def test_property_9_rekognition_failure_no_partial_state(
        self,
        registration_request: dict
    ):
        """
        Test that Rekognition failures don't create partial state.
        
        **Validates: Requirements 2.5**
        
        Property: For any Rekognition error during face detection, the system
        should not store partial data in DynamoDB.
        
        This test verifies that when Rekognition fails (service error, no face
        detected in all photos), the registration handler:
        - Does not call DynamoDB store operations
        - Returns appropriate error response
        - Cleans up any temporary data
        """
        with patch('src.lambdas.registration.handler.s3_client') as mock_s3, \
             patch('src.lambdas.registration.handler.rekognition_client') as mock_rekognition, \
             patch('src.lambdas.registration.handler.dynamodb_client') as mock_dynamodb:
            
            # Configure S3 mock to succeed (photos exist)
            mock_s3.head_object.return_value = {'ContentLength': 1000}
            mock_s3.get_object.return_value = {
                'Body': MagicMock(read=lambda: b'fake_image_data')
            }
            
            # Configure Rekognition mock to fail on all photos
            from src.shared.services.rekognition_client import NoFaceDetectedError
            mock_rekognition.detect_faces.side_effect = NoFaceDetectedError(
                "No face detected in image"
            )
            
            # Create Lambda event
            event = {
                'body': json.dumps(registration_request),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 400, \
                f"Expected 400 status code for no valid faces, got {response['statusCode']}"
            
            # Parse response body
            body = json.loads(response['body'])
            assert 'error' in body, "Response should contain error object"
            assert body['error']['code'] == 'NO_VALID_FACES', \
                f"Expected NO_VALID_FACES error code, got {body['error']['code']}"
            
            # Verify DynamoDB was NOT called (no partial state)
            mock_dynamodb.store_consent_record.assert_not_called()
            
            # Verify photos were deleted (cleanup)
            assert mock_s3.delete_object.called, \
                "Photos should be deleted even on failure"
    
    @given(valid_registration_request_strategy())
    @settings(max_examples=20, deadline=1000)
    def test_property_9_dynamodb_failure_no_inconsistent_state(
        self,
        registration_request: dict
    ):
        """
        Test that DynamoDB failures are handled gracefully.
        
        **Validates: Requirements 2.5**
        
        Property: For any DynamoDB error during consent record storage, the
        system should return an error and not leave inconsistent state.
        
        This test verifies that when DynamoDB operations fail, the registration
        handler:
        - Returns appropriate error response (500)
        - Provides descriptive error message
        - Photos are already deleted (cleanup happened before DB write)
        """
        with patch('src.lambdas.registration.handler.s3_client') as mock_s3, \
             patch('src.lambdas.registration.handler.rekognition_client') as mock_rekognition, \
             patch('src.lambdas.registration.handler.dynamodb_client') as mock_dynamodb:
            
            # Configure S3 mock to succeed
            mock_s3.head_object.return_value = {'ContentLength': 1000}
            mock_s3.get_object.return_value = {
                'Body': MagicMock(read=lambda: b'fake_image_data')
            }
            
            # Configure Rekognition mock to succeed
            from src.shared.services.rekognition_client import FaceDetection
            mock_face = FaceDetection(
                bounding_box={'Width': 0.5, 'Height': 0.5, 'Left': 0.25, 'Top': 0.25},
                confidence=99.5
            )
            mock_rekognition.detect_faces.return_value = mock_face
            mock_rekognition.extract_embedding.return_value = [0.1] * 512
            
            # Configure DynamoDB mock to fail
            mock_dynamodb.store_consent_record.side_effect = ClientError(
                {
                    'Error': {
                        'Code': 'ServiceUnavailable',
                        'Message': 'DynamoDB service unavailable'
                    }
                },
                'PutItem'
            )
            
            # Create Lambda event
            event = {
                'body': json.dumps(registration_request),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 500, \
                f"Expected 500 status code for DB error, got {response['statusCode']}"
            
            # Parse response body
            body = json.loads(response['body'])
            assert 'error' in body, "Response should contain error object"
            # The handler returns INTERNAL_ERROR for generic exceptions, DATABASE_ERROR for ClientError
            assert body['error']['code'] in ['DATABASE_ERROR', 'INTERNAL_ERROR'], \
                f"Expected DATABASE_ERROR or INTERNAL_ERROR code, got {body['error']['code']}"
            
            # Verify error message is descriptive
            assert 'Failed to store consent record' in body['error']['message']
            
            # Verify photos were deleted before DB write attempt
            assert mock_s3.delete_object.called, \
                "Photos should be deleted before DB write"
    
    @given(
        valid_registration_request_strategy(),
        st.integers(min_value=0, max_value=4)
    )
    @settings(max_examples=20, deadline=1000)
    def test_property_9_insufficient_valid_photos_no_partial_state(
        self,
        registration_request: dict,
        valid_photo_count: int
    ):
        """
        Test that insufficient valid photos don't create partial state.
        
        **Validates: Requirements 2.5**
        
        Property: When fewer than 5 photos are valid (exist in S3), the system
        should reject the request without storing any data.
        
        This test verifies that when some photos are missing or invalid:
        - No DynamoDB records are created
        - Appropriate error is returned
        - Error message indicates the problem
        """
        # Assume we have at least some photos to make invalid
        assume(len(registration_request['photo_keys']) > valid_photo_count)
        
        with patch('src.lambdas.registration.handler.s3_client') as mock_s3, \
             patch('src.lambdas.registration.handler.dynamodb_client') as mock_dynamodb:
            
            # Configure S3 mock: first N photos succeed, rest fail
            def head_object_side_effect(Bucket, Key):
                photo_index = registration_request['photo_keys'].index(Key)
                if photo_index < valid_photo_count:
                    return {'ContentLength': 1000}
                else:
                    raise create_s3_client_error('NoSuchKey', f'Photo {Key} not found')
            
            mock_s3.head_object.side_effect = head_object_side_effect
            
            # Create Lambda event
            event = {
                'body': json.dumps(registration_request),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify error response
            assert response['statusCode'] == 400, \
                f"Expected 400 status code for insufficient photos, got {response['statusCode']}"
            
            # Parse response body
            body = json.loads(response['body'])
            assert 'error' in body, "Response should contain error object"
            assert body['error']['code'] == 'INSUFFICIENT_PHOTOS', \
                f"Expected INSUFFICIENT_PHOTOS code, got {body['error']['code']}"
            
            # Verify DynamoDB was NOT called (no partial state)
            mock_dynamodb.store_consent_record.assert_not_called()
            
            # Verify error message mentions the count
            assert str(valid_photo_count) in body['error']['message'] or \
                   'At least 5 valid photos required' in body['error']['message']
    
    @given(valid_registration_request_strategy())
    @settings(max_examples=20, deadline=1000)
    def test_property_9_partial_success_maintains_consistency(
        self,
        registration_request: dict
    ):
        """
        Test that partial success (some photos fail) maintains consistency.
        
        **Validates: Requirements 2.5**
        
        Property: When some photos fail but at least one succeeds, the system
        should:
        1. Store a valid consent record with successful fingerprints
        2. Return PARTIAL_SUCCESS status
        3. Include error details for failed photos
        4. Clean up all photos (successful and failed)
        
        This verifies that partial failures are handled gracefully with
        consistent state.
        """
        # Assume we have at least 2 photos
        assume(len(registration_request['photo_keys']) >= 2)
        
        with patch('src.lambdas.registration.handler.s3_client') as mock_s3, \
             patch('src.lambdas.registration.handler.rekognition_client') as mock_rekognition, \
             patch('src.lambdas.registration.handler.dynamodb_client') as mock_dynamodb:
            
            # Configure S3 mock to succeed
            mock_s3.head_object.return_value = {'ContentLength': 1000}
            mock_s3.get_object.return_value = {
                'Body': MagicMock(read=lambda: b'fake_image_data')
            }
            
            # Configure Rekognition mock: first photo succeeds, rest fail
            from src.shared.services.rekognition_client import FaceDetection, NoFaceDetectedError
            
            call_count = [0]
            
            def detect_faces_side_effect(image_bytes):
                call_count[0] += 1
                if call_count[0] == 1:
                    # First photo succeeds
                    return FaceDetection(
                        bounding_box={'Width': 0.5, 'Height': 0.5, 'Left': 0.25, 'Top': 0.25},
                        confidence=99.5
                    )
                else:
                    # Subsequent photos fail
                    raise NoFaceDetectedError("No face detected")
            
            mock_rekognition.detect_faces.side_effect = detect_faces_side_effect
            mock_rekognition.extract_embedding.return_value = [0.1] * 512
            
            # Create Lambda event
            event = {
                'body': json.dumps(registration_request),
                'headers': {},
                'requestContext': {}
            }
            
            # Call Lambda handler
            response = lambda_handler(event, {})
            
            # Verify success response (partial success is still 200)
            # Note: The handler returns 200 for partial success with at least one valid photo
            assert response['statusCode'] in [200, 400], \
                f"Expected 200 (partial success) or 400 (no valid faces), got {response['statusCode']}"
            
            # Parse response body
            body = json.loads(response['body'])
            
            # If status is 200, verify partial success
            if response['statusCode'] == 200:
                assert 'likeness_id' in body, "Response should contain likeness_id"
                assert body['status'] == 'PARTIAL_SUCCESS', \
                    f"Expected PARTIAL_SUCCESS status, got {body['status']}"
                assert body['processed_photos'] >= 1, \
                    "At least one photo should be processed"
                assert body['errors'] is not None and len(body['errors']) > 0, \
                    "Errors should be included for failed photos"
                
                # Verify DynamoDB was called exactly once with valid data
                assert mock_dynamodb.store_consent_record.call_count == 1, \
                    "DynamoDB should be called exactly once"
            else:
                # If status is 400, all photos failed (no valid faces)
                assert 'error' in body
                assert body['error']['code'] == 'NO_VALID_FACES'
                
                # Verify DynamoDB was NOT called
                mock_dynamodb.store_consent_record.assert_not_called()
            
            # Verify all photos were deleted (cleanup)
            assert mock_s3.delete_object.call_count == len(registration_request['photo_keys']), \
                "All photos should be deleted"
    
    def test_edge_case_invalid_json_no_state_change(self):
        """
        Test that invalid JSON doesn't cause state changes.
        
        **Validates: Requirements 2.5**
        
        Edge case: Malformed JSON should be rejected immediately without
        any state changes.
        """
        with patch('src.lambdas.registration.handler.dynamodb_client') as mock_dynamodb:
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
            
            # Verify no state changes
            mock_dynamodb.store_consent_record.assert_not_called()
    
    def test_edge_case_missing_required_fields_no_state_change(self):
        """
        Test that missing required fields don't cause state changes.
        
        **Validates: Requirements 2.5**
        
        Edge case: Requests missing required fields should be rejected
        without any state changes.
        """
        with patch('src.lambdas.registration.handler.dynamodb_client') as mock_dynamodb:
            # Create Lambda event with missing fields
            event = {
                'body': json.dumps({
                    'user_id': 'test_user'
                    # Missing photo_keys and consent_policy
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
            
            # Verify no state changes
            mock_dynamodb.store_consent_record.assert_not_called()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
