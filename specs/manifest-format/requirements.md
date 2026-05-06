# LikenessGuard v3 — Consent Manifest Format Specification

**Version:** 3.0.0-draft
**Status:** Internal specification — guides implementation on `v3-reference-implementation` branch
**Component:** Provenance Issuance (Phase 4)

---

## 1. Scope and Non-Goals

### Scope

This specification defines the **Consent Manifest** format used by LikenessGuard v3 to record pre-generation consent decisions for AI-generated content involving real people's likenesses. A Consent Manifest is a signed JSON document that records whether a specific generation request was permitted or denied, the operating mode under which the decision was made, and the cryptographic proof that the decision was issued by a trusted authority.

The manifest is designed as a **C2PA assertion type** (`org.likenessguard.consent.v3`) that can be embedded inside a downstream C2PA manifest attached to the generated artifact. It does not replace C2PA — it extends C2PA with consent provenance that C2PA does not model.

The manifest requires **generator cooperation**: the generating platform must call the LikenessGuard consent check API before generation and must embed or reference the resulting manifest. The system cannot enforce consent without the generator's participation.

### Non-Goals

- This specification does **not** describe content provenance of generated artifacts. Content provenance (who generated what, when, with which tool) is C2PA's responsibility.
- This specification does **not** protect subjects whose images are not provided as reference inputs to the generation request. If a generator produces a likeness from a text prompt alone without a reference image, this system has no input to match against.
- This specification does **not** define the Identity Resolution or Consent Resolution components. It defines only the output format of the Provenance Issuance component.

### Rationale

Consent enforcement and content provenance are distinct concerns with different trust models. C2PA records what happened; LikenessGuard records whether it was permitted. Combining them into a single format would couple two independent standards and prevent adopters from using either independently. By defining the consent manifest as a C2PA assertion type, adopters get both signals in a single C2PA manifest without either standard depending on the other.

---

## 2. Operating Modes

### 2.1 REGISTERED_SUBJECT Mode

When the system operates in `REGISTERED_SUBJECT` mode and no registered subject matches the query image, the manifest records:

- `decision.outcome` = `ADVISORY_NO_REGISTERED_SUBJECT`
- `decision.binding` = `false`
- `decision.reason_code` = `ADVISORY_NO_REGISTERED_SUBJECT`
- `subject.match_status` = `NO_MATCH`

The system has **not** made a consent decision. It has made a no-violation finding: no registered subject was identified, so no registered policy was violated. Verifiers MUST treat manifests with `decision.binding = false` as advisory. Generators receiving an advisory manifest MAY proceed with generation at their own discretion.

### 2.2 CLOSED_CONSENT Mode

When the system operates in `CLOSED_CONSENT` mode and no registered subject matches the query image, the manifest records:

- `decision.outcome` = `DENY`
- `decision.binding` = `true`
- `decision.reason_code` = `DENY_NO_CONSENT_RECORD`
- `subject.match_status` = `NO_MATCH`

The denial is a **positive enforcement** of the closed default. The system has made a consent decision: generation is denied because no consent record exists for the subject. Generators receiving this manifest MUST NOT proceed with generation.

### 2.3 Matched Subject (Both Modes)

When a registered subject matches in either mode, the manifest records the policy evaluation result with `decision.binding = true`. Both modes produce an identical manifest structure for matched subjects. The modes diverge **only** in the unmatched case.

### 2.4 Mode Declaration

- `mode.active` declares the mode that was in effect when this manifest was issued. Value is one of `REGISTERED_SUBJECT` or `CLOSED_CONSENT`.
- `mode.per_usage_type` declares the per-usage-type mode mapping as an object whose keys are `usage_type` values and whose values are mode values. This allows a deployment to operate in `REGISTERED_SUBJECT` mode for some usage types and `CLOSED_CONSENT` mode for others.
- Both fields are part of the signed payload. A verifier can confirm which mode was active for the decision recorded in this manifest.

### Rationale

Embedding the mode in the manifest makes each manifest self-describing. A verifier does not need to query the issuer's current configuration to interpret the decision. This is critical for offline verification and for auditing historical decisions where the issuer's configuration may have changed since issuance. The per-usage-type mapping allows platforms with mixed requirements (e.g., closed consent for face swaps but registered-subject for editorial) to express their policy in a single deployment without running multiple instances.

---

## 3. Manifest Structure

A Consent Manifest is a JSON object with the following top-level fields. All fields are REQUIRED unless marked optional.

```json
{
  "schema_version": "3.0.0",
  "manifest_id": "550e8400-e29b-41d4-a716-446655440000",
  "issued_at": "2025-01-15T12:00:00Z",
  "expires_at": "2025-01-16T12:00:00Z",
  "mode": {
    "active": "REGISTERED_SUBJECT",
    "per_usage_type": {
      "FACE_SWAP": "CLOSED_CONSENT",
      "GENERAL_GENERATION": "REGISTERED_SUBJECT"
    }
  },
  "subject": {
    "id": "subject-uuid-or-null",
    "policy_version": 3,
    "policy_hash": "sha256:abcdef...",
    "match_status": "MATCHED"
  },
  "requester": {
    "id": "requester-uuid",
    "platform": "platform-id",
    "purpose": "Generate marketing image",
    "usage_type": "COMMERCIAL"
  },
  "decision": {
    "outcome": "ALLOW",
    "reason_code": "ALLOW_POLICY_PERMITS",
    "binding": true,
    "confidence": 0.9812,
    "similarity_score": 0.9812,
    "similarity_threshold": 0.85
  },
  "embedding": {
    "model_id": "insightface-buffalo_l",
    "model_version": "1.0.0",
    "dimensionality": 512,
    "normalization": "L2",
    "benchmark": "LFW",
    "operating_point": "1e-6"
  },
  "image": {
    "reference_hash": "sha256:abcdef1234567890...",
    "hash_algorithm": "SHA-256"
  },
  "proof": {
    "kid": "RFC7638-thumbprint",
    "algorithm": "ES256",
    "signature": "base64url-encoded-signature",
    "jwks_url": "https://example.com/.well-known/jwks.json"
  },
  "revocation": {
    "verify_url": "https://example.com/v3/revocation/status"
  }
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `schema_version` | string (semver) | The version of this specification the manifest conforms to. |
| `manifest_id` | string (UUIDv4) | Unique identifier for this manifest instance. |
| `issued_at` | string (RFC 3339) | Timestamp when the manifest was issued. |
| `expires_at` | string (RFC 3339) | Timestamp after which the manifest MUST NOT be treated as valid without re-verification. |
| `mode.active` | string (enum) | The operating mode in effect for this decision. |
| `mode.per_usage_type` | object | Maps usage_type values to mode values. Keys are usage_type enum values; values are mode enum values. |
| `subject.id` | string or null | The matched subject's identifier, or null if no match. |
| `subject.policy_version` | integer or null | The version of the subject's policy that was evaluated, or null if no match. |
| `subject.policy_hash` | string or null | SHA-256 hash of the policy document evaluated, or null if no match. |
| `subject.match_status` | string (enum) | Whether a subject match was found. |
| `requester.id` | string | Identifier of the entity requesting generation. |
| `requester.platform` | string | Identifier of the platform through which the request was made. |
| `requester.purpose` | string | Free-text description of the generation purpose. |
| `requester.usage_type` | string (enum) | Categorized usage type for policy evaluation. |
| `decision.outcome` | string (enum) | The consent decision. |
| `decision.reason_code` | string (enum) | Machine-readable reason for the decision. |
| `decision.binding` | boolean | Whether this decision is binding on the generator. |
| `decision.confidence` | number (0.0–1.0) | The similarity score that informed the match decision. Same as `similarity_score` when a match was evaluated. |
| `decision.similarity_score` | number or null | Cosine similarity between query and reference embeddings, or null if no comparison was performed. |
| `decision.similarity_threshold` | number or null | The threshold that was applied, or null if no comparison was performed. |
| `embedding.model_id` | string | Identifier of the embedding model used for face matching. |
| `embedding.model_version` | string (semver) | Version of the embedding model. |
| `embedding.dimensionality` | integer | Dimensionality of the embedding vectors. |
| `embedding.normalization` | string | Normalization applied to vectors (e.g., "L2"). |
| `embedding.benchmark` | string | The benchmark dataset used to calibrate the operating point. |
| `embedding.operating_point` | string | The false-positive rate at which the threshold was set (e.g., "1e-6"). |
| `image.reference_hash` | string | Hash of the reference image used for matching. |
| `image.hash_algorithm` | string | Algorithm used to compute `reference_hash`. |
| `proof.kid` | string | Key identifier: JWK thumbprint per RFC 7638. |
| `proof.algorithm` | string | Signing algorithm identifier. Value is `ES256`. |
| `proof.signature` | string | Base64url-encoded ECDSA signature. |
| `proof.jwks_url` | string (URL) | URL where the verifier can retrieve the public key. |
| `revocation.verify_url` | string (URL) | URL for checking revocation status. OPTIONAL field — the entire `revocation` object may be omitted. |

### Rationale

The structure separates concerns into logical groups: identity (subject), authorization context (requester, mode), decision output (decision), matching metadata (embedding, image), and cryptographic proof (proof, revocation). This separation allows verifiers to process only the fields relevant to their verification level. The embedding metadata enables reproducibility audits: given the same model, version, and operating point, a replay should produce the same similarity score.

---

## 4. Closed Enumerations

### 4.1 `decision.outcome`

| Value | Semantic |
|-------|----------|
| `ALLOW` | The subject's policy permits this generation request for the specified usage type. |
| `DENY` | The subject's policy denies this generation request, or no consent record exists (in CLOSED_CONSENT mode), or the system cannot produce a match. |
| `ADVISORY_NO_REGISTERED_SUBJECT` | No registered subject was identified; this is an advisory finding, not a consent decision (REGISTERED_SUBJECT mode only). |

### 4.2 `decision.reason_code`

| Value | Semantic |
|-------|----------|
| `ALLOW_POLICY_PERMITS` | The matched subject's policy explicitly permits this usage type. |
| `ALLOW_SELF_EDIT` | The requester is the subject and self-editing is permitted. |
| `DENY_NO_CONSENT_RECORD` | No consent record exists for the identified subject (CLOSED_CONSENT mode). |
| `DENY_POLICY_DENIES` | The matched subject's policy explicitly denies this usage type. |
| `DENY_FACE_SWAP` | The request involves face swapping and the subject's policy denies face swaps. |
| `DENY_THIRD_PARTY_EDIT` | A third party is requesting edits to the subject's likeness and the policy denies this. |
| `DENY_PLATFORM_BLOCKED` | The requesting platform is blocked by the subject's policy. |
| `DENY_NOT_IN_ALLOWLIST` | The requester is not in the subject's explicit allowlist (when allowlist mode is active). |
| `DENY_PROVISIONAL_ENTRY` | The subject's consent record is provisional and not yet confirmed. |
| `DENY_SIMILARITY_BELOW_THRESHOLD` | A face was detected but similarity fell below the configured threshold. |
| `DENY_MATCH_UNAVAILABLE` | The matching system could not produce a result (provider error, no face detected, multiple faces). |
| `DENY_SIGNING_FAILURE` | The decision was ALLOW but signing failed; the decision was flipped to DENY. |
| `ADVISORY_NO_REGISTERED_SUBJECT` | No registered subject was identified (REGISTERED_SUBJECT mode advisory). |

### 4.3 `subject.match_status`

| Value | Semantic |
|-------|----------|
| `MATCHED` | A registered subject was identified with similarity at or above threshold. |
| `NO_MATCH` | No registered subject matched the query image above threshold. |
| `MATCH_UNAVAILABLE` | The matching system could not produce a result due to a provider error or unprocessable image. |

### 4.4 `requester.usage_type`

| Value | Semantic |
|-------|----------|
| `GENERAL_GENERATION` | General-purpose image generation not covered by a more specific type. |
| `FACE_SWAP` | Replacing one person's face with another's likeness. |
| `SELF_EDIT` | The subject is editing their own likeness. |
| `THIRD_PARTY_EDIT` | A third party is editing the subject's likeness. |
| `COMMERCIAL` | Generation for commercial use (advertising, marketing, product imagery). |
| `EDITORIAL` | Generation for editorial or journalistic use. |
| `RESEARCH` | Generation for academic or scientific research purposes. |
| `SATIRE_PARODY` | Generation for satire or parody purposes. |

### 4.5 `mode.active`

| Value | Semantic |
|-------|----------|
| `REGISTERED_SUBJECT` | The system protects only registered subjects; unregistered subjects receive advisory results. |
| `CLOSED_CONSENT` | The system enforces default-deny; all subjects are protected regardless of registration status. |

### Rationale

Closed enumerations ensure that manifests are machine-parseable without ambiguity. Every reason code maps to exactly one decision path in the Consent Resolution component. New values may only be added in a minor version bump with backward-compatible semantics. Verifiers that encounter an unknown enum value MUST treat the manifest as invalid (fail closed).

---

## 5. Canonicalization

### Specification

The canonicalization method for signing is **RFC 8785 — JSON Canonicalization Scheme (JCS)**.

Before signing, the manifest is serialized using RFC 8785, which defines:
- Lexicographic sorting of object keys (recursive)
- No insignificant whitespace
- Deterministic number serialization (no trailing zeros, no positive sign on exponent)
- UTF-8 encoding with no BOM

The canonical form is the byte sequence produced by applying RFC 8785 to the manifest object with the `proof.signature` field removed (see Section 6).

### Rationale

RFC 8785 is the IETF standard for JSON canonicalization. It eliminates implementation-defined serialization differences (key ordering, number formatting, whitespace) that would cause signature verification failures across implementations. The v2 approach (`json.dumps(sort_keys=True, separators=(',', ':'))`) is Python-specific and does not handle number serialization deterministically (e.g., `1.0` vs `1` vs `1.00`). RFC 8785 is language-agnostic and has reference implementations in Python, JavaScript, Java, Go, and Rust.

---

## 6. Signing

### Specification

The signing algorithm is **ECDSA P-256 (ES256)** over the **SHA-256 hash** of the canonicalized manifest.

**Procedure:**

1. Construct the manifest object with all fields populated except `proof.signature` (set to empty string or omit entirely).
2. Remove the `proof.signature` field from the object.
3. Serialize the remaining object using RFC 8785 canonicalization to produce a byte sequence.
4. Compute SHA-256 over the canonical byte sequence to produce a 32-byte digest.
5. Sign the digest using ECDSA with the P-256 curve (NIST secp256r1).
6. Encode the signature in base64url (RFC 4648 §5, no padding).
7. Set `proof.signature` to the encoded value.

**The exact bytes signed** are the 32-byte SHA-256 digest of the RFC 8785 canonical form of the manifest with `proof.signature` removed.

**Key Identifier (`proof.kid`):** The `kid` field contains the JWK Thumbprint of the signing key, computed per RFC 7638. The thumbprint is the base64url-encoded SHA-256 hash of the canonical JWK representation of the public key (containing only the required members `crv`, `kty`, `x`, `y` for EC keys, sorted lexicographically).

**Invariant:** If signing fails for any reason, the decision MUST be flipped to DENY with `reason_code = DENY_SIGNING_FAILURE`. The system MUST NEVER return an unsigned manifest with `decision.outcome = ALLOW`.

### Rationale

ECDSA P-256 is the same algorithm used in v2 and is widely supported by HSMs, cloud KMS services, and C2PA tooling. The JWK thumbprint as `kid` decouples key identification from any specific cloud provider (v2 used an AWS KMS ARN, which is not portable). Base64url encoding (no padding) aligns with JOSE standards (JWS, JWK) and avoids the `+` and `/` characters that cause issues in URLs and JSON.

---

## 7. Key Publication and Rotation

### Specification

**Publication:** The signing key's public component is published as a JSON Web Key Set (JWKS) at a stable HTTPS URL. The URL is recorded in `proof.jwks_url` in every manifest. The JWKS endpoint MUST:

- Serve `application/json` with appropriate cache headers.
- Contain the current active signing key.
- Contain all keys used to sign manifests that are within the audit retention window.
- Include the `kid` (JWK thumbprint), `kty`, `crv`, `x`, `y`, `use` ("sig"), and `alg` ("ES256") fields for each key.

**Retention:** The JWKS MUST retain all public keys used during the audit retention window. The default audit retention window is **7 years**. This means a key retired today must remain in the JWKS for 7 years after its last use.

**Rotation procedure:**

1. Generate a new P-256 key pair.
2. Add the new public key to the JWKS with its computed `kid` (RFC 7638 thumbprint).
3. Begin signing new manifests with the new key.
4. The previous key remains in the JWKS for verification of existing manifests.
5. After the retention window expires for all manifests signed with the old key, the old key MAY be removed from the JWKS.

**Compromise procedure:**

1. Immediately remove the compromised key from the JWKS.
2. Issue a revocation notice for all manifests signed with the compromised key (see Section 9).
3. Generate a new key and resume signing.
4. Publish an incident report documenting the compromise window (first and last manifest signed with the compromised key).

### Rationale

The 7-year retention window aligns with typical regulatory audit requirements (GDPR data retention, financial audit trails). Retaining keys in the JWKS ensures that any manifest issued during the retention window can be verified without contacting the issuer for historical key material. This supports offline verification and reduces the issuer's operational burden during audits.

---

## 8. Verification

### Specification

A verifier is any system that receives a Consent Manifest and determines whether it is valid. The verification procedure is:

**MUST (required steps):**

1. Parse the manifest as JSON. If parsing fails → `INVALID_SCHEMA`.
2. Validate that all required fields are present and correctly typed. If validation fails → `INVALID_SCHEMA`.
3. Validate that all enum fields contain permitted values. If validation fails → `INVALID_SCHEMA`.
4. Check `expires_at`. If the current time is after `expires_at` → `EXPIRED`.
5. Retrieve the JWKS from `proof.jwks_url`.
6. Locate the key in the JWKS whose `kid` matches `proof.kid`. If not found → `INVALID_SIGNATURE`.
7. Remove `proof.signature` from the manifest, canonicalize per RFC 8785, compute SHA-256.
8. Verify the ECDSA signature using the located public key. If verification fails → `INVALID_SIGNATURE`.
9. If all checks pass → `VERIFIED_NOT_REVOKED` (if revocation is not checked) or proceed to revocation check.

**MUST distinguish binding from advisory:**

- If `decision.binding` is `true`, the manifest represents a binding consent decision. Generators MUST respect it.
- If `decision.binding` is `false`, the manifest is advisory. Generators MAY use it for logging or policy but are not bound by it.

**MAY (optional steps):**

- Check revocation status at `revocation.verify_url` (see Section 9).
- Validate that `issued_at` is not in the future (clock skew tolerance of 5 minutes is RECOMMENDED).
- Validate that `expires_at` - `issued_at` does not exceed a maximum manifest lifetime (RECOMMENDED: 24 hours).
- Cache JWKS responses with appropriate TTL (RECOMMENDED: 1 hour, MUST NOT exceed 24 hours).

**Verification result** is one of the confidence levels defined in Section 9.

### Rationale

The verification procedure is designed to be implementable by any party without access to the issuer's infrastructure beyond the public JWKS endpoint. The binding/advisory distinction is critical: a verifier that treats all manifests as binding will incorrectly enforce advisory results from REGISTERED_SUBJECT mode, potentially blocking legitimate generation. A verifier that treats all manifests as advisory will fail to enforce binding denials.

---

## 9. Revocation

### Specification

Revocation follows an **OCSP-style** request/response model. The revocation endpoint is declared in `revocation.verify_url` (optional field). If the field is absent, the verifier cannot check revocation and MUST report `VERIFIED_REVOCATION_UNKNOWN`.

**Request:** `GET {verify_url}?manifest_id={manifest_id}`

**Response:** JSON object with field `status` containing one of the confidence levels below.

**Confidence Levels (verification result):**

| Level | Meaning |
|-------|---------|
| `VERIFIED_NOT_REVOKED` | Signature is valid, schema is valid, manifest is not expired, and revocation check confirms the manifest has not been revoked. |
| `VERIFIED_REVOCATION_UNKNOWN` | Signature is valid, schema is valid, manifest is not expired, but revocation status could not be determined (endpoint unavailable or not configured). |
| `VERIFIED_REVOKED` | Signature is valid, but the manifest has been explicitly revoked by the issuer. |
| `INVALID_SIGNATURE` | The cryptographic signature does not verify against the published key. |
| `INVALID_SCHEMA` | The manifest does not conform to the required structure or contains invalid enum values. |
| `EXPIRED` | The manifest's `expires_at` timestamp has passed. |

**Revocation reasons** (returned alongside `VERIFIED_REVOKED`):
- `KEY_COMPROMISE` — the signing key was compromised.
- `POLICY_CHANGE` — the subject's policy changed after issuance and the manifest no longer reflects current consent.
- `ISSUER_ERROR` — the manifest was issued in error.

### Rationale

An OCSP-style model allows real-time revocation checking without requiring verifiers to download and process large revocation lists. The confidence levels provide a complete taxonomy of verification outcomes, enabling verifiers to make graduated decisions (e.g., accept `VERIFIED_REVOCATION_UNKNOWN` for low-risk use cases but require `VERIFIED_NOT_REVOKED` for high-risk ones). v2 had no revocation model, meaning a compromised key or erroneously issued ALLOW could not be recalled.

---

## 10. Versioning

### Specification

The `schema_version` field uses **Semantic Versioning 2.0.0** (semver.org).

- **Major version** (e.g., 3.x.x → 4.x.x): Breaking changes. New required fields, removed fields, changed field semantics, new enum values that alter verification logic. Verifiers MUST reject manifests with an unrecognized major version.
- **Minor version** (e.g., 3.0.x → 3.1.x): Backward-compatible additions. New optional fields, new enum values that do not alter existing verification logic. Verifiers MUST accept manifests with a recognized major version and any minor version ≥ the minimum they support.
- **Patch version** (e.g., 3.0.0 → 3.0.1): Clarifications, typo fixes, test vector additions. No structural changes. Verifiers MUST accept any patch version.

**Compatibility guarantee:** A verifier implementing version 3.0.0 MUST be able to verify any manifest with `schema_version` matching `3.*.*`. Unknown fields in a minor-version-ahead manifest MUST be ignored during verification (but preserved in canonicalization).

### Rationale

Semantic versioning provides clear expectations for implementers about what changes require code updates. The compatibility guarantee ensures that the ecosystem does not fragment on minor version differences — a verifier does not need to update for every spec revision, only for major version bumps.

---

## 11. Security Considerations

### Threat Model

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Replay attack** | An attacker reuses a valid manifest from a previous request to authorize a new generation. | Manifests have short expiry (`expires_at`, RECOMMENDED 24h). Verifiers MUST check expiry. The `manifest_id` (UUIDv4) is unique per issuance; audit systems can detect duplicate presentation. |
| **Manifest substitution** | An attacker replaces a DENY manifest with an ALLOW manifest from a different request. | The manifest is cryptographically signed. Substitution requires forging a signature. Verifiers MUST verify the signature before trusting the decision. The `requester.id`, `requester.platform`, and `image.reference_hash` bind the manifest to a specific request context. |
| **Mode downgrade attack** | An attacker modifies `mode.active` from `CLOSED_CONSENT` to `REGISTERED_SUBJECT` to convert a binding DENY into an advisory. | `mode.active` is part of the signed payload. Any modification invalidates the signature. Verifiers that operate in CLOSED_CONSENT deployments SHOULD additionally verify that `mode.active` matches their expected configuration. |
| **Stale JWKS** | A verifier caches an old JWKS that does not contain a rotated key, causing valid manifests to fail verification. | JWKS cache TTL MUST NOT exceed 24 hours. Verifiers SHOULD retry JWKS fetch on `kid` miss before concluding `INVALID_SIGNATURE`. |
| **kid collision** | Two different keys produce the same `kid` (JWK thumbprint collision). | SHA-256 has 256-bit output; collision probability is negligible for operational key counts. Issuers MUST verify uniqueness of `kid` values in their JWKS before publishing a new key. |
| **Advisory-as-binding misinterpretation** | A verifier incorrectly treats an advisory manifest (`decision.binding = false`) as a binding consent decision, or vice versa. | The `decision.binding` field is explicit and part of the signed payload. Verifiers MUST check this field. Verification libraries SHOULD surface binding status prominently in their API. Manifests with `decision.binding = false` MUST have `decision.outcome = ADVISORY_NO_REGISTERED_SUBJECT`; any other outcome with `binding = false` is `INVALID_SCHEMA`. |

### Additional Considerations

- **Clock skew:** Verifiers SHOULD allow up to 5 minutes of clock skew when checking `issued_at` and `expires_at`.
- **JWKS transport security:** `proof.jwks_url` MUST use HTTPS. Verifiers MUST reject `http://` URLs.
- **Signature malleability:** ECDSA signatures have a known malleability issue (both `(r, s)` and `(r, n-s)` are valid). Implementations SHOULD normalize to low-S form per RFC 6979 to ensure consistent signature representation.

### Rationale

The threat model focuses on attacks specific to the consent manifest system rather than generic web security threats. Each mitigation is implementable by either the issuer or the verifier without requiring changes to the underlying cryptographic primitives. The mode downgrade attack is unique to v3's dual-mode architecture and has no analog in single-mode systems.

---

## 12. Test Vectors

*Reserved for Phase 6 (Conformance Suite). Test vectors will be generated after the signing implementation is complete and will cover:*

- Valid manifest in REGISTERED_SUBJECT mode (matched subject, ALLOW)
- Valid manifest in REGISTERED_SUBJECT mode (unmatched subject, advisory)
- Valid manifest in CLOSED_CONSENT mode (matched subject, ALLOW)
- Valid manifest in CLOSED_CONSENT mode (unmatched subject, DENY)
- Valid manifest with DENY_MATCH_UNAVAILABLE (both modes)
- Invalid manifest (tampered field, signature mismatch)
- Expired manifest
- Manifest with unknown enum value (INVALID_SCHEMA)
- Manifest with per-usage-type mode mapping

*Vectors will include the signing key pair, the canonical form, the digest, and the expected verification result.*
