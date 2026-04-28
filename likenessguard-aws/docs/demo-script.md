# LikenessGuard v2 — Demo Video Script (< 3 minutes)

## Scene 1: The Problem (0:00 – 0:20)

**Narrator:** "AI image generators can use anyone's face — without permission. LikenessGuard v2 is the world's first system that enforces consent *before* generation happens."

*Show: A deepfake image being generated. Red "BLOCKED" overlay appears.*

---

## Scene 2: Registration + Proof-of-Face (0:20 – 0:50)

**Narrator:** "Register your likeness in seconds. Upload photos — LikenessGuard generates a cryptographic fingerprint using Amazon Bedrock Titan Embeddings."

*Show: Registration page. Upload 3 photos. Success message with likeness ID.*

**Narrator:** "Every ALLOW decision produces a Proof-of-Face — a KMS-signed C2PA certificate that proves consent was checked."

*Show: ProofOfFacePreview component. Manifest fields. Download button. Signature field.*

---

## Scene 3: Multi-Agent Consent Check (0:50 – 1:30)

**Narrator:** "When a platform submits a reference image, three Bedrock agents work together in under 300 milliseconds."

*Show: ConsentCheck page. Upload reference image. Loading spinner.*

**Narrator:** "First, the Anomaly Agent screens for jailbreaks and prompt injection. Then, Titan Embeddings searches our OpenSearch vector index for a match. Finally, the Consent Orchestrator reasons over the policy and returns a decision."

*Show: AgentReasoningTrace component expanding. Three sections: Anomaly (CLEARED, 15ms), Matcher (MATCH 94.2%, 25ms), Orchestrator (ALLOW, 70ms). Total: 247ms.*

*Show: ALLOW decision with blue badge. Proof-of-Face certificate appears.*

---

## Scene 4: Natural Language Policy (1:30 – 1:50)

**Narrator:** "Subjects control their policy in plain English — no JSON required."

*Show: NLPolicyEditor. Type: "Allow personal use only. Block all face swaps and political content." Click Convert. Policy summary appears. Confirm.*

---

## Scene 5: Edge Offline Enforcement (1:50 – 2:10)

**Narrator:** "LikenessGuard works offline too. Our Greengrass v2 edge component caches fingerprints locally and enforces default-deny when disconnected."

*Show: EdgeStatusIndicator. Click "Simulate Offline". Status turns red. Run consent check. DENY with reason OFFLINE_NO_CACHE.*

*Show: Click "Go Online". Status turns blue. "Syncing..." then "ONLINE". Unsynced decisions uploaded.*

---

## Scene 6: Impact Dashboard + Compliance (2:10 – 2:40)

**Narrator:** "The Impact Dashboard shows live metrics — false negative rate, P95 latency, cost per 1000 checks, and full compliance status."

*Show: ImpactDashboard. Metrics cards: 12,847 checks today, 0.31% false negatives, 247ms P95, $0.048/1000.*

*Show: Compliance badges: EU AI Act COMPLIANT, C2PA v1.3 COMPLIANT, ANZ Privacy COMPLIANT.*

*Show: Click "Export Compliance Report". JSON file downloads.*

---

## Scene 7: 1-Day SDK Integration (2:40 – 2:55)

**Narrator:** "Any AI platform can integrate in one day — 10 lines of Python."

*Show: Code snippet:*
```python
from likenessguard import LikenessGuardClient
client = LikenessGuardClient(api_endpoint="...", platform_id="my-platform")
result = client.check_consent("reference.jpg", usage_type="GENERAL_GENERATION")
if result.denied:
    raise PermissionError(f"Consent denied: {result.reason_code}")
```

---

## Scene 8: Closing (2:55 – 3:00)

**Narrator:** "LikenessGuard v2. The new global standard for responsible AI consent."

*Show: Logo. "World's First" claims list. AWS logo.*

---

## Key Talking Points for Judges

1. **World's first** Bedrock multi-agent pre-generation consent enforcement
2. **< 0.5% false negatives** — down from 1.2% in v1
3. **< 300ms P95** — full multi-agent pipeline
4. **< $5/month** at 100k checks
5. **Cryptographic proof** — not just a flag in a database
6. **Works offline** — edge-first, default-deny
7. **1-day integration** — Python + Node.js SDK
8. **Regulation-ready** — EU AI Act, C2PA, ANZ Privacy, GDPR Art. 9
