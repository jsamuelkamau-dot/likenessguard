# RFC-003: Proof-of-Face Cryptographic Signing

**Status:** Accepted
**Author:** Samuel Jesse
**Created:** April 2026
**Last Updated:** April 2026

---

## Summary

Every ALLOW decision in LikenessGuard v2 is accompanied by a cryptographically signed Proof-of-Face manifest. The manifest is signed using AWS KMS with ECDSA P-256 and follows the C2PA (Coalition for Content Provenance and Authenticity) manifest structure.

## Motivation

In v1, ALLOW decisions were unsigned API responses. A platform could claim "LikenessGuard approved this" without any verifiable proof. This creates two problems:

1. **No accountability** — there's no way to verify after the fact whether consent was actually checked
2. **No interoperability** — other platforms can't verify a consent decision made on a different platform

The competition judges flagged Proof-of-Face as "conceptual" in v1. v2 makes it a working implementation.

## Design

### Manifest Structure

```json
{
  "schema_version": "2.0",
  "manifest_id": "uuid",
  "created_at": "ISO-8601",
  "expires_at": "ISO-8601 (default: +24h)",
  "subject": {
    "id": "subject-uuid",
    "policy_version": 1
  },
  "requester": {
    "id": "platform-id",
    "platform": "platform-name"
  },
  "decision": {
    "outcome": "ALLOW",
    "reason_code": "ALLOW_POLICY_PERMITS",
    "similarity_score": 0.923,
    "usage_type": "GENERAL_GENERATION",
    "agent_confidence": 0.97
  },
  "proof": {
    "kms_key_id": "arn:aws:kms:...",
    "algorithm": "ECDSA_SHA_256",
    "signature": "base64-encoded-signature",
    "jwks_url": "https://.../.well-known/jwks.json"
  },
  "compliance": {
    "eu_ai_act": "Article 13",
    "c2pa_version": "1.3",
    "audit_id": "audit-entry-uuid"
  }
}
```

### Signing Flow

1. Supervisor constructs the manifest (all fields except `signature`)
2. Manifest is canonicalized (JSON with sorted keys, no whitespace)
3. SHA-256 hash of canonical form is computed
4. KMS signs the hash with ECDSA P-256 (`ECDSA_SHA_256` algorithm)
5. Signature is base64-encoded and placed in `proof.signature`
6. `manifest_hash` in `soft_binding` is set to the SHA-256 hash

### Verification Flow

1. Extract `signature` from manifest
2. Recompute canonical form (excluding `signature`)
3. Compute SHA-256 hash
4. Call KMS `verify()` or use the JWKS public key to verify locally
5. Check `expires_at` is in the future

### JWKS Public Key Distribution

The KMS signing key's public component is published to S3 and served via CloudFront at `/.well-known/jwks.json`. This allows any party to verify a Proof-of-Face manifest without calling our API.

### Why KMS ECDSA P-256?

- **HSM-backed** — private key never leaves the KMS hardware security module
- **ECDSA P-256** — widely supported, compact signatures (~70 bytes)
- **C2PA compatible** — the C2PA standard uses ECDSA for content provenance
- **Auditable** — CloudTrail logs every sign/verify operation

### Critical Invariant

**If KMS signing fails, the decision flips from ALLOW to DENY.** An unsigned ALLOW is never returned. This is enforced in the Supervisor Lambda and tested by Property 1 in the test suite.

## Security Considerations

- The KMS key policy restricts `kms:Sign` to the Supervisor Lambda's execution role
- Key rotation is handled by KMS (automatic annual rotation)
- Old signatures remain verifiable after rotation (KMS retains previous key versions)
- The JWKS endpoint is public and read-only — compromise of S3/CloudFront only affects public key distribution, not signing

## Backward Compatibility

v1 had no Proof-of-Face. v2 ALLOW responses always include the `proof_of_face` field. Clients that don't need it can ignore it.

## Decision

**Accepted** — April 2026

KMS ECDSA signing provides hardware-backed, auditable, C2PA-compatible proof of consent with minimal latency (~18ms). The "signing failure = DENY" invariant ensures safety even under KMS outages.

