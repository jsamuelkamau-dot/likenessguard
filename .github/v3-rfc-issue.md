# v3 Reference Implementation: Plan and RFC for Comment

**Type:** RFC (Request for Comments)
**Status:** Draft — open for contributor feedback before code work begins
**Branch:** `v3-reference-implementation`
**Related document:** `ROADMAP-V3.md`

---

## Summary

This RFC describes the planned transition from LikenessGuard v2 to v3. v3 reframes
the project as a reference implementation of an open consent-enforcement standard.
It introduces a formal component architecture, removes three incorrect v2 behaviors,
and adds first-class support for two operating modes.

No application code has been written yet. This issue is open for contributor
feedback before implementation begins. If you have concerns about the architecture,
the mode definitions, the removal decisions, or the conformance approach, this is
the place to raise them.

---

## Why This Change Is Needed

v2 shipped a working system and won the ANZ regional award in AWS AIdeas 2025.
Post-competition review identified three problems that matter for a project others
will build on:

**v2 cross-embedding similarity scores.** When the v2 embedding pipeline cannot
produce a reliable match, the supervisor substitutes a hardcoded score of 0.86 and
proceeds as if a match occurred. The v2 pipeline computes cosine similarity between
Titan query vectors and Rekognition stored vectors — two different embedding spaces.
The resulting number is not a valid similarity score. Adopters who rely on this path
are not enforcing consent.

**Non-deterministic decision path.** The v2 Consent Orchestrator invokes an LLM
(Nova Pro) on the path between receiving a request and returning ALLOW or DENY.
LLM outputs are not deterministic. A consent enforcement system that cannot be
formally tested cannot be trusted.

**No formal specification.** There is no document that defines what a correct
consent decision is, independent of the implementation. Without a spec, there is
no standard.

Full rationale is in `ROADMAP-V3.md`.

---

## Architectural Summary

v3 defines five components with specified interfaces:

| Component | Responsibility |
|-----------|---------------|
| Identity Resolution | Query image → SubjectMatch or MatchUnavailable |
| Consent Resolution | SubjectMatch + mode + context → ConsentDecision (deterministic) |
| Provenance Issuance | ConsentDecision → signed ConsentManifest |
| Audit and Replay | Record every decision; replay from recorded inputs |
| Conformance Suite | Verify structural correctness for both operating modes |

Interface contracts for each component are defined in the `contracts/` directory
before implementation begins.

---

## Two Operating Modes

v3 supports two modes. Both are first-class. Mode is configured at deployment time
and recorded in every manifest. Adopters choose one mode based on their use case
and trade-offs. The conformance suite verifies both.

### Registered-Subject Mode

**Who is protected:** Only subjects who have explicitly registered a consent policy.
Unregistered subjects receive no protection from this mode.

**How it works:** When a consent check arrives, the system looks up the subject in
the registry. If the subject is registered, their policy is evaluated and the result
(ALLOW or DENY) is returned with a signed manifest. If the subject is not registered,
the system returns an advisory manifest with `decision.binding=false` and reason
`UNREGISTERED_SUBJECT` — this is not an ALLOW and not a DENY. The calling platform
receives this signal and decides how to proceed. The system takes no protective
action for unregistered subjects.

If the matcher cannot produce a result due to a provider error or an unprocessable
image (no face detected, multiple faces detected), the system returns DENY with
reason `DENY_MATCH_UNAVAILABLE` and a signed manifest. This is the one case where
Registered-Subject Mode and Closed-Consent Mode converge on DENY regardless of
registration status.

**Trade-off:** Subjects must register to be protected. This gives registered subjects
full control over their consent policy. Unregistered subjects are outside the
system's scope entirely.

**Appropriate for:** Platforms where subjects actively opt in to registration and
the platform's obligation is to honor the preferences of those who have registered.
Examples: creator platforms, talent agencies, opt-in consent networks.

### Closed-Consent Mode

**Who is protected:** Everyone — registered and unregistered subjects alike.

**How it works:** The system operates on default-deny. When a consent check arrives:
- If the subject is registered with an ALLOW policy for the requested usage type,
  the result is ALLOW with a signed manifest.
- If the subject is registered with a DENY policy, the result is DENY with a signed
  manifest and the applicable policy reason (e.g., `DENY_FACE_SWAP`,
  `DENY_THIRD_PARTY_EDIT`, `DENY_PLATFORM_BLOCKED`).
- If the subject is not registered, the result is DENY with a signed manifest and
  reason `DENY_NO_CONSENT_RECORD`. No generation is permitted without a consent
  record on file. There are no advisory results.

The system distinguishes between "subject is not registered"
(`DENY_NO_CONSENT_RECORD`), "matcher could not produce a result due to provider
error or unprocessable image" (`DENY_MATCH_UNAVAILABLE`), and a confirmed registered
match. All three produce signed manifests with appropriate reason codes; adopters
can route on the distinction. A platform receiving `DENY_MATCH_UNAVAILABLE` knows
its consent system is degraded and should alert operations. A platform receiving
`DENY_NO_CONSENT_RECORD` knows the subject is genuinely unregistered and can route
them to a registration flow.

**Trade-off:** No generation is possible for any subject without an explicit consent
record. This provides the strongest protection but requires the platform to manage
consent records for all subjects it may encounter.

**Appropriate for:** Newsrooms, research institutions, platforms serving public
figures, or any deployment where generating content involving a person without
explicit consent on record is not acceptable — regardless of whether that person
has registered.

---

### Choosing a Mode

| | Registered-Subject Mode | Closed-Consent Mode |
|---|---|---|
| Unregistered subject | Advisory manifest, `decision.binding=false`, `UNREGISTERED_SUBJECT` | DENY, `DENY_NO_CONSENT_RECORD` |
| Registered subject, ALLOW policy | ALLOW | ALLOW |
| Registered subject, DENY policy | DENY | DENY |
| Provider error / unprocessable image | DENY, `DENY_MATCH_UNAVAILABLE` | DENY, `DENY_MATCH_UNAVAILABLE` |
| Manifest issued for every decision | Yes (`decision.binding=false` for advisory) | Yes (always binding) |
| Default stance | Advisory for unknowns | Deny for unknowns |
| Registration required for protection | Yes | No |

Neither mode is the default. Neither is a fallback for the other. Adopters select
one mode at deployment time based on their requirements and trade-offs.

---

## What Is Being Removed

| Removed | Reason |
|---------|--------|
| v2 cross-embedding similarity score fallback | Returns a score computed across incompatible embedding spaces; not a valid similarity score |
| LLM in the decision path | Non-deterministic; untestable |
| Federation unsigned-JWT fallback | Security boundary violation |
| Duplicate `src/src` tree | Structural debt |

---

## What Is Being Preserved

| Preserved | Reason |
|-----------|--------|
| KMS signing module's cryptographic core | Correct; v3 manifest signer builds on it |
| Audit log structure | Sound schema; v3 extends with mode and replay fields |
| Deterministic policy fast-path logic | Correct and deterministic; extracted into Consent Resolution |

---

## Timeline

| Phase | Work | Status |
|-------|------|--------|
| Phase 1 | Governance setup (this RFC, ROADMAP-V3.md, governance constraints, contracts directory) | In progress |
| Phase 2 | Identity Resolution — FaceEmbeddingProvider interface, InsightFace provider, benchmark | Not started |
| Phase 3 | Consent Resolution — evaluator spec and implementation | Not started |
| Phase 4 | Provenance Issuance — v3 manifest signer, JWKS rotation | Not started |
| Phase 5 | Audit and Replay | Not started |
| Phase 6 | Conformance Suite — dual-mode | Not started |
| Phase 7 | Outreach materials | Not started |

`main` continues to host v2 unchanged during the transition. The
`v3-reference-implementation` branch merges only after the conformance suite
passes end-to-end.

---

## Invitation for Feedback

Before any implementation code is written, we want contributor input on:

1. **Mode definitions** — Are Registered-Subject Mode and Closed-Consent Mode
   defined clearly enough that you could implement a conforming system from the
   description? What is ambiguous?

2. **Removal decisions** — Do you disagree with any of the four removals? If the
   v2 cross-embedding similarity score fallback or the LLM decision path serves a
   use case you rely on, say so here.

3. **Component boundaries** — Does the five-component split make sense? Are there
   responsibilities that belong in a different component, or that are missing
   entirely?

4. **Conformance approach** — The conformance suite is intended to be runnable by
   any adopter against their own deployment. What does it need to test that is not
   listed above?

5. **Migration path** — If you are running v2 in production, what do you need from
   the v3 migration guide?

Please comment on this issue. The RFC is open for **14 days** from the date it is
posted. Before Phase 2 implementation begins, the maintainer will publish a summary
of feedback received and how each substantive concern was addressed in either the
spec or the implementation plan.

---

*This issue was drafted on the `v3-reference-implementation` branch and is posted
by the maintainer. It has not been auto-generated.*
