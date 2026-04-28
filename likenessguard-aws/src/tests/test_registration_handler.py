"""
Unit tests for registration Lambda handler.

Tests the registration handler's ability to:
- Parse and validate registration requests
- Validate photo count (5-10 images)
- Validate photos exist in S3
- Handle errors gracefully

Requirements: 1.1, 2.1, 2.3
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

# Import the handler
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambdas', 'registration'))
from handler import lambda_handler


class TestRegistrationHandler:
    """Test suite for registration Lambda handler."""
    
    def test_valid_registration_request(self):
        """Test handler accepts valid registration request with 5-10 photos."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                },
                'email': 'user@example.com'
            })
        }
        
        # Mock S3 client and Rekognition client
        with patch('handler.s3_client') as mock_s3, \
             patch('handler.rekognition_client') as mock_rekognition, \
             patch('handler.dynamodb_client') as mock_dynamodb:
            
            # Mock S3 head_object to return success
            mock_s3.head_object.return_value = {}
            
            # Mock S3 get_object to return fake image bytes
            mock_s3.get_object.return_value = {
                'Body': Mock(read=Mock(return_value=b'fake_image_data'))
            }
            
            # Mock S3 delete_object
            mock_s3.delete_object.return_value = {}
            
            # Mock Rekognition face detection
            mock_face = Mock()
            mock_face.confidence = 95.0
            mock_face.bounding_box = {'Left': 0.1, 'Top': 0.1, 'Width': 0.5, 'Height': 0.5}
            mock_face.embedding = [0.1] * 512
            mock_rekognition.detect_faces.return_value = mock_face
            
            # Mock Rekognition embedding extraction
            mock_rekognition.extract_embedding.return_value = [0.1] * 512
            
            # Mock DynamoDB store_consent_record
            mock_dynamodb.store_consent_record.return_value = None
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 200
            body = json.loads(response['body'])
            assert body['status'] == 'SUCCESS'
            assert body['processed_photos'] == 5
            assert 'likeness_id' in body
            assert body['likeness_id'] != 'pending'  # Should have a real UUID now
            assert mock_s3.head_object.call_count == 5
            assert mock_s3.get_object.call_count == 5
            assert mock_s3.delete_object.call_count == 5
            assert mock_rekognition.detect_faces.call_count == 5
            assert mock_rekognition.extract_embedding.call_count == 5
            assert mock_dynamodb.store_consent_record.call_count == 1
    
    def test_photo_count_too_few(self):
        """Test handler rejects request with fewer than 5 photos."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Act
        response = lambda_handler(event, None)
        
        # Assert
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'photo_keys must contain 5-10 items' in body['error']['message']
    
    def test_photo_count_too_many(self):
        """Test handler rejects request with more than 10 photos."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [f'photos/user123/photo{i}.jpg' for i in range(11)],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Act
        response = lambda_handler(event, None)
        
        # Assert
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'photo_keys must contain 5-10 items' in body['error']['message']
    
    def test_missing_required_field_user_id(self):
        """Test handler rejects request missing user_id."""
        # Arrange
        event = {
            'body': json.dumps({
                'photo_keys': ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg'],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Act
        response = lambda_handler(event, None)
        
        # Assert
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'user_id' in body['error']['message']
    
    def test_missing_required_field_photo_keys(self):
        """Test handler rejects request missing photo_keys."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Act
        response = lambda_handler(event, None)
        
        # Assert
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'photo_keys' in body['error']['message']
    
    def test_missing_required_field_consent_policy(self):
        """Test handler rejects request missing consent_policy."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg']
            })
        }
        
        # Act
        response = lambda_handler(event, None)
        
        # Assert
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'consent_policy' in body['error']['message']
    
    def test_photo_not_found_in_s3(self):
        """Test handler handles missing photos in S3."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Mock S3 client to return 404 for some photos
        with patch('handler.s3_client') as mock_s3:
            def head_object_side_effect(Bucket, Key):
                if 'photo3' in Key or 'photo4' in Key:
                    raise ClientError(
                        {'Error': {'Code': '404', 'Message': 'Not Found'}},
                        'HeadObject'
                    )
                return {}
            
            mock_s3.head_object.side_effect = head_object_side_effect
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'error' in body
            assert body['error']['code'] == 'INSUFFICIENT_PHOTOS'
            assert 'At least 5 valid photos required' in body['error']['message']
    
    def test_some_photos_missing_but_enough_valid(self):
        """Test handler succeeds when some photos are missing but 5+ are valid."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg',
                    'photos/user123/photo6.jpg',
                    'photos/user123/photo7.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Mock S3 client and Rekognition client
        with patch('handler.s3_client') as mock_s3, \
             patch('handler.rekognition_client') as mock_rekognition, \
             patch('handler.dynamodb_client') as mock_dynamodb:
            
            # Mock S3 head_object to return 404 for 2 photos
            def head_object_side_effect(Bucket, Key):
                if 'photo6' in Key or 'photo7' in Key:
                    raise ClientError(
                        {'Error': {'Code': '404', 'Message': 'Not Found'}},
                        'HeadObject'
                    )
                return {}
            
            mock_s3.head_object.side_effect = head_object_side_effect
            
            # Mock S3 get_object to return fake image bytes
            mock_s3.get_object.return_value = {
                'Body': Mock(read=Mock(return_value=b'fake_image_data'))
            }
            
            # Mock S3 delete_object
            mock_s3.delete_object.return_value = {}
            
            # Mock Rekognition face detection
            mock_face = Mock()
            mock_face.confidence = 95.0
            mock_face.bounding_box = {'Left': 0.1, 'Top': 0.1, 'Width': 0.5, 'Height': 0.5}
            mock_face.embedding = [0.1] * 512
            mock_rekognition.detect_faces.return_value = mock_face
            
            # Mock Rekognition embedding extraction
            mock_rekognition.extract_embedding.return_value = [0.1] * 512
            
            # Mock DynamoDB store_consent_record
            mock_dynamodb.store_consent_record.return_value = None
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 200
            body = json.loads(response['body'])
            assert body['status'] == 'PARTIAL_SUCCESS'
            assert body['processed_photos'] == 5
            assert body['errors'] is not None
            assert len(body['errors']) == 2
    
    def test_invalid_json_body(self):
        """Test handler handles invalid JSON gracefully."""
        # Arrange
        event = {
            'body': 'not valid json {'
        }
        
        # Act
        response = lambda_handler(event, None)
        
        # Assert
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert body['error']['code'] == 'INVALID_JSON'
    
    def test_empty_body(self):
        """Test handler handles empty body gracefully."""
        # Arrange
        event = {
            'body': '{}'
        }
        
        # Act
        response = lambda_handler(event, None)
        
        # Assert
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'user_id' in body['error']['message']
    
    def test_s3_access_error(self):
        """Test handler handles S3 access errors gracefully."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Mock S3 client to return access denied error
        with patch('handler.s3_client') as mock_s3:
            mock_s3.head_object.side_effect = ClientError(
                {'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}},
                'HeadObject'
            )
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'error' in body
            assert body['error']['code'] == 'INSUFFICIENT_PHOTOS'
    
    def test_no_face_detected_in_photos(self):
        """Test handler handles photos with no detectable faces."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Mock S3 and Rekognition clients
        with patch('handler.s3_client') as mock_s3, \
             patch('handler.rekognition_client') as mock_rekognition:
            
            # Mock S3 operations
            mock_s3.head_object.return_value = {}
            mock_s3.get_object.return_value = {
                'Body': Mock(read=Mock(return_value=b'fake_image_data'))
            }
            mock_s3.delete_object.return_value = {}
            
            # Mock Rekognition to raise NoFaceDetectedError
            from shared.services.rekognition_client import NoFaceDetectedError
            mock_rekognition.detect_faces.side_effect = NoFaceDetectedError("No face detected")
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'error' in body
            assert body['error']['code'] == 'NO_VALID_FACES'
            assert 'No valid faces detected' in body['error']['message']
            # All photos should be deleted even on error
            assert mock_s3.delete_object.call_count == 5
    
    def test_multiple_faces_detected_in_photos(self):
        """Test handler handles photos with multiple faces."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Mock S3 and Rekognition clients
        with patch('handler.s3_client') as mock_s3, \
             patch('handler.rekognition_client') as mock_rekognition:
            
            # Mock S3 operations
            mock_s3.head_object.return_value = {}
            mock_s3.get_object.return_value = {
                'Body': Mock(read=Mock(return_value=b'fake_image_data'))
            }
            mock_s3.delete_object.return_value = {}
            
            # Mock Rekognition to raise MultipleFacesDetectedError
            from shared.services.rekognition_client import MultipleFacesDetectedError
            mock_rekognition.detect_faces.side_effect = MultipleFacesDetectedError("Multiple faces detected")
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'error' in body
            assert body['error']['code'] == 'NO_VALID_FACES'
            # All photos should be deleted even on error
            assert mock_s3.delete_object.call_count == 5
    
    def test_partial_success_with_some_face_detection_failures(self):
        """Test handler succeeds with partial results when some photos fail face detection."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg',
                    'photos/user123/photo6.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Mock S3 and Rekognition clients
        with patch('handler.s3_client') as mock_s3, \
             patch('handler.rekognition_client') as mock_rekognition, \
             patch('handler.dynamodb_client') as mock_dynamodb:
            
            # Mock S3 operations
            mock_s3.head_object.return_value = {}
            mock_s3.get_object.return_value = {
                'Body': Mock(read=Mock(return_value=b'fake_image_data'))
            }
            mock_s3.delete_object.return_value = {}
            
            # Mock Rekognition to fail on some photos
            from shared.services.rekognition_client import NoFaceDetectedError
            call_count = [0]
            
            def detect_faces_side_effect(image_bytes):
                call_count[0] += 1
                if call_count[0] <= 3:
                    # First 3 succeed
                    mock_face = Mock()
                    mock_face.confidence = 95.0
                    mock_face.bounding_box = {'Left': 0.1, 'Top': 0.1, 'Width': 0.5, 'Height': 0.5}
                    mock_face.embedding = [0.1] * 512
                    return mock_face
                else:
                    # Last 3 fail
                    raise NoFaceDetectedError("No face detected")
            
            mock_rekognition.detect_faces.side_effect = detect_faces_side_effect
            mock_rekognition.extract_embedding.return_value = [0.1] * 512
            
            # Mock DynamoDB store_consent_record
            mock_dynamodb.store_consent_record.return_value = None
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 200
            body = json.loads(response['body'])
            assert body['status'] == 'PARTIAL_SUCCESS'
            assert body['processed_photos'] == 3
            assert body['errors'] is not None
            assert len(body['errors']) == 3
            # All photos should be deleted
            assert mock_s3.delete_object.call_count == 6
    
    def test_rekognition_service_error(self):
        """Test handler handles Rekognition service errors gracefully."""
        # Arrange
        event = {
            'body': json.dumps({
                'user_id': 'user123',
                'photo_keys': [
                    'photos/user123/photo1.jpg',
                    'photos/user123/photo2.jpg',
                    'photos/user123/photo3.jpg',
                    'photos/user123/photo4.jpg',
                    'photos/user123/photo5.jpg'
                ],
                'consent_policy': {
                    'allow_self_edits': True,
                    'deny_third_party_edits': True,
                    'deny_face_swaps': True,
                    'deny_sexualized_content': True,
                    'deny_impersonation': True,
                    'deny_political_use': True
                }
            })
        }
        
        # Mock S3 and Rekognition clients
        with patch('handler.s3_client') as mock_s3, \
             patch('handler.rekognition_client') as mock_rekognition:
            
            # Mock S3 operations
            mock_s3.head_object.return_value = {}
            mock_s3.get_object.return_value = {
                'Body': Mock(read=Mock(return_value=b'fake_image_data'))
            }
            mock_s3.delete_object.return_value = {}
            
            # Mock Rekognition to raise service error
            from shared.services.rekognition_client import RekognitionServiceError
            mock_rekognition.detect_faces.side_effect = RekognitionServiceError("Service unavailable")
            
            # Act
            response = lambda_handler(event, None)
            
            # Assert
            assert response['statusCode'] == 400
            body = json.loads(response['body'])
            assert 'error' in body
            assert body['error']['code'] == 'NO_VALID_FACES'
            # Photos should NOT be deleted on service error (might be transient)
            assert mock_s3.delete_object.call_count == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
