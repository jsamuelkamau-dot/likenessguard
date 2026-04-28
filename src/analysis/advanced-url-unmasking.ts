import { AnalysisError, ERROR_CODES } from '../types/errors';

export interface UnmaskingResult {
  finalUrl: string;
  redirectChain: string[];
  shortenerDetected: boolean;
  encodingLayers: number;
  obfuscationTechniques: string[];
  openRedirectDetected: boolean;
  suspiciousPatterns: string[];
  analysisTime: number;
}

export class AdvancedURLUnmasker {
  private static readonly URL_SHORTENERS = new Set([
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
    'buff.ly', 'adf.ly', 'bl.ink', 'lnkd.in', 'ift.tt', 'tiny.cc',
    'tr.im', 'cli.gs', 'pic.gd', 'ulu.lu', 'url.ie', 'kl.am',
    'wp.me', 'rubyurl.com', 'om.ly', 'to.ly', 'bit.do', 'db.tt',
    'qr.ae', 'cur.lv', 'ity.im', 'q.gs', 'po.st', 'bc.vc',
    'twitthis.com', 'u.to', 'j.mp', 'buzurl.com', 'cutt.us', 'u.bb',
    'yourls.org', 'x.co', 'prettylinkpro.com', 'scrnch.me',
    'filoops.info', 'vzturl.com', 'qr.net', '1url.com', 'tweez.me',
    'v.gd', 'link.zip', 'short.link', 'rebrand.ly', 'clk.sh',
    'shorturl.at', 'cutt.ly', 's.id'
  ]);

  private static readonly REDIRECT_PARAMS = [
    'url', 'redirect', 'goto', 'link', 'target', 'destination', 'dest',
    'continue', 'return', 'returnurl', 'return_url', 'next', 'forward',
    'redir', 'redirect_uri', 'redirect_url', 'out', 'exit', 'away',
    'external', 'site', 'to', 'uri', 'u', 'r', 'l', 'href', 'ref'
  ];

  private static readonly MAX_REDIRECT_DEPTH = 5;
  private static readonly MAX_ENCODING_DEPTH = 3;
  private static readonly TIMEOUT_MS = 5000;

  static async unmaskURL(url: string): Promise<UnmaskingResult> {
    const startTime = Date.now();
    const redirectChain: string[] = [url];
    const obfuscationTechniques: string[] = [];
    const suspiciousPatterns: string[] = [];
    let currentUrl = url;
    let encodingLayers = 0;
    let shortenerDetected = false;
    let openRedirectDetected = false;

    try {
      const decodingResult = this.decodeMultipleLayers(currentUrl);
      currentUrl = decodingResult.decoded;
      encodingLayers = decodingResult.layers;
      
      if (decodingResult.layers > 1) {
        obfuscationTechniques.push(`Multiple URL encoding (${decodingResult.layers} layers)`);
        suspiciousPatterns.push('Excessive URL encoding detected');
      }

      if (this.isShortURL(currentUrl)) {
        shortenerDetected = true;
        obfuscationTechniques.push('URL shortener detected');
        
        try {
          const expanded = await this.expandShortURL(currentUrl);
          if (expanded && expanded !== currentUrl) {
            redirectChain.push(expanded);
            currentUrl = expanded;
          }
        } catch (error) {
          console.warn('Failed to expand short URL:', error);
        }
      }

      const openRedirect = this.detectOpenRedirect(currentUrl);
      if (openRedirect) {
        openRedirectDetected = true;
        obfuscationTechniques.push('Open redirect detected');
        suspiciousPatterns.push(`Open redirect parameter: ${openRedirect.param}`);
        
        if (openRedirect.targetUrl) {
          redirectChain.push(openRedirect.targetUrl);
          currentUrl = openRedirect.targetUrl;
        }
      }

      const base64Result = this.detectBase64URL(currentUrl);
      if (base64Result.detected) {
        obfuscationTechniques.push('Base64 encoding detected');
        if (base64Result.decodedUrl) {
          redirectChain.push(base64Result.decodedUrl);
          currentUrl = base64Result.decodedUrl;
        }
      }

      const jsRedirect = this.detectJavaScriptRedirect(currentUrl);
      if (jsRedirect) {
        obfuscationTechniques.push('JavaScript redirect detected');
        suspiciousPatterns.push('JavaScript redirect pattern found');
      }

      const metaRefresh = this.detectMetaRefreshPattern(currentUrl);
      if (metaRefresh) {
        obfuscationTechniques.push('Meta refresh pattern detected');
        suspiciousPatterns.push('HTML meta refresh detected');
      }

      if (currentUrl.startsWith('data:')) {
        obfuscationTechniques.push('Data URI detected');
        suspiciousPatterns.push('Embedded data URI (potential phishing page)');
      }

      const fragmentAnalysis = this.analyzeFragment(currentUrl);
      if (fragmentAnalysis.suspicious) {
        suspiciousPatterns.push(...fragmentAnalysis.patterns);
      }

      const analysisTime = Date.now() - startTime;

      return {
        finalUrl: currentUrl,
        redirectChain,
        shortenerDetected,
        encodingLayers,
        obfuscationTechniques,
        openRedirectDetected,
        suspiciousPatterns,
        analysisTime
      };

    } catch (error) {
      return {
        finalUrl: currentUrl,
        redirectChain,
        shortenerDetected,
        encodingLayers,
        obfuscationTechniques,
        openRedirectDetected,
        suspiciousPatterns: [...suspiciousPatterns, `Analysis error: ${error}`],
        analysisTime: Date.now() - startTime
      };
    }
  }

  private static decodeMultipleLayers(url: string): { decoded: string; layers: number } {
    let decoded = url;
    let layers = 0;
    let previousDecoded = '';

    while (layers < this.MAX_ENCODING_DEPTH && decoded !== previousDecoded) {
      previousDecoded = decoded;
      
      try {
        if (decoded.includes('%')) {
          const testDecode = decodeURIComponent(decoded);
          
          if (testDecode !== decoded) {
            decoded = testDecode;
            layers++;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (error) {
        break;
      }
    }

    return { decoded, layers };
  }

  private static isShortURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      return this.URL_SHORTENERS.has(hostname);
    } catch {
      return false;
    }
  }

  private static async expandShortURL(url: string): Promise<string> {
    try {
      console.log('URL shortener expansion not yet implemented:', url);
      return url;
    } catch (error) {
      throw new AnalysisError(
        ERROR_CODES.ANALYSIS_TIMEOUT,
        `Failed to expand short URL: ${error}`
      );
    }
  }

  private static detectOpenRedirect(url: string): {
    detected: boolean;
    param?: string;
    targetUrl?: string;
  } | null {
    try {
      const urlObj = new URL(url);
      
      for (const [key, value] of urlObj.searchParams.entries()) {
        if (this.REDIRECT_PARAMS.includes(key.toLowerCase())) {
          if (this.looksLikeURL(value)) {
            try {
              const targetUrl = new URL(value);
              
              if (targetUrl.hostname !== urlObj.hostname) {
                return {
                  detected: true,
                  param: key,
                  targetUrl: value
                };
              }
            } catch {
              if (value.startsWith('http') || value.startsWith('//')) {
                return {
                  detected: true,
                  param: key,
                  targetUrl: value
                };
              }
            }
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private static looksLikeURL(str: string): boolean {
    return str.startsWith('http://') || 
           str.startsWith('https://') || 
           str.startsWith('//') ||
           str.includes('://') ||
           /^[a-z0-9-]+\.[a-z]{2,}/i.test(str);
  }

  private static detectBase64URL(url: string): {
    detected: boolean;
    decodedUrl?: string;
  } {
    try {
      const urlObj = new URL(url);
      
      for (const [, value] of urlObj.searchParams.entries()) {
        if (this.isBase64(value) && value.length > 20) {
          try {
            const decoded = atob(value);
            
            if (this.looksLikeURL(decoded)) {
              return {
                detected: true,
                decodedUrl: decoded
              };
            }
          } catch {
          }
        }
      }
      
      const pathParts = urlObj.pathname.split('/');
      for (const part of pathParts) {
        if (this.isBase64(part) && part.length > 20) {
          try {
            const decoded = atob(part);
            if (this.looksLikeURL(decoded)) {
              return {
                detected: true,
                decodedUrl: decoded
              };
            }
          } catch {
          }
        }
      }
      
      return { detected: false };
    } catch {
      return { detected: false };
    }
  }

  private static isBase64(str: string): boolean {
    if (!str || str.length < 4) return false;
    
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    return base64Pattern.test(str);
  }

  private static detectJavaScriptRedirect(url: string): boolean {
    const jsRedirectPatterns = [
      /window\.location/i,
      /document\.location/i,
      /location\.href/i,
      /location\.replace/i,
      /location\.assign/i,
      /window\.open/i,
      /javascript:/i
    ];

    return jsRedirectPatterns.some(pattern => pattern.test(url));
  }

  private static detectMetaRefreshPattern(url: string): boolean {
    const metaRefreshPatterns = [
      /meta.*refresh/i,
      /http-equiv.*refresh/i,
      /content.*url=/i
    ];

    return metaRefreshPatterns.some(pattern => pattern.test(url));
  }

  private static analyzeFragment(url: string): {
    suspicious: boolean;
    patterns: string[];
  } {
    try {
      const urlObj = new URL(url);
      const fragment = urlObj.hash.substring(1);
      
      if (!fragment) {
        return { suspicious: false, patterns: [] };
      }

      const patterns: string[] = [];
      
      const suspiciousKeywords = [
        'login', 'signin', 'password', 'secure', 'verify', 'confirm',
        'update', 'billing', 'payment', 'account', 'security'
      ];
      
      for (const keyword of suspiciousKeywords) {
        if (fragment.toLowerCase().includes(keyword)) {
          patterns.push(`Suspicious keyword in fragment: ${keyword}`);
        }
      }
      
      if (fragment.includes('%') && fragment.length > 20) {
        patterns.push('Encoded content in URL fragment');
      }
      
      if (fragment.includes('javascript:') || fragment.includes('eval(')) {
        patterns.push('JavaScript code in URL fragment');
      }
      
      if (fragment.length > 500) {
        patterns.push(`Very long URL fragment: ${fragment.length} characters`);
      }
      
      return {
        suspicious: patterns.length > 0,
        patterns
      };
    } catch {
      return { suspicious: false, patterns: [] };
    }
  }

  static calculateObfuscationRisk(result: UnmaskingResult): number {
    let riskScore = 0;

    if (result.encodingLayers > 1) {
      riskScore += 15 * result.encodingLayers;
    }

    if (result.shortenerDetected) {
      riskScore += 10;
    }

    if (result.openRedirectDetected) {
      riskScore += 20;
    }

    riskScore += result.obfuscationTechniques.length * 10;
    riskScore += result.suspiciousPatterns.length * 5;

    if (result.redirectChain.length > 2) {
      riskScore += (result.redirectChain.length - 1) * 10;
    }

    return Math.min(riskScore, 100);
  }
}
