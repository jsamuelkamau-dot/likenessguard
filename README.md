# LikenessGuard v2

**The world's first Bedrock Multi-Agent, Edge-Capable, Cryptographically Verifiable Pre-Generation Consent Enforcement Platform.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![AWS AIdeas Finalist](https://img.shields.io/badge/AWS%20AIdeas-Top%2050%20Finalist-orange)](https://builder.aws.com/connect/events/10000aideas)
[![CI](https://github.com/jsamuelkamau-dot/likenessguard/actions/workflows/ci.yml/badge.svg)](https://github.com/jsamuelkamau-dot/likenessguard/actions)

LikenessGuard stops non-consensual AI image generation **before it happens** -- at the point of generation, not after. When an AI model receives a request to generate or edit an image involving a real person's face, LikenessGuard checks consent in real time. If consent is denied, the AI refuses. If consent is granted, a cryptographically signed Proof-of-Face certificate is issued.

---


---

## Screenshots

<!-- Screenshot: Dashboard Home -->
![Dashboard Home](screenshots/dashboard-home.png)
*Caption: LikenessGuard v2 Dashboard Home showing live metrics, recent activity, and multi-agent status.*

<!-- Screenshot: Consent Check -->
![Consent Check](screenshots/consent-check.png)
*Caption: Real-time consent check with multi-agent reasoning trace, similarity score, and Proof-of-Face result.*

<!-- Screenshot: Activity Logs -->
![Activity Logs](screenshots/activity-logs.png)
*Caption: Searchable activity logs with filtering by decision type, requester platform, and time range.*

<!-- Screenshot: Impact Dashboard -->
![Impact Dashboard](screenshots/impact-dashboard.png)
*Caption: Impact Dashboard showing consent enforcement metrics, cost analysis, and compliance trends.*

<!-- Screenshot: Federated Registry -->
![Federated Registry](screenshots/federated-registry.png)
*Caption: Federated Registry view with cross-platform peer connections, sync status, and opt-out management.*

<!-- Screenshot: Prompt Playground -->
![Prompt Playground](screenshots/prompt-playground.png)
*Caption: Prompt Playground for testing natural language consent policies with live AI evaluation.*

## Features

- **Pre-generation enforcement** -- consent checked before any image is rendered
- **Bedrock multi-agent system** -- Anomaly Agent (Claude Haiku) + Consent Orchestrator (Nova Pro) + Policy Reasoner (Nova Lite)
- **Hybrid facial matching** -- Rekognition + Titan Embeddings + OpenSearch Serverless k-NN (<0.5% false negatives)
- **Cryptographic Proof-of-Face** -- KMS ECDSA P-256 signed C2PA-compatible manifests
- **Edge enforcement** -- AWS IoT Greengrass v2 with offline default-deny
- **Federated registry** -- JWT-authenticated cross-platform peer sharing
- **Claude.ai integration** -- MCP connector for native consent enforcement in Claude
- **Grok (xAI) integration** -- OpenAI-compatible function calling
- **Natural language policies** -- write consent rules in plain English
- **<300ms P95 latency** -- production-ready performance
- **~$4.20/month** at 100k checks -- serverless cost efficiency

---

## Architecture

```
AI Platforms (Claude, Grok, SDKs)
         |
         v
    API Gateway (/v2/consent/*)
         |
         v
  Supervisor Lambda (<300ms P95)
    /       |        \
   v        v         v
Anomaly   Consent    Policy
Agent     Orchestr.  Reasoner
(Haiku)   (Nova Pro) (Nova Lite)
   |         |
   v         v
Hybrid Matching     KMS ECDSA
(Rekognition+Titan  (Proof-of-
 OpenSearch k-NN)    Face Sign)
         |
         v
     DynamoDB
  (ConsentRegistry
   AuditLog 7yr)
```

---


---

## Core Architecture & Key Files

Explore the core logic directly:

| Component | File | What it does |
|-----------|------|-------------|
| **Supervisor (Orchestrator)** | [`supervisor/handler.py`](likenessguard-aws/src/lambdas/supervisor/handler.py) | 9-step consent pipeline entry point |
| **Consent Orchestrator** | [`consent_orchestrator/handler.py`](likenessguard-aws/src/lambdas/consent_orchestrator/handler.py) | Nova Pro policy evaluation + ALLOW/DENY decision |
| **Anomaly Agent** | [`anomaly_agent/handler.py`](likenessguard-aws/src/lambdas/anomaly_agent/handler.py) | Claude Haiku threat detection (injection, jailbreak, rate abuse) |
| **Policy Reasoner** | [`policy_reasoner/handler.py`](likenessguard-aws/src/lambdas/policy_reasoner/handler.py) | Nova Lite NL-to-JSON policy conversion |
| **Proof-of-Face Signing** | [`shared/kms_signing.py`](likenessguard-aws/src/lambdas/shared/kms_signing.py) | KMS ECDSA P-256 C2PA manifest signing |
| **Facial Embeddings** | [`shared/titan_embeddings.py`](likenessguard-aws/src/lambdas/shared/titan_embeddings.py) | 512-dim Titan vector generation |
| **Vector Search** | [`shared/opensearch_client.py`](likenessguard-aws/src/lambdas/shared/opensearch_client.py) | OpenSearch k-NN cosine similarity |
| **Edge Enforcement** | [`edge/edge_consent.py`](likenessguard-aws/edge/edge_consent.py) | Greengrass v2 offline consent with SQLite cache |
| **MCP Server (Claude)** | [`likenessguard-mcp/server.py`](likenessguard-mcp/server.py) | Claude.ai MCP connector with OAuth stubs |
| **Federation + Opt-out** | [`federation/handler.py`](likenessguard-aws/src/lambdas/federation/handler.py) | Federated registry, public opt-out endpoint |

## Quick Start

### Prerequisites

- AWS account with Bedrock access enabled
- Python 3.13+
- Node.js 20+
- AWS CLI v2 + SAM CLI

### 1. Clone and configure

```bash
git clone https://github.com/jsamuelkamau-dot/likenessguard.git
cd likenessguard
cp .env.example .env
# Edit .env with your AWS account details
```

### 2. Deploy to AWS

```bash
make build
make deploy
```

### 3. Start the dashboard

```bash
make start-dashboard
# Open http://localhost:5173
```

### 4. Run a consent check

```python
from likenessguard import LikenessGuardClient

client = LikenessGuardClient(
    api_endpoint="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1",
    platform_id="my-platform"
)

result = client.check_consent("face.jpg", usage_type="GENERAL_GENERATION")

if result.allowed:
    print(f"Consent granted. Proof: {result.proof_of_face['manifest_id']}")
else:
    print(f"Consent denied: {result.reason_code}")
```

---

## Project Structure

```
likenessguard/
â”œâ”€â”€ likenessguard-aws/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â””â”€â”€ lambdas/
â”‚   â”‚       â”œâ”€â”€ supervisor/          # Orchestrator entry point
â”‚   â”‚       â”œâ”€â”€ anomaly_agent/       # Threat detection (Claude Haiku)
â”‚   â”‚       â”œâ”€â”€ consent_orchestrator/ # Policy evaluation (Nova Pro)
â”‚   â”‚       â”œâ”€â”€ policy_reasoner/     # NL->JSON policy (Nova Lite)
â”‚   â”‚       â”œâ”€â”€ proof_verify/        # KMS manifest verification
â”‚   â”‚       â”œâ”€â”€ federation/          # Federated registry + opt-out
â”‚   â”‚       â”œâ”€â”€ registration/        # Photo upload + fingerprint
â”‚   â”‚       â”œâ”€â”€ image_proxy/         # Base64->S3 presigned URL
â”‚   â”‚       â””â”€â”€ shared/              # Titan, OpenSearch, KMS, schemas
â”‚   â”œâ”€â”€ edge/                        # Greengrass v2 edge component
â”‚   â”œâ”€â”€ sdk/
â”‚   â”‚   â”œâ”€â”€ python/                  # Python SDK
â”‚   â”‚   â””â”€â”€ nodejs/                  # Node.js TypeScript SDK
â”‚   â”œâ”€â”€ infrastructure/              # CloudFormation templates
â”‚   â”œâ”€â”€ scripts/                     # Deploy, backfill, crosscheck
â”‚   â””â”€â”€ docs/                        # Architecture, guides
â”œâ”€â”€ likenessguard-dashboard/         # React dashboard
â”œâ”€â”€ likenessguard-mcp/               # MCP server (Claude.ai)
â”‚   â”œâ”€â”€ server.py                    # MCP + OAuth stubs
â”‚   â”œâ”€â”€ grok_integration.py          # Grok/xAI function calling
â”‚   â””â”€â”€ openai_integration.py        # OpenAI function calling
â”œâ”€â”€ .env.example                     # Environment template
â”œâ”€â”€ .gitignore
â”œâ”€â”€ LICENSE                          # Apache 2.0
â”œâ”€â”€ Makefile                         # Common commands
â”œâ”€â”€ CONTRIBUTING.md
â”œâ”€â”€ SECURITY.md
â””â”€â”€ CHANGELOG.md
```

---

## API Reference

**Base URL:** `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v2/consent/check` | Check consent for a reference image |
| POST | `/v2/proof/verify` | Verify a Proof-of-Face manifest |
| POST | `/v2/policy/nl-to-json` | Convert NL policy to JSON |
| POST | `/v2/optout` | Public opt-out (no account needed) |
| GET | `/v2/federation/peers` | List federation peers |
| POST | `/v2/image/upload` | Upload image, get presigned URL |
| GET | `/v2/metrics/live` | Live dashboard metrics |

### Consent Check Example

```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1/v2/consent/check \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/face.jpg",
    "usage_type": "GENERAL_GENERATION",
    "requester_id": "my-platform",
    "platform": "stable-diffusion"
  }'
```

Response:
```json
{
  "decision": "ALLOW",
  "reason_code": "ALLOW_POLICY_PERMITS",
  "confidence": 0.97,
  "similarity_score": 0.923,
  "subject_id": "sub-abc123",
  "proof_of_face": {
    "manifest_id": "uuid",
    "proof": { "signature": "base64-ecdsa-sig", "algorithm": "ECDSA_SHA_256" }
  },
  "latency_ms": 263
}
```

---

---

## Public Opt-out

Anyone can protect their likeness without creating an account. The public opt-out endpoint applies a DENY-ALL policy immediately:

```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1/v2/optout \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/my-face.jpg", "reason": "I do not consent to AI generation"}'
```

The dashboard also includes an **Opt-out page** where non-technical users can upload a photo and submit their opt-out request through a simple form -- no API knowledge required.

## Claude.ai Integration (MCP)

```bash
# Start MCP server
make start-mcp

# Expose publicly via ngrok
ngrok http 8080

# Add to Claude.ai: Settings -> Connectors -> Add custom connector
# URL: https://YOUR-NGROK-URL.ngrok-free.app/mcp
```

Claude will automatically call `check_consent` before generating any image involving a real person.

---

## Grok (xAI) Integration

```bash
cd likenessguard-mcp
export XAI_API_KEY=your-xai-key
python grok_integration.py
```


---

## Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| P95 end-to-end latency | <300ms | ~263ms |
| False negative rate | <0.5% | <0.5% |
| OpenSearch k-NN query | <30ms | ~25ms |
| KMS signing | <20ms | ~18ms |

## Cost at Scale

| Service | 100k checks/month |
|---------|-------------------|
| Lambda | $1.92 |
| Bedrock (Nova Pro + Haiku + Titan) | $1.90 |
| Rekognition | $1.00 |
| KMS | $0.30 |
| DynamoDB | $0.13 |
| OpenSearch Serverless | Free Tier |
| **Total** | **~$4.20/month** |


---

---

## Testing

LikenessGuard includes unit tests for core consent logic:

```bash
# Run all tests
make test

# Or run directly
cd likenessguard-aws && python -m pytest tests/ -v
```

**What the tests cover:**

- **Policy evaluation** -- 12 tests covering default-deny, anomaly blocking, similarity thresholds, face swap denial, self-edit allowance, and decision priority ordering
- **Manifest signing** -- 4 tests covering manifest structure, hash determinism, tamper detection, and DENY manifest validation
- **Property-based tests** -- 25 additional tests in `src/tests/` covering Proof-of-Face round-trip, edge offline invariants, audit log completeness, and more

```bash
# Run property-based tests (requires hypothesis)
cd likenessguard-aws && python -m pytest src/tests/test_v2_properties.py -v
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding standards, and the PR process.

---

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.



---

## :star: Support the Project

If you find LikenessGuard useful, please consider:

- **Starring the repository** :star: to help others discover it
- **Sharing it** with others who care about responsible AI
- **Contributing improvements** via pull requests
- **Reporting issues** to help us improve

Every star and contribution helps make AI safer for everyone.

---

## License

Apache License 2.0 -- see [LICENSE](LICENSE).

## Acknowledgements

Built by Samuel Jesse as an AWS AIdeas 2025 competition finalist. Powered by AWS Bedrock, OpenSearch Serverless, KMS, IoT Greengrass, and API Gateway.

---

---

## Community & Discussions

Have questions, ideas, or want to discuss responsible AI consent enforcement?

- **[GitHub Discussions](https://github.com/jsamuelkamau-dot/likenessguard/discussions)** -- Ask questions, share ideas, get help
- **[Good First Issues](https://github.com/jsamuelkamau-dot/likenessguard/labels/good%20first%20issue)** -- Great starting points for new contributors
- **[Bug Reports](https://github.com/jsamuelkamau-dot/likenessguard/issues/new?template=bug_report.md)** -- Found a problem? Let us know
- **[Feature Requests](https://github.com/jsamuelkamau-dot/likenessguard/issues/new?template=feature_request.md)** -- Suggest improvements

## Repository Topics

Recommended GitHub topics for discoverability:

`aws` ï¿½ `bedrock` ï¿½ `responsible-ai` ï¿½ `deepfake-prevention` ï¿½ `ai-safety` ï¿½ `serverless` ï¿½ `python` ï¿½ `react` ï¿½ `mcp` ï¿½ `consent` ï¿½ `biometric-privacy`

---
