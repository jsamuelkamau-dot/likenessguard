"""
Pytest configuration for LikenessGuard AWS Prototype

This file configures the test environment:
- Adds src directory to Python path for imports
- Sets up AWS environment variables for testing
- Configures moto for AWS service mocking
"""
import sys
import os
from pathlib import Path

# Add src directory to Python path so tests can import from shared, lambdas, etc.
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

# Set AWS environment variables for testing
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SECURITY_TOKEN", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")

# Set environment variables for Lambda functions
os.environ.setdefault("CONSENT_REGISTRY_TABLE", "LikenessGuard-ConsentRegistry-Test")
os.environ.setdefault("AUDIT_LOG_TABLE", "LikenessGuard-AuditLog-Test")
os.environ.setdefault("PHOTO_BUCKET", "likenessguard-photos-test")
os.environ.setdefault("SIMILARITY_THRESHOLD", "0.85")
os.environ.setdefault("LOG_LEVEL", "INFO")
