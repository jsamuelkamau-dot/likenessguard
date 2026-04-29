# RFC-001: Supervisor Orchestration Pattern

**Status:** Accepted
**Author:** Samuel Jesse
**Created:** April 2026
**Last Updated:** April 2026

---

## Summary

LikenessGuard v2 uses a single Supervisor Lambda that orchestrates all agent invocations via synchronous Lambda calls, rather than using AWS Bedrock Agents or Step Functions.

## Motivation

The v1 architecture had a single monolithic Lambda handling everything. For v2, we needed to split responsibilities across specialized agents (anomaly detection, consent evaluation, policy reasoning) while keeping latency under 300ms P95.

Three orchestration approaches were evaluated:
1. **AWS Bedrock Agents** — managed agent orchestration
2. **AWS Step Functions** — state machine orchestration
3. **Supervisor Lambda** — direct synchronous Lambda invocations

## Design

### Chosen Approach: Supervisor Lambda

The Supervisor Lambda receives every consent check request and orchestrates a 9-step pipeline:

1. Input validation and sanitization
2. Rekognition face detection (~45ms)
3. Titan embedding generation (~75ms)
4. OpenSearch k-NN candidate retrieval (~25ms)
5. Anomaly Agent screening (~15ms fast-path)
6. Consent Orchestrator policy evaluation (~70ms)
7. KMS Proof-of-Face signing (~18ms, ALLOW only)
8. Audit log write (async, best-effort)
9. Response construction

Each agent is a separate Lambda function invoked synchronously via `boto3.client('lambda').invoke()`.

### Why Not Bedrock Agents?

- **Latency overhead:** Bedrock Agents add 200-500ms of orchestration overhead per invocation. With a 300ms P95 target, this leaves no room for actual work.
- **Limited control:** Bedrock Agents decide which tools to call based on LLM reasoning. For consent enforcement, the pipeline must be deterministic — we can't have the orchestrator skip the anomaly check because the LLM decided it wasn't needed.
- **Cost:** Each Bedrock Agent invocation incurs model inference costs for the orchestration layer itself, on top of the agent-specific model calls.

### Why Not Step Functions?

- **Cold start:** Step Functions Express Workflows add ~50ms overhead. Standard Workflows add 200ms+.
- **Complexity:** The pipeline is linear with one conditional branch (ALLOW → sign, DENY → skip signing). Step Functions are better suited for complex branching and retry logic.
- **Cost at scale:** Step Functions charge per state transition. At 100k checks/month with 9 steps each, that's 900k transitions.

### Trade-offs Accepted

- **Coupling:** The Supervisor knows about all agents. Adding a new agent requires modifying the Supervisor.
- **No built-in retry:** We handle retries manually (currently: no retry, fail-fast to DENY).
- **Single point of failure:** If the Supervisor Lambda has a bug, all consent checks are affected.

## Security Considerations

- The Supervisor's IAM role has `lambda:InvokeFunction` permission scoped to the specific agent Lambda ARNs.
- Each agent Lambda has its own minimal IAM role (e.g., Anomaly Agent can read DynamoDB Suspensions but not ConsentRegistry).
- The Supervisor never passes raw credentials between agents — each agent uses its own execution role.

## Backward Compatibility

This was a v1 → v2 breaking change. The v1 monolithic Lambda is preserved as the `/v1/consent/check` endpoint for backward compatibility.

## Decision

**Accepted** — April 2026

The Supervisor pattern delivers predictable sub-300ms latency with full control over the pipeline ordering. The coupling trade-off is acceptable at the current scale (1 maintainer, 5 agents).

