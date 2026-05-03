# LikenessGuard Roadmap

This document outlines the project's direction, priorities, and non-goals. It's updated quarterly and reflects where we're heading — not a promise of delivery dates.

If you want to contribute to any of these areas, open an issue or start a [Discussion](https://github.com/jsamuelkamau-dot/likenessguard/discussions) to coordinate.

---

## Current Focus: v2.1 (Q3 2026)

**Theme: Contributor experience and production hardening**

| Area | Work | Status | Difficulty |
|------|------|--------|------------|
| Developer experience | Local mock mode (`make dev-mock`) — run full stack without AWS | 🟢 Done | — |
| Developer experience | Publish Python SDK to PyPI (`likenessguard`) | 🔲 Planned | Medium |
| Developer experience | Publish Node.js SDK to npm (`@likenessguard/sdk`) | 🔲 Planned | Medium |
| Documentation | Threat model document | 🟢 Done | — |
| Documentation | Architecture decision records (RFCs) | 🟢 Done | — |
| Testing | Expand property-based tests to 30+ properties | 🔲 Planned | Medium |
| Testing | Integration test suite with mocked AWS services | 🔲 Planned | Medium |
| Edge | Greengrass v2 component published to AWS IoT registry | 🔲 Planned | High |
| Security | Dependency scanning in CI (Dependabot + Snyk) | 🟢 Done | — |
| Security | SBOM generation for each release | 🔲 Planned | Low |

## In Progress: v3.0 — Reference Implementation

**Branch:** `v3-reference-implementation`
**Theme: Formal specification and dual-mode consent enforcement**

v3 reframes LikenessGuard as a reference implementation of an open consent-enforcement
standard. See [ROADMAP-V3.md](ROADMAP-V3.md) for the full plan and
[`.github/v3-rfc-issue.md`](.github/v3-rfc-issue.md) for the RFC open for contributor
feedback.

The core changes in v3:

- **Formal component specification** — five components with defined interfaces and
  interface contracts. Any component can be replaced by a conforming implementation.
- **Two first-class operating modes** — Registered-Subject Mode (protects registered
  subjects; advisory result for unregistered) and Closed-Consent Mode (default-deny
  for everyone; no generation without a consent record on file).
- **Deterministic decision path** — the consent evaluator is deterministic given its
  inputs. No LLM on the decision path.
- **Verified identity matching** — similarity scores must be computed by the configured
  embedding provider in a consistent embedding space. The v2 cross-embedding score
  fallback is removed.
- **Dual-mode conformance suite** — a test suite any adopter can run against their
  own deployment to verify conformance with the standard.
- **Audit and replay** — every decision is reproducible from its recorded inputs.

v2 remains on `main` and continues to receive bug fixes and security patches during
the v3 transition. v3 merges to `main` after the conformance suite passes end-to-end.

## Next: v2.2 (Q4 2026)

**Theme: Federation and multi-platform adoption**

| Area | Work | Status | Difficulty |
|------|------|--------|------------|
| Federation | Reference implementation of a federated peer | 🔲 Planned | High |
| Federation | Federation protocol specification (RFC) | 🔲 Planned | Medium |
| SDK | Rust SDK for native/embedded platforms | 🔲 Planned | High |
| SDK | Go SDK for server-side platforms | 🔲 Planned | Medium |
| Dashboard | Public read-only demo instance | 🔲 Planned | Medium |
| Compliance | SOC 2 Type II mapping document | 🔲 Planned | Medium |
| Compliance | GDPR data processing agreement template | 🔲 Planned | Low |
| Performance | Sub-200ms P95 latency target | 🔲 Planned | High |

---

## Non-Goals

These are things we've explicitly decided not to build. If you're considering a PR in one of these areas, please open a Discussion first.

| Non-goal | Reason |
|----------|--------|
| Client-side-only enforcement | Consent enforcement must happen server-side at the point of generation. Client-side checks are trivially bypassable. |
| Browser extension | Same reason — enforcement at the browser level doesn't prevent generation. |
| Post-generation detection | LikenessGuard is a pre-generation system. Post-generation detection (watermarking, forensics) is a different problem with different tools. |
| Storing raw biometric data | We store 512-dim vectors only. Raw photos are deleted after processing. This is a core privacy invariant. |
| Supporting non-facial biometrics | Voice, gait, etc. are out of scope for now. The architecture could support them, but the consent model needs more research. |
| Building our own ML models | We use AWS Bedrock models (Titan, Rekognition, Claude, Nova). Training custom models is not in scope. |
| Replacing platform-level content moderation | LikenessGuard handles consent, not content policy. A platform might allow certain content types that a subject has consented to. |

---

## How to Propose New Work

1. **Small improvements** — open an issue with the `enhancement` label
2. **Larger features** — write an RFC in `docs/rfcs/` following the template, then open a PR for discussion
3. **New integration** — start a Discussion thread to coordinate with maintainers before building

---

## Release Cadence

- **Patch releases** (2.1.x): as needed for bug fixes and security patches
- **Minor releases** (2.x.0): quarterly, aligned with the roadmap above
- **Major releases** (x.0.0): when breaking changes are necessary, with at least 3 months notice
