# LikenessGuard v3 — v2 Conformance Gap Analysis

**Status:** Internal reference — maps every deviation between v2 KMS signing and v3 manifest spec
**Source (v2):** `likenessguard-aws/src/lambdas/shared/kms_signing.py`
**Target (v3):** `requirements.md` (same directory)

---

## Classification Key

| Classification | Meaning |
|----------------|---------|
| **v2 limitation / v3 adds** | v2 does not have this capability; v3 introduces it as a new requirement. |
| **v2 incorrect / v3 fixes** | v2 implements this incorrectly or in a non-portable way; v3 corrects it. |
| **genuine ambiguity** | The correct approach is not obvious; requires discussion before resolving. |

---

## Gap 1: Canonicalization Method

| | v2 | v3 |
|---|---|---|
| **Method** | `json.dumps(sort_keys=True, separators=(',', ':'))` | RFC 8785 (JSON Canonicalization Scheme) |
| **Scope** | Python-specific deterministic serialization | Language-agnostic IETF standard |

**Classification:** v2 incorrect / v3 fixes

**Detail:** v2's canonicalization is Python's `json.dumps` with sorted keys and compact separators. This does not define deterministic behavior for number serialization across languages (e.g., `0.9812` may serialize as `0.9812`, `9.812e-1`, or `0.98120` depending on the implementation). A JavaScript verifier using `JSON.stringify` will not produce byte-identical output for floating-point values. RFC 8785 specifies deterministic number serialization (IEEE 754 double → shortest decimal representation) and is implemented in all major languages.

**Migration impact:** All existing v2 manifests were signed with Python's serialization. They cannot be verified using RFC 8785 canonicalization. v2 manifests must be verified using the v2 method; only new v3 manifests use RFC 8785. The `schema_version` field distinguishes which canonicalization to apply.

---

## Gap 2: Key Identifier (`kid`)

| | v2 | v3 |
|---|---|---|
| **Field** | `proof.kms_key_id` (AWS KMS ARN) | `proof.kid` (JWK Thumbprint per RFC 7638) |
| **Example** | `arn:aws:kms:us-east-1:538784191640:key/d47b74ed-...` | `base64url(SHA-256(canonical-JWK))` |

**Classification:** v2 incorrect / v3 fixes

**Detail:** v2 uses the AWS KMS key ARN as the key identifier. This couples the manifest format to AWS infrastructure. A verifier must understand AWS ARN syntax to locate the key. A deployment using GCP Cloud KMS, Azure Key Vault, or a local HSM cannot produce a conforming manifest. The JWK thumbprint (RFC 7638) is provider-agnostic: it is computed from the public key's mathematical parameters (`crv`, `kty`, `x`, `y`) and is identical regardless of where the key is stored.

**Migration impact:** v3 verifiers look up keys by JWK thumbprint in the JWKS. The JWKS must include the thumbprint as the `kid` for each key. Existing v2 manifests reference keys by ARN; a compatibility shim could map ARN → thumbprint during a transition period.

---

## Gap 3: No Mode Field

| | v2 | v3 |
|---|---|---|
| **Field** | Not present | `mode.active`, `mode.per_usage_type` |

**Classification:** v2 limitation / v3 adds

**Detail:** v2 has no concept of operating modes. It implicitly operates in what v3 calls REGISTERED_SUBJECT mode (look up subject, evaluate policy if found). There is no field in the v2 manifest that records which mode was active, and no mechanism to express CLOSED_CONSENT semantics. v3 requires the mode to be declared in every manifest as part of the signed payload.

**Migration impact:** v2 manifests should be interpreted as REGISTERED_SUBJECT mode for audit purposes. No code change to v2 is needed; the gap is addressed by v3's new field.

---

## Gap 4: No `decision.binding` Field

| | v2 | v3 |
|---|---|---|
| **Field** | Not present | `decision.binding` (boolean) |

**Classification:** v2 limitation / v3 adds

**Detail:** v2 manifests do not distinguish between binding decisions and advisory findings. Every v2 manifest implicitly carries the same weight regardless of whether a subject was matched. v3 introduces `decision.binding` to explicitly signal whether the generator is obligated to respect the decision. This is critical for REGISTERED_SUBJECT mode where unmatched-subject results are advisory.

**Migration impact:** All v2 manifests should be treated as `binding = true` for backward compatibility (v2 only issued manifests for matched subjects with ALLOW/DENY outcomes).

---

## Gap 5: No `subject.match_status`

| | v2 | v3 |
|---|---|---|
| **Field** | Not present (implied by `subject.id` being populated) | `subject.match_status` (enum: MATCHED, NO_MATCH, MATCH_UNAVAILABLE) |

**Classification:** v2 limitation / v3 adds

**Detail:** v2 infers match status from whether `subject.id` is populated. This conflates "no match" with "match unavailable" — both result in a missing or empty `subject.id`. v3 introduces an explicit enum that distinguishes three states: a confirmed match, a confirmed non-match, and a system failure that prevented matching. This distinction is critical for operational alerting (MATCH_UNAVAILABLE indicates degraded service) and for mode-specific behavior (NO_MATCH triggers different outcomes in each mode).

**Migration impact:** v2 manifests with a populated `subject.id` map to `MATCHED`. v2 manifests without a subject (if any exist) are ambiguous between NO_MATCH and MATCH_UNAVAILABLE.

---

## Gap 6: No Embedding Metadata

| | v2 | v3 |
|---|---|---|
| **Section** | Not present | `embedding` object (model_id, model_version, dimensionality, normalization, benchmark, operating_point) |

**Classification:** v2 limitation / v3 adds

**Detail:** v2 does not record which embedding model produced the similarity score, what dimensionality the vectors have, or what threshold operating point was used. This makes it impossible to reproduce or audit the matching decision. If the embedding model is upgraded, historical manifests cannot be distinguished from current ones. v3 requires full embedding provenance so that audit replay can use the correct model version and threshold.

**Migration impact:** v2 manifests implicitly used Amazon Titan Embed Image v1 (512-dim) but this is not recorded in the manifest. Audit systems must infer the model from the `schema_version` and deployment records.

---

## Gap 7: `agent_confidence` (LLM-Derived, Non-Deterministic)

| | v2 | v3 |
|---|---|---|
| **Field** | `decision.agent_confidence` (float, LLM-derived) | Removed entirely |

**Classification:** v2 incorrect / v3 fixes

**Detail:** v2 includes an `agent_confidence` score derived from the LLM (Nova Pro) on the consent decision path. This value is non-deterministic: the same input can produce different confidence values across invocations. Including a non-reproducible value in a signed manifest creates a false impression of precision. It cannot be used for verification, replay, or conformance testing. v3 removes LLMs from the decision path entirely; there is no LLM-derived value to record.

**Migration impact:** v2 manifests containing `agent_confidence` remain valid v2 manifests. The field is simply absent in v3. No migration action needed beyond ignoring the field when processing v2 manifests under v3 logic.

---

## Gap 8: No Revocation Model

| | v2 | v3 |
|---|---|---|
| **Mechanism** | None | OCSP-style revocation with `revocation.verify_url` |

**Classification:** v2 limitation / v3 adds

**Detail:** v2 has no mechanism to revoke a manifest after issuance. If a signing key is compromised or a manifest is issued in error, there is no way to signal to verifiers that the manifest should no longer be trusted. The only protection is the `expires_at` field (24-hour default), creating a window of vulnerability. v3 introduces an optional OCSP-style revocation endpoint that verifiers can query for real-time status.

**Migration impact:** v2 manifests have no `revocation` field and cannot be revoked through the v3 mechanism. The only mitigation for compromised v2 manifests is key rotation and waiting for expiry.

---

## Gap 9: `soft_binding` and `compliance` Sections

| | v2 | v3 |
|---|---|---|
| **Fields** | `soft_binding` (manifest_hash, verify_url, embed_snippet), `compliance` (eu_ai_act, c2pa_version, audit_id) | Removed |

**Classification:** genuine ambiguity

**Detail:** v2 includes a `soft_binding` section that provides a manifest hash, verification URL, and an embeddable JSON snippet for generators to include in their output metadata. v2 also includes a `compliance` section with EU AI Act references and C2PA version. v3 removes both sections:

- `soft_binding.verify_url` is replaced by `revocation.verify_url` (different semantics: revocation vs. general verification).
- `soft_binding.manifest_hash` served as a content-addressable reference: downstream systems could refer to a manifest by its hash without needing to fetch and re-canonicalize it. v3 removes this field because the manifest's integrity is guaranteed by the signature. However, the content-addressable reference use case is legitimate — downstream systems that index manifests by content hash lose this capability. This should be confirmed with adopters during the RFC period. Note: downstream systems can compute the hash themselves from the RFC 8785 canonical form, so the capability is not lost — only the pre-computed convenience value is removed.
- `soft_binding.embed_snippet` is an implementation convenience, not a specification concern.
- `compliance.eu_ai_act` is a static string that does not change per manifest and belongs in documentation, not in the signed payload.
- `compliance.c2pa_version` is relevant to the C2PA embedding layer, not to the consent manifest itself.
- `compliance.audit_id` is replaced by `manifest_id` (the manifest ID is the audit identifier).

**Ambiguity:** The `embed_snippet` concept (a pre-formatted blob that generators can paste into their output) has practical value for adoption. Removing it shifts the burden to generators to construct their own C2PA assertion from the manifest. Whether this is acceptable depends on the SDK's role — if the SDK provides an embedding helper, the manifest does not need to carry the snippet. This needs discussion.

**Migration impact:** v2 consumers relying on `soft_binding.embed_snippet` for integration will need to use the v3 SDK's embedding helper instead.

---

## Gap 10: `rekognition_confidence` (Provider-Specific)

| | v2 | v3 |
|---|---|---|
| **Field** | `image.rekognition_confidence` (float, AWS Rekognition-specific) | Removed; replaced by `decision.similarity_score` + `embedding` metadata |

**Classification:** v2 incorrect / v3 fixes

**Detail:** v2 records a `rekognition_confidence` value in the `image` section. This is the confidence score returned by AWS Rekognition's face detection API — it measures whether a face was detected in the image, not whether the face matches a registered subject. The field name and placement in the manifest actively misled downstream consumers into treating it as a matching confidence score, when it is an entirely different metric (face detection vs. face matching). Beyond being provider-specific (only meaningful for AWS Rekognition), the exposure of a face-detection confidence score under a name that suggests it is a matching score was a correctness issue — not merely a portability issue. v3 separates these concerns: `decision.similarity_score` records the actual matching similarity, and `embedding` metadata records which model produced it. Face detection confidence is an internal implementation detail not exposed in the manifest.

**Migration impact:** v2 manifests containing `rekognition_confidence` remain valid v2 manifests. The value should not be confused with `decision.similarity_score` in v3 — they measure different things.

---

## Gap 11: Timestamp Field Naming

| | v2 | v3 |
|---|---|---|
| **Field** | `created_at` | `issued_at` |

**Classification:** naming refinement / v3 adds clarity

**Detail:** v2 uses `created_at` for the manifest issuance timestamp. v3 renames this to `issued_at` to more precisely describe the semantics: the manifest is *issued* (signed and delivered) at this time, not merely *created* (constructed in memory). The distinction matters because there may be a delay between manifest construction and signing (e.g., if KMS has latency). `issued_at` refers to the moment the signed manifest is complete and ready for delivery. This is not a correctness fix — v2's `created_at` was not wrong — but the rename adds precision that matters for audit replay where the exact signing moment is relevant.

**Migration impact:** Trivial field rename. v2 parsers use `created_at`; v3 parsers use `issued_at`. The `schema_version` field determines which name to expect.

---

## Gap 12: No Per-Usage-Type Mode Mapping

| | v2 | v3 |
|---|---|---|
| **Field** | Not present | `mode.per_usage_type` (object mapping usage_type → mode) |

**Classification:** v2 limitation / v3 adds

**Detail:** v2 has no concept of varying behavior by usage type at the mode level. All requests are processed identically regardless of usage type (the usage type affects only policy evaluation, not the operating mode). v3 allows deployments to declare different modes for different usage types, enabling mixed-mode operation within a single instance. For example, a platform can enforce CLOSED_CONSENT for face swaps while operating in REGISTERED_SUBJECT mode for general generation.

**Migration impact:** v2 deployments operate in a single implicit mode (REGISTERED_SUBJECT) for all usage types. No per-usage-type mapping exists to migrate.

---

## Gap 13: `decision.similarity_threshold`

| | v2 | v3 |
|---|---|---|
| **Field** | Not present (threshold is an internal configuration) | `decision.similarity_threshold` (nullable float) |

**Classification:** v2 limitation / v3 adds

**Detail:** v2 applies a similarity threshold internally but does not record it in the manifest. This means an auditor cannot determine whether the threshold was appropriate for the claimed operating point without querying the deployment's historical configuration. v3 records the threshold in the manifest so that audit replay can verify the threshold was correctly applied.

**Migration impact:** v2 manifests do not contain threshold information. Audit systems must infer the threshold from deployment configuration records.

---

## Summary Table

| # | Gap | Classification | Breaking? |
|---|-----|----------------|-----------|
| 1 | Canonicalization (sort_keys → RFC 8785) | v2 incorrect / v3 fixes | Yes — signatures incompatible |
| 2 | Key identifier (KMS ARN → JWK thumbprint) | v2 incorrect / v3 fixes | Yes — kid lookup changes |
| 3 | No mode field | v2 limitation / v3 adds | No — new field |
| 4 | No decision.binding | v2 limitation / v3 adds | No — new field |
| 5 | No subject.match_status | v2 limitation / v3 adds | No — new field |
| 6 | No embedding metadata | v2 limitation / v3 adds | No — new section |
| 7 | agent_confidence removed | v2 incorrect / v3 fixes | Yes — field removed |
| 8 | No revocation model | v2 limitation / v3 adds | No — new capability |
| 9 | soft_binding and compliance removed | genuine ambiguity | Yes — sections removed |
| 10 | rekognition_confidence removed | v2 incorrect / v3 fixes | Yes — field removed |
| 11 | created_at → issued_at | naming refinement / v3 adds clarity | Yes — field renamed |
| 12 | No per-usage-type mode mapping | v2 limitation / v3 adds | No — new field |
| 13 | No similarity_threshold in manifest | v2 limitation / v3 adds | No — new field |

---

## Compatibility Note

v2 and v3 manifests are **not interchangeable**. The `schema_version` field (`"2.0"` vs `"3.0.0"`) determines which specification applies. Verifiers MUST support both versions during the transition period. A v3 verifier encountering a v2 manifest MUST apply v2 canonicalization (sort_keys) and v2 key lookup (KMS ARN) for signature verification.
