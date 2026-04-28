/**
 * LikenessGuard Node.js SDK v2
 *
 * 1-day integration for AI image generator platforms.
 * Perform a full consent check in 10 lines of code.
 *
 * Usage:
 *   import { LikenessGuardClient } from '@likenessguard/sdk';
 *
 *   const client = new LikenessGuardClient({
 *     apiEndpoint: 'https://your-api.execute-api.us-east-1.amazonaws.com/v1',
 *     platformId: 'my-platform',
 *     apiKey: 'your-api-key'
 *   });
 *
 *   const result = await client.checkConsent('./image.jpg', 'GENERAL_GENERATION');
 *   if (result.allowed) {
 *     console.log('Consent granted. Proof:', result.proofOfFace?.manifest_id);
 *   }
 *
 * Requirements: 6.7, 6.8
 */

import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export type UsageType = 'GENERAL_GENERATION' | 'SELF_EDIT' | 'THIRD_PARTY_EDIT' | 'FACE_SWAP';
export type Decision = 'ALLOW' | 'DENY' | 'UNKNOWN';

export interface ConsentResult {
  decision: Decision;
  reasonCode: string;
  confidence: number;
  similarityScore: number;
  subjectId: string | null;
  reasoningTrace: string;
  proofOfFace: ProofOfFace | null;
  agentTrace: AgentTrace | null;
  requestId: string;
  latencyMs: number;
  allowed: boolean;
  denied: boolean;
}

export interface ProofOfFace {
  manifest_id: string;
  created_at: string;
  expires_at: string;
  subject: { id: string; policy_version: number };
  requester: { id: string; platform: string };
  decision: { outcome: string; reason_code: string; similarity_score: number };
  proof: { signature: string; algorithm: string; jwks_url: string };
  soft_binding: { manifest_hash: string; verify_url: string; embed_snippet: string };
  compliance: { eu_ai_act: string; c2pa_version: string; audit_id: string };
}

export interface AgentTrace {
  request_id: string;
  steps: Record<string, unknown>;
  total_latency_ms: number;
}

export interface LikenessGuardConfig {
  apiEndpoint: string;
  platformId: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class LikenessGuardClient {
  private config: Required<LikenessGuardConfig>;

  constructor(config: LikenessGuardConfig) {
    this.config = {
      apiKey: '',
      timeoutMs: 10000,
      ...config,
      apiEndpoint: config.apiEndpoint.replace(/\/$/, '')
    };
  }

  /** Check consent for an image file path */
  async checkConsent(imagePath: string, usageType: UsageType = 'GENERAL_GENERATION',
                     requesterId?: string): Promise<ConsentResult> {
    const imageBytes = fs.readFileSync(imagePath);
    return this.checkConsentBytes(imageBytes, usageType, requesterId);
  }

  /** Check consent for a Buffer of image bytes */
  async checkConsentBytes(imageBytes: Buffer, usageType: UsageType = 'GENERAL_GENERATION',
                           requesterId?: string): Promise<ConsentResult> {
    const imageB64 = imageBytes.toString('base64');
    const response = await this._post('/v2/consent/check', {
      image: imageB64,
      usage_type: usageType,
      requester_id: requesterId ?? this.config.platformId,
      platform: this.config.platformId
    });

    return {
      decision: response.decision ?? 'DENY',
      reasonCode: response.reason_code ?? 'UNKNOWN',
      confidence: Number(response.confidence ?? 0),
      similarityScore: Number(response.similarity_score ?? 0),
      subjectId: response.subject_id ?? null,
      reasoningTrace: response.reasoning_trace ?? '',
      proofOfFace: response.proof_of_face ?? null,
      agentTrace: response.agent_trace ?? null,
      requestId: response.request_id ?? '',
      latencyMs: response.latency_ms ?? 0,
      allowed: response.decision === 'ALLOW',
      denied: response.decision !== 'ALLOW'
    };
  }

  /** Verify a Proof-of-Face signed manifest */
  async verifyProof(manifest: ProofOfFace): Promise<{ valid: boolean; reason: string }> {
    return this._post('/v2/proof/verify', { manifest });
  }

  private _post(path: string, payload: unknown): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.config.apiEndpoint}${path}`);
      const body = JSON.stringify(payload);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(this.config.apiKey ? { 'x-api-key': this.config.apiKey } : {})
        },
        timeout: this.config.timeoutMs
      };

      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            // Handle API Gateway envelope
            if (parsed.body && typeof parsed.body === 'string') {
              resolve(JSON.parse(parsed.body));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(body);
      req.end();
    });
  }
}

export default LikenessGuardClient;
