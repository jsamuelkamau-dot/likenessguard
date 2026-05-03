# Changelog

All notable changes to LikenessGuard are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] — v3.0.0

v3 is in active development on the `v3-reference-implementation` branch.
See [ROADMAP-V3.md](ROADMAP-V3.md) for the full plan and the open RFC for feedback.

### Planned changes
- Formal five-component specification with interface contracts
- Two first-class operating modes: Registered-Subject Mode and Closed-Consent Mode
- Deterministic consent evaluator — no LLM on the decision path
- Verified identity matching — similarity scores computed in a consistent embedding space; `MatchUnavailable` returned when matching fails
- Dual-mode conformance suite
- Audit and replay — every decision reproducible from recorded inputs
- Removal of v2 cross-embedding similarity score fallback
- Removal of unsigned-JWT federation fallback

## [2.0.0] - 2026-04-28

### Added
- **Bedrock Multi-Agent System**: Supervisor Lambda orchestrating Anomaly Agent (Claude Haiku), Consent Orchestrator (Nova Pro), and Policy Reasoner (Nova Lite)
- **OpenSearch Serverless**: HNSW k-NN vector search replacing DynamoDB full-table scan -- false negatives reduced from 1.2% to <0.5%
- **Bedrock Titan Embeddings**: 512-dimensional facial vectors replacing SHA-256 fingerprints
- **Proof-of-Face**: KMS ECDSA P-256 signed C2PA-compatible manifests on every ALLOW decision
- **JWKS Endpoint**: CloudFront + S3 public key distribution for third-party proof verification
- **Edge Enforcement**: AWS IoT Greengrass v2 component with SQLite cache and offline default-deny
- **Federated Registry API**: JWT-authenticated cross-platform peer forwarding and public opt-out
- **Claude.ai Integration**: MCP server with OAuth stubs for native Claude connector support
- **Grok (xAI) Integration**: OpenAI-compatible function calling integration
- **Proactive Discovery Hints**: Provisional DENY-ALL for unregistered subjects detected at >=0.70 similarity
- **Natural Language Policy Editor**: Nova Lite converts plain English to structured JSON policy
- **Impact Dashboard**: Live metrics, compliance status, agent reasoning trace viewer
- **Python SDK**: 10-line integration with full type hints
- **Node.js TypeScript SDK**: Identical API surface for JavaScript platforms
- **Property-Based Tests**: 25 tests covering 14 formal correctness properties
- **Cross-Platform Audit Trail**: Unified dashboard showing consent checks from Claude, Grok, and SDK clients

### Performance
- P95 end-to-end latency: ~263ms (target: <300ms)
- Cost at 100k checks/month: ~.20

## [1.0.0] - 2025-12-01

### Added
- Initial release: serverless consent enforcement platform
- Rekognition face detection + SHA-256 fingerprint matching
- DynamoDB ConsentRegistry and AuditLog
- React dashboard with registration, consent check, activity logs
- API Gateway with v1 endpoints
- Basic rule-based policy evaluation
