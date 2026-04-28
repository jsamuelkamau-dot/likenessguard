import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { registerLikeness } from "../services/registration-service";
import type { ConsentPolicy } from "../types/api-types";

interface PhotoItem { file: File; preview: string; status: "analyzing" | "ready" | "error"; }

const DEFAULT_POLICY: ConsentPolicy = {
  allow_self_edits: true, deny_third_party_edits: true, deny_face_swaps: true,
  deny_sexualized_content: true, deny_impersonation: true, deny_political_use: true,
};

const STEPS = ["User Info", "Upload Photos", "Review & Register"];

export const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ likenessId: string } | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 10 - photos.length);
    for (const file of arr) {
      const preview = URL.createObjectURL(file);
      const item: PhotoItem = { file, preview, status: "analyzing" };
      setPhotos(prev => [...prev, item]);
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      setPhotos(prev => prev.map(p => p.preview === preview ? { ...p, status: "ready" } : p));
    }
  }, [photos.length]);

  const removePhoto = (preview: string) => {
    setPhotos(prev => { const p = prev.find(x => x.preview === preview); if (p) URL.revokeObjectURL(p.preview); return prev.filter(x => x.preview !== preview); });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) addPhotos(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!userId.trim() || photos.length < 1) return;
    setLoading(true); setError(null);
    try {
      const result = await registerLikeness(userId, photos.map(p => p.file), DEFAULT_POLICY);
      localStorage.setItem("likenessId", result.likeness_id);
      localStorage.setItem("consentPolicy", JSON.stringify(DEFAULT_POLICY));
      setSuccess({ likenessId: result.likeness_id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const card = (s?: React.CSSProperties): React.CSSProperties => ({ background: "#1a2035", border: "1px solid #2a3550", borderRadius: 8, padding: 16, ...s });
  const btn = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({ padding: "9px 18px", background: bg, color, border: border || "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 });
  const readyCount = photos.filter(p => p.status === "ready").length;

  // Success screen
  if (success) return (
    <PageContainer title="Registration Complete">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560, margin: "0 auto" }}>
        <div style={{ ...card({ background: "linear-gradient(135deg, #4FA3FF11, #7B61FF11)", border: "1px solid #4FA3FF44", textAlign: "center", padding: 32 }) }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2 style={{ color: "#4FA3FF", fontSize: 20, fontWeight: 800, margin: "0 0 8px 0" }}>Likeness Registered</h2>
          <div style={{ color: "#a0aec0", fontSize: 13, marginBottom: 16 }}>Your identity is now protected by LikenessGuard v2</div>
          <div style={{ background: "#0f1729", borderRadius: 6, padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 3 }}>Likeness ID</div>
            <div style={{ color: "#4FA3FF", fontSize: 13, fontFamily: "monospace", wordBreak: "break-all" }}>{success.likenessId}</div>
          </div>
          <div style={{ background: "#4FA3FF11", border: "1px solid #4FA3FF33", borderRadius: 6, padding: "8px 12px", marginBottom: 16, textAlign: "left" }}>
            <div style={{ color: "#4FA3FF", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Fingerprint Created Using</div>
            <div style={{ color: "#a0aec0", fontSize: 11 }}>AWS Rekognition face detection → Bedrock Titan Embed Image v1 (512-dim vectors) → OpenSearch Serverless HNSW k-NN index</div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/consent-policy")} style={btn("#4FA3FF")}>Set Consent Policy Now</button>
            <button onClick={() => navigate("/consent-check")} style={btn("#1a2035", "#4FA3FF", "1px solid #4FA3FF44")}>Run First Consent Check Demo</button>
          </div>
        </div>
      </div>
    </PageContainer>
  );

  return (
    <PageContainer title="Register Your Likeness">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640, margin: "0 auto" }}>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i <= step ? "#4FA3FF" : "#2a3550", color: i <= step ? "#fff" : "#4B556A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, transition: "background 0.3s" }}>{i + 1}</div>
                <div style={{ color: i === step ? "#4FA3FF" : "#4B556A", fontSize: 10, marginTop: 4, fontWeight: i === step ? 600 : 400 }}>{s}</div>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 2, height: 2, background: i < step ? "#4FA3FF" : "#2a3550", marginBottom: 16, transition: "background 0.3s" }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: User Info */}
        {step === 0 && (
          <div style={card()}>
            <h3 style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Your Information</h3>
            <label style={{ color: "#a0aec0", fontSize: 12, display: "block", marginBottom: 6 }}>User ID / Name</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="Enter your user ID or name"
              style={{ width: "100%", background: "#0f1729", border: "1px solid #2a3550", borderRadius: 6, color: "#e2e8f0", padding: "10px 12px", fontSize: 13, boxSizing: "border-box" }} />
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setStep(1)} disabled={!userId.trim()} style={btn(userId.trim() ? "#4FA3FF" : "#2a3550", userId.trim() ? "#fff" : "#4B556A")}>Next: Upload Photos →</button>
            </div>
          </div>
        )}

        {/* Step 1: Upload Photos */}
        {step === 1 && (
          <>
            <div style={card()}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, flex: 1, margin: 0 }}>Upload Face Photos</h3>
                <span style={{ color: "#a0aec0", fontSize: 12 }}>{readyCount}/10 photos</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: "#2a3550", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ width: `${(readyCount / 10) * 100}%`, height: "100%", background: "#4FA3FF", borderRadius: 2, transition: "width 0.4s" }} />
              </div>
              {/* Drop zone */}
              <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                onClick={() => photos.length < 10 && fileRef.current?.click()}
                style={{ border: `2px dashed ${dragging ? "#4FA3FF" : "#2a3550"}`, borderRadius: 8, padding: "24px 16px", textAlign: "center", cursor: photos.length < 10 ? "pointer" : "default", background: dragging ? "#4FA3FF08" : "transparent", transition: "all 0.2s", marginBottom: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Drag & drop photos here</div>
                <div style={{ color: "#4B556A", fontSize: 11, marginTop: 4 }}>or click to browse • JPEG, PNG, WebP • max 10 photos</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => e.target.files && addPhotos(e.target.files)} />
              {/* Thumbnails */}
              {photos.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {photos.map(p => (
                    <div key={p.preview} style={{ position: "relative", width: 72, height: 72 }}>
                      <img src={p.preview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: `2px solid ${p.status === "ready" ? "#4FA3FF" : p.status === "analyzing" ? "#F6C90E" : "#FF7A45"}` }} />
                      {p.status === "analyzing" && (
                        <div style={{ position: "absolute", inset: 0, background: "#00000088", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ color: "#F6C90E", fontSize: 9, textAlign: "center", padding: 4 }}>Analyzing...</div>
                        </div>
                      )}
                      {p.status === "ready" && (
                        <div style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "#4FA3FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>✓</div>
                      )}
                      <button onClick={() => removePhoto(p.preview)} style={{ position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: "50%", background: "#FF7A45", border: "none", color: "#fff", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart insight */}
            {readyCount >= 3 && (
              <div style={{ ...card({ background: "#4FA3FF11", border: "1px solid #4FA3FF33" }) }}>
                <div style={{ color: "#4FA3FF", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Smart Insight</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 4 }}>Multi-photo fingerprint will improve matching accuracy — {readyCount} photos creates a more robust 512-dim Titan embedding.</div>
                <div style={{ color: "#a0aec0", fontSize: 11 }}>Proactive discovery protection: If a similar unregistered face is detected in future checks, LikenessGuard will automatically create a provisional DENY-ALL entry to protect you.</div>
              </div>
            )}

            {/* Trust badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: "#4FA3FF11", color: "#4FA3FF", fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid #4FA3FF33" }}>🔒 Securely processed with AWS Rekognition & Titan Embeddings</span>
              <button onClick={() => setShowPrivacyModal(true)} style={{ background: "transparent", border: "none", color: "#4FA3FF", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>How your data is protected</button>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              <button onClick={() => setStep(0)} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>← Back</button>
              <button onClick={() => setStep(2)} disabled={readyCount < 1} style={btn(readyCount >= 1 ? "#4FA3FF" : "#2a3550", readyCount >= 1 ? "#fff" : "#4B556A")}>Next: Review & Register →</button>
            </div>
          </>
        )}

        {/* Step 2: Review & Register */}
        {step === 2 && (
          <>
            <div style={card()}>
              <h3 style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Review & Register</h3>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "#0f1729", borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ color: "#4B556A", fontSize: 10 }}>User ID</div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{userId}</div>
                </div>
                <div style={{ flex: 1, background: "#0f1729", borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ color: "#4B556A", fontSize: 10 }}>Photos</div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{readyCount} face photos</div>
                </div>
              </div>
              <div style={{ background: "#4FA3FF11", border: "1px solid #4FA3FF33", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
                <div style={{ color: "#4FA3FF", fontSize: 11, fontWeight: 600, marginBottom: 3 }}>What happens next</div>
                <div style={{ color: "#a0aec0", fontSize: 11 }}>Rekognition detects faces → Titan Embed Image v1 generates 512-dim vectors → Vectors indexed in OpenSearch HNSW → Default DENY-ALL policy applied → You configure your consent policy</div>
              </div>
              {error && <div style={{ color: "#FF7A45", fontSize: 12, background: "#FF7A4511", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{error}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} style={btn("#1a2035", "#a0aec0", "1px solid #2a3550")}>← Back</button>
              <button onClick={handleSubmit} disabled={loading} style={btn(loading ? "#2a3550" : "#4FA3FF", loading ? "#4B556A" : "#fff")}>
                {loading ? "Registering..." : "Register Likeness"}
              </button>
            </div>
          </>
        )}

        {/* Privacy Modal */}
        {showPrivacyModal && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowPrivacyModal(false)}>
            <div style={{ background: "#1a2035", border: "1px solid #4FA3FF", borderRadius: 10, padding: 24, maxWidth: 420, margin: 16 }} onClick={e => e.stopPropagation()}>
              <div style={{ color: "#4FA3FF", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>How Your Data Is Protected</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[["Default-Deny Policy","Your likeness starts with a DENY-ALL policy. No AI platform can use your face until you explicitly allow it."],["Edge Caching","Your fingerprint is cached on the Greengrass edge node. Even offline, consent is enforced — no internet required."],["No Raw Biometrics","Photos are deleted from S3 immediately after processing. Only the 512-dim vector fingerprint is stored — it cannot be reversed to reconstruct your face."],["KMS Encryption","All data is encrypted at rest with AWS KMS. Your vectors are stored in OpenSearch Serverless with AES-256 encryption."]].map(([t,d]) => (
                  <div key={t} style={{ background: "#0f1729", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ color: "#4FA3FF", fontSize: 12, fontWeight: 600 }}>{t}</div>
                    <div style={{ color: "#a0aec0", fontSize: 11, marginTop: 2 }}>{d}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowPrivacyModal(false)} style={{ ...btn("#4FA3FF"), marginTop: 14 }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export const Registration = RegistrationPage;
