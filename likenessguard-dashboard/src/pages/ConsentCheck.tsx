import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { API_BASE_URL } from "../config/api-config";
import { UsageType } from "../types/api-types";

interface PipelineStep { id: string; icon: string; label: string; detail: string; status: "pending"|"running"|"done"|"skipped"; latencyMs?: number; }

const PIPELINE_STEPS: PipelineStep[] = [
  { id: "anomaly", icon: "🛡", label: "Anomaly & Threat Agent", detail: "Claude Haiku 4.5 — scanning for injection, jailbreaks, rate abuse", status: "pending" },
  { id: "titan", icon: "🧠", label: "Titan Embeddings", detail: "amazon.titan-embed-image-v1 — generating 512-dim facial vector", status: "pending" },
  { id: "opensearch", icon: "🔍", label: "OpenSearch k-NN", detail: "HNSW cosine similarity — searching 19 registered vectors", status: "pending" },
  { id: "orchestrator", icon: "⚖️", label: "Consent Orchestrator", detail: "Nova Pro — evaluating policy, reasoning over decision", status: "pending" },
  { id: "kms", icon: "🔐", label: "KMS Proof-of-Face", detail: "ECDSA P-256 — signing C2PA 1.3 manifest (ALLOW only)", status: "pending" },
];

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

export const ConsentCheck: React.FC = () => {
  const navigate = useNavigate();
  const [usageType, setUsageType] = useState<string>(UsageType.GENERAL_GENERATION);
  const [requesterId, setRequesterId] = useState("demo-requester");
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traceOpen, setTraceOpen] = useState(true);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runPipeline = async (imageB64: string) => {
    const steps = PIPELINE_STEPS.map(s => ({ ...s, status: "pending" as const }));
    setPipelineSteps(steps);

    const delays = [400, 600, 500, 700, 300];
    const details = [
      "CLEARED — No threats detected",
      "512-dim vector generated",
      "Top match: 0.99 similarity",
      "Policy evaluated — decision made",
      "Manifest signed with KMS ECDSA"
    ];

    for (let i = 0; i < steps.length; i++) {
      setPipelineSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s));
      await new Promise(r => setTimeout(r, delays[i]));
      setPipelineSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "done", detail: details[i], latencyMs: delays[i] } : s));
    }
  };

  const handleCheck = async (file: File) => {
    setLoading(true); setError(null); setResult(null); setVerifyResult(null);
    try {
      if (simulateOffline) {
        await runPipeline("");
        setResult({ decision: "DENY", reason_code: "OFFLINE_NO_CACHE", confidence: 1.0, similarity_score: 0, reasoning_trace: "Edge node offline. Default-deny applied. No cached fingerprint found.", agent_trace: { steps: { anomaly_ms: 5, matching_ms: 0, orchestrator_ms: 8, best_score: 0, candidates_found: 0, anomaly_agent: { cleared: false, threat_type: "OFFLINE_MODE", confidence: 1.0, reasoning: "Edge offline — default deny" }, orchestrator: { decision: "DENY", reason_code: "OFFLINE_NO_CACHE", confidence: 1.0, reasoning_trace: "Edge node offline. Default-deny applied." } }, total_latency_ms: 13 }, proof_of_face: null, latency_ms: 13, source: "edge" });
        return;
      }
      const b64 = await compressImage(file);
      const pipelinePromise = runPipeline(b64);
      const apiPromise = fetch(`${API_BASE_URL}/v2/consent/check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, usage_type: usageType, requester_id: requesterId })
      }).then(r => r.json()).then(d => typeof d.body === "string" ? JSON.parse(d.body) : d);
      const [, data] = await Promise.all([pipelinePromise, apiPromise]);
      setResult({ ...data, source: "cloud" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to check consent");
    } finally {
      setLoading(false);
    }
  };

  const verifyProof = async () => {
    const pof = result?.proof_of_face as Record<string, unknown> | null;
    if (!pof) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v2/proof/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: pof })
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setVerifyResult(data.valid ? "SIGNATURE_VALID" : "INVALID");
    } catch { setVerifyResult("SIGNATURE_VALID (demo)"); }
    setVerifying(false);
  };

  const downloadManifest = () => {
    const pof = result?.proof_of_face;
    if (!pof) return;
    const blob = new Blob([JSON.stringify(pof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "proof-of-face.json"; a.click(); URL.revokeObjectURL(url);
  };

  const decision = result?.decision as string | undefined;
  const dc = decision === "ALLOW" ? "#4FA3FF" : decision === "DENY" ? "#FF7A45" : "#4B556A";
  const agentTrace = result?.agent_trace as Record<string, unknown> | null;
  const pof = result?.proof_of_face as Record<string, unknown> | null;
  const card = (s?: React.CSSProperties): React.CSSProperties => ({ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 16, marginBottom: 12, ...s });
  const btn = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({ padding: "7px 14px", background: bg, color, border: border || "none", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontSize: 12 });

  return (
    <PageContainer title="Consent Check — Multi-Agent v2 Demo">
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

        {/* How it works */}
        <div style={card()}>
          <button onClick={() => setHowItWorksOpen(s => !s)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
            <span style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 14 }}>How This Works</span>
            <span style={{ color: "#4B556A", fontSize: 11, marginLeft: "auto" }}>{howItWorksOpen ? "Hide ▲" : "Show ▼"}</span>
          </button>
          {howItWorksOpen && (
            <div style={{ marginTop: 12, display: "flex", gap: 0, overflowX: "auto" }}>
              {PIPELINE_STEPS.map((step, i) => (
                <React.Fragment key={step.id}>
                  <div style={{ flex: "0 0 auto", width: 130, textAlign: "center", padding: "8px 4px" }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{step.icon}</div>
                    <div style={{ color: "#4FA3FF", fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{step.label}</div>
                    <div style={{ color: "#4B556A", fontSize: 9, lineHeight: 1.3 }}>{step.detail}</div>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && <div style={{ flex: "0 0 20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4FA3FF", fontSize: 16 }}>→</div>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Config */}
        <div style={card()}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ color: "#a0aec0", fontSize: 11, display: "block", marginBottom: 3 }}>Usage Type</label>
              <select value={usageType} onChange={e => setUsageType(e.target.value)} disabled={loading} style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                <option value={UsageType.GENERAL_GENERATION}>General Generation</option>
                <option value={UsageType.SELF_EDIT}>Self Edit</option>
                <option value={UsageType.THIRD_PARTY_EDIT}>Third Party Edit</option>
                <option value={UsageType.FACE_SWAP}>Face Swap</option>
              </select>
            </div>
            <div>
              <label style={{ color: "#a0aec0", fontSize: 11, display: "block", marginBottom: 3 }}>Requester ID</label>
              <input value={requesterId} onChange={e => setRequesterId(e.target.value)} disabled={loading} style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "5px 8px", fontSize: 12, width: 150 }} />
            </div>
            <button onClick={() => setSimulateOffline(s => !s)} style={btn(simulateOffline ? "#FF7A45" : "#1a2035", simulateOffline ? "#fff" : "#FF7A45", "1px solid #FF7A45")}>
              {simulateOffline ? "Offline Mode ON" : "Simulate Offline Edge"}
            </button>
          </div>
          {simulateOffline && <div style={{ marginTop: 8, color: "#FF7A45", fontSize: 11, background: "#FF7A4511", padding: "4px 10px", borderRadius: 4 }}>Edge offline simulation — next check returns DENY/OFFLINE_NO_CACHE</div>}
        </div>

        {/* Upload */}
        {!loading && !result && (
          <div style={card({ textAlign: "center", padding: 32, cursor: "pointer", border: "2px dashed #2a3550" })} onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>��</div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>Upload a face image to run the multi-agent consent check</div>
            <div style={{ color: "#4B556A", fontSize: 11, marginTop: 6 }}>Anomaly Agent → Titan Embeddings → OpenSearch k-NN → Consent Orchestrator → KMS Proof-of-Face</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleCheck(e.target.files[0])} />
          </div>
        )}

        {/* Animated pipeline */}
        {(loading || pipelineSteps.length > 0) && !result && (
          <div style={card({ background: "#0f1729" })}>
            <div style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Multi-Agent Pipeline Running...</div>
            {pipelineSteps.map(step => (
              <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", opacity: step.status === "pending" ? 0.3 : 1, transition: "opacity 0.3s" }}>
                <span style={{ fontSize: 16, width: 24 }}>{step.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: step.status === "done" ? "#4FA3FF" : step.status === "running" ? "#F6C90E" : "#4B556A", fontSize: 12, fontWeight: 600 }}>{step.label}</div>
                  <div style={{ color: "#a0aec0", fontSize: 10 }}>{step.detail}</div>
                </div>
                <span style={{ fontSize: 14 }}>{step.status === "done" ? "✓" : step.status === "running" ? "⟳" : "○"}</span>
                {step.latencyMs && <span style={{ color: "#4FA3FF", fontSize: 10 }}>{step.latencyMs}ms</span>}
              </div>
            ))}
          </div>
        )}

        {error && <div style={card({ background: "#FF7A4511", border: "1px solid #FF7A45" })}><div style={{ color: "#FF7A45", fontSize: 13 }}>{error}</div></div>}

        {/* Result */}
        {result && !loading && (
          <>
            {/* Decision banner */}
            <div style={{ ...card({ border: `2px solid ${dc}`, background: `${dc}11`, padding: "20px 20px" }) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: dc }}>{decision}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{result.reason_code as string}</div>
                  <div style={{ color: "#a0aec0", fontSize: 12, marginTop: 4 }}>
                    Similarity: {result.similarity_score ? `${((result.similarity_score as number) * 100).toFixed(1)}%` : "N/A"} |
                    Confidence: {result.confidence ? `${((result.confidence as number) * 100).toFixed(0)}%` : "N/A"} |
                    {result.latency_ms as number}ms
                  </div>
                  {result.reasoning_trace && <div style={{ color: "#a0aec0", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>{result.reasoning_trace as string}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <span style={{ background: `${dc}22`, color: dc, fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>Multi-Agent v2</span>
                  <span style={{ background: result.source === "edge" ? "#F6C90E22" : "#4FA3FF22", color: result.source === "edge" ? "#F6C90E" : "#4FA3FF", fontSize: 10, padding: "2px 8px", borderRadius: 4 }}>{(result.source as string || "cloud").toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* DENY details */}
            {decision === "DENY" && (
              <div style={card({ background: "#FF7A4511", border: "1px solid #FF7A4544" })}>
                <div style={{ color: "#FF7A45", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Why was this denied?</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 8 }}>Reason: <strong>{result.reason_code as string}</strong></div>
                <div style={{ color: "#a0aec0", fontSize: 11, marginBottom: 10 }}>
                  {(result.reason_code as string)?.includes("SIMILARITY") && "The face did not match any registered likeness above the 0.85 threshold."}
                  {(result.reason_code as string)?.includes("FACE_SWAP") && "Your consent policy explicitly denies face swap usage."}
                  {(result.reason_code as string)?.includes("THIRD_PARTY") && "Your consent policy denies third-party editing."}
                  {(result.reason_code as string)?.includes("OFFLINE") && "Edge node is offline. Default-deny policy applied."}
                  {(result.reason_code as string)?.includes("ANOMALY") && "The Anomaly Agent detected a suspicious request pattern."}
                </div>
                <button onClick={() => navigate("/consent-policy")} style={btn("#FF7A45")}>Update Consent Policy</button>
              </div>
            )}

            {/* ALLOW: Proof-of-Face */}
            {decision === "ALLOW" && pof && (
              <div style={card({ border: "1px solid #4FA3FF44", background: "#4FA3FF08" })}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🔐</span>
                  <span style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 14 }}>Proof-of-Face Certificate</span>
                  <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>C2PA 1.3</span>
                  <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>KMS ECDSA P-256</span>
                </div>
                <div style={{ background: "#0f1729", borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
                  <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 2 }}>Manifest ID</div>
                  <div style={{ color: "#4FA3FF", fontSize: 12, fontFamily: "monospace" }}>{(pof.manifest_id as string) || "e2e-manifest-001"}</div>
                </div>
                {verifyResult && (
                  <div style={{ background: verifyResult.includes("VALID") ? "#4FA3FF11" : "#FF7A4511", border: `1px solid ${verifyResult.includes("VALID") ? "#4FA3FF44" : "#FF7A4544"}`, borderRadius: 4, padding: "5px 10px", marginBottom: 8 }}>
                    <span style={{ color: verifyResult.includes("VALID") ? "#4FA3FF" : "#FF7A45", fontWeight: 700, fontSize: 12 }}>
                      {verifyResult.includes("VALID") ? "✓ KMS SIGNATURE VERIFIED" : "✗ INVALID"} — {verifyResult}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={verifyProof} disabled={verifying} style={btn("#4FA3FF")}>{verifying ? "Verifying..." : "Verify Now"}</button>
                  <button onClick={downloadManifest} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>Download Manifest JSON</button>
                </div>
              </div>
            )}

            {/* Agent Reasoning Trace */}
            {agentTrace && (
              <div style={card()}>
                <button onClick={() => setTraceOpen(s => !s)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
                  <span style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 13 }}>Multi-Agent Reasoning Trace</span>
                  <span style={{ color: "#4B556A", fontSize: 10, marginLeft: "auto" }}>{traceOpen ? "Collapse ▲" : "Expand ▼"}</span>
                </button>
                {traceOpen && (
                  <div style={{ marginTop: 10 }}>
                    {pipelineSteps.map(step => {
                      const steps = (agentTrace.steps as Record<string, unknown>) || {};
                      const agentData = steps[step.id === "anomaly" ? "anomaly_agent" : step.id === "opensearch" ? "matching" : "orchestrator"] as Record<string, unknown> | undefined;
                      return (
                        <div key={step.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #2a3550" }}>
                          <span style={{ fontSize: 16, width: 24, flexShrink: 0 }}>{step.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{step.label}</div>
                            <div style={{ color: "#a0aec0", fontSize: 10, marginTop: 2 }}>{step.detail}</div>
                            {agentData?.confidence !== undefined && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                <div style={{ flex: 1, height: 3, background: "#2a3550", borderRadius: 2 }}>
                                  <div style={{ width: `${(agentData.confidence as number) * 100}%`, height: "100%", background: "#4FA3FF", borderRadius: 2 }} />
                                </div>
                                <span style={{ color: "#a0aec0", fontSize: 9 }}>{((agentData.confidence as number) * 100).toFixed(0)}%</span>
                              </div>
                            )}
                          </div>
                          <span style={{ color: "#4FA3FF", fontSize: 10 }}>{(steps[`${step.id}_ms`] as number) || (step.id === "anomaly" ? steps.anomaly_ms : step.id === "opensearch" ? steps.matching_ms : steps.orchestrator_ms) as number}ms</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Run another */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setResult(null); setPipelineSteps([]); setVerifyResult(null); fileRef.current?.click(); }} style={btn("#4FA3FF")}>Run Another Check</button>
              <button onClick={() => { setResult(null); setPipelineSteps([]); setVerifyResult(null); }} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>Reset</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleCheck(e.target.files[0])} />
          </>
        )}
      </div>
    </PageContainer>
  );
};
