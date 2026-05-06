# LikenessGuard v3 — Manifest Format Design Decisions

**Status:** Internal design rationale — documents contested decisions for reviewer discussion
**Companion to:** `requirements.md` (same directory)

---

## Purpose

This document identifies decisions in the v3 manifest format specification that are likely to be contested by reviewers. For each decision, it states the choice made, the alternatives considered, and the reasoning behind the selected approach. Reviewers should focus feedback on these points — they represent genuine trade-offs where reasonable engineers may disagree.

---

## Decision 1: Embedding Mode in the Manifest (Rather Than Publishing It Separately)

### The Decision

The operating mode (`mode.active` and `mode.per_usage_type`) is a field inside the signed manifest payload. Every manifest carries its own mode declaration.

### Alternatives Considered

**A. Publish mode as issuer metadata at a well-known URL.**
The issuer publishes its current mode at `/.well-known/likenessguard-mode.json`. Manifests do not contain mode information. Verifiers query the issuer's metadata to determine how to interpret the decision.

**B. Mode is implicit from the decision outcome.**
If `outcome` is `ADVISORY_NO_REGISTERED_SUBJECT`, the verifier infers REGISTERED_SUBJECT mode. If `outcome` is `DENY` with `reason_code = DENY_NO_CONSENT_RECORD`, the verifier infers CLOSED_CONSENT mode. No explicit mode field exists.

**C. Mode is a deployment-time configuration recorded in the JWKS metadata.**
The JWKS includes a custom claim indicating the mode. All manifests signed by that key are assumed to operate in that mode.

### Why the Chosen Approach Was Selected

Option A fails for offline verification and historical audits. If the issuer changes mode after issuance, a verifier querying the current metadata will misinterpret historical manifests. This is not hypothetical — platforms may transition from REGISTERED_SUBJECT to CLOSED_CONSENT as their user base grows.

Option B is fragile. It works for the current enum values but breaks if future versions add new outcomes. It also prevents a verifier from distinguishing "this is REGISTERED_SUBJECT mode and the subject was not found" from "this is some future mode with a new advisory outcome." Implicit semantics create coupling between the enum and the mode logic.

Option C ties mode to key identity, which means a mode change requires key rotation. This is operationally expensive and conflates two independent concerns (cryptographic key lifecycle and policy configuration).

Embedding mode in the manifest makes each manifest self-describing. A verifier needs only the manifest and the JWKS to fully interpret the decision. The cost is ~50 bytes per manifest, which is negligible relative to the signature and embedding metadata.

---

## Decision 2: RFC 8785 (JCS) for Canonicalization

### The Decision

The specification mandates RFC 8785 (JSON Canonicalization Scheme) as the canonicalization method before signing.

### Alternatives Considered

**A. JWS with detached payload (RFC 7515).**
Serialize the manifest as a JWS Compact Serialization with a detached payload. The canonical form is the base64url-encoded payload segment. Signing and verification use standard JOSE libraries.

**B. COSE (RFC 9052) with CBOR serialization.**
Serialize the manifest as CBOR, sign using COSE_Sign1. This is the approach used by C2PA for content credentials.

**C. Preserve v2's approach: `json.dumps(sort_keys=True, separators=(',', ':'))`.**
Continue using Python's deterministic JSON serialization with sorted keys and compact separators.

### Why the Chosen Approach Was Selected

Option A (JWS) is well-supported but introduces a format transformation: the manifest must be base64url-encoded to become the JWS payload, then decoded after verification. This means the "manifest" that humans read and the "manifest" that is signed are different representations. Debugging signature failures requires understanding the JWS encoding layer. Additionally, JWS Compact Serialization does not support unprotected headers, limiting future extensibility.

Option B (COSE/CBOR) aligns with C2PA's signing approach but introduces a binary format. The manifest is no longer human-readable JSON. Debugging requires CBOR decoding tools. The ecosystem of CBOR libraries is smaller than JSON, raising the barrier for adopters implementing verifiers. Since the manifest is designed to be embedded as a C2PA assertion (which is itself JSON within the C2PA manifest structure), CBOR would require a format translation at the embedding boundary.

Option C (v2's approach) is Python-specific. `json.dumps` with `sort_keys=True` does not define behavior for number serialization (`1.0` vs `1` vs `1.00`), Unicode escaping, or key ordering of nested objects in other languages. A JavaScript implementation using `JSON.stringify` with a custom replacer will not produce byte-identical output for edge cases involving floating-point numbers. This makes cross-language verification unreliable.

RFC 8785 is an IETF standard specifically designed for this problem. It has reference implementations in 7+ languages, handles all JSON edge cases deterministically, and produces human-readable output. The manifest remains plain JSON — no format transformation, no binary encoding. The only cost is that implementations must use an RFC 8785 library rather than naive `JSON.stringify` or `json.dumps`, but such libraries exist and are small.

---

## Decision 3: Issuing a Manifest for Advisory Results

### The Decision

In REGISTERED_SUBJECT mode, when no subject matches, the system issues a signed manifest with `decision.outcome = ADVISORY_NO_REGISTERED_SUBJECT` and `decision.binding = false`. An advisory result produces a manifest.

### Alternatives Considered

**A. Return no manifest for unmatched subjects.**
The API returns a simple JSON response indicating "no match found" without a signed manifest. Only binding decisions (ALLOW or DENY) produce manifests.

**B. Return an unsigned advisory document.**
The API returns a structured document with the same fields as a manifest but without the `proof` section. This signals "advisory" by the absence of a signature.

### Why the Chosen Approach Was Selected

Option A (no manifest) creates an asymmetry that complicates audit. If the system only produces manifests for matches, then the absence of a manifest is ambiguous: does it mean "no match in REGISTERED_SUBJECT mode" or "the system was not called" or "the system failed silently"? Audit systems cannot distinguish these cases. Issuing a manifest for every decision — including advisory ones — creates a complete audit trail.

Option B (unsigned advisory) uses the absence of a signature as a semantic signal, which is dangerous. A manifest that was supposed to be signed but failed signing looks identical to an intentionally unsigned advisory. The `decision.binding` field makes the distinction explicit and machine-readable regardless of signature presence. Furthermore, signing the advisory provides tamper evidence: a verifier can confirm that the advisory was genuinely issued by the system and not fabricated by a generator trying to justify proceeding without consent.

The chosen approach (signed advisory manifest) provides: complete audit trail, tamper evidence for all decisions, explicit binding semantics via a dedicated field, and uniform processing logic in verifiers (every response is a manifest; check `decision.binding` to determine enforcement obligation).

The cost is that the system performs a signing operation for advisory results that generators are not bound by. This is acceptable because signing is fast (~10ms with KMS) and the audit/tamper-evidence benefits outweigh the marginal compute cost.

---

## Decision 4: 7-Year JWKS Retention Window

### The Decision

The JWKS must retain all public keys used during the audit retention window, defaulted to 7 years.

### Alternatives Considered

**A. Short retention (90 days) with an archive endpoint.**
The JWKS contains only keys used in the last 90 days. Historical keys are available at a separate archive endpoint that verifiers can query for expired manifests.

**B. No retention requirement — keys removed after rotation.**
Once a key is rotated out, it is removed from the JWKS. Manifests signed with old keys become unverifiable. Verifiers must verify at issuance time or cache the result.

**C. Indefinite retention — keys are never removed.**
The JWKS grows monotonically. All keys ever used remain available.

### Why the Chosen Approach Was Selected

Option A (short retention + archive) splits key material across two endpoints, complicating verifier implementations. A verifier must know to check the archive when the primary JWKS does not contain the `kid`. This is an extra code path that many implementations will get wrong, leading to false `INVALID_SIGNATURE` results for valid historical manifests.

Option B (no retention) makes historical verification impossible. This is unacceptable for a consent enforcement system where regulatory audits may examine decisions made years ago. If a regulator asks "was consent obtained for this generation?" and the manifest cannot be verified because the key was removed, the system has failed its core purpose.

Option C (indefinite retention) is operationally simple but the JWKS grows without bound. After decades of operation with annual rotation, the JWKS could contain 30+ keys. This is not a practical problem (JWKS with 30 keys is ~15KB) but "indefinite" is a stronger commitment than necessary.

7 years aligns with GDPR's general data retention guidance, financial audit requirements (SOX), and the EU AI Act's record-keeping obligations. It provides a concrete, defensible number that satisfies regulatory requirements without committing to indefinite retention. After 7 years, manifests are beyond the audit window and key removal is safe.

---

## Decision 5: Per-Usage-Type Mode Mapping

### The Decision

The `mode.per_usage_type` field allows a deployment to declare different operating modes for different usage types within a single instance. For example, a platform might operate in CLOSED_CONSENT mode for `FACE_SWAP` requests but REGISTERED_SUBJECT mode for `EDITORIAL` requests.

### Alternatives Considered

**A. Single mode per deployment — no per-usage-type mapping.**
A deployment chooses one mode and applies it uniformly to all usage types. Platforms needing different modes for different usage types must run multiple deployments.

**B. Per-usage-type mode as a separate configuration document, not in the manifest.**
The mapping exists in the deployment configuration but is not recorded in the manifest. The manifest only records `mode.active` (the mode that was applied for this specific decision).

### Why the Chosen Approach Was Selected

Option A (single mode) is simpler but does not reflect real-world requirements. A newsroom platform may need CLOSED_CONSENT for face swaps (never swap a face without explicit consent) but REGISTERED_SUBJECT for editorial generation (only enforce consent for subjects who have registered preferences). Requiring separate deployments for this creates operational complexity, duplicated infrastructure, and split audit trails.

Option B (configuration-only, not in manifest) is partially correct — `mode.active` does record the effective mode for each decision. However, without the full mapping in the manifest, an auditor cannot determine whether the system was correctly configured at the time of issuance. If an auditor sees a manifest with `mode.active = REGISTERED_SUBJECT` and `usage_type = FACE_SWAP`, they cannot determine whether this was intentional policy or a misconfiguration without querying the issuer's historical configuration. Including the mapping in the manifest makes the configuration auditable from the manifest alone.

The chosen approach records both the effective mode (`mode.active`) and the full mapping (`mode.per_usage_type`) in the signed payload. This makes each manifest fully self-describing for audit purposes. The cost is additional payload size (~100-200 bytes depending on the number of usage types configured), which is acceptable.

---

## Decision 6: Removing `agent_confidence` (LLM-Derived Score)

### The Decision

v3 removes the `agent_confidence` field that v2 included in the decision object. No LLM-derived confidence score appears in the v3 manifest.

### Alternatives Considered

**A. Preserve `agent_confidence` as an optional field.**
Keep the field for deployments that use LLM-based policy reasoning, but make it optional so deterministic deployments can omit it.

**B. Replace with a deterministic `policy_confidence` derived from rule evaluation.**
Instead of an LLM confidence score, include a score derived from the deterministic policy evaluation (e.g., how many policy rules matched, strength of match).

### Why the Chosen Approach Was Selected

Option A preserves a field whose value is non-deterministic by definition. If two identical requests can produce different `agent_confidence` values, the field cannot be used for verification, replay, or conformance testing. Including it in the manifest (even optionally) signals that it is meaningful, which encourages reliance on a non-reproducible value. The v3 governance constraint explicitly prohibits LLMs on the decision path; preserving a field designed for LLM output contradicts this constraint.

Option B attempts to salvage the concept but introduces a new metric that has no established meaning. What does "policy confidence" mean for a deterministic rule evaluation? If the rules match, confidence is 1.0. If they don't, confidence is 0.0. A binary signal does not benefit from a continuous score.

The chosen approach removes the field entirely. The `decision.similarity_score` field records the cosine similarity from face matching, which is deterministic and reproducible given the same embedding model and vectors. This is a genuine measure with calibrated meaning (derived from the embedding model's operating point).

---

## Decision 7: OCSP-Style Revocation Over CRL

### The Decision

Revocation uses an OCSP-style per-manifest status check rather than a Certificate Revocation List (CRL) approach.

### Alternatives Considered

**A. CRL (Certificate Revocation List) approach.**
The issuer publishes a list of revoked manifest IDs at a well-known URL. Verifiers download the list periodically and check membership.

**B. No revocation — manifests are immutable once issued.**
Once signed, a manifest cannot be revoked. If a key is compromised, the only remedy is to rotate the key and let existing manifests expire naturally.

**C. Short-lived manifests (minutes) with refresh.**
Manifests expire in 5-10 minutes. Generators must refresh before each use. This eliminates the need for revocation because manifests expire before revocation would be needed.

### Why the Chosen Approach Was Selected

Option A (CRL) requires verifiers to download and process a potentially large list. For a system that may issue millions of manifests per day, the CRL could grow to gigabytes. Delta CRLs mitigate this but add complexity. CRLs also have a freshness problem: a verifier using a cached CRL may not see a recent revocation.

Option B (no revocation) is unacceptable for a consent enforcement system. If a signing key is compromised, an attacker can forge ALLOW manifests. Without revocation, these forged manifests remain "valid" until they expire. With a 24-hour expiry, this creates a 24-hour window of vulnerability. For key compromise scenarios, this is too long.

Option C (short-lived manifests) eliminates the revocation problem but creates a performance problem. Every generation request requires a fresh manifest, and manifests cannot be cached or pre-issued. This prevents batch workflows and increases latency for every generation.

OCSP-style checking provides real-time revocation status for individual manifests without requiring bulk list downloads. The verifier queries a single manifest ID and receives a status. The endpoint can be implemented as a simple key-value lookup (manifest_id → revoked/not_revoked). The `revocation` field is optional, allowing deployments that accept the expiry-based approach to omit it.
