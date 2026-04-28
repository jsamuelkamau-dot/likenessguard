import React, { useEffect, useState } from "react";

interface AgentStep {
  id: string; name: string; model: string; icon: string;
  status: "waiting" | "running" | "done" | "blocked";
  latencyMs?: number; confidence?: number; result?: string; detail?: string;
}

interface Props {
  trace: Record<string, unknown> | null;
  decision?: string;
  isLoading?: boolean;
}

export const MultiAgentFlow: React.FC<Props> = ({ trace, decision, isLoading }) => {
  const [visibleSteps, setVisibleSteps] = useState(0);

  const steps = trace ? buildSteps(trace, decision) : [];

  useEffect(() => {
    if (isLoading) { setVisibleSteps(0); return; }
    if (!steps.length) return;
    setVisibleSteps(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleSteps(i);
      if (i >= steps.length) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, [trace, isLoading]);

  if (!trace && !isLoading) return null;

  const decisionColor = decision === "ALLOW" ? "#4FA3FF" : decision === "DENY" ? "#FF7A45" : "#4B556A";

  return (
    <div style={{ background: "#0f1729", borderRadius: 8, padding: 16, border: "1px solid #2a3550" }}>
      <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        Multi-Agent Reasoning Flow
        {isLoading && <span style={{ color: "#F6C90E", fontSize: 11, animation: "pulse 1s infinite" }}>Processing...</span>}
        {decision && !isLoading && (
          <span style={{ marginLeft: "auto", background: `${decisionColor}22`, color: decisionColor, fontSize: 12, padding: "2px 10px", borderRadius: 4, fontWeight: 800 }}>
            Final: {decision}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {(isLoading ? LOADING_STEPS : steps).map((step, idx) => {
          const visible = isLoading || idx < visibleSteps;
          const statusColor = step.status === "done" ? "#4FA3FF" : step.status === "blocked" ? "#FF7A45" : step.status === "running" ? "#F6C90E" : "#4B556A";
          return (
            <div key={step.id} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s", display: "flex", gap: 0 }}>
              {/* Connector line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${statusColor}22`, border: `2px solid ${statusColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {step.icon}
                </div>
                {idx < (isLoading ? LOADING_STEPS.length : steps.length) - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 16, background: visible ? statusColor : "#2a3550", transition: "background 0.4s", margin: "2px 0" }} />
                )}
              </div>
              {/* Content */}
              <div style={{ flex: 1, paddingLeft: 12, paddingBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{step.name}</span>
                  <span style={{ color: "#4B556A", fontSize: 10 }}>{step.model}</span>
                  {step.latencyMs !== undefined && <span style={{ color: "#4FA3FF", fontSize: 10, marginLeft: "auto" }}>{step.latencyMs}ms</span>}
                </div>
                {step.result && (
                  <div style={{ color: statusColor, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{step.result}</div>
                )}
                {step.detail && (
                  <div style={{ color: "#a0aec0", fontSize: 11, lineHeight: 1.5 }}>{step.detail}</div>
                )}
                {step.confidence !== undefined && (
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 4, background: "#2a3550", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${step.confidence * 100}%`, height: "100%", background: statusColor, borderRadius: 2, transition: "width 0.6s" }} />
                    </div>
                    <span style={{ color: "#a0aec0", fontSize: 10 }}>{(step.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LOADING_STEPS: AgentStep[] = [
  { id: "anomaly", name: "Anomaly & Threat Agent", model: "Claude Haiku 4.5", icon: "🛡", status: "running" },
  { id: "embed", name: "Titan Embeddings + OpenSearch", model: "amazon.titan-embed-image-v1", icon: "🔍", status: "waiting" },
  { id: "orch", name: "Consent Orchestrator", model: "Nova Pro", icon: "⚖️", status: "waiting" },
  { id: "kms", name: "KMS Proof-of-Face Signing", model: "ECDSA P-256", icon: "🔐", status: "waiting" },
];

function buildSteps(trace: Record<string, unknown>, decision?: string): AgentStep[] {
  const steps = trace.steps as Record<string, unknown> || {};
  const anomaly = steps.anomaly_agent as Record<string, unknown> | undefined;
  const orch = steps.orchestrator as Record<string, unknown> | undefined;
  return [
    {
      id: "anomaly", name: "Anomaly & Threat Agent", model: "Claude Haiku 4.5", icon: "🛡",
      status: anomaly ? (anomaly.cleared ? "done" : "blocked") : "done",
      latencyMs: steps.anomaly_ms as number,
      confidence: anomaly?.confidence as number,
      result: anomaly ? (anomaly.cleared ? "CLEARED — No threats detected" : `BLOCKED — ${anomaly.threat_type}`) : "CLEARED",
      detail: anomaly?.reasoning as string || "Regex scan + suspension check passed"
    },
    {
      id: "embed", name: "Titan Embeddings + OpenSearch k-NN", model: "amazon.titan-embed-image-v1", icon: "🔍",
      status: "done",
      latencyMs: (steps.embedding_ms as number || 0) + (steps.matching_ms as number || 0),
      confidence: steps.best_score as number,
      result: steps.candidates_found ? `${steps.candidates_found} candidates found` : "Similarity search complete",
      detail: `Best match score: ${steps.best_score ? ((steps.best_score as number) * 100).toFixed(1) : "N/A"}% | HNSW cosine similarity`
    },
    {
      id: "orch", name: "Consent Orchestrator", model: "Nova Pro", icon: "⚖️",
      status: decision === "ALLOW" ? "done" : "blocked",
      latencyMs: steps.orchestrator_ms as number,
      confidence: orch?.confidence as number,
      result: orch ? `${orch.decision} — ${orch.reason_code}` : decision || "Decision made",
      detail: orch?.reasoning_trace as string || "Policy evaluation complete"
    },
    {
      id: "kms", name: "KMS Proof-of-Face Signing", model: "ECDSA P-256 + C2PA 1.3", icon: "🔐",
      status: decision === "ALLOW" ? "done" : "blocked",
      latencyMs: steps.signing_ms as number,
      result: decision === "ALLOW" ? "Manifest signed — SIGNATURE_VALID" : "Skipped — DENY decisions do not receive PoF",
      detail: decision === "ALLOW" ? "KMS ECDSA signature embedded in C2PA manifest" : "Proof-of-Face only issued on ALLOW"
    },
  ];
}
