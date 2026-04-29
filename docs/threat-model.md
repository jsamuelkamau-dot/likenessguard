# LikenessGuard Threat Model

This document describes the threats LikenessGuard is designed to defend against, the trust boundaries in the system, and the residual risks we accept.

**Last updated:** April 2026
**Scope:** LikenessGuard v2.x (AWS deployment)

---

## 1. System Overview

LikenessGuard is a pre-generation consent enforcement platform. It sits between AI image generation platforms and the generation engine, checking whether a real person has consented to their likeness being used before any image is rendered.

**Core security invariant:** If consent is not confirmed, the system returns DENY. Errors default to DENY. An unsigned ALLOW is never returned.

---

## 2. Trust Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  UNTRUSTED: External platforms, end users, attackers    │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SEMI-TRUSTED: API Gateway (authenticated)        │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  TRUSTED: Lambda execution environment      │  │  │
│  │  │  KMS, DynamoDB, OpenSearch (IAM-scoped)     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SEMI-TRUSTED: Edge nodes (Greengrass v2)         │  │
│  │  Local cache, offline enforcement                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SEMI-TRUSTED: Federation peers (JWT-authed)      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Threat Categories

### 3.1 Consent Bypass

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| T1: Direct API bypass | Attacker calls generation API without going through LikenessGuard | Platform integration required — SDK enforces check before generation | Platforms that don't integrate are unprotected |
| T2: Image manipulation to avoid matching | Attacker modifies reference image to reduce similarity score | Hybrid matching (Rekognition + Titan embeddings + OpenSearch k-NN) with <0.5% false negative rate | Adversarial examples specifically crafted against Titan embeddings |
| T3: Replay of old ALLOW decision | Attacker reuses a previously valid Proof-of-Face certificate | Manifests have `expires_at` (default 24h), verification checks expiry | Within the validity window, replay is possible |
| T4: Forged Proof-of-Face | Attacker creates a fake signed manifest | KMS ECDSA P-256 signing — private key never leaves AWS KMS HSM | Compromise of AWS KMS (extremely unlikely) |

### 3.2 Data Exfiltration

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| T5: Biometric data theft | Attacker extracts raw facial images | Raw photos deleted after processing (24h max). Only 512-dim vectors stored. Vectors are not reversible to images. | Vectors could theoretically be used for re-identification in a different system |
| T6: Consent registry enumeration | Attacker lists all registered subjects | API requires authentication. No list-all endpoint. Queries require a reference image. | Targeted queries with known faces can confirm registration |
| T7: Audit log tampering | Attacker modifies audit entries to hide activity | Each audit entry includes `EntryHash` (SHA-256 of content). DynamoDB has point-in-time recovery. 7-year retention with Glacier archival. | DynamoDB admin access could bypass hash checks |

### 3.3 Denial of Service

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| T8: API rate abuse | Attacker floods consent check endpoint | Anomaly Agent fast-path (regex + DynamoDB suspension check, <20ms). API Gateway throttling. CloudWatch alarms. | Distributed attacks from many IPs |
| T9: Cost amplification | Attacker triggers expensive Bedrock model calls | Anomaly Agent screens before LLM invocation. Fast-path handles 80%+ of requests without LLM. | Sophisticated requests that pass fast-path but trigger LLM |
| T10: Edge cache poisoning | Attacker injects false entries into edge SQLite cache | Cache sync uses authenticated API. Stale cache (>24h) appends STALE_CACHE warning. | Physical access to edge device |

### 3.4 Prompt Injection

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| T11: Prompt injection via policy text | Attacker crafts NL policy that manipulates Nova Lite | Policy Reasoner uses temperature=0.1 for determinism. Output is validated against JSON schema. | Novel prompt injection techniques |
| T12: Prompt injection via requester metadata | Attacker includes instructions in requester_id or platform fields | Input validation on all fields. Anomaly Agent screens for injection patterns. | Zero-day injection patterns |

### 3.5 Federation Threats

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| T13: Malicious federation peer | A peer sends false consent data | JWT authentication with per-peer keys. Consent decisions are verified locally, not trusted from peers. | A compromised peer could provide false opt-out signals |
| T14: Federation man-in-the-middle | Attacker intercepts peer-to-peer communication | HTTPS required for all federation endpoints. JWT signatures verified. | Certificate authority compromise |

---

## 4. Security Invariants

These properties must hold at all times. Violation of any invariant is a critical security bug.

1. **Default-deny:** All error paths return DENY. No code path returns ALLOW on error.
2. **Signed ALLOW:** Every ALLOW decision includes a valid KMS ECDSA signature. An unsigned ALLOW is never returned to the caller.
3. **KMS failure = DENY:** If KMS signing fails for any reason, the decision flips from ALLOW to DENY.
4. **No raw biometric storage:** Raw photos are deleted after vector extraction. Only 512-dim vectors are persisted.
5. **Audit completeness:** Every consent decision (ALLOW or DENY) produces an audit log entry with a tamper-detection hash.
6. **Edge default-deny:** When an edge node is offline and has no cache match, the decision is DENY.
7. **Stale cache warning:** Edge cache entries older than 24 hours append a STALE_CACHE warning to any ALLOW decision.
8. **Provisional = DENY:** Proactively discovered (unregistered) subjects always receive DENY regardless of similarity score.

---

## 5. Attack Surface Summary

| Component | Exposure | Authentication | Notes |
|-----------|----------|----------------|-------|
| API Gateway | Public internet | API key (optional) | Rate-limited, WAF-eligible |
| Supervisor Lambda | Via API Gateway only | IAM execution role | No direct invocation |
| Bedrock models | Via Lambda only | IAM service role | No public access |
| DynamoDB tables | Via Lambda only | IAM table-scoped | Point-in-time recovery enabled |
| OpenSearch Serverless | Via Lambda only | IAM collection-scoped | VPC endpoint recommended for production |
| KMS signing key | Via Lambda only | IAM key policy | Key material never exported |
| S3 (photos) | Via presigned URL | Time-limited, scoped | Auto-delete after 24h |
| S3 (JWKS) | Public read via CloudFront | None (public key distribution) | Read-only, no write access |
| Edge SQLite | Local device only | Physical access | Encrypted at rest recommended |
| Federation API | Peer-to-peer | JWT per peer | HTTPS required |
| MCP Server | localhost or ngrok | OAuth stubs (dev) | Not for production without proper OAuth |

---

## 6. Residual Risks We Accept

| Risk | Why we accept it | Monitoring |
|------|-----------------|------------|
| Adversarial examples against Titan embeddings | No embedding model is adversarial-proof. Our hybrid approach (Rekognition + Titan + k-NN) raises the bar significantly. | Monitor false negative rate in production metrics |
| Replay within manifest validity window | Short validity (24h default) limits exposure. Tighter windows increase latency for legitimate use. | Audit log tracks all verifications |
| Platform non-integration | We can't force platforms to integrate. SDK + documentation lower the barrier. | Track SDK downloads and integration count |
| Edge device physical compromise | Physical security is the deployer's responsibility. | Edge sync logs detect anomalies |

---

## 7. Reporting Security Issues

See [SECURITY.md](../SECURITY.md) for how to report vulnerabilities responsibly.

