# Changelog

All notable changes to LikenessGuard are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] — 2026-04-30

### Added
- **Bedrock Multi-Agent System**: Supervisor Lambda orchestrating Anomaly Agent (Claude Haiku), Consent Orchestrator (Nova Pro), and Policy Reasoner (Nova Lite)
- **OpenSearch Serverless**: HNSW k-NN vector search replacing DynamoDB full-table scan
- **Bedrock Titan Embeddings**: 512-dimensional facial vectors replacing SHA-256 fingerprints
- **Proof-of-Face**: KMS ECDSA P-256 signed C2PA-compatible manifests on every ALLOW decision
- **JWKS Endpoint**: CloudFront + S3 public key distribution for proof verification
- **Edge Enforcement**: AWS IoT Greengrass v2 component with SQLite cache and offline default-deny
- **Federated Registry API**: JWT-authenticated peer forwarding and public opt-out endpoint
- **Claude.ai Integration**: MCP server with OAuth stubs for native Claude connector support
- **Grok (xAI) Integration**: OpenAI-compatible function calling integration
- **Proactive Discovery Hints**: Provisional DENY-ALL for unregistered subjects detected at ≥0.70 similarity
- **Natural Language Policy Editor**: Nova Lite converts plain English to structured JSON policy
- **Impact Dashboard**: Live metrics, compliance status, agent reasoning trace viewer
- **Python SDK**: 10-line integration with full type hints
- **Node.js TypeScript SDK**: Identical API surface for JavaScript platforms
- **Property-Based Tests**: 25 tests covering 14 formal correctness properties

### Changed
- Facial matching accuracy improved from 1.2% to <0.5% false negative rate
- P95 latency reduced to ~263ms (target: <300ms)
- Registry storage migrated from DynamoDB scan to OpenSearch Serverless k-NN
- Policy evaluation upgraded from rule-based to LLM-reasoning (Nova Pro)

### Fixed
- Active registration no longer required for protection (proactive discovery)
- Scale limitation resolved (OpenSearch replaces O(n) DynamoDB scan)
- Proof-of-Face moved from conceptual to working implementation

---

## [1.0.0] — 2025-12-01

### Added
- Initial release: serverless consent enforcement platform
- Rekognition face detection + SHA-256 fingerprint matching
- DynamoDB ConsentRegistry and AuditLog
- React dashboard with registration, consent check, activity logs
- API Gateway with v1 endpoints
- Basic policy evaluation (rule-based)
