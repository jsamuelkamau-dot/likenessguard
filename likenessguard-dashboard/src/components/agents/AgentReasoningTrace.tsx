import React, { useState } from "react";
import styles from "./AgentReasoningTrace.module.css";

interface AgentTrace {
  request_id?: string;
  steps?: Record<string, unknown>;
  total_latency_ms?: number;
}

interface Props {
  trace: AgentTrace | null;
  decision?: string;
  className?: string;
}

export const AgentReasoningTrace: React.FC<Props> = ({ trace, decision, className }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ anomaly: true, matching: true, orchestrator: true });
  if (!trace) return null;
  const steps = trace.steps || {};
  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  const decisionColor = decision === "ALLOW" ? "#4FA3FF" : decision === "DENY" ? "#FF7A45" : "#4B556A";
  const anomalyData = steps.anomaly_agent as Record<string, unknown> | undefined;
  const orchData = steps.orchestrator as Record<string, unknown> | undefined;

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.header}>
        <span className={styles.title}>Agent Reasoning Trace</span>
        {trace.request_id && <span className={styles.requestId}>ID: {trace.request_id.slice(0, 8)}...</span>}
        {trace.total_latency_ms !== undefined && <span className={styles.totalLatency}>{trace.total_latency_ms}ms total</span>}
      </div>

      <div className={styles.section}>
        <button className={styles.sectionHeader} onClick={() => toggle("anomaly")} aria-expanded={expanded.anomaly}>
          <span className={styles.sectionTitle}>Anomaly and Threat Agent</span>
          <div className={styles.sectionMeta}>
            {steps.anomaly_ms !== undefined && <span className={styles.latencyBadge}>{String(steps.anomaly_ms)}ms</span>}
            {anomalyData && <span className={styles.statusBadge} style={{ color: anomalyData.cleared ? "#4FA3FF" : "#FF7A45" }}>{anomalyData.cleared ? "CLEARED" : "THREAT"}</span>}
          </div>
        </button>
        {expanded.anomaly && anomalyData && (
          <div className={styles.sectionBody}>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Cleared:</span><span className={styles.detailValue}>{String(anomalyData.cleared)}</span></div>
            {anomalyData.threat_type && <div className={styles.detailRow}><span className={styles.detailLabel}>Threat:</span><span className={`${styles.detailValue} ${styles.danger}`}>{String(anomalyData.threat_type)}</span></div>}
            <div className={styles.detailRow}><span className={styles.detailLabel}>Confidence:</span><span className={styles.detailValue}>{(Number(anomalyData.confidence || 0) * 100).toFixed(0)}%</span></div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <button className={styles.sectionHeader} onClick={() => toggle("matching")} aria-expanded={expanded.matching}>
          <span className={styles.sectionTitle}>Hybrid Facial Matcher</span>
          <div className={styles.sectionMeta}>
            {steps.matching_ms !== undefined && <span className={styles.latencyBadge}>{String(steps.matching_ms)}ms</span>}
            {steps.best_score !== undefined && <span className={styles.statusBadge} style={{ color: Number(steps.best_score) >= 0.85 ? "#4FA3FF" : "#FF7A45" }}>{Number(steps.best_score) >= 0.85 ? "MATCH" : "NO_MATCH"}</span>}
          </div>
        </button>
        {expanded.matching && (
          <div className={styles.sectionBody}>
            {steps.best_score !== undefined && <div className={styles.detailRow}><span className={styles.detailLabel}>Best Score:</span><span className={styles.detailValue}>{(Number(steps.best_score) * 100).toFixed(1)}%</span></div>}
            {steps.candidates_found !== undefined && <div className={styles.detailRow}><span className={styles.detailLabel}>Candidates:</span><span className={styles.detailValue}>{String(steps.candidates_found)}</span></div>}
            {steps.embedding_ms !== undefined && <div className={styles.detailRow}><span className={styles.detailLabel}>Embedding:</span><span className={styles.detailValue}>{String(steps.embedding_ms)}ms</span></div>}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <button className={styles.sectionHeader} onClick={() => toggle("orchestrator")} aria-expanded={expanded.orchestrator}>
          <span className={styles.sectionTitle}>Consent Orchestrator</span>
          <div className={styles.sectionMeta}>
            {steps.orchestrator_ms !== undefined && <span className={styles.latencyBadge}>{String(steps.orchestrator_ms)}ms</span>}
            {decision && <span className={styles.statusBadge} style={{ color: decisionColor }}>{decision}</span>}
          </div>
        </button>
        {expanded.orchestrator && orchData && (
          <div className={styles.sectionBody}>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Decision:</span><span className={`${styles.detailValue} ${decision === "ALLOW" ? styles.success : styles.danger}`}>{String(orchData.decision || decision || "")}</span></div>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Reason:</span><span className={styles.detailValue}>{String(orchData.reason_code || "")}</span></div>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Confidence:</span><span className={styles.detailValue}>{(Number(orchData.confidence || 0) * 100).toFixed(0)}%</span></div>
            {orchData.reasoning_trace && <div className={styles.reasoning}><span className={styles.reasoningLabel}>Reasoning:</span><p className={styles.reasoningText}>{String(orchData.reasoning_trace)}</p></div>}
          </div>
        )}
      </div>
    </div>
  );
};
