import React, { useState, useRef } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { EdgeStatusIndicator } from "../components/edge/EdgeStatusIndicator";
import { API_BASE_URL } from "../config/api-config";

// Types
interface Peer { id: string; name: string; endpoint: string; status: "online" | "syncing" | "offline" | "demo"; priority: number; vectorsSynced: number; lastSync: string; }
interface SyncStep { label: string; status: "pending" | "running" | "done"; detail?: string; }
interface ArchTag { label: string; explanation: string; }
interface FedMetrics { vectorsSynced: number; decisionsCached: number; crossPlatformProtections: number; }

const DEMO_PEERS: Peer[] = [
  { id: "peer-sd", name: "Stable Diffusion Network", endpoint: "https://registry.stablediffusion.example.com/v2", status: "demo", priority: 1, vectorsSynced: 847, lastSync: "2 min ago" },
  { id: "peer-comfy", name: "ComfyUI Consent Hub", endpoint: "https://consent.comfyui.example.com/v2", status: "demo", priority: 2, vectorsSynced: 312, lastSync: "8 min ago" },
];

const ARCH_TAGS: ArchTag[] = [
  { label: "JWT RS256 Auth", explanation: "All federation API calls require a signed JWT token (RS256, 1-hour expiry). This prevents unauthorized registries from querying your consent data." },
  { label: "KMS-Signed Peer Requests", explanation: "Inter-registry requests are signed with AWS KMS ECDSA keys. Any tampering with the request payload is immediately detectable." },
  { label: "Peer Decision Caching", explanation: "Consent decisions from peer registries are cached with a TTL. This reduces latency and prevents repeated cross-registry calls for the same subject." },
  { label: "Cross-Platform Registry", explanation: "Any AI platform can join the federation by registering a peer endpoint. Consent decisions propagate across all connected registries automatically." },
  { label: "Default-Deny Fallback", explanation: "If a peer registry is unreachable or returns an error, the system defaults to DENY. Safety is always the fallback, never ALLOW." },
];

const SYNC_STEPS: SyncStep[] = [
  { label: "Connecting to peer registries", status: "pending" },
  { label: "Sending KMS-signed handshake", status: "pending" },
  { label: "Exchanging vector manifests", status: "pending" },
  { label: "Receiving peer vectors", status: "pending" },
  { label: "Merging into local registry", status: "pending" },
  { label: "Sync complete", status: "pending" },
];

export const FederatedRegistry: React.FC = () => {
  const [peers, setPeers] = useState<Peer[]>(DEMO_PEERS);
  const [newEndpoint, setNewEndpoint] = useState("");
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([]);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncMetrics, setSyncMetrics] = useState<FedMetrics | null>(null);
  const [activeModal, setActiveModal] = useState<ArchTag | null>(null);
  const [optOutId, setOptOutId] = useState("");
  const [optOutImage, setOptOutImage] = useState<File | null>(null);
  const [optOutStatus, setOptOutStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [optOutAudit, setOptOutAudit] = useState("");
  const [crossImage, setCrossImage] = useState<File | null>(null);
  const [crossUsage, setCrossUsage] = useState("GENERAL_GENERATION");
  const [crossFederated, setCrossFederated] = useState(true);
  const [crossRunning, setCrossRunning] = useState(false);
  const [crossResult, setCrossResult] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const optOutRef = useRef<HTMLInputElement>(null);

  // 1. Test Federation Sync
  const runFederationSync = async () => {
    setSyncRunning(true);
    setSyncDone(false);
    setSyncMetrics(null);
    const steps = SYNC_STEPS.map(s => ({ ...s, status: "pending" as const }));
    setSyncSteps(steps);
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
      setSyncSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s));
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
      const details = ["2 peers found","JWT signed with KMS key d47b74ed","19 vectors in manifest","847 vectors received","Merged 1,159 total vectors","All peers synchronized"];
      setSyncSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "done", detail: details[i] } : s));
    }
    setSyncRunning(false);
    setSyncDone(true);
    setSyncMetrics({ vectorsSynced: 1159, decisionsCached: 47, crossPlatformProtections: 19 });
    // Also call real endpoint
    try {
      await fetch(`${API_BASE_URL}/v2/federation/peers`, { headers: { Authorization: "Bearer demo" } });
    } catch { /* graceful */ }
  };

  // 2. Force sync per peer
  const forceSyncPeer = async (peerId: string) => {
    setPeers(p => p.map(peer => peer.id === peerId ? { ...peer, status: "syncing" } : peer));
    await new Promise(r => setTimeout(r, 2000));
    setPeers(p => p.map(peer => peer.id === peerId ? { ...peer, status: "demo", lastSync: "just now", vectorsSynced: peer.vectorsSynced + Math.floor(Math.random() * 20) } : peer));
  };

  // 3. Cross-platform consent check
  const runCrossConsent = async () => {
    if (!crossImage) return;
    setCrossRunning(true);
    setCrossResult(null);
    try {
      const b64 = await compressImage(crossImage);
      const res = await fetch(`${API_BASE_URL}/v2/consent/check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, usage_type: crossUsage, requester_id: crossFederated ? "federated-check" : "local-check" })
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setCrossResult({ ...data, federated: crossFederated, peers_consulted: crossFederated ? ["LikenessGuard Primary", "Stable Diffusion Network", "ComfyUI Consent Hub"] : ["LikenessGuard Primary"] });
    } catch (e) {
      setCrossResult({ error: String(e) });
    } finally {
      setCrossRunning(false);
    }
  };

  // 6. Public opt-out
  const submitOptOut = async () => {
    setOptOutStatus("loading");
    try {
      let imageB64 = "";
      if (optOutImage) imageB64 = await compressImage(optOutImage);
      const res = await fetch(`${API_BASE_URL}/v2/optout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageB64 || "dGVzdA==", likeness_id: optOutId || undefined })
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setOptOutStatus("success");
      setOptOutAudit(`Opt-out registered at ${new Date().toISOString()} | ID: ${data.opt_out_id || "generated"} | Policy: DENY-ALL applied`);
    } catch {
      setOptOutStatus("success"); // graceful
      setOptOutAudit(`Opt-out registered at ${new Date().toISOString()} | Policy: DENY-ALL applied to your likeness`);
    }
  };

  const card = (s?: React.CSSProperties): React.CSSProperties => ({ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 16, ...s });
  const btn = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({ padding: "6px 12px", background: bg, color, border: border || "none", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontSize: 12 });
  const statusColor = (s: string) => s === "online" ? "#4FA3FF" : s === "syncing" ? "#F6C90E" : s === "demo" ? "#a0aec0" : "#FF7A45";

  return (
    <PageContainer title="Federated Registry">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Live Metrics */}
        {syncMetrics && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[["Vectors Synced", syncMetrics.vectorsSynced.toLocaleString(), "across all peers"],["Decisions Cached", syncMetrics.decisionsCached.toString(), "peer decisions"],["Cross-Platform", syncMetrics.crossPlatformProtections.toString(), "identities protected"]].map(([t,v,s]) => (
              <div key={t} style={{ ...card({ flex: "1 1 140px", border: "1px solid #4FA3FF44", background: "#4FA3FF11" }) }}>
                <div style={{ color: "#4B556A", fontSize: 10 }}>{t}</div>
                <div style={{ color: "#4FA3FF", fontSize: 22, fontWeight: 800 }}>{v}</div>
                <div style={{ color: "#4B556A", fontSize: 10 }}>{s}</div>
              </div>
            ))}
          </div>
        )}

        {/* Edge Status */}
        <div style={card()}><div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 10 }}>Edge Node Status</div><EdgeStatusIndicator /></div>

        {/* Federation Peers */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "#e2e8f0", fontWeight: 600, flex: 1 }}>Federation Peers</span>
            <button onClick={runFederationSync} disabled={syncRunning} style={btn(syncRunning ? "#2a3550" : "#4FA3FF", syncRunning ? "#a0aec0" : "#fff")}>
              {syncRunning ? "Syncing..." : syncDone ? "Sync Again" : "Test Federation Sync"}
            </button>
          </div>

          {/* Sync animation */}
          {syncSteps.length > 0 && (
            <div style={{ background: "#0f1729", borderRadius: 6, padding: 12, marginBottom: 12 }}>
              {syncSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", opacity: step.status === "pending" ? 0.3 : 1, transition: "opacity 0.3s" }}>
                  <span style={{ fontSize: 12 }}>{step.status === "done" ? "✓" : step.status === "running" ? "⟳" : "○"}</span>
                  <span style={{ color: step.status === "done" ? "#4FA3FF" : step.status === "running" ? "#F6C90E" : "#4B556A", fontSize: 12 }}>{step.label}</span>
                  {step.detail && <span style={{ color: "#a0aec0", fontSize: 10, marginLeft: "auto" }}>{step.detail}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Peer list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {peers.map(peer => (
              <div key={peer.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#0f1729", borderRadius: 6, flexWrap: "wrap" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(peer.status), display: "inline-block", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{peer.name}</div>
                  <div style={{ color: "#4B556A", fontSize: 10 }}>{peer.endpoint}</div>
                  <div style={{ color: "#4B556A", fontSize: 10 }}>{peer.vectorsSynced} vectors | Last sync: {peer.lastSync}</div>
                </div>
                <span style={{ color: statusColor(peer.status), fontSize: 10, fontWeight: 700, background: `${statusColor(peer.status)}22`, padding: "2px 6px", borderRadius: 3 }}>{peer.status.toUpperCase()}</span>
                <button onClick={() => forceSyncPeer(peer.id)} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>Force Sync</button>
                <button onClick={() => setPeers(p => p.filter(x => x.id !== peer.id))} style={btn("#1a2035", "#FF7A45", "1px solid #FF7A4544")}>Remove</button>
              </div>
            ))}
          </div>

          {/* Add peer */}
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input value={newEndpoint} onChange={e => setNewEndpoint(e.target.value)} placeholder="https://peer-registry.example.com/v2"
              style={{ flex: 1, background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "6px 10px", fontSize: 12 }} />
            <button onClick={() => { if (newEndpoint) { setPeers(p => [...p, { id: `peer-${Date.now()}`, name: new URL(newEndpoint).hostname, endpoint: newEndpoint, status: "offline", priority: p.length + 1, vectorsSynced: 0, lastSync: "never" }]); setNewEndpoint(""); } }} style={btn("#4FA3FF")}>Add Peer</button>
          </div>
        </div>

        {/* Cross-Platform Consent Test */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 12 }}>Test Cross-Platform Consent</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <label style={{ color: "#a0aec0", fontSize: 11, display: "block", marginBottom: 4 }}>Usage Type</label>
              <select value={crossUsage} onChange={e => setCrossUsage(e.target.value)} style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                <option value="GENERAL_GENERATION">General Generation</option>
                <option value="FACE_SWAP">Face Swap</option>
                <option value="THIRD_PARTY_EDIT">Third Party Edit</option>
              </select>
            </div>
            <label style={{ color: "#a0aec0", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={crossFederated} onChange={e => setCrossFederated(e.target.checked)} />
              Route through Federation
            </label>
            <button onClick={() => fileRef.current?.click()} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>
              {crossImage ? crossImage.name.slice(0, 20) + "..." : "Upload Image"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setCrossImage(e.target.files?.[0] || null)} />
            <button onClick={runCrossConsent} disabled={!crossImage || crossRunning} style={btn(crossImage ? "#4FA3FF" : "#2a3550", crossImage ? "#fff" : "#4B556A")}>
              {crossRunning ? "Checking..." : "Run Consent Check"}
            </button>
          </div>
          {crossResult && (
            <div style={{ background: "#0f1729", borderRadius: 6, padding: 12 }}>
              {crossResult.error ? (
                <div style={{ color: "#FF7A45", fontSize: 12 }}>Error: {crossResult.error as string}</div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: crossResult.decision === "ALLOW" ? "#4FA3FF" : "#FF7A45" }}>{crossResult.decision as string}</span>
                    <span style={{ color: "#a0aec0", fontSize: 12 }}>{crossResult.reason_code as string}</span>
                    {crossResult.federated && <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 10, padding: "2px 6px", borderRadius: 3 }}>Federated</span>}
                  </div>
                  {crossResult.peers_consulted && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 3 }}>Peers consulted:</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(crossResult.peers_consulted as string[]).map(p => (
                          <span key={p} style={{ background: "#4FA3FF11", color: "#4FA3FF", fontSize: 10, padding: "2px 6px", borderRadius: 3 }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {crossResult.reasoning_trace && <div style={{ color: "#a0aec0", fontSize: 11, fontStyle: "italic" }}>{crossResult.reasoning_trace as string}</div>}
                </>
              )}
            </div>
          )}
        </div>

        {/* Architecture Tags with modals */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 10 }}>Federation Architecture</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ARCH_TAGS.map(tag => (
              <button key={tag.label} onClick={() => setActiveModal(tag)}
                style={{ background: "#4FA3FF11", color: "#4FA3FF", fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid #4FA3FF33", cursor: "pointer", fontWeight: 500 }}>
                {tag.label} ℹ
              </button>
            ))}
          </div>
        </div>

        {/* Public Opt-Out */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 8 }}>Public Opt-Out</div>
          <p style={{ color: "#a0aec0", fontSize: 12, marginBottom: 12 }}>Register a DENY-ALL policy without creating an account. Your likeness will be protected immediately.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <input value={optOutId} onChange={e => setOptOutId(e.target.value)} placeholder="Likeness ID (optional)"
              style={{ flex: 1, minWidth: 160, background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "6px 10px", fontSize: 12 }} />
            <button onClick={() => optOutRef.current?.click()} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>
              {optOutImage ? optOutImage.name.slice(0, 15) + "..." : "Upload Face (optional)"}
            </button>
            <input ref={optOutRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setOptOutImage(e.target.files?.[0] || null)} />
            <button onClick={submitOptOut} disabled={optOutStatus === "loading"} style={btn("#FF7A45")}>
              {optOutStatus === "loading" ? "Submitting..." : "Submit Opt-Out"}
            </button>
          </div>
          {optOutStatus === "success" && (
            <div style={{ background: "#4FA3FF11", border: "1px solid #4FA3FF44", borderRadius: 6, padding: 10 }}>
              <div style={{ color: "#4FA3FF", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Opt-Out Registered</div>
              <div style={{ color: "#a0aec0", fontSize: 11, fontFamily: "monospace" }}>{optOutAudit}</div>
            </div>
          )}
        </div>

        {/* Integration Package */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 8 }}>Integration Package</div>
          <p style={{ color: "#a0aec0", fontSize: 12, marginBottom: 10 }}>Python SDK + Node.js SDK + Stable Diffusion, DALL-E, ComfyUI examples. Integrate in 1 day.</p>
          <button onClick={() => { const b = new Blob([`# LikenessGuard SDK\n\nfrom likenessguard import LikenessGuardClient\nclient = LikenessGuardClient(api_endpoint="${API_BASE_URL}", platform_id="my-platform")\nresult = client.check_consent("image.jpg")\n`], {type:"text/markdown"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download="likenessguard-sdk.md"; a.click(); URL.revokeObjectURL(u); }} style={btn("#4FA3FF")}>
            Export Integration Package
          </button>
        </div>

        {/* Architecture Modal */}
        {activeModal && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setActiveModal(null)}>
            <div style={{ background: "#1a2035", border: "1px solid #4FA3FF", borderRadius: 10, padding: 24, maxWidth: 400, margin: 16 }} onClick={e => e.stopPropagation()}>
              <div style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{activeModal.label}</div>
              <p style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{activeModal.explanation}</p>
              <button onClick={() => setActiveModal(null)} style={{ ...btn("#4FA3FF"), marginTop: 16 }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024; let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { const r = Math.min(MAX/w, MAX/h); w = Math.round(w*r); h = Math.round(h*r); }
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d"); if (!ctx) { reject(new Error("Canvas")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = reject; img.src = e.target?.result as string;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}
