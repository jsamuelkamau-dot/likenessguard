# LikenessGuard v2

**The world's first Bedrock Multi-Agent, Edge-Capable, Cryptographically Verifiable Pre-Generation Consent Enforcement Platform.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![AWS AIdeas Finalist](https://img.shields.io/badge/AWS%20AIdeas-Top%2050%20Finalist-orange)](https://builder.aws.com/connect/events/10000aideas)
[![CI](https://github.com/jsamuelkamau-dot/likenessguard/actions/workflows/ci.yml/badge.svg)](https://github.com/jsamuelkamau-dot/likenessguard/actions)

LikenessGuard stops non-consensual AI image generation **before it happens** — at the point of generation, not after. When an AI model receives a request to generate or edit an image involving a real person's face, LikenessGuard checks consent in real time. If consent is denied, the AI refuses. If consent is granted, a cryptographically signed Proof-of-Face certificate is issued.

---

## Demo Screenshots

* LikenessGuard v2 Dashboard Home showing live metrics and recent activity.
<!-- Screenshot: Dashboard Home -->
<img width="959" height="494" alt="dashbord" src="https://github.com/user-attachments/assets/0591a65a-4dbc-458f-847b-f90be7476067" />

---
* Real-time consent check flow with agent reasoning trace and Proof-of-Face result.
<!-- Screenshot: Consent Check -->
<img width="958" height="491" alt="consent check" src="https://github.com/user-attachments/assets/d5b46d47-8f90-41aa-bb92-fb1a00b40f95" />

---
* Searchable activity logs with filtering by decision type, time range, and platform.
<!-- Screenshot: Activity Logs -->
<img width="1919" height="904" alt="cloude and grpk logs" src="https://github.com/user-attachments/assets/651f5e93-8668-475a-ac6c-70051ab18c60" />

---
* Impact Dashboard showing consent enforcement metrics, cost savings, and compliance trends.
<!-- Screenshot: Impact Dashboard -->
<img width="959" height="453" alt="impact dashboard" src="https://github.com/user-attachments/assets/cd9f5d07-dacd-425b-86e7-86832b850174" />

---

* Federated Registry view with cross-platform peer connections and sync status.
<!-- Screenshot: Federated Registry -->
<img width="955" height="481" alt="federated registry" src="https://github.com/user-attachments/assets/3b1f6b9e-2130-4345-8863-6793d99354d2" />


## 🎥 Demo Video: LikenessGuard in Action

See how LikenessGuard enforces consent before any AI image generation or editing involving a real person’s likeness.



https://github.com/user-attachments/assets/f9c596e5-4b2f-492e-b3c6-be725ac8f4ee



---

## Features

- **Pre-generation enforcement** — consent checked before any image is rendered
- **Bedrock multi-agent system** — Anomaly Agent (Claude Haiku) + Consent Orchestrator (Nova Pro) + Policy Reasoner (Nova Lite)
- **Hybrid facial matching** — Rekognition + Titan Embeddings + OpenSearch Serverless k-NN (<0.5% false negatives)
- **Cryptographic Proof-of-Face** — KMS ECDSA P-256 signed C2PA-compatible manifests
- **Edge enforcement** — AWS IoT Greengrass v2 with offline default-deny
- **Federated registry** — JWT-authenticated cross-platform peer sharing
- **Claude.ai integration** — MCP connector for native consent enforcement in Claude
- **Grok (xAI) integration** — OpenAI-compatible function calling
- **Natural language policies** — write consent rules in plain English
- **<300ms P95 latency** — production-ready performance
- **~$4.20/month** at 100k checks — serverless cost efficiency

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Platforms & Clients                        │
│  Claude.ai (MCP)  │  Grok (xAI)  │  Python SDK  │  Node.js SDK │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
                  ┌─────────────────┐
                  │   API Gateway   │
                  │  /v2/consent/*  │
                  └────────┬────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Supervisor Lambda    │  ← Orchestrates 9-step pipeline
              │   <300ms P95           │
              └──┬──────┬──────┬───────┘
                 │      │      │
        ┌────────┘  ┌───┘  ┌──┘
        ▼           ▼      ▼
  ┌──────────┐ ┌────────┐ ┌──────────┐
  │ Anomaly  │ │Consent │ │  Policy  │
  │  Agent   │ │Orchest.│ │ Reasoner │
  │  Haiku   │ │Nova Pro│ │Nova Lite │
  └──────────┘ └────────┘ └──────────┘
        │           │
        ▼           ▼
  ┌──────────────────────┐    ┌─────────────┐
  │  Hybrid Matching     │    │  KMS ECDSA  │
  │  Rekognition+Titan   │    │  Proof-of-  │
  │  OpenSearch k-NN     │    │  Face Sign  │
  └──────────────────────┘    └─────────────┘
        │
        ▼
  ┌──────────────────────┐
  │  DynamoDB            │
  │  ConsentRegistry     │
  │  AuditLog (7yr)      │
  └──────────────────────┘
```

---

## Quick Start

Get LikenessGuard running in your AWS account in under 10 minutes.

### What you'll need

- **AWS account** with Bedrock model access enabled in us-east-1 ([enable models here](https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess))
- **AWS CLI v2** — [install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS SAM CLI** — [install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- **Python 3.12+** — [download](https://www.python.org/downloads/)
- **Node.js 20+** — [download](https://nodejs.org/)

### Step 1: Clone and configure

```bash
git clone https://github.com/jsamuelkamau-dot/likenessguard.git
cd likenessguard
cp .env.example .env
# Open .env and replace YOUR_AWS_ACCOUNT_ID with your actual account ID
```

### Step 2: Configure AWS credentials

If you haven't already, set up your AWS credentials:

```bash
aws configure
# Access Key ID:     <your-key>
# Secret Access Key: <your-secret>
# Default region:    us-east-1
# Output format:     json
```

### Step 3: Deploy to AWS

```bash
make deploy
```

This builds all Lambda functions and deploys the full stack (API Gateway, DynamoDB, KMS, S3, OpenSearch, and 9 Lambda functions).

### Step 4: Run post-deploy setup

```bash
make post-deploy
```

This creates the OpenSearch vector index and publishes the JWKS public key.

### Step 5: Start the dashboard and MCP server

```bash
make start
# Dashboard:  http://localhost:5173
# MCP server: http://localhost:8080
```

### Step 6: Test a consent check

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

For the full deployment guide with troubleshooting, see [DEPLOY.md](DEPLOY.md).

---

## Project Structure

```
likenessguard/
├── likenessguard-aws/
│   ├── src/
│   │   └── lambdas/
│   │       ├── supervisor/          # Orchestrator entry point
│   │       ├── anomaly_agent/       # Threat detection (Claude Haiku)
│   │       ├── consent_orchestrator/ # Policy evaluation (Nova Pro)
│   │       ├── policy_reasoner/     # NL→JSON policy (Nova Lite)
│   │       ├── proof_verify/        # KMS manifest verification
│   │       ├── federation/          # Federated registry + opt-out
│   │       ├── registration/        # Photo upload + fingerprint
│   │       ├── image_proxy/         # Base64→S3 presigned URL
│   │       └── shared/              # Titan, OpenSearch, KMS, schemas
│   ├── edge/                        # Greengrass v2 edge component
│   ├── sdk/
│   │   ├── python/                  # Python SDK
│   │   └── nodejs/                  # Node.js TypeScript SDK
│   ├── infrastructure/              # CloudFormation templates
│   ├── scripts/                     # Deploy, backfill, crosscheck
│   └── docs/                        # Architecture, guides
├── likenessguard-dashboard/         # React dashboard
├── likenessguard-mcp/               # MCP server (Claude.ai)
│   ├── server.py                    # MCP + OAuth stubs
│   ├── grok_integration.py          # Grok/xAI function calling
│   └── openai_integration.py        # OpenAI function calling
├── .env.example                     # Environment template
├── .gitignore
├── LICENSE                          # Apache 2.0
├── Makefile                         # Common commands
├── CONTRIBUTING.md
├── SECURITY.md
└── CHANGELOG.md
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

## Claude.ai Integration (MCP)

```bash
# Start MCP server
make start-mcp

# Expose publicly via ngrok
ngrok http 8080

# Add to Claude.ai: Settings → Connectors → Add custom connector
# URL: https://YOUR-NGROK-URL.ngrok-free.app/mcp
```

Claude will automatically call `check_consent` before generating any image involving a real person.

> **Production deployment:** ngrok is for development/testing only. For production, deploy the MCP server to a stable HTTPS endpoint:
> - **AWS Lambda Function URL** -- serverless, no infrastructure to manage
> - **Railway / Render** -- one-click deploy from the included `Dockerfile`
> - **Any HTTPS server** -- run `python server.py` behind nginx/caddy with a real domain and TLS certificate

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding standards, and the PR process.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## License

Apache License 2.0 — see [LICENSE](LICENSE).

## Acknowledgements

Built by Samuel Jesse as an AWS AIdeas 2025 competition finalist. Powered by AWS Bedrock, OpenSearch Serverless, KMS, IoT Greengrass, and API Gateway.
