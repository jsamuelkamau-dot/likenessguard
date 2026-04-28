"""
Unit tests for Rekognition client wrapper.

Tests face detection, embedding extraction, error handling, and retry logic.

Requirements:
- 3.1: Face detection in uploaded photos
- 3.2: No face detected scenario
- 3.3: Multiple faces scenario
- 3.4: Facial feature extraction
- 8.2: Reference image face detection
- 19.1: Retry logic with exponential backoff
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError, BotoCoreError
import time

from src.shared.services.rekognition_client import (
    RekognitionClient,
    FaceDetection,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    RekognitionServiceError
)


class TestFaceDetection:
    """Test FaceDetection data class."""
    
    def test_face_detection_creation(self):
        """Test creating a FaceDetection object."""
        bounding_box = {'Left': 0.1, 'Top': 0.2, 'Width': 0.3, 'Height': 0.4}
        face = FaceDetection(
            bounding_box=bounding_box,
            confidence=95.5,
            face_id='test-face-id'
        )
        
        assert face.bounding_box == bounding_box
        assert face.confidence == 95.5
        assert face.face_id == 'test-face-id'
        assert face.embedding is None
    
    def test_face_detection_with_embedding(self):
        """Test FaceDetection with embedding."""
        embedding = [0.1] * 512
        face = FaceDetection(
            bounding_box={},
            confidence=90.0,
            embedding=embedding
        )
        
        assert face.embedding == embedding
        assert len(face.embedding) == 512


class TestRekognitionClient:
    """Test RekognitionClient functionality."""
    
    @pytest.fixture
    def mock_rekognition_client(self):
        """Create a mock boto3 Rekognition client."""
        with patch('boto3.client') as mock_client:
            yield mock_client.return_value
    
    @pytest.fixture
    def rekognition_client(self, mock_rekognition_client):
        """Create RekognitionClient with mocked boto3 client."""
        return RekognitionClient(region_name='us-east-1')
    
    def test_client_initialization(self, mock_rekognition_client):
        """Test RekognitionClient initialization."""
        client = RekognitionClient(
            region_name='us-west-2',
            max_retries=5,
            retry_delay=0.2
        )
        
        assert client.max_retries == 5
        assert client.retry_delay == 0.2
    
    def test_detect_faces_success(self, rekognition_client, mock_rekognition_client):
        """
        Test successful face detection with single face.
        
        Requirements: 3.1
        """
        # Mock Rekognition response
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': [
                {
                    'BoundingBox': {
                        'Left': 0.2,
                        'Top': 0.3,
                        'Width': 0.4,
                        'Height': 0.5
                    },
                    'Confidence': 99.5
                }
            ]
        }
        
        image_bytes = b'fake-image-data'
        face = rekognition_client.detect_faces(image_bytes)
        
        assert isinstance(face, FaceDetection)
        assert face.confidence == 99.5
        assert face.bounding_box['Left'] == 0.2
        assert face.bounding_box['Top'] == 0.3
        
        # Verify Rekognition was called correctly
        mock_rekognition_client.detect_faces.assert_called_once()
        call_args = mock_rekognition_client.detect_faces.call_args
        assert call_args[1]['Image']['Bytes'] == image_bytes
    
    def test_detect_faces_no_face(self, rekognition_client, mock_rekognition_client):
        """
        Test face detection when no face is present.
        
        Requirements: 3.2
        """
        # Mock Rekognition response with no faces
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': []
        }
        
        image_bytes = b'fake-image-data'
        
        with pytest.raises(NoFaceDetectedError) as exc_info:
            rekognition_client.detect_faces(image_bytes)
        
        assert "No face detected" in str(exc_info.value)
    
    def test_detect_faces_low_confidence(self, rekognition_client, mock_rekognition_client):
        """
        Test face detection when confidence is below threshold.
        
        Requirements: 3.2
        """
        # Mock Rekognition response with low confidence face
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': [
                {
                    'BoundingBox': {'Left': 0.1, 'Top': 0.1, 'Width': 0.2, 'Height': 0.2},
                    'Confidence': 85.0  # Below default 90% threshold
                }
            ]
        }
        
        image_bytes = b'fake-image-data'
        
        with pytest.raises(NoFaceDetectedError) as exc_info:
            rekognition_client.detect_faces(image_bytes, min_confidence=90.0)
        
        assert "No face detected" in str(exc_info.value)
    
    def test_detect_faces_multiple_faces(self, rekognition_client, mock_rekognition_client):
        """
        Test face detection when multiple faces are present.
        
        Requirements: 3.3
        """
        # Mock Rekognition response with multiple faces
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': [
                {
                    'BoundingBox': {'Left': 0.1, 'Top': 0.1, 'Width': 0.2, 'Height': 0.2},
                    'Confidence': 95.0
                },
                {
                    'BoundingBox': {'Left': 0.5, 'Top': 0.1, 'Width': 0.2, 'Height': 0.2},
                    'Confidence': 93.0
                }
            ]
        }
        
        image_bytes = b'fake-image-data'
        
        with pytest.raises(MultipleFacesDetectedError) as exc_info:
            rekognition_client.detect_faces(image_bytes)
        
        assert "Multiple faces detected" in str(exc_info.value)
        assert "2" in str(exc_info.value)
    
    def test_extract_embedding_success(self, rekognition_client, mock_rekognition_client):
        """
        Test successful embedding extraction.
        
        Requirements: 3.4
        """
        # Mock Rekognition response with landmarks
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': [
                {
                    'Confidence': 99.0,
                    'Landmarks': [
                        {'Type': 'eyeLeft', 'X': 0.3, 'Y': 0.4},
                        {'Type': 'eyeRight', 'X': 0.7, 'Y': 0.4},
                        {'Type': 'nose', 'X': 0.5, 'Y': 0.6},
                        {'Type': 'mouthLeft', 'X': 0.35, 'Y': 0.8},
                        {'Type': 'mouthRight', 'X': 0.65, 'Y': 0.8}
                    ]
                }
            ]
        }
        
        face_detection = FaceDetection(
            bounding_box={'Left': 0.1, 'Top': 0.1, 'Width': 0.8, 'Height': 0.8},
            confidence=99.0
        )
        image_bytes = b'fake-image-data'
        
        embedding = rekognition_client.extract_embedding(face_detection, image_bytes)
        
        assert isinstance(embedding, list)
        assert len(embedding) == 512  # Should be padded to 512 dimensions
        assert all(isinstance(x, float) for x in embedding)
        
        # Verify the embedding was stored in face_detection
        assert face_detection.embedding == embedding
    
    def test_extract_embedding_no_face(self, rekognition_client, mock_rekognition_client):
        """Test embedding extraction when no face is returned."""
        # Mock Rekognition response with no faces
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': []
        }
        
        face_detection = FaceDetection(
            bounding_box={},
            confidence=90.0
        )
        image_bytes = b'fake-image-data'
        
        with pytest.raises(RekognitionServiceError) as exc_info:
            rekognition_client.extract_embedding(face_detection, image_bytes)
        
        assert "No face details" in str(exc_info.value)
    
    def test_retry_on_throttling(self, rekognition_client, mock_rekognition_client):
        """
        Test retry logic with exponential backoff on throttling.
        
        Requirements: 19.1
        """
        # Mock throttling error followed by success
        throttle_error = ClientError(
            {
                'Error': {
                    'Code': 'ThrottlingException',
                    'Message': 'Rate exceeded'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = [
            throttle_error,
            throttle_error,
            {
                'FaceDetails': [
                    {
                        'BoundingBox': {'Left': 0.1, 'Top': 0.1, 'Width': 0.2, 'Height': 0.2},
                        'Confidence': 95.0
                    }
                ]
            }
        ]
        
        # Use very short retry delay for testing
        rekognition_client.retry_delay = 0.01
        
        start_time = time.time()
        face = rekognition_client.detect_faces(b'fake-image-data')
        elapsed = time.time() - start_time
        
        # Should succeed after retries
        assert isinstance(face, FaceDetection)
        assert face.confidence == 95.0
        
        # Should have called detect_faces 3 times (2 failures + 1 success)
        assert mock_rekognition_client.detect_faces.call_count == 3
        
        # Should have taken some time due to backoff (at least 2 delays)
        assert elapsed >= 0.02  # 0.01 + 0.02 (with exponential backoff)
    
    def test_retry_exhausted(self, rekognition_client, mock_rekognition_client):
        """
        Test that retries are exhausted and error is raised.
        
        Requirements: 19.1
        """
        # Mock persistent throttling error
        throttle_error = ClientError(
            {
                'Error': {
                    'Code': 'ThrottlingException',
                    'Message': 'Rate exceeded'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = throttle_error
        
        # Use very short retry delay for testing
        rekognition_client.retry_delay = 0.01
        rekognition_client.max_retries = 3
        
        with pytest.raises(RekognitionServiceError) as exc_info:
            rekognition_client.detect_faces(b'fake-image-data')
        
        assert "after 3 retries" in str(exc_info.value)
        
        # Should have attempted 3 times
        assert mock_rekognition_client.detect_faces.call_count == 3
    
    def test_no_retry_on_client_error(self, rekognition_client, mock_rekognition_client):
        """
        Test that client errors (invalid input) are not retried.
        
        Requirements: 19.1
        """
        # Mock client error (invalid parameter)
        client_error = ClientError(
            {
                'Error': {
                    'Code': 'InvalidParameterException',
                    'Message': 'Invalid image'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = client_error
        
        with pytest.raises(RekognitionServiceError) as exc_info:
            rekognition_client.detect_faces(b'fake-image-data')
        
        assert "InvalidParameterException" in str(exc_info.value)
        
        # Should have attempted only once (no retries for client errors)
        assert mock_rekognition_client.detect_faces.call_count == 1
    
    def test_retry_on_service_unavailable(self, rekognition_client, mock_rekognition_client):
        """
        Test retry on service unavailable error.
        
        Requirements: 19.1
        """
        # Mock service unavailable error followed by success
        service_error = ClientError(
            {
                'Error': {
                    'Code': 'ServiceUnavailable',
                    'Message': 'Service temporarily unavailable'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = [
            service_error,
            {
                'FaceDetails': [
                    {
                        'BoundingBox': {'Left': 0.1, 'Top': 0.1, 'Width': 0.2, 'Height': 0.2},
                        'Confidence': 95.0
                    }
                ]
            }
        ]
        
        rekognition_client.retry_delay = 0.01
        
        face = rekognition_client.detect_faces(b'fake-image-data')
        
        # Should succeed after retry
        assert isinstance(face, FaceDetection)
        assert mock_rekognition_client.detect_faces.call_count == 2
    
    def test_retry_on_network_error(self, rekognition_client, mock_rekognition_client):
        """
        Test retry on network/BotoCore errors.
        
        Requirements: 19.1
        """
        # Mock network error followed by success
        network_error = BotoCoreError()
        
        mock_rekognition_client.detect_faces.side_effect = [
            network_error,
            {
                'FaceDetails': [
                    {
                        'BoundingBox': {'Left': 0.1, 'Top': 0.1, 'Width': 0.2, 'Height': 0.2},
                        'Confidence': 95.0
                    }
                ]
            }
        ]
        
        rekognition_client.retry_delay = 0.01
        
        face = rekognition_client.detect_faces(b'fake-image-data')
        
        # Should succeed after retry
        assert isinstance(face, FaceDetection)
        assert mock_rekognition_client.detect_faces.call_count == 2


class TestEdgeCases:
    """Test edge cases and error scenarios."""
    
    @pytest.fixture
    def mock_rekognition_client(self):
        """Create a mock boto3 Rekognition client."""
        with patch('boto3.client') as mock_client:
            yield mock_client.return_value
    
    @pytest.fixture
    def rekognition_client(self, mock_rekognition_client):
        """Create RekognitionClient with mocked boto3 client."""
        return RekognitionClient(region_name='us-east-1')
    
    def test_empty_image_bytes(self, rekognition_client, mock_rekognition_client):
        """Test handling of empty image bytes."""
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': []
        }
        
        with pytest.raises(NoFaceDetectedError):
            rekognition_client.detect_faces(b'')
    
    def test_invalid_image_format(self, rekognition_client, mock_rekognition_client):
        """
        Test handling of invalid image format.
        
        Requirements: 2.4, 3.2
        """
        # Mock Rekognition response for invalid image format
        invalid_format_error = ClientError(
            {
                'Error': {
                    'Code': 'InvalidImageFormatException',
                    'Message': 'Invalid image format'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = invalid_format_error
        
        # Should raise RekognitionServiceError for invalid format
        with pytest.raises(RekognitionServiceError) as exc_info:
            rekognition_client.detect_faces(b'not-an-image')
        
        assert "InvalidImageFormatException" in str(exc_info.value)
        
        # Should not retry on client errors
        assert mock_rekognition_client.detect_faces.call_count == 1
    
    def test_corrupted_image_data(self, rekognition_client, mock_rekognition_client):
        """
        Test handling of corrupted image data.
        
        Requirements: 2.4, 3.2
        """
        # Mock Rekognition response for corrupted image
        corrupted_error = ClientError(
            {
                'Error': {
                    'Code': 'InvalidS3ObjectException',
                    'Message': 'Unable to get image metadata from S3'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = corrupted_error
        
        with pytest.raises(RekognitionServiceError) as exc_info:
            rekognition_client.detect_faces(b'corrupted-data')
        
        assert "InvalidS3ObjectException" in str(exc_info.value)
    
    def test_unsupported_image_type(self, rekognition_client, mock_rekognition_client):
        """
        Test handling of unsupported image types (e.g., BMP, TIFF).
        
        Requirements: 2.4
        """
        # Mock Rekognition response for unsupported format
        unsupported_error = ClientError(
            {
                'Error': {
                    'Code': 'InvalidParameterException',
                    'Message': 'Request has Invalid Parameters'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = unsupported_error
        
        with pytest.raises(RekognitionServiceError) as exc_info:
            rekognition_client.detect_faces(b'BMP-or-TIFF-data')
        
        assert "InvalidParameterException" in str(exc_info.value)
    
    def test_image_too_large(self, rekognition_client, mock_rekognition_client):
        """
        Test handling of images that exceed size limits.
        
        Requirements: 2.4
        """
        # Mock Rekognition response for image too large
        size_error = ClientError(
            {
                'Error': {
                    'Code': 'ImageTooLargeException',
                    'Message': 'Image size exceeds limit'
                }
            },
            'DetectFaces'
        )
        
        mock_rekognition_client.detect_faces.side_effect = size_error
        
        with pytest.raises(RekognitionServiceError) as exc_info:
            rekognition_client.detect_faces(b'x' * (15 * 1024 * 1024))  # Simulate large image
        
        assert "ImageTooLargeException" in str(exc_info.value)
    
    def test_custom_confidence_threshold(self, rekognition_client, mock_rekognition_client):
        """Test custom confidence threshold."""
        mock_rekognition_client.detect_faces.return_value = {
            'FaceDetails': [
                {
                    'BoundingBox': {'Left': 0.1, 'Top': 0.1, 'Width': 0.2, 'Height': 0.2},
                    'Confidence': 85.0
                }
            ]
        }
        
        # Should succeed with lower threshold
        face = rekognition_client.detect_faces(b'fake-image-data', min_confidence=80.0)
        assert face.confidence == 85.0
        
        # Should fail with higher threshold
        with pytest.raises(NoFaceDetectedError):
            rekognition_client.detect_faces(b'fake-image-data', min_confidence=90.0)
