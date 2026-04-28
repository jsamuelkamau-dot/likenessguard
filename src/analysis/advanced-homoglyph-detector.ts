/**
 * Advanced Homoglyph Detector
 * Detects sophisticated character substitution attacks beyond basic punycode
 */

export interface HomoglyphResult {
  isHomoglyph: boolean;
  confidence: number;
  suspectedTarget: string | null;
  techniques: string[];
  riskScore: number;
}

export class AdvancedHomoglyphDetector {
  // Confusable character mappings (Latin to lookalikes)
  private confusables: Map<string, string[]> = new Map([
    // Cyrillic lookalikes
    ['a', ['а', 'ɑ', 'α', 'ａ']], // Cyrillic a, Greek alpha, Fullwidth
    ['e', ['е', 'ė', 'ē', 'ｅ']], // Cyrillic e
    ['o', ['о', 'ο', 'օ', 'ｏ', '0']], // Cyrillic o, Greek omicron, zero
    ['p', ['р', 'ρ', 'ｐ']], // Cyrillic r, Greek rho
    ['c', ['с', 'ϲ', 'ｃ']], // Cyrillic s
    ['i', ['і', 'ı', 'ɪ', 'ｉ', '1', 'l']], // Cyrillic i, Turkish i, one, lowercase L
    ['h', ['һ', 'ｈ']], // Cyrillic h
    ['x', ['х', 'ｘ']], // Cyrillic kh
    ['y', ['у', 'ｙ']], // Cyrillic u
    ['k', ['κ', 'ｋ']], // Greek kappa
    ['n', ['ո', 'ｎ']], // Armenian n
    ['s', ['ѕ', 'ｓ', '5']], // Cyrillic dze, five
    ['t', ['τ', 'ｔ']], // Greek tau
    ['v', ['ν', 'ｖ']], // Greek nu
    ['w', ['ԝ', 'ｗ']], // Cyrillic w
    ['z', ['ᴢ', 'ｚ']], // Small capital z
    ['b', ['Ь', 'ｂ']], // Cyrillic soft sign
    ['d', ['ԁ', 'ｄ']], // Cyrillic d
    ['g', ['ɡ', 'ｇ']], // Latin small letter script g
    ['j', ['ј', 'ｊ']], // Cyrillic je
    ['m', ['м', 'ｍ']], // Cyrillic m
    ['q', ['ԛ', 'ｑ']], // Cyrillic q
    ['u', ['υ', 'ｕ']], // Greek upsilon
  ]);

  // Zero-width and invisible characters
  private zeroWidthChars = [
    '\u200B', // Zero-width space
    '\u200C', // Zero-width non-joiner
    '\u200D', // Zero-width joiner
    '\uFEFF', // Zero-width no-break space
    '\u180E', // Mongolian vowel separator
  ];

  // Common brand names to check against
  private commonBrands = [
    'google', 'facebook', 'amazon', 'paypal', 'microsoft',
    'apple', 'netflix', 'twitter', 'instagram', 'linkedin',
    'github', 'youtube', 'reddit', 'ebay', 'walmart',
    'target', 'bestbuy', 'chase', 'wellsfargo', 'bankofamerica'
  ];

  detect(domain: string): HomoglyphResult {
    const techniques: string[] = [];
    let riskScore = 0;

    // Check for zero-width characters
    const hasZeroWidth = this.detectZeroWidth(domain);
    if (hasZeroWidth) {
      techniques.push('zero-width-characters');
      riskScore += 70;
    }

    // Check for mixed scripts
    const mixedScripts = this.detectMixedScripts(domain);
    if (mixedScripts) {
      techniques.push('mixed-scripts');
      riskScore += 60;
    }

    // Calculate visual similarity to known brands
    const { target, similarity } = this.findVisuallySimilar(domain);
    if (similarity > 0.7) {
      techniques.push('visual-lookalike');
      riskScore += Math.round(similarity * 80);
    }

    // Check for confusable characters
    const hasConfusables = this.detectConfusableChars(domain);
    if (hasConfusables) {
      techniques.push('confusable-characters');
      riskScore += 50;
    }

    // Check for combined characters (rn → m, vv → w, cl → d)
    const hasCombined = this.detectCombinedChars(domain);
    if (hasCombined) {
      techniques.push('combined-characters');
      riskScore += 45;
    }

    return {
      isHomoglyph: riskScore > 40,
      confidence: Math.min(riskScore / 100, 1),
      suspectedTarget: target,
      techniques,
      riskScore: Math.min(riskScore, 100)
    };
  }

  private detectZeroWidth(text: string): boolean {
    return this.zeroWidthChars.some(char => text.includes(char));
  }

  private detectMixedScripts(text: string): boolean {
    const scripts = new Set<string>();
    
    for (const char of text) {
      const code = char.charCodeAt(0);
      
      // Latin: 0x0041-0x007A, 0x00C0-0x00FF
      if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x00FF)) {
        scripts.add('latin');
      }
      // Cyrillic: 0x0400-0x04FF
      else if (code >= 0x0400 && code <= 0x04FF) {
        scripts.add('cyrillic');
      }
      // Greek: 0x0370-0x03FF
      else if (code >= 0x0370 && code <= 0x03FF) {
        scripts.add('greek');
      }
    }
    
    return scripts.size > 1;
  }

  private findVisuallySimilar(domain: string): { target: string | null, similarity: number } {
    const normalized = this.normalizeForComparison(domain);
    let bestMatch: string | null = null;
    let bestSimilarity = 0;

    for (const brand of this.commonBrands) {
      const similarity = this.calculateSimilarity(normalized, brand);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = brand;
      }
    }

    return { target: bestMatch, similarity: bestSimilarity };
  }

  private normalizeForComparison(text: string): string {
    let normalized = text.toLowerCase();
    
    // Replace confusable characters with their Latin equivalents
    for (const [latin, confusables] of this.confusables) {
      for (const confusable of confusables) {
        normalized = normalized.replace(new RegExp(confusable, 'g'), latin);
      }
    }
    
    // Remove non-alphanumeric
    normalized = normalized.replace(/[^a-z0-9]/g, '');
    
    return normalized;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
  }

  private detectConfusableChars(text: string): boolean {
    for (const char of text) {
      for (const [latin, confusables] of this.confusables) {
        if (confusables.includes(char)) {
          return true;
        }
      }
    }
    return false;
  }

  private detectCombinedChars(text: string): boolean {
    // Check for character combinations that look like other characters
    const patterns = [
      /rn/g,  // looks like m
      /vv/g,  // looks like w
      /cl/g,  // looks like d
      /nn/g,  // looks like m
    ];

    return patterns.some(pattern => pattern.test(text));
  }
}
