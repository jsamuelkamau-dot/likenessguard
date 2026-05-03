# LikenessGuard v3 — Roadmap and Reframing Rationale

## Why v3 Exists

v2 shipped a working system. It won the ANZ regional award in the AWS AIdeas 2025
competition. But winning exposed problems that matter for a project that wants to be
a reference implementation others build on.

**Four specific problems with v2:**

**1. v2 face matching does not perform face recognition.**
The v2 supervisor falls back to a cross-embedding cosine comparison between Titan
query vectors and Rekognition-stored vectors. These are different embedding spaces.
The cosine score between them is not a similarity score — it is a number. When that
number falls below the threshold, the supervisor substitutes a hardcoded score of
0.86 and proceeds as if a match occurred. This is not matching. It is a placeholder
that happens to pass the threshold check. Any adopter who deploys v2 and relies on
this path is not enforcing consent — they are running a system that returns ALLOW
for faces it has not matched.

**2. v2's decision path is non-deterministic.**
The Consent Orchestrator invokes Nova Pro (an LLM) on the critical path between
receiving a request and returning ALLOW or DENY. LLM outputs are not deterministic.
Two identical requests can produce different decisions. This makes the system
untestable in the formal sense: you cannot write a conformance test that asserts a
specific decision for a specific input, because the decision depends on a model
whose behavior is not specified. A consent enforcement system that cannot be
formally tested cannot be trusted.

**3. v2 has no formal specification.**
There is no document that defines what a correct consent decision is, independent
of the implementation. There is no interface contract between components. There is
no way for an adopter to verify that their deployment conforms to the standard.
Without a spec, there is no standard — there is only one implementation, and
"correct" means "whatever this code does."

**4. v2 supports only one operating philosophy.**
v2 assumes that subjects register in advance and that the system's job is to look
them up. This is one valid model. But many real deployments cannot require
pre-registration: a platform serving public figures, a newsroom, a research
institution. These adopters need a mode where the system enforces consent for
subjects who have explicitly granted it, and denies for everyone else. v2 has no
clean way to express this. The result is that adopters either misuse the system or
do not adopt it.

---

## What v3 Is

v3 reframes LikenessGuard as a **reference implementation of an open
consent-enforcement standard**. The standard defines five components with specified
interfaces. The reference implementation implements those interfaces. Adopters can
replace any component with their own implementation and verify conformance using the
conformance suite.

v3 is not a rewrite of v2. It preserves what v2 got right and removes what v2 got
wrong.

---

## Architecture: Five Components

### 1. Identity Resolution
Accepts a query image. Returns either a `SubjectMatch` (subject identifier,
similarity score, embedding provider, threshold used) or a `MatchUnavailable`
(reason, no placeholder score). The similarity score must be computed by the
configured embedding provider against the actual stored vectors. No other score is
valid.

### 2. Consent Resolution
Accepts a `SubjectMatch` or `MatchUnavailable`, the operating mode, and the
requester context. Returns a `ConsentDecision` (ALLOW or DENY, reason code,
mode used). The evaluator is deterministic: given the same inputs it must return
the same output. No LLM is on this path.

### 3. Provenance Issuance
Accepts a `ConsentDecision`. If the decision is ALLOW, produces a signed
`ConsentManifest` (v3 schema). If signing fails, the decision becomes DENY.
Never returns an unsigned ALLOW. The manifest records the operating mode.

### 4. Audit and Replay
Records every decision with its full input set. Provides a replay interface:
given a recorded audit entry, re-run the decision and assert the output matches.
If replay produces a different result, the system flags a determinism violation.

### 5. Conformance Suite
A test suite that any implementation can run against. Verifies structural
correctness for both operating modes. Verifies that invalid cross-embedding scores are
rejected. Verifies that the decision path is deterministic. Verifies that every
ALLOW decision has a valid manifest. Verifies audit replay.

---

## Two Operating Modes

Both modes are first-class. No mode is the default. Mode is configured at
deployment time and recorded in every manifest.

### Registered-Subject Mode

**Who is protected:** Only subjects who have explicitly registered a consent policy.
Unregistered subjects receive no protection from this mode.

When a consent check arrives, the system looks up the subject in the registry. If
the subject is registered, their policy is evaluated and the result (ALLOW or DENY)
is returned with a signed manifest. If the subject is not found in the registry,
the system returns `UNREGISTERED_SUBJECT` — this is not an ALLOW and not a DENY.
The calling platform receives this signal and decides how to proceed. The system
takes no protective action for unregistered subjects.

**Trade-off:** Subjects must register to be protected. Registered subjects have full
control over their consent policy. Unregistered subjects are outside the system's
scope entirely.

This mode is appropriate for platforms where subjects actively opt in to registration
and the platform's obligation is to honor the preferences of those who have
registered. Examples: creator platforms, talent agencies, opt-in consent networks.

### Closed-Consent Mode

**Who is protected:** Everyone — registered and unregistered subjects alike.

The system operates on default-deny. When a consent check arrives:
- If the subject is registered with an ALLOW policy for the requested usage type,
  the result is ALLOW with a signed manifest.
- If the subject is registered with a DENY policy, the result is DENY with a signed
  manifest.
- If the subject is not registered, the result is DENY with a signed manifest.

No generation is permitted without a consent record on file. There are no advisory
results and no exceptions for unregistered subjects.

**Trade-off:** No generation is possible for any subject without an explicit consent
record. This provides the strongest protection but requires the platform to manage
consent records for all subjects it may encounter.

This mode is appropriate for newsrooms, research institutions, platforms serving
public figures, or any deployment where generating content involving a person without
explicit consent on record is not acceptable — regardless of whether that person
has registered.

---

## Phased Work Plan

Each phase corresponds to one prompt in the implementation sequence. Each phase
produces a requirements document before any code is written.

| Phase | Component | Prompts |
|-------|-----------|---------|
| 1 | Governance setup (this document) | Prompt 1 |
| 2 | Identity Resolution | Prompts 2.1, 2.2, 2.3 |
| 3 | Consent Resolution | Prompts 3.1, 3.2 |
| 4 | Provenance Issuance | Prompts 4.1, 4.2 |
| 5 | Audit and Replay | Prompt 5.1 |
| 6 | Conformance Suite | Prompt 6.1 |
| 7 | Outreach materials | Prompt 7.2 |

All v3 work happens on the `v3-reference-implementation` branch. `main` continues
to host v2 unchanged until the conformance suite passes end-to-end and the branch
is reviewed for merge.

---

## What Is Being Removed from v2

These v2 behaviors are removed in v3. They are not deprecated — they are removed
because they are incorrect.

**v2 cross-embedding similarity score fallback.**
The code path in `supervisor/handler.py` that computes a cosine score between
Titan query vectors and Rekognition stored vectors, then substitutes `0.86` when
the raw score is below threshold. The Titan and Rekognition embedding spaces are
not compatible — the cosine score between them is not a valid similarity score.
This path is removed entirely. If matching is unavailable, the system returns `MatchUnavailable`.

**LLM in the decision path.**
The invocation of the Consent Orchestrator (Nova Pro) on the path between receiving
a consent check request and returning a decision. LLMs are permitted in
policy-authoring tools that run before decisions are made. They are not permitted
on the decision path.

**Federation layer's unsigned-JWT validator.**
The federation handler accepts peer requests with unsigned JWTs as a fallback. This
is a security boundary violation. In v3, all inter-peer requests must be signed.
The unsigned fallback is removed.

**Duplicate `src/src` tree.**
The repository contains a nested `likenessguard-aws/src/src/` directory that
duplicates parts of the lambda source tree. This is removed.

---

## What Is Being Preserved from v2

These v2 components are correct and are carried forward into v3.

**KMS signing module's cryptographic core.**
`likenessguard-aws/src/lambdas/shared/kms_signing.py` — the manifest
canonicalisation, SHA-256 hashing, KMS ECDSA P-256 signing, and verification
logic is correct. The v3 manifest signer builds on this.

**Audit log structure.**
The DynamoDB audit log schema (QueryID, Timestamp, LikenessID, RequesterID,
Decision, ReasonCode, SimilarityScore, PolicyVersion, ReferenceImageHash,
ManifestHash, EntryHash) is sound. v3 extends it with mode and replay fields
but does not replace it.

**Deterministic policy fast-path logic.**
The policy evaluation logic in `consent_orchestrator/handler.py` that evaluates
boolean policy fields (allow_commercial, allow_editorial, etc.) without invoking
an LLM is correct and deterministic. v3 extracts this into the standalone Consent
Resolution component and removes the LLM invocation that surrounds it.

---

## Governance

All v3 work is governed by six steering constraints in `.kiro/steering/`:

- `no-fabricated-scores.md` — no invalid cross-embedding similarity scores
- `no-llm-in-decision-path.md` — no LLM on the consent check path
- `every-decision-replayable.md` — every decision reproducible from recorded inputs
- `both-modes-equal.md` — Registered-Subject Mode and Closed-Consent Mode are both first-class
- `spec-before-code.md` — requirements document must exist before implementation
- `honest-claims.md` — documentation may not claim what the conformance suite does not verify

Cross-component interface contracts are defined in `.kiro/specs/contracts/`.
