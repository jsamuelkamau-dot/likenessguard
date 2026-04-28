/**
 * Redirect Chain Analyzer
 * Follows URL redirects to unmask hidden destinations
 */

export interface RedirectHop {
  from: string;
  to: string;
  status: number;
  suspicious: boolean;
}

export interface RedirectAnalysis {
  finalUrl: string;
  chain: RedirectHop[];
  riskScore: number;
  flags: string[];
  redirectCount: number;
}

export class RedirectChainAnalyzer {
  private maxDepth = 5;
  private timeout = 5000; // 5 seconds

  // Known URL shorteners
  private shorteners = new Set([
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
    'is.gd', 'buff.ly', 'adf.ly', 'rebrand.ly', 'short.io',
    'tiny.cc', 'cli.gs', 'pic.gd', 'DwarfURL.com', 'yfrog.com',
    'migre.me', 'ff.im', 'tiny.pl', 'url4.eu', 'tr.im',
    'twit.ac', 'su.pr', 'twurl.nl', 'snipurl.com', 'short.to',
    'BudURL.com', 'ping.fm', 'post.ly', 'Just.as', 'bkite.com',
    'snipr.com', 'fic.kr', 'loopt.us', 'doiop.com', 'twitthis.com',
    'htxt.it', 'AltURL.com', 'RedirX.com', 'DigBig.com', 'short.ie'
  ]);

  // Known legitimate domains
  private legitimateDomains = new Set([
    'google.com', 'facebook.com', 'amazon.com', 'microsoft.com',
    'apple.com', 'youtube.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'github.com', 'reddit.com', 'wikipedia.org'
  ]);

  async analyze(url: string): Promise<RedirectAnalysis> {
    const chain: RedirectHop[] = [];
    const flags: string[] = [];
    let current = url;
    let depth = 0;

    try {
      while (depth < this.maxDepth) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(current, {
            method: 'HEAD',
            redirect: 'manual',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('Location');
            if (!location) break;

            const nextUrl = this.resolveUrl(current, location);
            const suspicious = this.isSuspiciousRedirect(current, nextUrl);

            chain.push({
              from: current,
              to: nextUrl,
              status: response.status,
              suspicious
            });

            current = nextUrl;
            depth++;
          } else {
            break;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          break;
        }
      }
    } catch (error) {
      // Network error or timeout
    }

    // Analyze the chain
    const riskScore = this.calculateRiskScore(chain, flags);

    return {
      finalUrl: current,
      chain,
      riskScore,
      flags,
      redirectCount: chain.length
    };
  }

  private resolveUrl(base: string, relative: string): string {
    try {
      return new URL(relative, base).href;
    } catch {
      return relative;
    }
  }

  private isSuspiciousRedirect(from: string, to: string): boolean {
    try {
      const fromUrl = new URL(from);
      const toUrl = new URL(to);

      const fromDomain = this.extractDomain(fromUrl.hostname);
      const toDomain = this.extractDomain(toUrl.hostname);

      // Legitimate to unknown
      if (this.legitimateDomains.has(fromDomain) && !this.legitimateDomains.has(toDomain)) {
        return true;
      }

      // Different TLDs
      if (this.getTLD(fromUrl.hostname) !== this.getTLD(toUrl.hostname)) {
        return true;
      }

      return false;
    } catch {
      return true;
    }
  }

  private calculateRiskScore(chain: RedirectHop[], flags: string[]): number {
    let score = 0;

    // Multiple redirects
    if (chain.length >= 3) {
      score += 40;
      flags.push(`Multiple redirects (${chain.length} hops)`);
    } else if (chain.length >= 2) {
      score += 20;
      flags.push(`${chain.length} redirects detected`);
    }

    // Suspicious hops
    const suspiciousCount = chain.filter(hop => hop.suspicious).length;
    if (suspiciousCount > 0) {
      score += suspiciousCount * 30;
      flags.push(`${suspiciousCount} suspicious redirect(s)`);
    }

    // Through URL shortener
    const hasShortener = chain.some(hop => {
      try {
        const domain = new URL(hop.from).hostname;
        return this.shorteners.has(domain);
      } catch {
        return false;
      }
    });

    if (hasShortener) {
      score += 25;
      flags.push('Redirect through URL shortener');
    }

    // Protocol downgrade (HTTPS to HTTP)
    const hasDowngrade = chain.some(hop => {
      try {
        return hop.from.startsWith('https://') && hop.to.startsWith('http://');
      } catch {
        return false;
      }
    });

    if (hasDowngrade) {
      score += 50;
      flags.push('Protocol downgrade (HTTPS → HTTP)');
    }

    return Math.min(score, 100);
  }

  private extractDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  private getTLD(hostname: string): string {
    const parts = hostname.split('.');
    return parts[parts.length - 1];
  }
}
