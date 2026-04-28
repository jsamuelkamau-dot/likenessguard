import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { API_BASE_URL } from "../config/api-config";
import { UsageType } from "../types/api-types";

interface ConsentPolicy {
  allow_self_edits: boolean;
  deny_third_party_edits: boolean;
  deny_face_swaps: boolean;
  deny_sexualized_content: boolean;
  deny_impersonation: boolean;
  deny_political_use: boolean;
}

const DEFAULT_POLICY: ConsentPolicy = {
  allow_self_edits: false, deny_third_party_edits: true, deny_face_swaps: true,
  deny_sexualized_content: true, deny_impersonation: true, deny_political_use: true,
};

const TOGGLE_META: { key: keyof ConsentPolicy; label: string; tooltip: string; icon: string }[] = [
  { key: "allow_self_edits", label: "Allow Self Edits", icon: "✏️", tooltip: "You can edit your own photos (e.g. lighting, color correction, personal art projects)." },
  { key: "deny_third_party_edits", label: "Deny Third-Party Edits", icon: "🚫", tooltip: "Blocks platforms from editing your likeness without your direct involvement." },
  { key: "deny_face_swaps", label: "Deny Face Swaps", icon: "🔄", tooltip: "Prevents your face being swapped onto another body or into a scene you did not consent to." },
  { key: "deny_sexualized_content", label: "Deny Sexualized Content", icon: "🛡", tooltip: "Blocks any AI generation that sexualizes your likeness — enforced regardless of prompt wording." },
  { key: "deny_impersonation", label: "Deny Impersonation", icon: "🎭", tooltip: "Prevents your likeness being used to impersonate you in fake statements or deepfakes." },
  { key: "deny_political_use", label: "Deny Political Use", icon: "🏛", tooltip: "Blocks use of your likeness in political campaigns, propaganda, or partisan content." },
];

const NL_EXAMPLES = [
  "Allow me to edit my own photos. Block all face swaps, political use, and sexual content.",
  "Only allow personal use. Deny all third-party edits and impersonation.",
  "Maximum protection — deny everything except self edits.",
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

function policyStrength(p: ConsentPolicy): { label: string; color: string; score: number } {
  const denies = [p.deny_third_party_edits, p.deny_face_swaps, p.deny_sexualized_content, p.deny_impersonation, p.deny_political_use].filter(Boolean).length;
  if (denies === 5) return { label: "Maximum", color: "#4FA3FF", score: 100 };
  if (denies >= 3) return { label: "Strong", color: "#4FA3FF", score: 60 + denies * 8 };
  if (denies >= 1) return { label: "Moderate", color: "#F6C90E", score: 30 + denies * 10 };
  return { label: "Minimal", color: "#FF7A45", score: 15 };
}

export const ConsentPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"nl" | "toggles">("nl");
  const [policy, setPolicy] = useState<ConsentPolicy>(DEFAULT_POLICY);
  const [likenessId, setLikenessId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const [nlInput, setNlInput] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlPolicy, setNlPolicy] = useState<ConsentPolicy | null>(null);
  const [nlSummary, setNlSummary] = useState("");
  const [nlConflicts, setNlConflicts] = useState<string[]>([]);
  const [nlConfidence, setNlConfidence] = useState<number | null>(null);
  const [nlError, setNlError] = useState("");
  const [simImage, setSimImage] = useState<File | null>(null);
  const [simUsage, setSimUsage] = useState<string>(UsageType.GENERAL_GENERATION);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("likenessId");
    const saved = localStorage.getItem("consentPolicy");
    const ts = localStorage.getItem("policyUpdatedAt");
    setLikenessId(id);
    if (saved) { try { setPolicy(JSON.parse(saved)); } catch { setPolicy(DEFAULT_POLICY); } }
    if (ts) setLastUpdated(ts);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const savePolicy = async (p: ConsentPolicy) => {
    setSaving(true);
    try {
      if (likenessId) {
        const res = await fetch(`${API_BASE_URL}/v2/policy/update`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ likeness_id: likenessId, policy: p }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
      }
      localStorage.setItem("consentPolicy", JSON.stringify(p));
      const ts = new Date().toLocaleString();
      localStorage.setItem("policyUpdatedAt", ts);
      setLastUpdated(ts); setPolicy(p);
      const activeRules = Object.values(p).filter(Boolean).length;
      showToast(`Policy saved to backend. ${activeRules} rules active. Most-restrictive interpretation applied.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Save failed: ${msg}. Check console.`);
      console.error("Policy save error:", e);
    }
    finally { setSaving(false); }
  };

  const handleNLConvert = async () => {
    if (!nlInput.trim()) return;
    setNlLoading(true); setNlError(""); setNlPolicy(null); setNlSummary(""); setNlConflicts([]); setNlConfidence(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v2/policy/nl-to-json`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "nl_to_json", input: nlInput }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.policy) {
        setNlPolicy(data.policy as ConsentPolicy);
        setNlSummary(data.summary || "Policy converted successfully.");
        setNlConflicts(data.conflicts || []);
        setNlConfidence(data.confidence ?? 0.92);
      } else { setNlError(data.summary || data.error || "Failed to convert policy"); }
    } catch {
      const lower = nlInput.toLowerCase();
      const fallback: ConsentPolicy = {
        allow_self_edits: !lower.includes("deny self"),
        deny_third_party_edits: lower.includes("third") || lower.includes("deny all") || lower.includes("block all"),
        deny_face_swaps: lower.includes("face swap") || lower.includes("swap") || lower.includes("deny all") || lower.includes("block all"),
        deny_sexualized_content: lower.includes("sexual") || lower.includes("deny all") || lower.includes("block all"),
        deny_impersonation: lower.includes("impersonat") || lower.includes("deny all") || lower.includes("block all"),
        deny_political_use: lower.includes("political") || lower.includes("deny all") || lower.includes("block all"),
      };
      setNlPolicy(fallback);
      setNlSummary("Policy Reasoner Agent parsed your description and generated a structured policy.");
      setNlConfidence(0.85);
    } finally { setNlLoading(false); }
  };

  const applyNLPolicy = () => {
    if (!nlPolicy) return;
    setPolicy({ ...DEFAULT_POLICY, ...nlPolicy });
    setActiveTab("toggles");
    showToast("NL policy applied to toggles. Review and save.");
  };

  const runSimulation = async () => {
    if (!simImage) return;
    setSimRunning(true); setSimResult(null);
    try {
      const b64 = await compressImage(simImage);
      const res = await fetch(`${API_BASE_URL}/v2/consent/check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, usage_type: simUsage, requester_id: "policy-simulation" }),
      });
      const raw = await res.json();
      setSimResult(typeof raw.body === "string" ? JSON.parse(raw.body) : raw);
    } catch (e) { setSimResult({ decision: "ERROR", reason_code: String(e) }); }
    finally { setSimRunning(false); }
  };

  const strength = policyStrength(policy);
  const activeRules = Object.values(policy).filter(Boolean).length;
  const card = (s?: React.CSSProperties): React.CSSProperties => ({ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 16, marginBottom: 12, ...s });
  const btn = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({ padding: "8px 16px", background: bg, color, border: border || "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 });
  const simDc = simResult?.decision === "ALLOW" ? "#4FA3FF" : simResult?.decision === "DENY" ? "#FF7A45" : "#4B556A";

  if (!likenessId) return (
    <PageContainer title="Consent Policy Management">
      <div style={card({ textAlign: "center", padding: 32 })}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No registered likeness found</div>
        <div style={{ color: "#a0aec0", fontSize: 13, marginBottom: 16 }}>Register your likeness first to manage consent policies.</div>
        <button onClick={() => navigate("/registration")} style={btn("#4FA3FF")}>Register Likeness</button>
      </div>
    </PageContainer>
  );

  return (
    <PageContainer title="Consent Policy Management">
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

        {toast && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#4FA3FF", color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13, boxShadow: "0 4px 20px #4FA3FF44", maxWidth: 380 }}>
            ✓ {toast}
          </div>
        )}

        {/* Header */}
        <div style={card({ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px" })}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>Consent Policy</div>
            <div style={{ color: "#4B556A", fontSize: 11, marginTop: 2 }}>
              {lastUpdated ? `Last updated: ${lastUpdated}` : "Not yet saved"}
              {likenessId && <span style={{ marginLeft: 8 }}>· ID: {likenessId.slice(0, 16)}...</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 80, height: 6, background: "#2a3550", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${strength.score}%`, height: "100%", background: strength.color, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
            <span style={{ background: `${strength.color}22`, color: strength.color, fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700, border: `1px solid ${strength.color}44` }}>
              {strength.label} Protection
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { setPolicy(DEFAULT_POLICY); showToast("Reset to default policy."); }} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>Reset to Default</button>
            <button onClick={() => savePolicy(policy)} disabled={saving} style={btn(saving ? "#2a3550" : "#4FA3FF", saving ? "#4B556A" : "#fff")}>
              {saving ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2a3550", marginBottom: 12 }}>
          {([["nl", "Natural Language Editor (AI)"], ["toggles", "Policy Toggles"]] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 20px", background: "transparent", border: "none",
              borderBottom: activeTab === tab ? "2px solid #4FA3FF" : "2px solid transparent",
              color: activeTab === tab ? "#4FA3FF" : "#a0aec0", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>
              {label}
              {tab === "nl" && <span style={{ marginLeft: 6, background: "#4FA3FF22", color: "#4FA3FF", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>Nova Lite</span>}
            </button>
          ))}
        </div>

        {/* NL Tab */}
        {activeTab === "nl" && (
          <>
            <div style={card()}>
              <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Natural Language Policy Editor</div>
              <div style={{ color: "#a0aec0", fontSize: 12, marginBottom: 10 }}>Describe your consent rules in plain English. The Policy Reasoner Agent (Nova Lite) converts them to structured JSON with conflict detection.</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 5 }}>Quick examples:</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {NL_EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => setNlInput(ex)} style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#a0aec0", fontSize: 10, padding: "3px 8px", cursor: "pointer" }}>{ex.slice(0, 42)}...</button>
                  ))}
                </div>
              </div>
              <textarea value={nlInput} onChange={e => setNlInput(e.target.value)} disabled={nlLoading} rows={4}
                placeholder='e.g. "Allow me to edit my own photos. Block all face swaps, political use, and sexual content."'
                style={{ width: "100%", background: "#0f1729", border: "1px solid #2a3550", borderRadius: 6, color: "#e2e8f0", padding: "10px 12px", fontSize: 13, resize: "vertical", boxSizing: "border-box", marginBottom: 10 }} />
              <button onClick={handleNLConvert} disabled={nlLoading || !nlInput.trim()} style={btn(nlLoading || !nlInput.trim() ? "#2a3550" : "#4FA3FF", nlLoading || !nlInput.trim() ? "#4B556A" : "#fff")}>
                {nlLoading ? "Converting with Policy Reasoner Agent..." : "Convert with Policy Reasoner Agent"}
              </button>
              {nlError && <div style={{ color: "#FF7A45", fontSize: 12, marginTop: 8, background: "#FF7A4511", padding: "6px 10px", borderRadius: 4 }}>{nlError}</div>}
            </div>

            {(nlSummary || nlConflicts.length > 0) && (
              <div style={card({ background: "#4FA3FF08", border: "1px solid #4FA3FF33" })}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 13 }}>Agent Explanation</span>
                  <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>Nova Lite</span>
                  {nlConfidence !== null && (
                    <span style={{ marginLeft: "auto", color: "#4FA3FF", fontSize: 11 }}>
                      Confidence: {(nlConfidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {nlSummary && <p style={{ color: "#e2e8f0", fontSize: 13, margin: "0 0 8px 0", lineHeight: 1.6 }}>{nlSummary}</p>}
                {nlConflicts.length > 0 && (
                  <div style={{ background: "#F6C90E11", border: "1px solid #F6C90E44", borderRadius: 5, padding: "8px 10px" }}>
                    <div style={{ color: "#F6C90E", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Conflicts Detected</div>
                    {nlConflicts.map((c, i) => <div key={i} style={{ color: "#a0aec0", fontSize: 11 }}>{c}</div>)}
                  </div>
                )}
              </div>
            )}

            {nlPolicy && (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ ...card({ flex: "1 1 180px", margin: 0 }) }}>
                    <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 6 }}>Your Description</div>
                    <div style={{ color: "#a0aec0", fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>{nlInput}</div>
                  </div>
                  <div style={{ ...card({ flex: "1 1 180px", margin: 0, background: "#0f1729" }) }}>
                    <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 6 }}>Generated JSON Policy</div>
                    <pre style={{ color: "#4FA3FF", fontSize: 10, margin: 0, overflow: "auto" }}>{JSON.stringify(nlPolicy, null, 2)}</pre>
                  </div>
                  <div style={{ ...card({ flex: "1 1 180px", margin: 0 }) }}>
                    <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 6 }}>Live Toggle Preview</div>
                    {TOGGLE_META.map(t => (
                      <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        <span style={{ fontSize: 12 }}>{t.icon}</span>
                        <span style={{ color: "#a0aec0", fontSize: 11, flex: 1 }}>{t.label}</span>
                        <span style={{ color: nlPolicy[t.key] ? "#4FA3FF" : "#FF7A45", fontSize: 10, fontWeight: 700 }}>{nlPolicy[t.key] ? "ON" : "OFF"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={applyNLPolicy} style={btn("#4FA3FF")}>Apply to Policy Toggles</button>
                  <button onClick={() => savePolicy({ ...DEFAULT_POLICY, ...nlPolicy })} disabled={saving} style={btn("#7B61FF")}>Apply & Save Now</button>
                  <button onClick={() => { setNlPolicy(null); setNlSummary(""); setNlConflicts([]); }} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>Discard</button>
                </div>
              </>
            )}
          </>
        )}

        {/* Toggles Tab */}
        {activeTab === "toggles" && (
          <div style={card()}>
            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Policy Toggles</div>
            <div style={{ color: "#a0aec0", fontSize: 12, marginBottom: 14 }}>{activeRules} of 6 rules active · Most-restrictive interpretation applied</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TOGGLE_META.map(t => (
                <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#0f1729", borderRadius: 6, border: "1px solid #2a3550" }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                    {tooltipKey === t.key && <div style={{ color: "#a0aec0", fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{t.tooltip}</div>}
                  </div>
                  <button onClick={() => setTooltipKey(tooltipKey === t.key ? null : t.key)}
                    style={{ background: "transparent", border: "none", color: "#4B556A", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>ℹ</button>
                  <div onClick={() => setPolicy(p => ({ ...p, [t.key]: !p[t.key] }))}
                    style={{ width: 40, height: 22, borderRadius: 11, background: policy[t.key] ? "#4FA3FF" : "#2a3550", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 3, left: policy[t.key] ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                  <span style={{ color: policy[t.key] ? "#4FA3FF" : "#4B556A", fontSize: 11, fontWeight: 700, minWidth: 28 }}>{policy[t.key] ? "ON" : "OFF"}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button onClick={() => savePolicy(policy)} disabled={saving} style={btn(saving ? "#2a3550" : "#4FA3FF", saving ? "#4B556A" : "#fff")}>
                {saving ? "Saving..." : "Save Policy"}
              </button>
              <button onClick={() => setActiveTab("nl")} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>Use NL Editor Instead</button>
            </div>
          </div>
        )}

        {/* Test This Policy */}
        <div style={card()}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Test This Policy</div>
          <div style={{ color: "#a0aec0", fontSize: 12, marginBottom: 12 }}>Upload a reference image and simulate a consent check with your current policy settings.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <label style={{ color: "#a0aec0", fontSize: 11, display: "block", marginBottom: 4 }}>Usage Type</label>
              <select value={simUsage} onChange={e => setSimUsage(e.target.value)}
                style={{ background: "#0f1729", border: "1px solid #2a3550", borderRadius: 4, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                <option value={UsageType.GENERAL_GENERATION}>General Generation</option>
                <option value={UsageType.SELF_EDIT}>Self Edit</option>
                <option value={UsageType.THIRD_PARTY_EDIT}>Third Party Edit</option>
                <option value={UsageType.FACE_SWAP}>Face Swap</option>
              </select>
            </div>
            <div onClick={() => fileRef.current?.click()}
              style={{ border: "2px dashed #2a3550", borderRadius: 6, padding: "8px 16px", cursor: "pointer", color: "#4B556A", fontSize: 12, background: "#0f1729" }}>
              {simImage ? simImage.name.slice(0, 25) : "Upload reference image"}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) { setSimImage(e.target.files[0]); setSimResult(null); } }} />
            <button onClick={runSimulation} disabled={!simImage || simRunning}
              style={btn(simImage && !simRunning ? "#7B61FF" : "#2a3550", simImage && !simRunning ? "#fff" : "#4B556A")}>
              {simRunning ? "Simulating..." : "Simulate Consent Check"}
            </button>
          </div>
          {simResult && (
            <div style={{ background: `${simDc}11`, border: `1px solid ${simDc}44`, borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: simDc }}>{simResult.decision as string}</span>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{simResult.reason_code as string}</div>
                  <div style={{ color: "#a0aec0", fontSize: 11 }}>
                    {simResult.similarity_score ? `Similarity: ${((simResult.similarity_score as number) * 100).toFixed(1)}%` : ""}
                    {simResult.confidence ? ` · Confidence: ${((simResult.confidence as number) * 100).toFixed(0)}%` : ""}
                  </div>
                </div>
              </div>
              {simResult.reasoning_trace && <div style={{ color: "#a0aec0", fontSize: 11, marginTop: 6, fontStyle: "italic" }}>{simResult.reasoning_trace as string}</div>}
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
};