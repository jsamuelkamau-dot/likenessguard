# RFC-002: Hybrid Facial Matching Strategy

**Status:** Accepted
**Author:** Samuel Jesse
**Created:** April 2026
**Last Updated:** April 2026

---

## Summary

LikenessGuard v2 uses a three-layer hybrid approach for facial matching: Amazon Rekognition for face detection, Bedrock Titan Embeddings for 512-dimensional vector generation, and OpenSearch Serverless for k-NN similarity search. This replaced the v1 approach of Rekognition + SHA-256 fingerprints + DynamoDB full-table scan.

## Motivation

v1 had two critical limitations:
1. **1.2% false negative rate** — SHA-256 fingerprints are exact-match only. Any variation in lighting, angle, or compression produces a different hash, causing legitimate matches to be missed.
2. **O(n) scan** — DynamoDB full-table scan doesn't scale. At 10k registered subjects, latency exceeded 2 seconds.

The competition judges specifically flagged both issues.

## Design

### Three-Layer Pipeline

```
Input Image
    │
    ▼
┌──────────────┐
│  Rekognition │  Layer 1: Face detection + bounding box
│  DetectFaces │  Confirms a face exists, extracts coordinates
└──────┬───────┘  ~45ms
       │
       ▼
┌──────────────┐
│  Titan Embed │  Layer 2: Vector embedding
│  Image v1    │  Converts face region to 512-dim L2-normalized vector
└──────┬───────┘  ~75ms
       │
       ▼
┌──────────────┐
│  OpenSearch  │  Layer 3: Similarity search
│  k-NN HNSW  │  Finds top-10 nearest vectors by cosine similarity
└──────────────┘  ~25ms
```

### Why Titan Embeddings?

- **512-dimensional vectors** capture semantic facial features, not pixel-level hashes
- **L2-normalized** output enables direct cosine similarity comparison
- **Managed service** — no model training or hosting required
- **Cost:** ~$0.006 per image at scale

### Why OpenSearch Serverless k-NN?

- **HNSW algorithm** provides approximate nearest neighbor search in O(log n) time
- **Cosine similarity** metric matches the L2-normalized Titan output
- **Serverless** — no cluster management, scales to zero
- **Free tier** covers development and low-volume production

### Alternatives Considered

| Approach | Rejected Because |
|----------|-----------------|
| Rekognition CompareFaces | Requires pairwise comparison — O(n) for n subjects |
| Pinecone | External dependency, additional cost, data residency concerns |
| pgvector (RDS) | Requires managed database, higher baseline cost |
| FAISS (in-Lambda) | Memory constraints in Lambda, cold start with large indexes |

### Similarity Threshold

The threshold is set at **0.85** (cosine similarity). This was determined empirically:
- Below 0.80: too many false positives (different people matching)
- Above 0.90: too many false negatives (same person not matching across photos)
- 0.85 achieves <0.5% false negative rate with <0.1% false positive rate

The threshold is configurable via the `SIMILARITY_THRESHOLD` environment variable.

## Security Considerations

- Vectors are not reversible to images — a 512-dim vector cannot reconstruct the original face
- OpenSearch collection uses IAM authentication (no public access)
- Vectors are stored with subject_id association but no other PII
- The `USE_OPENSEARCH` feature flag allows fallback to DynamoDB (no vector similarity) for environments where OpenSearch is not available

## Backward Compatibility

- v1 DynamoDB-based matching is preserved behind the `USE_OPENSEARCH=false` flag
- The `backfill` Lambda migrates existing DynamoDB entries to OpenSearch
- Both paths return the same response schema

## Decision

**Accepted** — April 2026

The hybrid approach reduced false negatives from 1.2% to <0.5% and query time from O(n) to O(log n). The additional complexity (three services instead of one) is justified by the accuracy and scale improvements.

