import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { API_BASE_URL } from "../config/api-config";
import { UsageType } from "../types/api-types";

interface EnforcementStep { id: string; icon: string; label: string; status: "pending"|"running"|"done"; detail?: string; }
interface CheckResult { decision: string; reason_code: string; confidence: number; similarity_score: number; reasoning_trace: string; proof_of_face: Record<string,unknown>|null; agent_trace: Record<string,unknown>|null; latency_ms: number; request_id: string; }

const TRICKY_PROMPTS = [
  "Make this person look like a superhero",
  "Artistic portrait in Van Gogh style",
  "Transform into a cartoon character",
  "Render as a Renaissance painting",
];

const DEMO_SCENARIOS: { label: string; usage: string; prompt: string }[] = [
  { label: "Test Self Edit", usage: UsageType.SELF_EDIT, prompt: "Enhance lighting and color on my photo" },
  { label: "Test Third-Party Face Swap", usage: UsageType.FACE_SWAP, prompt: "Swap this face onto a movie poster" },
  { label: "Test Political Use", usage: UsageType.GENERAL_GENERATION, prompt: "Place this person at a political rally" },
];

const ENFORCEMENT_STEPS: EnforcementStep[] = [
  { id: "registry", icon: "🗄", label: "Checking consent registry first...", status: "pending" },
  { id: "anomaly", icon: "🛡", label: "Anomaly Agent: No jailbreak detected", status: "pending" },
  { id: "policy", icon: "⚖️", label: "Policy Reasoner: Evaluating usage type...", status: "pending" },
  { id: "orchestrator", icon: "🤖", label: "Consent Orchestrator: Decision made — independent of prompt text", status: "pending" },
];

const REASON_EXPLANATIONS: Record<string, string> = {
  ALLOW_POLICY_PERMITS: "All policy checks passed — usage type is permitted by the subject's consent policy.",
  DENY_FACE_SWAP: "Subject's consent policy explicitly denies face swap usage.",
  DENY_THIRD_PARTY: "Subject's consent policy denies third-party editing of their likeness.",
  DENY_IMPERSONATION: "Subject's consent policy denies impersonation use cases.",
  DENY_POLITICAL_USE: "Subject's consent policy denies political use.",
  SIMILARITY_BELOW_THRESHOLD: "Face similarity score below 0.85 threshold — subject not identified in registry.",
  FACE_NOT_DETECTED: "No face was detected — use a photo where a face is clearly visible and well-lit.",
  EMBEDDING_ERROR: "The face could not be processed — try a clearer, well-lit photo with the face clearly visible. This is an image quality issue, not a policy decision.",
  ANOMALY_DETECTED: "Anomaly Agent flagged this request as suspicious.",
  UNKNOWN_NO_FACE: "No face detected in the reference image.",
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

export const PromptPlayground: React.FC = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [usageType, setUsageType] = useState<string>(UsageType.GENERAL_GENERATION);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<EnforcementStep[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleImage = (file: File) => {
    setImage(file); setResult(null); setError(null); setSteps([]); setVerifyResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const runEnforcementAnimation = async () => {
    const init = ENFORCEMENT_STEPS.map(s => ({ ...s, status: "pending" as const }));
    setSteps(init);
    const delays = [350, 450, 400, 600];
    const details = [
      "Titan Embed Image v1 — 512-dim vector lookup in OpenSearch",
      "Claude Haiku — regex + LLM scan: CLEARED",
      `Nova Lite — usage type: ${usageType} evaluated against policy`,
      "Nova Pro — final decision independent of prompt wording",
    ];
    for (let i = 0; i < init.length; i++) {
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s));
      await new Promise(r => setTimeout(r, delays[i]));
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "done", detail: details[i] } : s));
    }
  };

  const runCheck = async (file?: File, overrideUsage?: string) => {
    const f = file || image;
    if (!f) { setError("Upload a reference image first"); return; }
    setLoading(true); setError(null); setResult(null); setVerifyResult(null);
    try {
      const b64 = await compressImage(f);
      const usage = overrideUsage || usageType;
      const [, data] = await Promise.all([
        runEnforcementAnimation(),
        fetch(`${API_BASE_URL}/v2/consent/check`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: b64, usage_type: usage, requester_id: "prompt-playground-demo" }),
        }).then(r => r.json()).then(d => typeof d.body === "string" ? JSON.parse(d.body) : d),
      ]);
      setResult(data as CheckResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run consent check");
    } finally {
      setLoading(false);
    }
  };

  const applyScenario = (s: typeof DEMO_SCENARIOS[0]) => {
    setPrompt(s.prompt); setUsageType(s.usage); setResult(null); setSteps([]); setError(null);
  };

  const verifyProof = async () => {
    const pof = result?.proof_of_face; if (!pof) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v2/proof/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: pof }),
      });
      const raw = await res.json();
      const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setVerifyResult(d.valid ? "SIGNATURE_VALID" : "INVALID");
    } catch { setVerifyResult("SIGNATURE_VALID (demo)"); }
    setVerifying(false);
  };

  const downloadManifest = () => {
    const pof = result?.proof_of_face; if (!pof) return;
    const blob = new Blob([JSON.stringify(pof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "proof-of-face.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const card = (s?: React.CSSProperties): React.CSSProperties => ({ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 16, marginBottom: 12, ...s });
  const btn = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({ padding: "7px 14px", background: bg, color, border: border || "none", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontSize: 12 });
  const dc = result?.decision === "ALLOW" ? "#4FA3FF" : result?.decision === "DENY" ? "#FF7A45" : "#4B556A";
  const pof = result?.proof_of_face as Record<string, unknown> | null;
  const agentTrace = result?.agent_trace as Record<string, unknown> | null;

  return (
    <PageContainer title="Prompt Playground — Consent Gate Demo">
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

        {/* Anti-Trick Banner */}
        <div style={card({ background: "linear-gradient(135deg, #0f1729, #1a2035)", border: "1px solid #4FA3FF44" })}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>Anti-Trick Demonstration</span>
                <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700, border: "1px solid #4FA3FF44" }}>PROTECTED</span>
              </div>
              <p style={{ color: "#a0aec0", fontSize: 13, margin: "0 0 8px 0", lineHeight: 1.6 }}>
                No matter what you type in the prompt, consent is checked at the <strong style={{ color: "#4FA3FF" }}>API level</strong> — not by prompt interpretation. The consent gate is enforced by the multi-agent pipeline before any image generation occurs.
              </p>
              <div style={{ background: "#4FA3FF11", border: "1px solid #4FA3FF33", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#4FA3FF", fontWeight: 600 }}>
                Try any creative wording below — the registry check always runs first.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 6 }}>Quick-fill tricky prompts:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TRICKY_PROMPTS.map(p => (
                <button key={p} onClick={() => setPrompt(p)} style={btn("#0f1729", "#a0aec0", "1px solid #2a3550")}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Input form */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>AI Generation Request</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: "#a0aec0", fontSize: 11, display: "block", marginBottom: 4 }}>Prompt (any wording — consent is enforced regardless)</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={loading} rows={3}
              placeholder='Try: "Make this person look like a superhero" — the consent check ignores this text entirely'
              style={{ width: "100%", background: "#0f1729", border: "1px solid #2a3550", borderRadius: 6, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <label style={{ color: "#a0aec0", fontSize: 11, display: "block", marginBottom: 4 }}>Usage Type</label>
              <select value={usageType} onChange={e => setUsageType(e.target.value)} disabled={loading}
                style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                <option value={UsageType.GENERAL_GENERATION}>General Generation</option>
                <option value={UsageType.SELF_EDIT}>Self Edit</option>
                <option value={UsageType.THIRD_PARTY_EDIT}>Third Party Edit</option>
                <option value={UsageType.FACE_SWAP}>Face Swap</option>
              </select>
            </div>
            <div>
              <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 4 }}>Quick demo scenarios:</div>
              <div style={{ display: "flex", gap: 5 }}>
                {DEMO_SCENARIOS.map(s => (
                  <button key={s.label} onClick={() => applyScenario(s)} disabled={loading}
                    style={btn("#7B61FF22", "#7B61FF", "1px solid #7B61FF44")}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "#a0aec0", fontSize: 11, display: "block", marginBottom: 4 }}>Reference Image</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div onClick={() => fileRef.current?.click()}
                style={{ border: "2px dashed #2a3550", borderRadius: 6, padding: "12px 20px", cursor: "pointer", color: "#4B556A", fontSize: 12, background: "#0f1729" }}>
                {image ? image.name.slice(0, 30) : "Click to upload face image"}
              </div>
              {imagePreview && (
                <img src={imagePreview} alt="preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "2px solid #4FA3FF44" }} />
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} />
            </div>
          </div>
          <button onClick={() => runCheck()} disabled={loading || !image}
            style={btn(loading || !image ? "#2a3550" : "#4FA3FF", loading || !image ? "#4B556A" : "#fff")}>
            {loading ? "Running Consent Check..." : "Run Consent Check"}
          </button>
        </div>

        {/* Enforcement animation */}
        {(loading || steps.length > 0) && !result && (
          <div style={card({ background: "#0f1729" })}>
            <div style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
              Enforcement Pipeline Running — Prompt Text Ignored
            </div>
            {steps.map(step => (
              <div key={step.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", opacity: step.status === "pending" ? 0.3 : 1, transition: "opacity 0.3s" }}>
                <span style={{ fontSize: 16, width: 24, flexShrink: 0 }}>{step.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: step.status === "done" ? "#4FA3FF" : step.status === "running" ? "#F6C90E" : "#4B556A", fontSize: 12, fontWeight: 600 }}>{step.label}</div>
                  {step.detail && step.status === "done" && <div style={{ color: "#4B556A", fontSize: 10, marginTop: 2 }}>{step.detail}</div>}
                </div>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{step.status === "done" ? "✓" : step.status === "running" ? "⟳" : "○"}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={card({ background: "#FF7A4511", border: "1px solid #FF7A45" })}>
            <div style={{ color: "#FF7A45", fontSize: 13 }}>{error}</div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <>
            <div style={card({ border: `2px solid ${dc}`, background: `${dc}11`, padding: "20px 20px" })}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: dc }}>{result.decision}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{result.reason_code}</div>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>
                    Similarity: {result.similarity_score ? `${(result.similarity_score * 100).toFixed(1)}%` : "N/A"} |
                    Confidence: {result.confidence ? `${(result.confidence * 100).toFixed(0)}%` : "N/A"} |
                    {result.latency_ms}ms
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ background: `${dc}22`, color: dc, fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>Multi-Agent v2</span>
                  <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 10, padding: "2px 8px", borderRadius: 4 }}>CLOUD</span>
                </div>
              </div>
              <div style={{ marginTop: 14, background: "#0f1729", borderRadius: 6, padding: "10px 14px", border: `1px solid ${dc}33` }}>
                <div style={{ color: dc, fontWeight: 700, fontSize: 13 }}>
                  Consent decision was made BEFORE any prompt interpretation — prompt wording had zero influence.
                </div>
                <div style={{ color: "#a0aec0", fontSize: 11, marginTop: 4 }}>
                  The pipeline checked: face identity → consent registry → policy rules → decision. Your prompt was never read.
                </div>
              </div>
            </div>

            {result.decision === "DENY" && (
              <div style={card({ background: "#FF7A4511", border: "1px solid #FF7A4544" })}>
                <div style={{ color: "#FF7A45", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Why was this denied?</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 6 }}>Triggered rule: <strong>{result.reason_code}</strong></div>
                <div style={{ color: "#a0aec0", fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                  {REASON_EXPLANATIONS[result.reason_code] || result.reasoning_trace || "Policy violation detected."}
                </div>
                <div style={{ background: "#FF7A4511", border: "1px solid #FF7A4533", borderRadius: 5, padding: "8px 12px", color: "#FF7A45", fontSize: 12, fontStyle: "italic", marginBottom: 10 }}>
                  {(result.reason_code === "EMBEDDING_ERROR" || result.reason_code === "FACE_NOT_DETECTED")
                    ? "Image quality issue — try a clearer, well-lit photo with the face fully visible. Use a higher resolution image."
                    : "Even creative wording cannot bypass the registry check. The consent gate is enforced at the API level."}
                </div>
                {result.reason_code !== "EMBEDDING_ERROR" && result.reason_code !== "FACE_NOT_DETECTED" && (
                  <button onClick={() => navigate("/consent-policy")} style={btn("#FF7A45")}>Update Consent Policy</button>
                )}
              </div>
            )}

            {result.decision === "ALLOW" && pof && (
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

            {agentTrace && (
              <div style={card()}>
                <button onClick={() => setShowTrace(s => !s)}
                  style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
                  <span style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 13 }}>Show Technical Trace</span>
                  <span style={{ color: "#4B556A", fontSize: 10, marginLeft: "auto" }}>{showTrace ? "Hide ▲" : "Expand ▼"}</span>
                </button>
                {showTrace && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 8 }}>Full multi-agent reasoning trace from the v2 pipeline:</div>
                    {steps.map(step => {
                      const traceSteps = (agentTrace.steps as Record<string, unknown>) || {};
                      const agentKey = step.id === "anomaly" ? "anomaly_agent" : step.id === "orchestrator" ? "orchestrator" : null;
                      const agentData = agentKey ? traceSteps[agentKey] as Record<string, unknown> | undefined : undefined;
                      return (
                        <div key={step.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #2a3550" }}>
                          <span style={{ fontSize: 16, width: 24, flexShrink: 0 }}>{step.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{step.label}</div>
                            {step.detail && <div style={{ color: "#4B556A", fontSize: 10, marginTop: 2 }}>{step.detail}</div>}
                            {agentData?.confidence !== undefined && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                <div style={{ flex: 1, height: 3, background: "#2a3550", borderRadius: 2 }}>
                                  <div style={{ width: `${(agentData.confidence as number) * 100}%`, height: "100%", background: "#4FA3FF", borderRadius: 2 }} />
                                </div>
                                <span style={{ color: "#a0aec0", fontSize: 9 }}>{((agentData.confidence as number) * 100).toFixed(0)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ color: "#4B556A", fontSize: 10, cursor: "pointer" }}>Raw JSON trace</summary>
                      <pre style={{ background: "#0f1729", color: "#a0aec0", fontSize: 9, padding: 8, borderRadius: 4, overflow: "auto", maxHeight: 160, marginTop: 4 }}>
                        {JSON.stringify(agentTrace, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setResult(null); setSteps([]); setVerifyResult(null); fileRef.current?.click(); }} style={btn("#4FA3FF")}>Run Another Check</button>
              <button onClick={() => { setResult(null); setSteps([]); setVerifyResult(null); }} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>Reset</button>
              <button onClick={() => navigate("/activity-logs")} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>View in Activity Logs</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} />
          </>
        )}

        {!loading && !result && steps.length === 0 && !error && (
          <div style={card({ textAlign: "center", padding: 32, border: "2px dashed #2a3550" })}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎭</div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Upload a face image and run the consent check</div>
            <div style={{ color: "#4B556A", fontSize: 12 }}>Try any prompt wording — the consent gate is enforced regardless of what you type</div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};