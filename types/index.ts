/**
 * Core type definitions for EasyPiky
 */

export interface AnalysisResult {
  decision: 'SAFE' | 'SUSPICIOUS' | 'UNKNOWN';
  threatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  phishingLikelihood: number; // 5-95%
  confidence: number; // 0-1
  riskFactors: string[];
  safetyFactors: string[];
  recommendations: string[];
  domain: string;
  analysisTime: number;
}

export interface ClickContext {
  source: 'EMAIL' | 'SOCIAL' | 'WEB';
  provider?: string;
  pageUrl: string;
  timestamp: number;
}

export interface UserSettings {
  strictMode: boolean;
  trustedDomains: string[];
  version: string;
}

export interface TrialInfo {
  token: string;
  expiresAt: number;
  createdAt: number;
}
