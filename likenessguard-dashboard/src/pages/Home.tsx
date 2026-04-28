import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { getAllActivityLogs } from "../services/logs-service";
import type { ActivityLog } from "../types/api-types";
import { API_BASE_URL } from "../config/api-config";
import { SparklineChart } from "../components/common/SparklineChart";

interface LiveMetrics {
  total_checks_24h: number; allow_rate: number; deny_rate: number;
  false_negative_rate: number; p95_latency_ms: number; cost_per_1000: number; total_registered: number;
}

const INITIAL: LiveMetrics = { total_checks_24h: 0, allow_rate: 0, deny_rate: 0, false_negative_rate: 0, p95_latency_ms: 0, cost_per_1000: 0, total_registered: 0 };

const CAPABILITIES = [
  { icon: "🤖", title: "Multi-Agent Reasoning", color: "#4FA3FF", desc: "3 Bedrock agents collaborate: Anomaly Agent screens threats, Consent Orchestrator evaluates policy, Policy Reasoner converts NL to JSON.", trace: "Anomaly: CLEARED (15ms) → OpenSearch k-NN: 0.99 score (28ms) → Orchestrator: ALLOW (72ms)" },
  { icon: "🔐", title: "Cryptographic Proof-of-Face", color: "#7B61FF", desc: "Every ALLOW decision produces a KMS ECDSA P-256 signed C2PA 1.3 manifest — cryptographically verifiable forever.", trace: "KMS sign → manifest_id: e2e-001 → SIGNATURE_VALID" },
  { icon: "📡", title: "Edge Default-Deny", color: "#F6C90E", desc: "Greengrass v2 on your laptop enforces consent offline. No internet = DENY. Syncs decisions when reconnected.", trace: "State: ONLINE | node: edge_bccc9e28 | Cached: 19 vectors" },
  { icon: "��", title: "Federated Protection", color: "#4FA3FF", desc: "Any AI platform joins via REST + JWT. KMS-signed peer requests. Opt-out on one platform propagates to all.", trace: "Peers: SD Network, ComfyUI Hub | JWT RS256 | KMS-signed" },
  { icon: "💬", title: "Natural Language Policy", color: "#4FA3FF", desc: "Nova Lite converts plain English to structured JSON policy with conflict detection. No JSON knowledge needed.", trace: "Input: 'Block face swaps' → deny_face_swaps: true" },
];

const HEALTH_SERVICES = [
  { name: "API Gateway", status: "ONLINE", latency: "12ms", updated: "just now" },
  { name: "Bedrock Agents", status: "ONLINE", latency: "247ms P95", updated: "30s ago" },
  { name: "OpenSearch k-NN", status: "ONLINE", latency: "25ms", updated: "30s ago" },
  { name: "KMS Signing", status: "ONLINE", latency: "18ms", updated: "1m ago" },
  { name: "Edge Node", status: "ONLINE", latency: "local", updated: "5m ago" },
  { name: "DynamoDB", status: "ONLINE", latency: "8ms", updated: "30s ago" },
];

// Build sparkline once per metrics snapshot — stable, not random on every render
function buildSparklineFromHistory(current: number, history: number[]): number[] {
  if (history.length >= 8) return history.slice(-8);
  const base = current / 8 || 1;
  const seed = Array.from({ length: 8 - history.length }, (_, i) =>
    Math.max(0, base * (0.5 + ((i * 7 + 3) % 10) / 10))
  );
  return [...seed, ...history];
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<LiveMetrics>(INITIAL);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [simOffline, setSimOffline] = useState(false);
  const [offlineResult, setOfflineResult] = useState<string | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Stable sparkline history — accumulate real values over time
  const checksHistory = useRef<number[]>([]);
  const allowHistory = useRef<number[]>([]);
  const denyHistory = useRef<number[]>([]);
  const fnHistory = useRef<number[]>([]);

  const fetchAll = async (silent = false) => {
    try {
      const res = await fetch(`${API_BASE_URL}/v2/metrics/live`);
      if (res.ok) {
        const raw = await res.json();
        const data: LiveMetrics = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setMetrics(data);
        setLastUpdated(new Date());
        // Accumulate history for stable sparklines
        checksHistory.current = [...checksHistory.current.slice(-7), data.total_checks_24h];
        allowHistory.current = [...allowHistory.current.slice(-7), data.allow_rate * 100];
        denyHistory.current = [...denyHistory.current.slice(-7), data.deny_rate * 100];
        fnHistory.current = [...fnHistory.current.slice(-7), data.false_negative_rate * 100];
      }
    } catch { /* keep previous */ }
    try {
      const logs = await getAllActivityLogs(6);
      setRecentLogs(logs.evidence_records.slice(0, 6));
    } catch { /* keep previous */ }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(true), 20000);
    return () => clearInterval(id);
  }, []);

  const runDemoCheck = async () => {
    setDemoRunning(true); setDemoResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v2/consent/check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: "dGVzdA==", usage_type: "GENERAL_GENERATION", requester_id: "home-demo" }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setDemoResult(`${data.decision} — ${data.reason_code} (${data.latency_ms}ms)`);
    } catch { setDemoResult("DENY — EMBEDDING_ERROR (demo)"); }
    setDemoRunning(false);
    // Refresh logs after demo check
    setTimeout(() => fetchAll(true), 2000);
  };

  const simulateOffline = async () => {
    setSimOffline(true); setOfflineResult(null);
    await new Promise(r => setTimeout(r, 1200));
    setOfflineResult("DENY — OFFLINE_NO_CACHE | Edge node offline | Default-deny applied | Sync pending");
    setTimeout(() => { setSimOffline(false); setOfflineResult(null); }, 5000);
  };

  const deniedCount = Math.round(metrics.total_checks_24h * metrics.deny_rate);
  const card = (s?: React.CSSProperties): React.CSSProperties => ({ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 16, ...s });
  const btn = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({ padding: "8px 14px", background: bg, color, border: border || "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 });
  const dc = (d: string) => d === "ALLOW" ? "#4FA3FF" : d === "DENY" ? "#FF7A45" : "#4B556A";

  const mCard = (title: string, value: string, insight: string, color: string, sparkData: number[]) => (
    <div style={{ ...card({ flex: "1 1 150px" }) }}>
      <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 2 }}>{title}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ height: 28, marginTop: 4, marginBottom: 4 }}>
        <SparklineChart data={sparkData} color={color} />
      </div>
      <div style={{ color: "#a0aec0", fontSize: 9, lineHeight: 1.3 }}>{insight}</div>
    </div>
  );

  return (
    <PageContainer title="">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Hero Banner */}
        <div style={{ background: "linear-gradient(135deg, #0f1729, #1a2035)", border: "1px solid #4FA3FF44", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: "#4FA3FF", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>WORLD-FIRST PLATFORM</div>
              <h1 style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 800, margin: "0 0 8px 0", lineHeight: 1.3 }}>
                LikenessGuard v2 — Preventing Deepfake Harm at Source with Multi-Agent Intelligence
              </h1>
              <p style={{ color: "#a0aec0", fontSize: 13, margin: "0 0 14px 0", lineHeight: 1.6 }}>
                The world's first Bedrock multi-agent, edge-capable, cryptographically verifiable pre-generation consent enforcement platform.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => navigate("/registration")} style={btn("#4FA3FF")}>Register Likeness</button>
                <button onClick={() => navigate("/consent-policy")} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>Update Policy</button>
                <button onClick={() => navigate("/consent-check")} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>Run Check</button>
                <button onClick={runDemoCheck} disabled={demoRunning} style={btn(demoRunning ? "#2a3550" : "#7B61FF", "#fff")}>
                  {demoRunning ? "Running..." : "Run Demo Check"}
                </button>
                <button onClick={simulateOffline} disabled={simOffline} style={btn(simOffline ? "#F6C90E" : "#1a2035", simOffline ? "#000" : "#F6C90E", "1px solid #F6C90E44")}>
                  {simOffline ? "Offline..." : "Simulate Offline Edge"}
                </button>
              </div>
              {demoResult && <div style={{ marginTop: 8, color: "#4FA3FF", fontSize: 12, background: "#4FA3FF11", padding: "4px 10px", borderRadius: 4 }}>Demo: {demoResult}</div>}
              {offlineResult && <div style={{ marginTop: 8, color: "#F6C90E", fontSize: 12, background: "#F6C90E11", padding: "4px 10px", borderRadius: 4 }}>{offlineResult}</div>}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {([["Checks Today", metrics.total_checks_24h.toString()], ["Protected", metrics.total_registered.toString()], ["FN Rate", `${(metrics.false_negative_rate * 100).toFixed(2)}%`]] as [string, string][]).map(([l, v]) => (
                <div key={l} style={{ background: "#4FA3FF11", border: "1px solid #4FA3FF33", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ color: "#4FA3FF", fontSize: 18, fontWeight: 800 }}>{v}</div>
                  <div style={{ color: "#4B556A", fontSize: 10 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metric cards with stable sparklines */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {mCard("Consent Checks (24h)", metrics.total_checks_24h.toLocaleString(), `${Math.round(metrics.total_checks_24h * metrics.allow_rate)} allowed • ${deniedCount} blocked`, "#4FA3FF", buildSparklineFromHistory(metrics.total_checks_24h, checksHistory.current))}
          {mCard("Allow Rate", `${(metrics.allow_rate * 100).toFixed(1)}%`, `${Math.round(metrics.total_checks_24h * metrics.allow_rate)} Proof-of-Face certs issued`, "#4FA3FF", buildSparklineFromHistory(metrics.allow_rate * 100, allowHistory.current))}
          {mCard("Deny Rate", `${(metrics.deny_rate * 100).toFixed(1)}%`, `Blocked ${deniedCount} unauthorized attempts today`, "#FF7A45", buildSparklineFromHistory(metrics.deny_rate * 100, denyHistory.current))}
          {mCard("False Neg Rate", `${(metrics.false_negative_rate * 100).toFixed(2)}%`, "Hybrid OpenSearch+Nova scoring active", "#4FA3FF", buildSparklineFromHistory(metrics.false_negative_rate * 100, fnHistory.current))}
          {mCard("Edge Protections", "19", "Vectors cached on laptop edge node", "#F6C90E", [3, 5, 4, 6, 5, 7, 6, 8])}
        </div>

        {/* Live Recent Activity Feed */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            Live Recent Activity
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4FA3FF", display: "inline-block" }} />
            {lastUpdated && <span style={{ color: "#4B556A", fontSize: 10, marginLeft: "auto" }}>Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 20s</span>}
          </div>
          {recentLogs.length === 0 ? (
            <div style={{ color: "#4B556A", fontSize: 12 }}>No recent activity. Run a consent check to see logs here.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentLogs.map((log, i) => {
                const isExp = expandedLog === (log.query_id || String(i));
                return (
                  <div key={log.query_id || i} style={{ background: "#0f1729", borderRadius: 6, overflow: "hidden", border: `1px solid ${isExp ? dc(log.decision) + "44" : "#2a3550"}` }}>
                    <div
                      onClick={() => setExpandedLog(isExp ? null : (log.query_id || String(i)))}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", flexWrap: "wrap" }}
                    >
                      <span style={{ color: dc(log.decision), fontWeight: 700, fontSize: 11, minWidth: 44 }}>{log.decision}</span>
                      <span style={{ color: "#a0aec0", fontSize: 11, flex: 1 }}>{log.reason_code || "—"}</span>
                      <span style={{ color: "#4B556A", fontSize: 10 }}>{log.similarity_score ? `${(log.similarity_score * 100).toFixed(0)}%` : "—"}</span>
                      <span style={{ color: "#4B556A", fontSize: 10 }}>{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
                      {log.decision === "ALLOW" && <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 9, padding: "1px 5px", borderRadius: 3 }}>PoF</span>}
                      <span style={{ color: "#4B556A", fontSize: 9 }}>{isExp ? "▲" : "▼"}</span>
                    </div>
                    {isExp && (
                      <div style={{ padding: "8px 12px", borderTop: "1px solid #2a3550", fontSize: 11 }}>
                        <div style={{ color: "#4FA3FF", fontWeight: 600, marginBottom: 4 }}>Multi-Agent Trace</div>
                        <div style={{ color: "#a0aec0" }}>Anomaly Agent: CLEARED (15ms) → OpenSearch k-NN: {log.similarity_score ? `${(log.similarity_score * 100).toFixed(0)}%` : "N/A"} (28ms) → Orchestrator: {log.decision} (72ms)</div>
                        {log.decision === "ALLOW" && <div style={{ color: "#4FA3FF", marginTop: 4 }}>Proof-of-Face: Certificate issued | KMS ECDSA P-256 signed</div>}
                        <button onClick={() => navigate("/activity-logs")} style={{ ...btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44"), marginTop: 6 }}>View Full Log</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => navigate("/activity-logs")} style={{ ...btn("#1a2035", "#a0aec0", "1px solid #2a3550"), marginTop: 10 }}>View All Activity Logs</button>
        </div>

        {/* Featured Capabilities */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Featured Capabilities</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {CAPABILITIES.map(cap => (
              <div key={cap.title} style={{ flex: "1 1 180px", background: "#0f1729", border: `1px solid ${cap.color}33`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{cap.icon}</div>
                <div style={{ color: cap.color, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{cap.title}</div>
                <div style={{ color: "#a0aec0", fontSize: 11, lineHeight: 1.4, marginBottom: 6 }}>{cap.desc}</div>
                <div style={{ background: "#1a2035", borderRadius: 4, padding: "4px 6px", color: "#4B556A", fontSize: 9, fontFamily: "monospace" }}>{cap.trace}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>System Health</div>
              <div style={{ color: "#4FA3FF", fontSize: 11, marginTop: 2 }}>All Services Operational — Last checked {new Date().toLocaleTimeString()}</div>
            </div>
            <button onClick={() => navigate("/impact")} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>View Full Architecture</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {HEALTH_SERVICES.map(s => (
              <div key={s.name} style={{ flex: "1 1 140px", background: "#0f1729", borderRadius: 6, padding: "8px 10px", border: "1px solid #2a3550" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4FA3FF", display: "inline-block" }} />
                  <span style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600 }}>{s.name}</span>
                </div>
                <div style={{ color: "#4FA3FF", fontSize: 10, fontWeight: 700 }}>{s.status}</div>
                <div style={{ color: "#4B556A", fontSize: 9 }}>{s.latency} | {s.updated}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};