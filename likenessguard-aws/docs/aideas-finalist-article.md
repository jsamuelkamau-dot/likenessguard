# AIdeas Finalist: LikenessGuard — AI-Powered Identity Protection

**Tags:** #aideas-2025 #aideas-2025-finalist #social-impact #ANZ

---

## App Category

**Social Impact**

---

## My Vision

Every day, AI image generators create thousands of images using real people's faces without their knowledge or consent. A teenager's selfie becomes training data. A public figure's likeness appears in deepfakes. An artist's face is used in commercial campaigns they never agreed to.

LikenessGuard stops this at the source — before the image is ever generated.

LikenessGuard is a pre-generation consent enforcement platform built entirely on AWS. It sits between the AI model and the generation request, checking whether the person in the reference image has given consent for that specific use. If consent exists, generation proceeds with a cryptographically signed Proof-of-Face certificate. If not, the request is denied. No image is ever created without verified consent.

What makes v2 different from the original submission: it now runs as a Bedrock multi-agent system with three AI agents reasoning about every consent decision, supports offline enforcement at the edge via AWS IoT Greengrass, produces cryptographic proof using KMS ECDSA signatures, and integrates directly with Claude and Grok so those AI assistants check consent automatically before generating anything involving a real person's face.

---

## Why This Matters

The scale of non-consensual AI image generation is staggering. Generative AI tools can now produce photorealistic images of anyone from a single reference photo. Current protections are reactive — they try to detect and remove deepfakes after they exist. That approach is fundamentally broken because once an image is generated and shared, the damage is done.

LikenessGuard takes a different approach: prevention over detection. By enforcing consent at the point of generation — before any pixels are rendered — it eliminates the problem at its root.

This matters to three groups of people:

**Individuals** get control over how their likeness is used in AI-generated content. They can set granular policies: allow editorial use but deny commercial, permit self-edits but block face swaps, approve specific platforms while blocking others.

**AI platforms** get a compliance layer that protects them from liability. Integrating LikenessGuard takes less than a day with the provided SDKs, and every ALLOW decision comes with a signed certificate that proves consent was verified.

**Regulators** get the transparency infrastructure they need. The EU AI Act (Article 13) requires transparency in AI systems that process biometric data. LikenessGuard's immutable audit trail, cryptographic proofs, and C2PA-compatible manifests provide exactly that.

---

## How I Built This

### Architecture Overview

LikenessGuard v2 runs on a fully serverless AWS stack in us-east-1. The core is a Supervisor Lambda that orchestrates a 9-step consent pipeline in under 300ms:

1. **Input validation** — accepts base64 images or public URLs
2. **Face detection** — Amazon Rekognition confirms a human face is present
3. **Facial embedding** — Bedrock Titan Embed Image v1 generates a 512-dimensional vector
4. **Vector matching** — OpenSearch Serverless k-NN finds the top-10 most similar registered faces
5. **Anomaly screening** — Claude Haiku checks for prompt injection, jailbreaks, and rate abuse
6. **Policy evaluation** — Nova Pro reasons over the subject's consent policy and the usage type
7. **Cryptographic signing** — KMS ECDSA P-256 signs a C2PA-compatible Proof-of-Face manifest
8. **Audit logging** — DynamoDB records an immutable, tamper-evident audit entry
9. **Response assembly** — Returns decision, reasoning trace, and signed proof

### The Multi-Agent System

Three Bedrock agents collaborate on every consent decision:

The **Anomaly Agent** (Claude Haiku) runs first as a fast-path gate. It checks a DynamoDB suspension list and scans for injection patterns in under 20ms. The LLM is only invoked for borderline cases, keeping costs low.

The **Consent Orchestrator** (Nova Pro, with Claude Sonnet as fallback) is the primary decision-maker. It evaluates the subject's policy against the requested usage type, applying the most-restrictive interpretation when policy clauses are ambiguous. It returns a structured decision with confidence score and reasoning trace.

The **Policy Reasoner** (Nova Lite) handles natural language policy conversion. Subjects can write policies in plain English — "allow editorial use but deny face swaps and commercial use" — and the reasoner converts them to structured JSON with conflict detection.

### Hybrid Facial Matching

v1 used SHA-256 fingerprint hashing, which had a 1.2% false negative rate. v2 replaced this with a hybrid pipeline:

- Rekognition detects the face and extracts the bounding box
- Titan Embed Image generates a 512-dimensional semantic vector
- OpenSearch Serverless runs HNSW k-NN search (cosine similarity) returning the top-10 candidates in ~25ms
- The Consent Orchestrator applies confidence scoring on top of the similarity score

This reduced false negatives to below 0.5% and scales to millions of registered faces without performance degradation.

### Proof-of-Face (Cryptographic)

Every ALLOW decision produces a KMS-signed C2PA-compatible manifest containing the subject ID, requester, decision, similarity score, and a JWKS-verifiable ECDSA signature. If KMS signing fails, the decision flips to DENY — the system never returns an unsigned ALLOW. A public JWKS endpoint on CloudFront enables any third party to verify the proof independently.

### Edge Enforcement

An AWS IoT Greengrass v2 component runs on edge devices with a SQLite cache of facial vectors. When offline, it performs local cosine similarity matching and defaults to DENY when no cache match exists. On reconnect, it syncs offline decisions back to the central audit log.

### Cross-Platform AI Integration

The most significant v2 addition: LikenessGuard now integrates directly with AI assistants so they check consent automatically.

**Claude (Anthropic):** We built an MCP (Model Context Protocol) server that exposes LikenessGuard tools — `check_consent`, `upload_image_for_consent`, `get_policy`, `update_policy`. Connected via Claude.ai's connector system, Claude automatically calls LikenessGuard before generating or editing any image involving a real person. When consent is denied, Claude refuses the request and explains why.

**Grok (xAI):** Using xAI's OpenAI-compatible API with function calling, Grok calls `check_consent` before any likeness-related generation. The integration script uses the same API endpoint, producing audit entries visible in the same dashboard alongside Claude's requests.

Both platforms produce unified audit logs — the dashboard shows requester names (claude-ai-user, grok-xai) alongside every consent decision.

### Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| P95 end-to-end latency | < 300ms | ~263ms |
| False negative rate | < 0.5% | < 0.5% |
| OpenSearch k-NN query | < 30ms | ~25ms |
| KMS signing | < 20ms | ~18ms |
| Anomaly Agent fast-path | < 20ms | ~15ms |

### Cost at Scale

| Service | 100k checks/month |
|---------|-------------------|
| Lambda (Supervisor + agents) | $1.92 |
| Bedrock (Nova Pro + Haiku + Titan) | $1.90 |
| Rekognition DetectFaces | $1.00 |
| KMS signing | $0.30 |
| DynamoDB | $0.13 |
| OpenSearch Serverless | Free Tier |
| **Total** | **~$4.20/month** |

The entire platform runs for under $5/month at 100,000 consent checks — less than a cup of coffee per day.

### Key Development Milestones

- **Week 1:** Deployed OpenSearch Serverless vector collection, backfilled 19 existing registrations, validated k-NN matching with 0.99 top-match score
- **Week 2:** Built the 3-agent Bedrock system (Anomaly + Orchestrator + Policy Reasoner), achieved <300ms P95
- **Week 3:** Implemented KMS Proof-of-Face signing, JWKS endpoint, verification API, and edge Greengrass component
- **Week 4:** Built cross-platform integrations (Claude MCP, Grok function calling), unified audit dashboard, and 25 property-based tests

---

## Demo

[Insert YouTube embed here — demo video under 3 minutes showing:
1. Dashboard overview with live metrics
2. Registration flow with multi-photo upload
3. Consent check via dashboard (ALLOW with Proof-of-Face)
4. Claude.ai refusing to edit a photo after DENY decision
5. Grok calling check_consent and respecting the DENY
6. Activity Logs showing cross-platform audit trail with requester names
7. Edge enforcement in offline mode]

---

## What I Learned

### Which judge feedback resonated most

The feedback that hit hardest was: **"Requires active user registration to protect individuals."** In v1, if you didn't know about LikenessGuard, you had zero protection. That's backwards — the people most vulnerable to non-consensual AI image generation are exactly the people least likely to know about a consent registry.

v2 addresses this with proactive discovery hints (the system detects unregistered faces and creates provisional DENY-ALL entries), a public opt-out endpoint (anyone can register protection without creating an account), and edge default-deny (when in doubt, deny). Protection is now the default state, not something you have to opt into.

The second piece of feedback that drove the biggest technical change was: **"Current registry scanning approach needs vector database for scale."** The judges were right — DynamoDB full-table scans would never scale beyond 10,000 faces. Migrating to OpenSearch Serverless with HNSW k-NN search was the single most impactful architectural change. It reduced query time from O(n) to sub-linear, improved matching accuracy, and made the system viable at millions of registered faces.

The feedback about **"Proof of Face still conceptual"** motivated the full KMS ECDSA implementation. Moving from a design document to a working cryptographic signing pipeline with JWKS verification was the most satisfying engineering challenge of the project.

### Key insights from the development journey

**AI agents are better than rules for consent decisions.** v1 used if/else policy evaluation. v2 uses Nova Pro to reason over ambiguous policies, and the quality difference is dramatic. When a policy says "allow editorial use" and the request is "news illustration," a rule-based system doesn't know what to do. Nova Pro correctly classifies it as editorial and allows it with high confidence.

**Cross-platform integration is the real moat.** Building the consent engine was the easy part. Getting Claude and Grok to actually call it before generating — that's what makes LikenessGuard useful in practice. The MCP server for Claude and the function calling integration for Grok prove that consent enforcement can be embedded directly into the AI assistants people already use, not just in specialized tools.

**Default-deny is the only safe default.** Every error path in LikenessGuard returns DENY. KMS signing fails? DENY. Face not detected? DENY. Offline with no cache? DENY. OpenSearch unavailable? Fall back to DynamoDB, and if that fails too, DENY. This principle — never return an unsafe ALLOW — is the single most important design decision in the entire system.

**Serverless keeps costs honest.** The entire platform costs $4.20/month at 100k checks. No EC2 instances running idle. No reserved capacity. Every dollar spent is directly tied to a consent check that protected someone's likeness. That cost structure makes it viable for any platform to adopt, regardless of size.
