# RFC-001: Supervisor Orchestration Pattern

- **Status**: Accepted
- **Author(s)**: Samuel Jesse
- **Created**: 2026-01-15
- **Last Updated**: 2026-01-20

---

## Summary

LikenessGuard uses a single Supervisor Lambda that orchestrates all agents (Anomaly Agent, Consent Orchestrator, Policy Reasoner) via synchronous Lambda invocations, rather than using Bedrock Agents or AWS Step Functions. This RFC documents the rationale and trade-offs.

---

## Motivation

LikenessGuard's consent check pipeline must complete in under 300ms P95 end-to-end. The pipeline has 9 steps: input validation, Titan embedding, OpenSearch k-NN search, Anomaly Agent screening, Consent Orchestrator evaluation, KMS signing, audit log write, metrics emission, and response assembly.

We evaluated three orchestration approaches:

1. **Bedrock Agents** — AWS-managed agent orchestration
2. **Step Functions Express** — state machine orchestration
3. **Supervisor Lambda** — single Lambda that calls other Lambdas directly

The Supervisor pattern was chosen for latency, determinism, and cost reasons.

---

## Design

### Overview

```
API Gateway → Supervisor Lambda → [Anomaly Agent, Consent Orchestrator, Policy Reasoner]
                    ↓
              KMS Sign → Audit Log → Response
```

The Supervisor Lambda is the sole entry point for consent checks. It:

1. Validates the incoming request
2. Generates a Titan embedding for the reference image
3. Queries OpenSearch for matching subjects
4. Invokes the Anomaly Agent (synchronous Lambda invoke)
5. Invokes the Consent Orchestrator (synchronous Lambda invoke)
6. Signs the decision with KMS if ALLOW
7. Writes the audit log entry
8. Returns the response

Each agent Lambda is a standalone function with its own handler, but they are invoked synchronously by the Supervisor — not via Bedrock Agent routing or Step Functions state transitions.

### Detailed Design

**Synchronous invocation**: The Supervisor uses `boto3.client('lambda').invoke()` with `InvocationType='RequestResponse'`. This adds ~5-10ms per invocation (Lambda cold start is mitigated by provisioned concurrency on the Supervisor).

**Error handling**: If any agent invocation fails, the Supervisor catches the exception and returns DENY. This enforces the default-deny invariant without relying on Step Functions error handling or Bedrock Agent fallback logic.

**Conditional invocation**: The Anomaly Agent fast-path (regex + DynamoDB suspension check) runs in <20ms. If the fast-path clears the request, the LLM path is skipped entirely. This conditional logic is trivial in a Lambda but would require Choice states in Step Functions or tool-use routing in Bedrock Agents.

### Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Bedrock Agents** | Managed orchestration; built-in tool routing; automatic retries | 200-500ms overhead per agent invocation; non-deterministic routing (LLM decides which tool to call — could skip Anomaly Agent); higher cost per invocation; limited observability | Latency exceeds 300ms target; non-deterministic routing is unacceptable for a security-critical pipeline where every step must execute |
| **Step Functions Express** | Visual workflow; built-in retry/catch; parallel execution | 50-100ms overhead per state transition; 9 states = 450-900ms overhead alone; JSON path manipulation is awkward for complex payloads; cold start on Express workflows | State transition overhead alone exceeds our latency budget; no benefit over direct Lambda invocation for a linear pipeline |
| **EventBridge + async** | Decoupled; scalable; event-driven | Cannot return synchronous response; consent check must be request-response; would require polling or WebSocket for result | Fundamentally incompatible with synchronous consent check requirement |

---

## Security Considerations

The Supervisor pattern has a direct impact on security invariant enforcement:

- **Default-deny**: The Supervisor's try/catch ensures DENY on any failure. With Bedrock Agents, the LLM could potentially route around a failing agent. With Step Functions, error handling depends on correct Catch configuration.
- **Deterministic execution**: Every consent check executes the same steps in the same order. Bedrock Agents use LLM-based routing, which means the Anomaly Agent could theoretically be skipped if the LLM decides it's unnecessary — this is unacceptable.
- **KMS signing**: The Supervisor calls KMS directly after the ALLOW decision. In a Bedrock Agent setup, KMS signing would need to be a "tool" that the LLM decides to call, introducing risk of unsigned ALLOWs.

---

## Backward Compatibility

This is the initial architecture — no backward compatibility concerns.

---

## Implementation Plan

| Phase | Work | Estimated Effort |
|-------|------|-----------------|
| 1 | Supervisor Lambda with direct Anomaly Agent invocation | 2 days |
| 2 | Add Consent Orchestrator and Policy Reasoner invocations | 1 day |
| 3 | Add KMS signing, audit log, metrics | 1 day |
| 4 | Performance testing and tuning | 1 day |

---

## Trade-offs Accepted

| Trade-off | Impact | Mitigation |
|-----------|--------|------------|
| **Tight coupling** — Supervisor knows about all agents | Adding a new agent requires modifying the Supervisor | Agent interface is standardized (event in, decision out); adding an agent is a small code change |
| **No built-in retry** — Lambda invoke failures are not automatically retried | A transient failure in one agent fails the entire request | Default-deny makes this safe; the caller can retry the consent check; CloudWatch alarms on error rates |
| **Single point of failure** — Supervisor Lambda failure blocks all consent checks | Service unavailability | Lambda's built-in availability (multi-AZ); provisioned concurrency; edge nodes provide offline fallback with default-deny |
| **No visual workflow** — harder to visualize the pipeline | Debugging requires reading code, not a state machine diagram | Detailed logging at each step; reasoning trace included in response; CloudWatch dashboard |

---

## Decision

**Status**: Accepted

**Decision date**: 2026-01-20

**Decision summary**: The Supervisor Lambda pattern is adopted as the orchestration approach for LikenessGuard v2. The 200-500ms overhead of Bedrock Agents and the state transition overhead of Step Functions are incompatible with the 300ms P95 latency target. The deterministic execution guarantee is critical for a security-sensitive pipeline where every step must execute.

**Reviewers**: Samuel Jesse
