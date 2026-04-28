"""
LikenessGuard Python SDK v2

1-day integration for AI image generator platforms.
Perform a full consent check in 10 lines of code.

Usage:
    from likenessguard import LikenessGuardClient

    client = LikenessGuardClient(
        api_endpoint="https://your-api.execute-api.us-east-1.amazonaws.com/v1",
        platform_id="my-platform",
        api_key="your-api-key"
    )

    result = client.check_consent("path/to/image.jpg", usage_type="GENERAL_GENERATION")
    if result.decision == "ALLOW":
        print(f"Consent granted. Proof: {result.proof_of_face['manifest_id']}")
    else:
        print(f"Consent denied: {result.reason_code}")

Requirements: 6.7, 6.8
"""
import base64
import json
import time
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Optional


@dataclass
class ConsentResult:
    """Result of a consent check."""
    decision: str           # ALLOW | DENY
    reason_code: str
    confidence: float
    similarity_score: float
    subject_id: Optional[str]
    reasoning_trace: str
    proof_of_face: Optional[dict]
    agent_trace: Optional[dict]
    request_id: str
    latency_ms: int

    @property
    def allowed(self) -> bool:
        return self.decision == 'ALLOW'

    @property
    def denied(self) -> bool:
        return self.decision == 'DENY'


class LikenessGuardClient:
    """
    LikenessGuard v2 consent check client.

    Integrates with the LikenessGuard federated registry API to perform
    pre-generation consent checks for AI image generators.
    """

    def __init__(self, api_endpoint: str, platform_id: str, api_key: str = '',
                 timeout: int = 10):
        self.api_endpoint = api_endpoint.rstrip('/')
        self.platform_id = platform_id
        self.api_key = api_key
        self.timeout = timeout

    def check_consent(self, image_path: str, usage_type: str = 'GENERAL_GENERATION',
                      requester_id: str = None) -> ConsentResult:
        """
        Check consent for an image file.

        Args:
            image_path: Path to the reference image file
            usage_type: One of GENERAL_GENERATION, SELF_EDIT, THIRD_PARTY_EDIT, FACE_SWAP
            requester_id: Optional requester identifier (defaults to platform_id)

        Returns:
            ConsentResult with decision, proof_of_face, and full agent trace
        """
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        return self.check_consent_bytes(image_bytes, usage_type, requester_id)

    def check_consent_bytes(self, image_bytes: bytes, usage_type: str = 'GENERAL_GENERATION',
                             requester_id: str = None) -> ConsentResult:
        """Check consent for raw image bytes."""
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        payload = {
            "image": image_b64,
            "usage_type": usage_type,
            "requester_id": requester_id or self.platform_id,
            "platform": self.platform_id
        }
        response = self._post('/v2/consent/check', payload)
        return ConsentResult(
            decision=response.get('decision', 'DENY'),
            reason_code=response.get('reason_code', 'UNKNOWN'),
            confidence=float(response.get('confidence', 0.0)),
            similarity_score=float(response.get('similarity_score', 0.0)),
            subject_id=response.get('subject_id'),
            reasoning_trace=response.get('reasoning_trace', ''),
            proof_of_face=response.get('proof_of_face'),
            agent_trace=response.get('agent_trace'),
            request_id=response.get('request_id', ''),
            latency_ms=response.get('latency_ms', 0)
        )

    def verify_proof(self, manifest: dict) -> dict:
        """Verify a Proof-of-Face signed manifest."""
        return self._post('/v2/proof/verify', {"manifest": manifest})

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{self.api_endpoint}{path}"
        body = json.dumps(payload).encode('utf-8')
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['x-api-key'] = self.api_key
        req = urllib.request.Request(url, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = json.loads(resp.read().decode('utf-8'))
                # Handle API Gateway envelope
                if 'body' in raw and isinstance(raw['body'], str):
                    return json.loads(raw['body'])
                return raw
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"LikenessGuard API error [{e.code}]: {e.read().decode()}")
