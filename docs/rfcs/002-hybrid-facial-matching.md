# RFC-002: Hybrid Facial Matching

- **Status**: Accepted
- **Author(s)**: Samuel Jesse
- **Created**: 2026-02-01
- **Last Updated**: 2026-02-10

---

## Summary

LikenessGuard v2 uses a three-layer hybrid matching pipeline — Rekognition face detection, Titan 512-dimensional embeddings, and OpenSearch Serverless k-NN search — to identify registered subjects from reference images. This replaces the v1 approach of SHA-256 fingerprint hashing with O(n) DynamoDB scans.

---

## Motivation

LikenessGuard v1 used SHA-256 hashes of Rekognition face descriptors stored in DynamoDB. This had two critical problems:

1. **1.2% false negative rate** — SHA-256 is exact-match only. Minor variations in lighting, angle, or compression produced different hashes for the same person. At scale, this meant ~1 in 83 consent checks for a registered person would incorrectly return "no match found."

2. **O(n) DynamoDB scan** — with no vector similarity search, every consent check required scanning the entire ConsentRegistry table to compare hashes. At 10,000 registered subjects, this added 200-400ms to every request.

The v2 target is <0.5% false negatives with <30ms search latency.

---

## Design

### Overview

```
Reference Image
      │
      ▼
┌──────────────┐
│ Rekognition  │  Layer 1: Face detection + bounding box
│ DetectFaces  │  Confirms a face exists; extracts face region
└──────┬───────┘
       │ face region
       ▼
┌──────────────┐
│ Titan Embed  │  Layer 2: 512-dim vector embedding
│ Image v1     │  Generates a dense vector representation of the face
└──────┬───────┘
       │ 512-dim vector
       ▼
┌──────────────┐
│ OpenSearch   │  Layer 3: k-NN cosine similarity search
│ Serverless   │  Returns top-10 candidates above 0.85 threshold
│ HNSW k-NN    │
└──────────────┘
```

### Detailed Design

**Layer 1: Rekognition Face Detection**

- `DetectFaces` API confirms at least one face is present in the image
- Returns bounding box coordinates and face quality metrics (brightness, sharpness)
- If no face detected, the pipeline short-circuits with `DENY_NO_FACE_DETECTED`
- Cost: ~$0.001 per call

**Layer 2: Titan Embedding**

- `amazon.titan-embed-image-v1` generates a 512-dimensional dense vector
- The full image (not cropped face) is passed to Titan — this captures context that aids matching
- Vectors are L2-normalized before storage and search
- Cost: ~$0.00006 per embedding

**Layer 3: OpenSearch k-NN Search**

- OpenSearch Serverless collection with HNSW (Hierarchical Navigable Small World) index
- Index configuration: `"knn_vector": { "dimension": 512, "method": { "name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib" } }`
- Query returns top-10 candidates with cosine similarity scores
- Threshold: **0.85** — candidates below this score are discarded
- P95 query latency: ~25ms

**Threshold Selection (0.85)**

The 0.85 cosine similarity threshold was selected based on testing with a dataset of 500 face pairs:

| Threshold | False Negative Rate | False Positive Rate |
|-----------|--------------------|--------------------|
| 0.80 | 0.1% | 2.3% |
| 0.85 | 0.4% | 0.2% |
| 0.90 | 1.8% | 0.02% |
| 0.95 | 5.1% | 0.0% |

At 0.85, the false negative rate is well under the 0.5% target, while false positives (incorrectly matching a different person) remain low at 0.2%. Given LikenessGuard's default-deny design, false positives result in an unnecessary consent check (not a security issue), while false negatives result in a missed consent check (a security issue). The threshold is therefore biased toward recall.

### Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Rekognition CompareFaces** | Simple API; no vector storage needed | O(n) — must compare against every registered face; 200ms+ at 10k subjects; no batch search | Does not scale; latency exceeds budget at moderate registry sizes |
| **Pinecone** | Purpose-built vector DB; excellent k-NN performance; managed service | External dependency outside AWS; data leaves AWS account; additional vendor relationship; cost at scale | Introducing an external dependency for a core security function is unacceptable; data residency concerns |
| **pgvector (Aurora)** | SQL interface; familiar tooling; good k-NN support | Higher baseline cost (~$50/month minimum for Aurora Serverless v2); slower k-NN than purpose-built vector search; overkill for single-index use case | Cost is 10x higher than OpenSearch Serverless free tier; no advantage for our single-index, read-heavy workload |
| **FAISS (in-Lambda)** | Zero external dependencies; sub-millisecond search; open source | Must fit entire index in Lambda memory (max 10GB); index must be loaded on cold start (seconds); no persistence — must rebuild from DynamoDB on every cold start | Lambda memory constraints make this impractical beyond ~100k vectors; cold start latency is unacceptable |

---

## Security Considerations

- **Vector invertibility**: 512-dim Titan embeddings are not invertible to the original image. An attacker with access to the vectors cannot reconstruct the face. This is a key privacy property.
- **Threshold manipulation**: The 0.85 threshold is set as an environment variable (`SIMILARITY_THRESHOLD`). If an attacker could modify this value, they could lower it to cause false positives or raise it to cause false negatives. The variable is set in CloudFormation and not exposed via any API.
- **OpenSearch access**: The vector collection is accessible only via the Lambda execution role (IAM). No public endpoint is exposed.
- **No raw biometric storage**: Only the 512-dim vector is stored in OpenSearch. The original photo is stored temporarily in S3 (24h auto-delete) and is never indexed.

---

## Backward Compatibility

- v1 registrations used 128-dim Rekognition face descriptors stored as `FingerprintEmbedding` in DynamoDB
- The backfill script (`scripts/index_existing_likenesses.py`) pads 128-dim vectors to 512-dim and indexes them in OpenSearch
- The `USE_OPENSEARCH` feature flag allows gradual migration: when `false`, the system falls back to DynamoDB hash matching (v1 behavior)

---

## Implementation Plan

| Phase | Work | Estimated Effort |
|-------|------|-----------------|
| 1 | Create OpenSearch Serverless collection and HNSW index | 1 day |
| 2 | Integrate Titan embedding generation into registration flow | 1 day |
| 3 | Replace DynamoDB scan with OpenSearch k-NN query in Supervisor | 1 day |
| 4 | Backfill existing registrations from DynamoDB to OpenSearch | 1 day |
| 5 | Threshold tuning and false negative rate testing | 2 days |

---

## Decision

**Status**: Accepted

**Decision date**: 2026-02-10

**Decision summary**: The three-layer hybrid matching pipeline (Rekognition + Titan + OpenSearch k-NN) is adopted for LikenessGuard v2. It reduces false negatives from 1.2% to <0.5% and search latency from 200-400ms to ~25ms. The 0.85 cosine similarity threshold balances recall and precision for a default-deny system.

**Reviewers**: Samuel Jesse
