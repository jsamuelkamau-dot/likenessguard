/**
 * Social Engineering Detector
 * Detects urgency language and psychological manipulation tactics
 */

export interface SocialEngineeringResult {
  detected: boolean;
  riskScore: number;
  keywords: string[];
  tactics: string[];
}

export class SocialEngineeringDetector {
  // Urgency keywords
  private urgencyPatterns = [
    { pattern: /verify.*account/i, score: 40, tactic: 'account-verification' },
    { pattern: /suspended/i, score: 50, tactic: 'account-suspension' },
    { pattern: /unusual.*activity/i, score: 45, tactic: 'suspicious-activity' },
    { pattern: /click.*immediately/i, score: 40, tactic: 'urgency' },
    { pattern: /act.*now/i, score: 35, tactic: 'urgency' },
    { pattern: /limited.*time/i, score: 30, tactic: 'scarcity' },
    { pattern: /expire[sd]?/i, score: 35, tactic: 'expiration' },
    { pattern: /confirm.*identity/i, score: 45, tactic: 'identity-verification' },
    { pattern: /update.*payment/i, score: 50, tactic: 'payment-update' },
    { pattern: /security.*alert/i, score: 40, tactic: 'security-alert' },
    { pattern: /unauthorized.*access/i, score: 45, tactic: 'security-breach' },
    { pattern: /locked.*account/i, score: 50, tactic: 'account-lockout' },
    { pattern: /reset.*password/i, score: 35, tactic: 'password-reset' },
    { pattern: /prize.*winner/i, score: 60, tactic: 'prize-scam' },
    { pattern: /congratulations/i, score: 30, tactic: 'prize-scam' },
    { pattern: /claim.*reward/i, score: 40, tactic: 'reward-scam' },
    { pattern: /tax.*refund/i, score: 55, tactic: 'tax-scam' },
    { pattern: /irs/i, score: 45, tactic: 'government-impersonation' },
    { pattern: /package.*delivery/i, score: 35, tactic: 'delivery-scam' },
    { pattern: /shipment.*delayed/i, score: 35, tactic: 'delivery-scam' },
    { pattern: /billing.*problem/i, score: 40, tactic: 'billing-issue' },
    { pattern: /payment.*failed/i, score: 45, tactic: 'payment-failure' },
    { pattern: /re-?activate/i, score: 40, tactic: 'reactivation' },
    { pattern: /restore.*access/i, score: 40, tactic: 'access-restoration' },
    { pattern: /download.*invoice/i, score: 35, tactic: 'malicious-attachment' },
    { pattern: /view.*document/i, score: 30, tactic: 'malicious-attachment' },
  ];

  // Financial keywords
  private financialPatterns = [
    { pattern: /credit.*card/i, score: 40 },
    { pattern: /bank.*account/i, score: 45 },
    { pattern: /social.*security/i, score: 50 },
    { pattern: /ssn/i, score: 50 },
    { pattern: /routing.*number/i, score: 45 },
    { pattern: /wire.*transfer/i, score: 50 },
    { pattern: /bitcoin|crypto/i, score: 40 },
  ];

  detectFromUrl(url: string): SocialEngineeringResult {
    const keywords: string[] = [];
    const tactics = new Set<string>();
    let riskScore = 0;

    // Check URL path and query parameters
    const urlLower = url.toLowerCase();

    for (const { pattern, score, tactic } of this.urgencyPatterns) {
      if (pattern.test(urlLower)) {
        keywords.push(pattern.source.replace(/[^a-z\s]/gi, ''));
        riskScore += score;
        if (tactic) tactics.add(tactic);
      }
    }

    for (const { pattern, score } of this.financialPatterns) {
      if (pattern.test(urlLower)) {
        keywords.push(pattern.source.replace(/[^a-z\s]/gi, ''));
        riskScore += score;
        tactics.add('financial-information');
      }
    }

    return {
      detected: riskScore > 0,
      riskScore: Math.min(riskScore, 100),
      keywords,
      tactics: Array.from(tactics)
    };
  }

  detectFromContent(content: string): SocialEngineeringResult {
    const keywords: string[] = [];
    const tactics = new Set<string>();
    let riskScore = 0;

    const contentLower = content.toLowerCase();

    for (const { pattern, score, tactic } of this.urgencyPatterns) {
      if (pattern.test(contentLower)) {
        keywords.push(pattern.source.replace(/[^a-z\s]/gi, ''));
        riskScore += score * 0.5; // Lower weight for content vs URL
        if (tactic) tactics.add(tactic);
      }
    }

    for (const { pattern, score } of this.financialPatterns) {
      if (pattern.test(contentLower)) {
        keywords.push(pattern.source.replace(/[^a-z\s]/gi, ''));
        riskScore += score * 0.5;
        tactics.add('financial-information');
      }
    }

    return {
      detected: riskScore > 0,
      riskScore: Math.min(riskScore, 100),
      keywords,
      tactics: Array.from(tactics)
    };
  }
}
