/**
 * Smart Analysis Engine - 100% Client-Side Phishing Detection
 * 
 * Features:
 * - Percentage-based risk scoring (5-95%)
 * - Fast analysis (<100ms)
 * - No external API calls
 * - Privacy-first approach
 * - Advanced homoglyph detection
 * - Redirect chain analysis
 * - Social engineering detection
 */

import { AnalysisResult } from '../types';
import { AdvancedHomoglyphDetector } from './advanced-homoglyph-detector';
import { RedirectChainAnalyzer } from './redirect-chain-analyzer';
import { SocialEngineeringDetector } from './social-engineering-detector';

export class SmartAnalysisEngine {
  private knownSafeDomains: Set<string>;
  private suspiciousTLDs: Set<string>;
  private homoglyphDetector: AdvancedHomoglyphDetector;
  private redirectAnalyzer: RedirectChainAnalyzer;
  private socialEngDetector: SocialEngineeringDetector;

  constructor() {
    // Known safe domains (common legitimate sites)
    this.knownSafeDomains = new Set([
      'google.com', 'youtube.com', 'facebook.com', 'amazon.com',
      'wikipedia.org', 'twitter.com', 'instagram.com', 'linkedin.com',
      'github.com', 'stackoverflow.com', 'reddit.com', 'microsoft.com',
      'apple.com', 'netflix.com', 'paypal.com', 'ebay.com'
    ]);

    // Suspicious TLDs often used in phishing
    this.suspiciousTLDs = new Set([
      'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'work',
      'click', 'link', 'download', 'stream', 'online'
    ]);

    // Initialize advanced detectors
    this.homoglyphDetector = new AdvancedHomoglyphDetector();
    this.redirectAnalyzer = new RedirectChainAnalyzer();
    this.socialEngDetector = new SocialEngineeringDetector();
  }

  /**
   * Analyze URL for phishing risk
   */
  async analyzeURL(url: string, trustedDomains: string[], context?: string): Promise<AnalysisResult> {
    const startTime = performance.now();
    
    try {
      const urlObj = new URL(url);
      const domain = this.extractDomain(urlObj.hostname);
      const tld = this.extractTLD(urlObj.hostname);

      // Initialize scoring - start at 20 for unknown domains
      let riskScore = 20;
      const riskFactors: string[] = [];
      const safetyFactors: string[] = [];

      // Check if user has trusted this domain
      if (trustedDomains.includes(domain)) {
        return this.createSafeResult(domain, startTime, ['Domain in your trusted list']);
      }

      // Check if it's a known safe domain (but SKIP this check for email context)
      const isEmailContext = context === 'email';
      if (this.knownSafeDomains.has(domain) && !isEmailContext) {
        return this.createSafeResult(domain, startTime, ['Known legitimate website']);
      }

      // SAFETY FACTORS (reduce risk)
      
      // HTTPS encryption
      if (urlObj.protocol === 'https:') {
        riskScore -= 5;
        safetyFactors.push('Uses HTTPS encryption');
      } else {
        riskScore += 25;
        riskFactors.push('⚠️ Uses insecure HTTP protocol');
      }

      // Educational/Government domains
      if (tld === 'edu' || tld === 'gov') {
        riskScore -= 20;
        safetyFactors.push('Educational or government domain');
      }

      // Common legitimate TLDs
      if (['com', 'org', 'net', 'edu', 'gov'].includes(tld)) {
        riskScore -= 5;
      }

      // RISK FACTORS (increase risk)

      // Advanced Homoglyph Detection - VERY HIGH RISK
      const homoglyphResult = this.homoglyphDetector.detect(urlObj.hostname);
      if (homoglyphResult.isHomoglyph) {
        riskScore += homoglyphResult.riskScore;
        riskFactors.push(`🚨 Advanced homoglyph attack detected (${homoglyphResult.techniques.join(', ')})`);
        if (homoglyphResult.suspectedTarget) {
          riskFactors.push(`🚨 Mimics: ${homoglyphResult.suspectedTarget}`);
        }
      }

      // Social Engineering Detection
      const socialEngResult = this.socialEngDetector.detectFromUrl(url);
      if (socialEngResult.detected) {
        riskScore += socialEngResult.riskScore * 0.5; // 50% weight for URL-based detection
        if (socialEngResult.keywords.length > 0) {
          riskFactors.push(`⚠️ Social engineering tactics: ${socialEngResult.tactics.join(', ')}`);
        }
      }

      // Punycode/IDN (homograph attacks) - VERY HIGH RISK
      if (urlObj.hostname.includes('xn--')) {
        riskScore += 60;
        riskFactors.push('🚨 Uses punycode (homograph attack detected)');
      }

      // Suspicious TLD - HIGH RISK
      if (this.suspiciousTLDs.has(tld)) {
        riskScore += 45;
        riskFactors.push(`🚨 Suspicious domain extension (.${tld})`);
      }

      // Look-alike detection - check for common substitutions
      const lookalike = this.detectLookalike(urlObj.hostname);
      if (lookalike) {
        riskScore += 55;
        riskFactors.push(`🚨 Look-alike domain (mimics ${lookalike})`);
      }

      // Excessive hyphens - MEDIUM RISK
      const hyphenCount = (urlObj.hostname.match(/-/g) || []).length;
      if (hyphenCount >= 3) {
        riskScore += 30;
        riskFactors.push(`⚠️ Excessive hyphens in domain (${hyphenCount} found)`);
      } else if (hyphenCount >= 2) {
        riskScore += 15;
        riskFactors.push(`⚠️ Multiple hyphens in domain`);
      }

      // Very short domain - MEDIUM RISK
      if (domain.length <= 4 && !this.knownSafeDomains.has(domain)) {
        riskScore += 20;
        riskFactors.push('⚠️ Very short domain name');
      }

      // Multiple consecutive numbers - MEDIUM RISK
      if (/\d{4,}/.test(urlObj.hostname)) {
        riskScore += 25;
        riskFactors.push('⚠️ Contains multiple consecutive numbers');
      }

      // Suspicious subdomain patterns (brand impersonation) - HIGH RISK
      const subdomains = urlObj.hostname.split('.');
      if (subdomains.length > 2) {
        const subdomain = subdomains[0].toLowerCase();
        const brandKeywords = ['paypal', 'amazon', 'google', 'microsoft', 'apple', 'bank', 'secure', 'login', 'account', 'verify', 'update'];
        
        for (const brand of brandKeywords) {
          if (subdomain.includes(brand) && !this.knownSafeDomains.has(domain)) {
            riskScore += 55;
            riskFactors.push(`🚨 Suspicious subdomain mimicking "${brand}"`);
            break;
          }
        }
      }

      // IP address instead of domain - HIGH RISK
      if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
        riskScore += 40;
        riskFactors.push('🚨 Uses IP address instead of domain name');
      }

      // Long domain name - LOW RISK
      if (urlObj.hostname.length > 40) {
        riskScore += 15;
        riskFactors.push('⚠️ Unusually long domain name');
      }

      // Clamp risk score between 5-95%
      riskScore = Math.max(5, Math.min(95, riskScore));

      // Determine threat level
      let threatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
      let decision: 'SAFE' | 'SUSPICIOUS' | 'UNKNOWN';

      if (riskScore < 30) {
        threatLevel = 'NONE';
        decision = 'SAFE';
      } else if (riskScore < 50) {
        threatLevel = 'LOW';
        decision = 'UNKNOWN';
      } else if (riskScore < 70) {
        threatLevel = 'MEDIUM';
        decision = 'SUSPICIOUS';
      } else {
        threatLevel = 'HIGH';
        decision = 'SUSPICIOUS';
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskScore, riskFactors);

      // Calculate confidence based on number of factors
      const totalFactors = riskFactors.length + safetyFactors.length;
      const confidence = Math.min(1, totalFactors / 5);

      const analysisTime = Math.round(performance.now() - startTime);

      return {
        decision,
        threatLevel,
        phishingLikelihood: riskScore,
        confidence,
        riskFactors,
        safetyFactors,
        recommendations,
        domain,
        analysisTime
      };

    } catch (error) {
      // If URL parsing fails, treat as suspicious
      return {
        decision: 'SUSPICIOUS',
        threatLevel: 'HIGH',
        phishingLikelihood: 85,
        confidence: 0.9,
        riskFactors: ['Invalid or malformed URL'],
        safetyFactors: [],
        recommendations: ['Do not visit this link', 'Report as suspicious'],
        domain: url,
        analysisTime: Math.round(performance.now() - startTime)
      };
    }
  }

  /**
   * Detect look-alike domains
   */
  private detectLookalike(hostname: string): string | null {
    const commonBrands = [
      'google', 'facebook', 'amazon', 'paypal', 'microsoft', 
      'apple', 'netflix', 'twitter', 'instagram', 'linkedin'
    ];

    const normalized = hostname.toLowerCase().replace(/[^a-z]/g, '');
    
    for (const brand of commonBrands) {
      // Check for character substitutions
      if (normalized.includes(brand.replace('o', '0')) ||
          normalized.includes(brand.replace('l', '1')) ||
          normalized.includes(brand.replace('i', '1')) ||
          normalized.includes(brand.replace('e', '3'))) {
        return brand;
      }
      
      // Check for similar spelling
      if (normalized.includes(brand) && !this.knownSafeDomains.has(this.extractDomain(hostname))) {
        return brand;
      }
    }
    
    return null;
  }

  /**
   * Create safe result
   */
  private createSafeResult(domain: string, startTime: number, safetyFactors: string[]): AnalysisResult {
    return {
      decision: 'SAFE',
      threatLevel: 'NONE',
      phishingLikelihood: 5,
      confidence: 1.0,
      riskFactors: [],
      safetyFactors,
      recommendations: ['Safe to proceed'],
      domain,
      analysisTime: Math.round(performance.now() - startTime)
    };
  }

  /**
   * Generate recommendations based on risk
   */
  private generateRecommendations(riskScore: number, riskFactors: string[]): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 70) {
      recommendations.push('Do not proceed unless you are absolutely certain');
      recommendations.push('Verify the URL carefully before continuing');
      recommendations.push('Contact the organization directly if unsure');
    } else if (riskScore >= 50) {
      recommendations.push('Proceed with caution');
      recommendations.push('Verify this is the correct website');
      recommendations.push('Do not enter sensitive information');
    } else {
      recommendations.push('Check if you recognize this domain');
      recommendations.push('Add to trusted list if legitimate');
    }

    return recommendations;
  }

  /**
   * Extract base domain from hostname
   */
  private extractDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  /**
   * Extract TLD from hostname
   */
  private extractTLD(hostname: string): string {
    const parts = hostname.split('.');
    return parts[parts.length - 1];
  }
}
