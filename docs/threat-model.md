# LikenessGuard Threat Model

This document describes the threat model for LikenessGuard, a pre-generation consent enforcement system for AI image generation. It identifies trust boundaries, threat categories, security invariants, and residual risks.

Last updated: 2026-06-01

---

## System Overview

LikenessGuard enforces consent **before** AI image generation occurs. When an AI platform receives a request to generate or edit an image involving a real person's face, LikenessGuard:

1. Detects the face using Rekognition
2. Generates a 512-dim Titan embedding
3. Searches for a matching registered subject via OpenSearch k-NN
4. Evaluates the subject's consent policy against the requested usage
5. Signs an ECDSA Proof-of-Face manifest if consent is granted
6. Returns DENY if consent is denied, no match is found, or any step fails

The system is designed around a **default-deny** principle: any error, timeout, or ambiguity results in a DENY decision.

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED: External                              │
│  AI platforms, end users, public internet, MCP clients, SDKs       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS (TLS 1.2+)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SEMI-TRUSTED: API Gateway                              │
│  Rate limiting, CORS, request validation                           │
│  Threat: request forgery, payload manipulation                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ IAM-authenticated invocation
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 TRUSTED: Core Services                              │
│  Supervisor Lambda, Anomaly Agent, Consent Orchestrator,           │
│  Policy Reasoner, KMS (ECDSA P-256), DynamoDB, S3                  │
│  All within same AWS account, IAM least-privilege                  │
└──────────┬──────────────────────────────────┬───────────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐        ┌──────────────────────────────────┐
│ SEMI-TRUSTED:        │        │ SEMI-TRUSTED:                    │
│ Edge Nodes           │        │ Federation Peers                 │
│ Greengrass v2        │        │ JWT-authenticated registries     │
│ Local SQLite cache   │        │ KMS-signed requests              │
│ Offline default-deny │        │ Untrusted consent data           │
└──────────────────────┘        └──────────────────────────────────┘
```

---

## Threat Categories

### Consent Bypass

| ID | Threat | Impact | Mitigation | Severity |
|----|--------|--------|------------|----------|
| T1 | **Direct API bypass** — attacker calls AI platform API directly, skipping LikenessGuard | Non-consensual generation | SDK enforcement at platform level; Proof-of-Face required for generation; platform integration contracts | Critical |
| T2 | **Similarity threshold evasion** — adversarial image crafted to fall below 0.85 cosine similarity | False negative, consent bypass | Three-layer matching (Rekognition + Titan + k-NN); threshold tuned on adversarial dataset; monitoring for false negative rate | High |
| T3 | **Policy manipulation** — attacker modifies consent policy in transit | Unauthorized ALLOW | DynamoDB server-side encryption; IAM least-privilege; policy version tracking; audit log with tamper-detection hashes | High |
| T4 | **Provisional consent exploitation** — using provisional (unverified) consent as full consent | Unauthorized generation under unverified identity | Provisional status tracked in DynamoDB; provisional consent treated as DENY for high-risk usage types | Medium |

### Data Exfiltration

| ID | Threat | Impact | Mitigation | Severity |
|----|--------|--------|------------|----------|
| T5 | **Embedding extraction** — attacker extracts 512-dim vectors to reconstruct facial features | Privacy violation | Vectors are not invertible to images; OpenSearch access restricted to Lambda execution role; no public API exposes raw vectors | Medium |
| T6 | **Audit log exposure** — attacker accesses audit trail containing subject IDs and decisions | Privacy violation, surveillance | DynamoDB encryption at rest (KMS); IAM least-privilege; no public API for raw audit data; evidence retrieval requires authentication | Medium |
| T7 | **Photo bucket access** — attacker accesses uploaded photos before 24h auto-deletion | Biometric data exposure | S3 bucket policy blocks public access; 24h lifecycle deletion; server-side encryption; presigned URLs expire in 15 minutes | High |

### Denial of Service

| ID | Threat | Impact | Mitigation | Severity |
|----|--------|--------|------------|----------|
| T8 | **API flooding** — high-volume requests to exhaust Lambda concurrency or Bedrock quotas | Service unavailability | API Gateway throttling; Lambda reserved concurrency; Anomaly Agent fast-path (regex) avoids Bedrock for obvious attacks | Medium |
| T9 | **Expensive query attack** — crafted requests that maximize Bedrock token consumption | Cost escalation | Input size limits; Anomaly Agent screens before Bedrock invocation; CloudWatch cost alarms | Medium |
| T10 | **OpenSearch saturation** — flooding vector index with registrations | Search degradation | Registration rate limiting; index size monitoring; OpenSearch Serverless auto-scaling | Low |

### Prompt Injection

| ID | Threat | Impact | Mitigation | Severity |
|----|--------|--------|------------|----------|
| T11 | **Anomaly Agent bypass** — prompt injection in requester_id or usage_type to trick Claude Haiku into clearing a malicious request | Threat detection bypass | Regex fast-path catches known patterns before LLM; structured input (not free-text) to Bedrock; Anomaly Agent output validated against schema | High |
| T12 | **Policy Reasoner manipulation** — injecting instructions into natural language policy to produce permissive JSON | Overly permissive policy | Temperature 0.1 for determinism; round-trip validation (NL→JSON→NL must evaluate identically); policy schema validation | Medium |

### Federation Threats

| ID | Threat | Impact | Mitigation | Severity |
|----|--------|--------|------------|----------|
| T13 | **Malicious peer** — federated peer sends false ALLOW decisions to override local DENY | Consent bypass via federation | Local policy always takes precedence; federation decisions are advisory; peer decisions cached with TTL and re-verified | High |
| T14 | **Peer impersonation** — attacker registers a fake peer endpoint | Data exfiltration, false decisions | JWT RS256 authentication for all federation calls; KMS-signed peer requests; manual peer approval required | High |

---

## Security Invariants

These invariants are non-negotiable. Any code change that violates them must be rejected.

| # | Invariant | Enforcement |
|---|-----------|-------------|
| 1 | **Default-deny** — all error paths return DENY, never an unsafe ALLOW | Every Lambda handler wraps logic in try/catch that returns DENY; property-based tests verify this |
| 2 | **Signed ALLOW** — every ALLOW decision includes a valid KMS ECDSA P-256 signature | Supervisor Lambda calls KMS Sign after ALLOW decision; signature included in Proof-of-Face manifest |
| 3 | **KMS failure = DENY** — if KMS signing fails, ALLOW flips to DENY | Supervisor handler catches KMS exceptions and overrides decision to DENY with reason_code `DENY_SIGNING_FAILURE` |
| 4 | **No raw biometric storage** — only 512-dim vectors stored; raw photos deleted within 24h | S3 lifecycle policy auto-deletes after 1 day; Lambda deletes after processing; no API returns raw photos |
| 5 | **Audit completeness** — every consent decision (ALLOW or DENY) is written to the audit log | Supervisor writes audit entry after every decision; audit write failures are logged but never block the response |
| 6 | **Edge default-deny** — offline edge nodes with no cache match return DENY | Edge component returns DENY when SQLite cache has no match and cloud API is unreachable |
| 7 | **Stale cache warning** — edge ALLOW from cache older than 24h includes STALE_CACHE warning | Edge component checks cache entry timestamp; appends warning to response metadata |
| 8 | **Provisional = DENY for high-risk** — provisional (unverified) consent is treated as DENY for FACE_SWAP and THIRD_PARTY_EDIT usage types | Consent Orchestrator checks `is_provisional` flag; high-risk usage types require verified consent |

---

## Attack Surface Summary

| Surface | Entry Point | Authentication | Rate Limited |
|---------|-------------|----------------|--------------|
| API Gateway | `/v2/consent/check` | API key (optional) | Yes (throttle) |
| API Gateway | `/v2/optout` | None (public) | Yes (throttle) |
| API Gateway | `/v2/federation/peers` | JWT RS256 | Yes |
| MCP Server | `localhost:8080/mcp` | OAuth stub | No (local only) |
| Edge Node | Local gRPC/HTTP | Device certificate | N/A |
| OpenSearch | Internal only | IAM (Lambda role) | N/A |
| DynamoDB | Internal only | IAM (Lambda role) | N/A |
| KMS | Internal only | IAM (Lambda role) | N/A |
| S3 (photos) | Presigned URL (15min) | Signature | N/A |
| S3 (JWKS) | CloudFront public | None (public key) | CloudFront cache |

---

## Residual Risks

These are risks we accept, with justification:

| Risk | Justification |
|------|---------------|
| **Platform bypass** — an AI platform could skip calling LikenessGuard entirely | LikenessGuard is an enforcement primitive, not a platform-level mandate. Adoption depends on platform integration. Proof-of-Face provides verifiable evidence of compliance. |
| **Bedrock model changes** — AWS could change model behavior, affecting Anomaly Agent or Consent Orchestrator accuracy | Regex fast-path handles most cases without LLM; property-based tests catch behavioral regressions; model versions are pinned in CloudFormation. |
| **Embedding drift** — Titan embedding model updates could change vector similarity scores | Threshold (0.85) was tuned with margin; backfill script can re-index; monitoring tracks false negative rate. |
| **Single-region deployment** — us-east-1 outage would take down the service | Edge nodes provide offline enforcement with default-deny; multi-region is on the v3.0 roadmap. |
| **Insider threat** — AWS account compromise gives full access | Standard AWS security practices (MFA, least-privilege, CloudTrail); out of scope for application-level threat model. |

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly. See [SECURITY.md](../SECURITY.md) for the disclosure process and response timeline.
