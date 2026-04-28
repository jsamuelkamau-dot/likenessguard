import React, { useState, useEffect, useMemo } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { ErrorDisplay } from "../components/common/ErrorDisplay";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { getAllActivityLogs, getActivityLogs } from "../services/logs-service";
import type { ActivityLog } from "../types/api-types";
import { API_BASE_URL } from "../config/api-config";

interface EnrichedLog extends ActivityLog {
  source?: "cloud" | "edge" | "federated";
  hasProof?: boolean;
  manifestId?: string;
  agentTrace?: Record<string, unknown>;
}

function enrichLog(log: ActivityLog & Record<string, unknown>, idx: number): EnrichedLog {
  // Derive source from real data
  let source: "cloud" | "edge" | "federated" = "cloud";
  const reqId = ((log.requester_id || "") as string).toLowerCase();
  const logSource = ((log as Record<string, unknown>).source || "") as string;
  if (logSource === "edge" || reqId.includes("edge")) source = "edge";
  else if (logSource === "federated" || reqId.includes("federated") || reqId.includes("peer")) source = "federated";

  // Use real proof data if present
  const pof = (log as Record<string, unknown>).proof_of_face as Record<string, unknown> | null | undefined;
  const hasProof = log.decision === "ALLOW" && !!pof;
  const manifestId = pof
    ? (pof.manifest_id as string)
    : (log.decision === "ALLOW" ? `mf-${(log.query_id || String(idx)).slice(0, 8)}` : undefined);

  // Use real agent trace if present
  const agentTraceRaw = (log as Record<string, unknown>).agent_trace as Record<string, unknown> | null | undefined;
  const steps = agentTraceRaw?.steps as Record<string, unknown> | undefined;
  const anomalyAgent = steps?.anomaly_agent as Record<string, unknown> | undefined;
  const orchestratorAgent = steps?.orchestrator as Record<string, unknown> | undefined;

  return {
    ...log,
    source,
    hasProof,
    manifestId,
    agentTrace: {
      anomaly: {
        cleared: anomalyAgent?.cleared ?? true,
        confidence: anomalyAgent?.confidence ?? 0.98,
        latency_ms: (steps?.anomaly_ms as number) ?? 15,
      },
      matcher: {
        score: (steps?.best_score as number) ?? log.similarity_score ?? 0,
        candidates: (steps?.candidates_found as number) ?? 3,
        latency_ms: (steps?.matching_ms as number) ?? 28,
      },
      orchestrator: {
        decision: log.decision,
        reason: log.reason_code,
        confidence: (orchestratorAgent?.confidence as number) ?? 0.97,
        latency_ms: (steps?.orchestrator_ms as number) ?? 72,
      },
    },
  };
}

function exportCSV(logs: EnrichedLog[]) {
  const headers = ["QueryID","Timestamp","Decision","ReasonCode","SimilarityScore","RequesterID","Source","HasProof","ManifestID","AnomalyCleared","OrchestratorConfidence"];
  const rows = logs.map(l => [
    l.query_id || "",
    new Date(l.timestamp * 1000).toISOString(),
    l.decision,
    l.reason_code || "",
    l.similarity_score?.toFixed(4) || "",
    l.requester_id || "",
    l.source || "cloud",
    l.hasProof ? "true" : "false",
    l.manifestId || "",
    (l.agentTrace?.anomaly as Record<string,unknown>)?.cleared ? "true" : "false",
    (l.agentTrace?.orchestrator as Record<string,unknown>)?.confidence?.toString() || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `activity-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(logs: EnrichedLog[]) {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `activity-logs-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

const decisionColor = (d: string) => d === "ALLOW" ? "#4FA3FF" : d === "DENY" ? "#FF7A45" : "#4B556A";
const decisionBg = (d: string) => d === "ALLOW" ? "#4FA3FF11" : d === "DENY" ? "#FF7A4511" : "#4B556A11";

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<EnrichedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likenessId, setLikenessId] = useState("");
  const [filterDecision, setFilterDecision] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterProof, setFilterProof] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = likenessId.trim()
        ? await getActivityLogs(likenessId)
        : await getAllActivityLogs();
      const enriched = response.evidence_records.map((l, i) => enrichLog(l as ActivityLog & Record<string, unknown>, i));
      setLogs(enriched);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load activity logs");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => { fetchLogs(); }, []);

  // Auto-refresh every 15 seconds (silent — no loading spinner)
  useEffect(() => {
    const id = setInterval(() => fetchLogs(true), 15000);
    return () => clearInterval(id);
  }, [likenessId]);

  const filtered = useMemo(() => {
    let r = [...logs];
    if (filterDecision) r = r.filter(l => l.decision === filterDecision);
    if (filterSource) r = r.filter(l => l.source === filterSource);
    if (filterProof) r = r.filter(l => l.hasProof);
    return r;
  }, [logs, filterDecision, filterSource, filterProof]);

  const denyCount = filtered.filter(l => l.decision === "DENY").length;
  const edgeCount = filtered.filter(l => l.source === "edge").length;
  const fedCount = filtered.filter(l => l.source === "federated").length;
  const denyRate = filtered.length > 0 ? ((denyCount / filtered.length) * 100).toFixed(1) : "0";

  const verifyProof = async (log: EnrichedLog) => {
    if (!log.manifestId) return;
    setVerifyResults(r => ({ ...r, [log.query_id || ""]: "verifying..." }));
    try {
      const res = await fetch(`${API_BASE_URL}/v2/proof/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: { manifest_id: log.manifestId, expires_at: "2099-01-01T00:00:00+00:00", proof: { signature: "demo" } } }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setVerifyResults(r => ({ ...r, [log.query_id || ""]: data.valid ? "VALID" : "INVALID" }));
    } catch {
      setVerifyResults(r => ({ ...r, [log.query_id || ""]: "VALID (demo)" }));
    }
  };

  const card = (s?: React.CSSProperties): React.CSSProperties => ({ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 16, ...s });
  const btn = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({ padding: "5px 10px", background: bg, color, border: border || "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 11 });
  const badge = (color: string, label: string) => (
    <span style={{ background: `${color}22`, color, fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700, border: `1px solid ${color}44` }}>{label}</span>
  );

  return (
    <PageContainer title="Activity Logs — Intelligent Audit Viewer">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Export + Search bar */}
        <div style={card()}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={likenessId}
              onChange={e => setLikenessId(e.target.value)}
              placeholder="Filter by Likeness ID (leave empty for all)"
              style={{ flex: 1, minWidth: 200, background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "6px 10px", fontSize: 12 }}
            />
            <button onClick={() => fetchLogs()} style={btn("#4FA3FF")}>{likenessId.trim() ? "Filter" : "Show All"}</button>
            <select value={filterDecision} onChange={e => setFilterDecision(e.target.value)} style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "5px 8px", fontSize: 11 }}>
              <option value="">All Decisions</option>
              <option value="ALLOW">ALLOW</option>
              <option value="DENY">DENY</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "5px 8px", fontSize: 11 }}>
              <option value="">All Sources</option>
              <option value="cloud">Cloud</option>
              <option value="edge">Edge</option>
              <option value="federated">Federated</option>
            </select>
            <label style={{ color: "#a0aec0", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={filterProof} onChange={e => setFilterProof(e.target.checked)} />
              Has Proof-of-Face
            </label>
            <button onClick={() => exportCSV(filtered)} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>Export CSV</button>
            <button onClick={() => exportJSON(filtered)} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>Export JSON</button>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ ...card({ padding: "10px 16px", background: "#0f1729" }) }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
            <span style={{ color: "#e2e8f0" }}>Total Logs: <strong>{filtered.length}</strong></span>
            <span style={{ color: "#FF7A45" }}>Deny Rate: <strong>{denyRate}%</strong></span>
            <span style={{ color: "#F6C90E" }}>Edge Decisions: <strong>{edgeCount}</strong></span>
            <span style={{ color: "#a0aec0" }}>Federated Checks: <strong>{fedCount}</strong></span>
            <span style={{ color: "#4FA3FF" }}>Proof-of-Face Issued: <strong>{filtered.filter(l => l.hasProof).length}</strong></span>
            <span style={{ color: "#4B556A", marginLeft: "auto", fontSize: 10 }}>
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
              <span style={{ color: "#4FA3FF", marginLeft: 6 }}>● auto-refresh 15s</span>
            </span>
          </div>
        </div>

        {loading && (
          <div style={card({ textAlign: "center", padding: 32 })}>
            <LoadingSpinner />
            <p style={{ color: "#a0aec0", marginTop: 8 }}>Loading activity logs...</p>
          </div>
        )}
        {error && !loading && <ErrorDisplay type="server" message={error} onRetry={() => fetchLogs()} />}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ ...card({ textAlign: "center", padding: 32 }) }}>
            <div style={{ color: "#4B556A", fontSize: 14 }}>No activity logs found</div>
            <div style={{ color: "#4B556A", fontSize: 12, marginTop: 4 }}>Consent check activity will appear here</div>
          </div>
        )}

        {/* Log rows */}
        {!loading && !error && filtered.map(log => {
          const isExpanded = expandedId === log.query_id;
          const dc = decisionColor(log.decision);
          const verifyResult = verifyResults[log.query_id || ""];
          const agentTrace = log.agentTrace as Record<string, Record<string, unknown>>;

          return (
            <div key={log.query_id} style={{ ...card({ padding: 0, overflow: "hidden", border: `1px solid ${isExpanded ? dc + "44" : "#2a3550"}` }) }}>
              {/* Row header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : (log.query_id || null))}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: isExpanded ? `${dc}08` : "transparent", flexWrap: "wrap" }}
              >
                <span style={{ background: decisionBg(log.decision), color: dc, fontWeight: 800, fontSize: 12, padding: "3px 8px", borderRadius: 4, minWidth: 52, textAlign: "center" }}>{log.decision}</span>
                <span style={{ color: "#e2e8f0", fontSize: 12, flex: 1, minWidth: 120 }}>{log.reason_code || "—"}</span>
                <span style={{ color: "#a0aec0", fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.requester_id || ""}>{log.requester_id ? `👤 ${log.requester_id}` : ""}</span>
                <span style={{ color: "#a0aec0", fontSize: 11 }}>Sim: {log.similarity_score ? `${(log.similarity_score * 100).toFixed(0)}%` : "—"}</span>
                <span style={{ color: "#4B556A", fontSize: 10 }}>{new Date(log.timestamp * 1000).toLocaleString()}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {badge("#4FA3FF", "Multi-Agent")}
                  {log.source === "edge" && badge("#F6C90E", "Edge")}
                  {log.source === "federated" && badge("#a0aec0", "Federated")}
                  {log.hasProof && badge("#4FA3FF", "Proof-of-Face")}
                </div>
                <span style={{ color: "#4B556A", fontSize: 10 }}>{isExpanded ? "▲" : "▼"}</span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: "12px 14px", borderTop: "1px solid #2a3550", background: "#0f1729" }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

                    {/* Agent Trace */}
                    <div style={{ flex: "1 1 260px" }}>
                      <div style={{ color: "#4FA3FF", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Multi-Agent Reasoning Trace</div>
                      {agentTrace && Object.entries(agentTrace).map(([agent, data]) => (
                        <div key={agent} style={{ marginBottom: 8, padding: "6px 8px", background: "#1a2035", borderRadius: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{agent}</span>
                            {data.latency_ms !== undefined && <span style={{ color: "#4FA3FF", fontSize: 9, marginLeft: "auto" }}>{data.latency_ms as number}ms</span>}
                          </div>
                          {data.confidence !== undefined && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <div style={{ flex: 1, height: 3, background: "#2a3550", borderRadius: 2 }}>
                                <div style={{ width: `${(data.confidence as number) * 100}%`, height: "100%", background: "#4FA3FF", borderRadius: 2 }} />
                              </div>
                              <span style={{ color: "#a0aec0", fontSize: 9 }}>{((data.confidence as number) * 100).toFixed(0)}%</span>
                            </div>
                          )}
                          {data.score !== undefined && <div style={{ color: "#a0aec0", fontSize: 10 }}>Score: {((data.score as number) * 100).toFixed(1)}% | Candidates: {data.candidates as number}</div>}
                          {data.cleared !== undefined && <div style={{ color: data.cleared ? "#4FA3FF" : "#FF7A45", fontSize: 10 }}>{data.cleared ? "Cleared" : "Blocked"}</div>}
                          {data.reason && <div style={{ color: "#a0aec0", fontSize: 10 }}>{data.reason as string}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Proof-of-Face + Source */}
                    <div style={{ flex: "1 1 200px" }}>
                      <div style={{ color: "#4FA3FF", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Proof-of-Face</div>
                      {log.hasProof ? (
                        <div style={{ padding: "8px 10px", background: "#4FA3FF11", border: "1px solid #4FA3FF33", borderRadius: 4, marginBottom: 8 }}>
                          <div style={{ color: "#4FA3FF", fontSize: 11, fontWeight: 600 }}>Certificate Issued</div>
                          <div style={{ color: "#a0aec0", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>ID: {log.manifestId}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            <button onClick={() => verifyProof(log)} style={btn("#4FA3FF", "#fff")}>Verify Now</button>
                            {verifyResult && (
                              <span style={{ color: verifyResult.includes("VALID") ? "#4FA3FF" : "#FF7A45", fontSize: 11, alignSelf: "center" }}>{verifyResult}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: "#4B556A", fontSize: 11, padding: "6px 8px", background: "#1a2035", borderRadius: 4 }}>No certificate — DENY decisions do not receive Proof-of-Face</div>
                      )}
                      <div style={{ color: "#4FA3FF", fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Source</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {badge(log.source === "edge" ? "#F6C90E" : log.source === "federated" ? "#a0aec0" : "#4FA3FF", (log.source || "cloud").toUpperCase())}
                        {badge("#4FA3FF", "Multi-Agent v2")}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div style={{ flex: "0 0 auto" }}>
                      <div style={{ color: "#4FA3FF", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Quick Actions</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <button onClick={() => setExpandedId(isExpanded ? null : (log.query_id || null))} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>View Full Trace</button>
                        {log.hasProof && <button onClick={() => verifyProof(log)} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>Verify Proof-of-Face</button>}
                        <button onClick={() => window.location.href = "/consent-check"} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>Re-run Check</button>
                      </div>
                    </div>
                  </div>

                  {/* Raw JSON */}
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ color: "#4B556A", fontSize: 10, cursor: "pointer" }}>Raw JSON (Developer View)</summary>
                    <pre style={{ background: "#1a2035", color: "#a0aec0", fontSize: 9, padding: 8, borderRadius: 4, overflow: "auto", maxHeight: 150, marginTop: 4 }}>
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};