import React, { useState } from "react";
import { API_BASE_URL } from "../../config/api-config";

interface Props { proof: Record<string, unknown> | null; className?: string; }

export const ProofOfFacePreview: React.FC<Props> = ({ proof, className }) => {
  const [showRaw, setShowRaw] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason: string } | null>(null);

  if (!proof) return null;

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proof-of-face-${(proof.manifest_id as string)?.slice(0, 8) || "manifest"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verifyNow = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v2/proof/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: proof })
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setVerifyResult({ valid: data.valid, reason: data.reason });
    } catch {
      setVerifyResult({ valid: false, reason: "Network error" });
    } finally {
      setVerifying(false);
    }
  };

  const decision = (proof.decision as Record<string, unknown>);
  const subject = (proof.subject as Record<string, unknown>);
  const proofData = (proof.proof as Record<string, unknown>);
  const compliance = (proof.compliance as Record<string, unknown>);
  const softBinding = (proof.soft_binding as Record<string, unknown>);

  const row = (label: string, value: string, mono = false) => (
    <div style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #1a2035" }}>
      <span style={{ color: "#4B556A", fontSize: 11, minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: 11, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{value}</span>
    </div>
  );

  const btn = (bg: string, color = "#fff"): React.CSSProperties => ({ padding: "7px 14px", background: bg, color, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 });

  return (
    <div style={{ background: "#0f1729", border: "1px solid #4FA3FF44", borderRadius: 8, overflow: "hidden" }} className={className}>
      {/* Header */}
      <div style={{ background: "#4FA3FF11", padding: "10px 16px", borderBottom: "1px solid #4FA3FF33", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>🔐</span>
        <span style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 14, flex: 1 }}>Proof-of-Face Certificate</span>
        <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 10, padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>C2PA 1.3</span>
        <span style={{ background: "#4FA3FF22", color: "#4FA3FF", fontSize: 10, padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>KMS ECDSA</span>
      </div>

      {/* Fields */}
      <div style={{ padding: "8px 16px" }}>
        {proof.manifest_id && row("Manifest ID", proof.manifest_id as string, true)}
        {decision?.outcome && row("Decision", decision.outcome as string)}
        {decision?.similarity_score !== undefined && row("Similarity Score", `${((decision.similarity_score as number) * 100).toFixed(1)}%`)}
        {decision?.usage_type && row("Usage Type", decision.usage_type as string)}
        {subject?.id && row("Subject ID", subject.id as string, true)}
        {proof.created_at && row("Issued At", new Date(proof.created_at as string).toLocaleString())}
        {proof.expires_at && row("Expires At", new Date(proof.expires_at as string).toLocaleString())}
        {proofData?.algorithm && row("Algorithm", proofData.algorithm as string)}
        {compliance?.eu_ai_act && row("EU AI Act", compliance.eu_ai_act as string)}
        {compliance?.c2pa_version && row("C2PA Version", compliance.c2pa_version as string)}
        {proofData?.signature && row("Signature (preview)", `${(proofData.signature as string).slice(0, 40)}...`, true)}
      </div>

      {/* Soft binding */}
      {softBinding?.embed_snippet && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid #2a3550" }}>
          <div style={{ color: "#4B556A", fontSize: 11, marginBottom: 4 }}>Soft-Binding Embed Snippet:</div>
          <pre style={{ background: "#1a2035", color: "#a0aec0", fontSize: 10, padding: 8, borderRadius: 4, overflow: "auto", margin: 0 }}>
            {softBinding.embed_snippet as string}
          </pre>
        </div>
      )}

      {/* Verify result */}
      {verifyResult && (
        <div style={{ padding: "8px 16px", background: verifyResult.valid ? "#4FA3FF11" : "#FF7A4511", borderTop: `1px solid ${verifyResult.valid ? "#4FA3FF44" : "#FF7A4544"}` }}>
          <span style={{ color: verifyResult.valid ? "#4FA3FF" : "#FF7A45", fontWeight: 700, fontSize: 13 }}>
            {verifyResult.valid ? "✓ SIGNATURE VALID" : "✗ INVALID"} — {verifyResult.reason}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #2a3550", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={btn("#4FA3FF")} onClick={downloadJson}>Download JSON</button>
        <button style={btn(verifying ? "#2a3550" : "#1a2035", "#4FA3FF")} onClick={verifyNow} disabled={verifying}>
          {verifying ? "Verifying..." : "Verify Now"}
        </button>
        <button style={btn("#1a2035", "#a0aec0")} onClick={() => setShowRaw(s => !s)}>
          {showRaw ? "Hide Raw" : "View Raw"}
        </button>
      </div>

      {showRaw && (
        <pre style={{ background: "#0f1729", color: "#a0aec0", fontSize: 10, padding: 16, margin: 0, overflow: "auto", maxHeight: 300, borderTop: "1px solid #2a3550" }}>
          {JSON.stringify(proof, null, 2)}
        </pre>
      )}
    </div>
  );
};
