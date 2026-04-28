import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config/api-config";

type EdgeState = "ONLINE" | "OFFLINE" | "SYNCING" | "UNKNOWN";

interface EdgeStatus {
  state: EdgeState;
  cached_vectors: number;
  unsynced_decisions: number;
  last_sync: number | null;
  cache_stale: boolean;
  node_id: string;
}

export const EdgeStatusIndicator: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const [status, setStatus] = useState<EdgeStatus | null>(null);
  const [simOffline, setSimOffline] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v2/edge/status`);
        if (res.ok) {
          const raw = await res.json();
          const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
          setStatus(data);
        }
      } catch {
        setStatus(prev =>
          prev
            ? { ...prev, state: "OFFLINE" }
            : { state: "OFFLINE", cached_vectors: 0, unsynced_decisions: 0, last_sync: null, cache_stale: true, node_id: "local" }
        );
      }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);

  const effectiveState: EdgeState = simOffline ? "OFFLINE" : (status?.state || "UNKNOWN");
  const color =
    effectiveState === "ONLINE" ? "#4FA3FF" :
    effectiveState === "OFFLINE" ? "#FF7A45" :
    effectiveState === "SYNCING" ? "#F6C90E" : "#4B556A";
  const label =
    effectiveState === "ONLINE" ? "Edge Online" :
    effectiveState === "OFFLINE" ? "Edge Offline" :
    effectiveState === "SYNCING" ? "Syncing..." : "Edge Unknown";

  if (compact) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }} title={label}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ color, fontSize: 11, fontWeight: 700 }}>{label}</span>
    </div>
  );

  return (
    <div style={{ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</span>
        {status?.node_id && (
          <span style={{ color: "#4B556A", fontSize: 10 }}>node: {status.node_id}</span>
        )}
        <button
          onClick={() => setSimOffline(s => !s)}
          style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#a0aec0", cursor: "pointer" }}
        >
          {simOffline ? "Go Online" : "Simulate Offline"}
        </button>
      </div>
      {status && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "#a0aec0", fontSize: 11 }}>Vectors: {status.cached_vectors.toLocaleString()}</span>
          {status.unsynced_decisions > 0 && (
            <span style={{ color: "#F6C90E", fontSize: 11 }}>{status.unsynced_decisions} unsynced</span>
          )}
          {status.last_sync && (
            <span style={{ color: "#a0aec0", fontSize: 11 }}>
              Synced: {new Date(status.last_sync * 1000).toLocaleTimeString()}
            </span>
          )}
          {status.cache_stale && (
            <span style={{ color: "#F6C90E", fontSize: 11 }}>Cache stale</span>
          )}
        </div>
      )}
    </div>
  );
};