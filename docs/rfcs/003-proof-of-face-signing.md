# RFC-003: Proof-of-Face KMS Signing

- **Status**: Accepted
- **Author(s)**: Samuel Jesse
- **Created**: 2026-02-15
- **Last Updated**: 2026-02-22

---

## Summary

LikenessGuard issues a cryptographically signed Proof-of-Face manifest for every ALLOW decision. The manifest is signed using AWS KMS with an ECDSA P-256 key, producing a C2PA-compatible certificate that proves consent was verified before image generation. If KMS signing fails for any reason, the ALLOW decision is flipped to DENY.

---

## Motivation

An ALLOW decision without cryptographic proof is just a claim. Any system could return `{"decision": "ALLOW"}` without actually checking consent. The Proof-of-Face manifest provides:

1. **Verifiability** — any third party can verify the signature using the public key (distributed via JWKS)
2. **Non-repudiation** — the platform cannot claim it checked consent if it doesn't have a valid signed manifest
3. **C2PA compatibility** — the manifest format aligns with the Coalition for Content Provenance and Authenticity standard, enabling integration with content provenance tooling
4. **Tamper evidence** — the manifest includes a hash of the decision payload; any modification invalidates the signature

---

## Design

### Overview

```
Consent Orchestrator returns ALLOW
            │
            ▼
┌───────────────────────┐
│  Build manifest       │
│  - decision: ALLOW    │
│  - subject_id         │
│  - usage_type         │
│  - timestamp          │
│  - similarity_score   │
│  - policy_version     │
│  - requester_id       │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  KMS Sign             │
│  ECDSA_SHA_256        │
│  ECC_NIST_P256        │
│  Key: alias/          │
│  likenessguard-pof-   │
│  signing              │
└───────────┬───────────┘
            │
     ┌──────┴──────┐
     │             │
  Success       Failure
     │             │
     ▼             ▼
  Return        Flip to DENY
  signed        reason_code:
  manifest      DENY_SIGNING_FAILURE
```

### Detailed Design

**Manifest Structure**

```json
{
  "manifest_id": "uuid-v4",
  "version": "1.0",
  "issued_at": "2026-02-15T12:00:00Z",
  "expires_at": "2026-02-15T13:00:00Z",
  "issuer": "likenessguard",
  "subject": {
    "subject_id": "sub-abc123",
    "similarity_score": 0.923
  },
  "decision": {
    "result": "ALLOW",
    "reason_code": "ALLOW_POLICY_PERMITS",
    "usage_type": "GENERAL_GENERATION",
    "policy_version": 3
  },
  "requester": {
    "requester_id": "platform-xyz",
    "platform": "stable-diffusion"
  },
  "proof": {
    "algorithm": "ECDSA_SHA_256",
    "key_id": "alias/likenessguard-pof-signing",
    "signature": "base64-encoded-ecdsa-signature"
  }
}
```

**KMS Key Configuration**

- **Key spec**: `ECC_NIST_P256` (NIST P-256 curve)
- **Key usage**: `SIGN_VERIFY`
- **Signing algorithm**: `ECDSA_SHA_256`
- **Key rotation**: Disabled (ECDSA keys cannot be auto-rotated by KMS; manual rotation via key alias update)
- **Key policy**: Restricted to the Lambda execution role

**Signing Process**

1. The Supervisor Lambda builds the manifest JSON (excluding the `proof` field)
2. The manifest is serialized to a canonical JSON string (sorted keys, no whitespace)
3. SHA-256 digest is computed over the canonical JSON
4. `kms:Sign` is called with `SigningAlgorithm=ECDSA_SHA_256` and `MessageType=DIGEST`
5. The base64-encoded signature is added to the `proof` field
6. The complete manifest is returned in the API response

**Verification Process**

1. The verifier extracts the `proof` field from the manifest
2. The remaining manifest fields are serialized to canonical JSON
3. SHA-256 digest is computed
4. The public key is fetched from the JWKS endpoint (`/.well-known/jwks.json` via CloudFront)
5. `kms:Verify` (or local ECDSA verification with the public key) confirms the signature

**JWKS Public Key Distribution**

- The KMS public key is exported via `kms:GetPublicKey` and converted to JWK format
- Published to S3 (`likenessguard-jwks-{account-id}/.well-known/jwks.json`)
- Distributed globally via CloudFront with caching
- The `publish_jwks.py` script handles key export and upload
- Public key is... public — no authentication required to fetch it

**Critical Invariant: Signing Failure = DENY**

This is the most important security property of the Proof-of-Face system. If KMS signing fails for any reason — timeout, throttling, key deletion, permission error — the ALLOW decision is flipped to DENY:

```python
try:
    signature = kms_client.sign(...)
    manifest["proof"] = {"signature": base64.b64encode(signature), ...}
    return {"decision": "ALLOW", "proof_of_face": manifest}
except Exception as e:
    logger.error(f"KMS signing failed: {e}")
    return {"decision": "DENY", "reason_code": "DENY_SIGNING_FAILURE"}
```

This ensures that an unsigned ALLOW can never be returned. Property-based tests verify this invariant.

**C2PA Compatibility**

The manifest structure is designed to be embeddable in a C2PA manifest store. The `proof` field maps to a C2PA `claim_signature`, and the manifest fields map to C2PA assertions. A future integration could embed the Proof-of-Face directly into generated image metadata.

### Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **HMAC-SHA256** | Faster (~1ms vs ~18ms for KMS); no external dependency | Symmetric key — verifier needs the secret; cannot distribute public key; not C2PA compatible | Verification requires sharing the secret, which defeats the purpose of third-party verifiability |
| **Lambda-local RSA signing** | No KMS dependency; faster | Private key must be stored somewhere accessible to Lambda (Secrets Manager, env var); key rotation is manual; no HSM protection | KMS provides HSM-backed key storage with audit trail; storing private keys in Lambda is a security anti-pattern |
| **No signing (trust the API)** | Simplest; no latency overhead | No verifiability; any system could forge an ALLOW response; no non-repudiation | Defeats the purpose of cryptographic consent verification |
| **Blockchain notarization** | Immutable; decentralized verification | 1-60 second confirmation time; cost per transaction; complexity; overkill for current scale | Latency is incompatible with 300ms target; on-chain consent is on the v3.0 roadmap as an optional layer |

---

## Security Considerations

- **Key compromise**: If the KMS key is compromised, an attacker could forge Proof-of-Face manifests. Mitigation: KMS keys are HSM-backed and never leave AWS; key policy restricts access to the Lambda execution role; CloudTrail logs all key usage.
- **Replay attacks**: A valid Proof-of-Face could be replayed for a different generation request. Mitigation: manifests include `manifest_id` (unique), `issued_at`, and `expires_at` (1-hour expiry). Verifiers should check expiry and track seen manifest IDs.
- **Signing failure as DoS**: An attacker who can cause KMS throttling could force all decisions to DENY. Mitigation: KMS has high default quotas (5,500 requests/second for Sign); CloudWatch alarm on KMS throttling; this is an acceptable failure mode (DENY is safe).

---

## Backward Compatibility

- v1 did not have Proof-of-Face signing. v1 API responses do not include a `proof_of_face` field.
- v2 API consumers should check for the presence of `proof_of_face` in the response. If absent, the decision was made without cryptographic proof (v1 behavior or signing failure).

---

## Implementation Plan

| Phase | Work | Estimated Effort |
|-------|------|-----------------|
| 1 | Create KMS ECDSA P-256 key via CloudFormation | 0.5 days |
| 2 | Implement `kms_signing.py` shared module | 1 day |
| 3 | Integrate signing into Supervisor Lambda (ALLOW path) | 0.5 days |
| 4 | Implement `proof_verify` Lambda for verification | 1 day |
| 5 | Publish JWKS public key (script + S3 + CloudFront) | 0.5 days |
| 6 | Property-based tests for signing invariants | 1 day |

---

## Decision

**Status**: Accepted

**Decision date**: 2026-02-22

**Decision summary**: KMS ECDSA P-256 signing is adopted for Proof-of-Face manifests. The signing-failure-flips-to-DENY invariant is the critical security property. C2PA compatibility enables future integration with content provenance standards. The ~18ms signing latency is acceptable within the 300ms P95 budget.

**Reviewers**: Samuel Jesse
