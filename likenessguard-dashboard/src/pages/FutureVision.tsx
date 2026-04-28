import React from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import styles from './FutureVision.module.css';

export const FutureVision: React.FC = () => {
  return (
    <PageContainer title="Future Vision – Consent Alliance">
      <div className={styles.container}>
        
        
        {/* Open Source Banner */}
        <div style={{ background: "linear-gradient(135deg, #4FA3FF22, #7B61FF22)", border: "2px solid #4FA3FF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 28 }}>🌐</span>
            <div>
              <div style={{ color: "#4FA3FF", fontWeight: 800, fontSize: 18 }}>Going Open Source — Apache 2.0</div>
              <div style={{ color: "#a0aec0", fontSize: 13 }}>After April 30, 2026 — Free for everyone to use, modify, and deploy</div>
            </div>
            <span style={{ marginLeft: "auto", background: "#4FA3FF", color: "#fff", fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>COMING SOON</span>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
            LikenessGuard v2 will be released as open-source under the Apache 2.0 license. Any developer, platform, or organization will be able to deploy their own consent enforcement registry.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Full source code on GitHub","Apache 2.0 License","Self-hostable on AWS","Community-driven roadmap","SDK packages on PyPI + npm","Docker + CloudFormation templates"].map(f => (
              <span key={f} style={{ background: "#4FA3FF11", color: "#4FA3FF", fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #4FA3FF33" }}>{f}</span>
            ))}
          </div>
        </div>
{/* Hero Section */}
        <Card className={styles.heroCard}>
          <h2 className={styles.heroTitle}>
            A Global Standard for AI Consent Enforcement
          </h2>
          <p className={styles.heroSubtitle}>
            LikenessGuard demonstrates that consent enforcement before AI image generation 
            is technically possible and practical. The long-term vision extends beyond a 
            centralized service to become an industry-wide standard.
          </p>
        </Card>

        {/* Current State */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.iconWrapper}>
              <svg className={styles.sectionIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 className={styles.sectionTitle}>Today: Live Consent Enforcement API</h3>
          </div>
          <p className={styles.sectionText}>
            LikenessGuard currently operates as a consent enforcement API that AI platforms 
            can integrate with today. Before generating or modifying images containing human 
            likenesses, platforms query the API to verify consent.
          </p>
          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Real-time consent verification</span>
            </div>
            <div className={styles.featureItem}>
              <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Facial fingerprint matching</span>
            </div>
            <div className={styles.featureItem}>
              <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Policy-based decision engine</span>
            </div>
            <div className={styles.featureItem}>
              <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Comprehensive audit logging</span>
            </div>
          </div>
        </Card>

        {/* Future Ecosystem */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.iconWrapper}>
              <svg className={styles.sectionIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className={styles.sectionTitle}>Future: Industry-Wide Adoption</h3>
          </div>
          <p className={styles.sectionText}>
            The goal is not centralized control, but universal adoption of consent enforcement 
            standards across the AI industry. Multiple implementation paths enable broad adoption:
          </p>
          
          <div className={styles.pathwayGrid}>
            <div className={styles.pathwayCard}>
              <div className={styles.pathwayNumber}>1</div>
              <h4 className={styles.pathwayTitle}>Direct API Integration</h4>
              <p className={styles.pathwayText}>
                AI platforms integrate directly with the LikenessGuard API to perform 
                consent checks before generating or modifying images.
              </p>
            </div>
            
            <div className={styles.pathwayCard}>
              <div className={styles.pathwayNumber}>2</div>
              <h4 className={styles.pathwayTitle}>Internal Implementation</h4>
              <p className={styles.pathwayText}>
                Platforms implement the same consent enforcement logic internally within 
                their own infrastructure while meeting standard consent requirements.
              </p>
            </div>
            
            <div className={styles.pathwayCard}>
              <div className={styles.pathwayNumber}>3</div>
              <h4 className={styles.pathwayTitle}>Federated Registries</h4>
              <p className={styles.pathwayText}>
                Multiple consent registries interoperate using shared standards, enabling 
                cooperation without centralized dependency.
              </p>
            </div>
            
            <div className={styles.pathwayCard}>
              <div className={styles.pathwayNumber}>4</div>
              <h4 className={styles.pathwayTitle}>Regulatory Reference</h4>
              <p className={styles.pathwayText}>
                Governments and regulators reference these standards for responsible 
                AI systems and compliance frameworks.
              </p>
            </div>
          </div>

          <div className={styles.principleBox}>
            <svg className={styles.principleIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <p className={styles.principleText}>
              The essential requirement: AI systems must verify consent before using 
              real human likeness in image generation workflows.
            </p>
          </div>
        </Card>

        {/* Benefits */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.iconWrapper}>
              <svg className={styles.sectionIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className={styles.sectionTitle}>Benefits of This Approach</h3>
          </div>
          
          <div className={styles.benefitGrid}>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>🏢</div>
              <h4 className={styles.benefitTitle}>Platform Independence</h4>
              <p className={styles.benefitText}>
                Platforms maintain independent infrastructure and control
              </p>
            </div>
            
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>🔓</div>
              <h4 className={styles.benefitTitle}>No Lock-In</h4>
              <p className={styles.benefitText}>
                Adoption without centralized dependency or vendor lock-in
              </p>
            </div>
            
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>🤝</div>
              <h4 className={styles.benefitTitle}>Cross-Platform Cooperation</h4>
              <p className={styles.benefitText}>
                Cooperation across AI providers using shared standards
              </p>
            </div>
            
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>👤</div>
              <h4 className={styles.benefitTitle}>User Control</h4>
              <p className={styles.benefitText}>
                Users retain control of their likeness usage rights
              </p>
            </div>
            
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>🚀</div>
              <h4 className={styles.benefitTitle}>Continued Innovation</h4>
              <p className={styles.benefitText}>
                Innovation continues with built-in safeguards
              </p>
            </div>
            
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>⚖️</div>
              <h4 className={styles.benefitTitle}>Regulatory Alignment</h4>
              <p className={styles.benefitText}>
                Standards align with emerging AI regulations
              </p>
            </div>
          </div>
        </Card>

        {/* Proof of Face Protocol */}
        <Card className={styles.protocolCard}>
          <div className={styles.protocolHeader}>
            <div className={styles.protocolBadge}>Next Evolution</div>
            <h3 className={styles.protocolTitle}>Proof of Face Protocol</h3>
            <p className={styles.protocolSubtitle}>
              Universal enforcement model for verifiable consent and content authenticity
            </p>
          </div>

          <div className={styles.protocolContent}>
            <p className={styles.protocolIntro}>
              Future versions introduce a universal enforcement model where likeness ownership 
              becomes part of a verifiable identity system. Instead of only checking consent, 
              the protocol creates cryptographic proof of authorization.
            </p>

            <div className={styles.protocolSteps}>
              <div className={styles.protocolStep}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4 className={styles.stepTitle}>Secure Identity Fingerprint</h4>
                  <p className={styles.stepText}>
                    A user's likeness generates a secure fingerprint representing their 
                    identity in AI systems.
                  </p>
                </div>
              </div>

              <div className={styles.protocolStep}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4 className={styles.stepTitle}>Cryptographic Signatures</h4>
                  <p className={styles.stepText}>
                    Every AI-generated image containing a real face receives a cryptographic 
                    signature tied to a verified consent decision.
                  </p>
                </div>
              </div>

              <div className={styles.protocolStep}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h4 className={styles.stepTitle}>Immutable Authorization Chain</h4>
                  <p className={styles.stepText}>
                    Signatures create a traceable and immutable chain of authorization 
                    that cannot be forged or removed.
                  </p>
                </div>
              </div>

              <div className={styles.protocolStep}>
                <div className={styles.stepNumber}>4</div>
                <div className={styles.stepContent}>
                  <h4 className={styles.stepTitle}>Verifiable Authenticity</h4>
                  <p className={styles.stepText}>
                    Platforms and users can verify whether an image was authorized or 
                    generated without consent.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.protocolImpact}>
              <h4 className={styles.impactTitle}>Long-Term Impact</h4>
              <div className={styles.impactList}>
                <div className={styles.impactItem}>
                  <svg className={styles.impactIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Images lacking authorization signatures treated as unauthorized content</span>
                </div>
                <div className={styles.impactItem}>
                  <svg className={styles.impactIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Platforms automatically verify consent before distribution or editing</span>
                </div>
                <div className={styles.impactItem}>
                  <svg className={styles.impactIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Content authenticity and consent become technically provable</span>
                </div>
              </div>
            </div>

            <div className={styles.analogyBox}>
              <svg className={styles.analogyIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className={styles.analogyText}>
                This approach turns likeness consent into an internet-wide trust layer — 
                similar to how HTTPS made secure communication standard across the web.
              </p>
            </div>
          </div>
        </Card>

        {/* Role of LikenessGuard */}
        <Card className={styles.roleCard}>
          <h3 className={styles.roleTitle}>LikenessGuard's Role</h3>
          <div className={styles.roleGrid}>
            <div className={styles.roleItem}>
              <div className={styles.roleIcon}>🔴</div>
              <h4 className={styles.roleItemTitle}>Live API</h4>
              <p className={styles.roleItemText}>
                A consent enforcement API usable by platforms today
              </p>
            </div>
            <div className={styles.roleItem}>
              <div className={styles.roleIcon}>📘</div>
              <h4 className={styles.roleItemTitle}>Reference Implementation</h4>
              <p className={styles.roleItemText}>
                Proof that consent enforcement is technically achievable
              </p>
            </div>
            <div className={styles.roleItem}>
              <div className={styles.roleIcon}>🌐</div>
              <h4 className={styles.roleItemTitle}>Standard Foundation</h4>
              <p className={styles.roleItemText}>
                Foundation for global digital identity protection standards
              </p>
            </div>
          </div>
        </Card>

        {/* Vision Statement */}
        <Card className={styles.visionCard}>
          <div className={styles.visionContent}>
            <svg className={styles.visionIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <h3 className={styles.visionTitle}>Our Vision</h3>
            <p className={styles.visionStatement}>
              A future where AI systems globally respect human identity by verifying consent 
              before using personal likeness, either through LikenessGuard integration or 
              adoption of universal consent and verification standards.
            </p>
          </div>
        </Card>

      </div>
    </PageContainer>
  );
};
