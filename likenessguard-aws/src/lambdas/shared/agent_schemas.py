"""
Agent Communication Protocol Schemas

Defines all inter-agent message envelopes and payloads for the
LikenessGuard v2 multi-agent Bedrock system.

Requirements: 2.1, 2.3, 2.4, 2.10
"""
from dataclasses import dataclass, field, asdict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


@dataclass
class AgentEnvelope:
    """Base envelope for all inter-agent messages."""
    agent: str
    request_id: str
    timestamp: str
    payload: dict
    trace_id: str = ''

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def create(cls, agent: str, payload: dict, trace_id: str = '') -> 'AgentEnvelope':
        return cls(
            agent=agent,
            request_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            payload=payload,
            trace_id=trace_id
        )


@dataclass
class AnomalyRequest:
    """Request payload for the Anomaly & Threat Agent."""
    requester_id: str
    usage_type: str
    request_payload_hash: str  # SHA-256 of full request (no raw image bytes)
    image_metadata: dict        # EXIF/format metadata, not raw bytes
    request_count_1h: int = 0   # Requester's request count in last hour
    anomaly_count_1h: int = 0   # Requester's anomaly count in last hour


@dataclass
class AnomalyResponse:
    """Response from the Anomaly & Threat Agent."""
    cleared: bool
    threat_type: Optional[str]  # PROMPT_INJECTION|ADVERSARIAL_IMAGE|JAILBREAK_PATTERN|SUSPICIOUS_REQUESTER|RATE_ABUSE
    confidence: float
    latency_ms: int
    reasoning: str = ''


@dataclass
class OrchestratorRequest:
    """Request payload for the Consent Orchestrator Agent."""
    subject_id: str
    policy: dict
    similarity_score: float
    usage_type: str
    requester_id: str
    anomaly_cleared: bool
    top_candidates: List[dict]  # From OpenSearch k-NN
    policy_version: int = 1


@dataclass
class OrchestratorResponse:
    """Response from the Consent Orchestrator Agent."""
    decision: str           # ALLOW | DENY
    reason_code: str
    confidence: float
    reasoning_trace: str    # Full agent reasoning text
    latency_ms: int
    policy_reasoner_invoked: bool = False


@dataclass
class PolicyReasonerRequest:
    """Request payload for the Policy Reasoner Agent."""
    mode: str               # nl_to_json | json_to_nl | conflict_check
    input: str              # NL string or JSON policy string
    existing_policy: Optional[dict] = None  # For conflict_check mode


@dataclass
class PolicyReasonerResponse:
    """Response from the Policy Reasoner Agent."""
    policy: Optional[dict]
    summary: str
    conflicts: List[str]
    resolution: str
    latency_ms: int


@dataclass
class AgentTrace:
    """Full reasoning trace for a consent check request — returned in API response."""
    request_id: str
    anomaly_agent: dict
    hybrid_matcher: dict
    consent_orchestrator: dict
    policy_reasoner: Optional[dict]
    total_latency_ms: int
    timestamp: str

    def to_dict(self) -> dict:
        return asdict(self)
