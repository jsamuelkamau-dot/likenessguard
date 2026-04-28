# LikenessGuard v2 — Compliance Checklist

## EU AI Act

| Article | Requirement | Status | Evidence |
|---------|-------------|--------|----------|
| Art. 9 | Risk management system | COMPLIANT | Anomaly Agent + Guardrails |
| Art. 10 | Data governance | COMPLIANT | No raw biometrics stored; vectors only |
| Art. 13 | Transparency | COMPLIANT | C2PA manifest + reasoning trace in every response |
| Art. 14 | Human oversight | COMPLIANT | Subject can update/revoke policy at any time |
| Art. 17 | Quality management | COMPLIANT | Audit log + CloudWatch metrics |
| Art. 26 | Obligations for deployers | COMPLIANT | SDK includes compliance documentation |

## C2PA (Coalition for Content Provenance and Authenticity)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Signed manifest | COMPLIANT | KMS ECDSA P-256 signature |
| Content binding | COMPLIANT | SHA-256 reference image hash in manifest |
| Provenance chain | COMPLIANT | manifest_id + audit_id linkage |
| Public key distribution | COMPLIANT | JWKS endpoint via CloudFront |
| Version | C2PA 1.3 | Declared in manifest compliance field |

## ANZ Privacy Laws

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Biometric data consent | COMPLIANT | Explicit registration + policy confirmation |
| Data minimisation | COMPLIANT | Photos deleted after processing (S3 lifecycle 1 day) |
| Right of access | COMPLIANT | Evidence retrieval API returns all records for subject |
| Right to deletion | COMPLIANT | DELETE /consent removes all vectors + policy |
| Retention limits | COMPLIANT | Audit log 7-year TTL (regulatory minimum) |
| Cross-border transfers | COMPLIANT | All data stays in configured AWS region |

## GDPR Article 9 (Biometric Data)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Explicit consent | COMPLIANT | Registration requires explicit policy confirmation |
| Pseudonymisation | COMPLIANT | Subject IDs are UUIDs, not PII |
| Data protection by design | COMPLIANT | Default-deny edge + provisional DENY-ALL |
| Breach notification | COMPLIANT | CloudWatch alarms + audit log tamper detection |
