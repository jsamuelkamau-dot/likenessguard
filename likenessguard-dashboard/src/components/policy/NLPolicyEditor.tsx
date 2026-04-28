import React, { useState } from "react";

interface ConsentPolicy {
  allow_self_edits: boolean;
  deny_third_party_edits: boolean;
  deny_face_swaps: boolean;
  deny_sexualized_content: boolean;
  deny_impersonation: boolean;
  deny_political_use: boolean;
  platform_allowlist?: string[];
  platform_blocklist?: string[];
  commercial_use_allowed?: boolean;
}

interface Props {
  onPolicySaved?: (policy: ConsentPolicy) => void;
  apiBase?: string;
}

export const NLPolicyEditor: React.FC<Props> = ({ onPolicySaved, apiBase = "" }) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<ConsentPolicy | null>(null);
  const [summary, setSummary] = useState("");
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleConvert = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setPolicy(null);
    setSummary("");
    setConflicts([]);
    setConfirmed(false);
    try {
      const res = await fetch(`${apiBase}/v2/policy/nl-to-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "nl_to_json", input })
      });
      const data = await res.json();
      const body = typeof data.body === "string" ? JSON.parse(data.body) : data;
      if (body.policy) {
        setPolicy(body.policy);
        setSummary(body.summary || "");
        setConflicts(body.conflicts || []);
      } else {
        setError(body.summary || "Failed to convert policy");
      }
    } catch (e) {
      setError("Failed to reach policy service");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (policy && onPolicySaved) {
      onPolicySaved(policy);
      setConfirmed(true);
    }
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "#0f1729", border: "1px solid #2a3550", borderRadius: 6, color: "#e2e8f0", padding: "10px 12px", fontSize: 14, resize: "vertical", minHeight: 80, boxSizing: "border-box" };
  const btnStyle: React.CSSProperties = { padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ color: "#a0aec0", fontSize: 13, display: "block", marginBottom: 6 }}>
          Describe your consent policy in plain English
        </label>
        <textarea
          style={inputStyle}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='e.g. "Allow my likeness for personal use only. Block all face swaps and political content. Only allow platforms I approve."'
          disabled={loading}
          aria-label="Natural language policy input"
        />
      </div>

      <button style={{ ...btnStyle, background: "#4FA3FF", color: "#fff", alignSelf: "flex-start" }} onClick={handleConvert} disabled={loading || !input.trim()}>
        {loading ? "Converting..." : "Convert to Policy"}
      </button>

      {error && <div style={{ color: "#FF7A45", fontSize: 13, padding: "8px 12px", background: "#FF7A4511", borderRadius: 6 }}>{error}</div>}

      {conflicts.length > 0 && (
        <div style={{ background: "#F6C90E11", border: "1px solid #F6C90E44", borderRadius: 6, padding: 12 }}>
          <div style={{ color: "#F6C90E", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Conflicts Detected</div>
          {conflicts.map((c, i) => <div key={i} style={{ color: "#a0aec0", fontSize: 12 }}>{c}</div>)}
        </div>
      )}

      {summary && (
        <div style={{ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 6, padding: 12 }}>
          <div style={{ color: "#4FA3FF", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Policy Summary</div>
          <p style={{ color: "#e2e8f0", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{summary}</p>
        </div>
      )}

      {policy && !confirmed && (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...btnStyle, background: "#4FA3FF", color: "#fff" }} onClick={handleSave}>Confirm and Save Policy</button>
          <button style={{ ...btnStyle, background: "#1a2035", color: "#a0aec0", border: "1px solid #2a3550" }} onClick={() => { setPolicy(null); setSummary(""); }}>Discard</button>
        </div>
      )}

      {confirmed && <div style={{ color: "#4FA3FF", fontSize: 13, fontWeight: 600 }}>Policy saved successfully.</div>}
    </div>
  );
};
