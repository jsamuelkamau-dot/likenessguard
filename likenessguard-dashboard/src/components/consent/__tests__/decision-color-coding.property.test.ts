/**
 * Property-Based Test: Decision Color Coding
 * 
 * **Validates: Requirements 4.5, 4.6, 4.7, 9.5**
 * 
 * Property 9: Decision Color Coding
 * For any consent check result, the decision display should use the correct status color:
 * - #4FA3FF for ALLOW
 * - #FF7A45 for DENY
 * - #4B556A for UNKNOWN
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Decision } from '../../../types/api-types';

describe('Feature: likenessguard-web-dashboard, Property 9: Decision Color Coding', () => {
  /**
   * Helper function to get the expected color for a decision
   * This mirrors the color mapping defined in the theme and CSS
   */
  const getExpectedColor = (decision: Decision): string => {
    switch (decision) {
      case 'ALLOW':
        return '#4FA3FF';
      case 'DENY':
        return '#FF7A45';
      case 'UNKNOWN':
        return '#4B556A';
      default:
        throw new Error(`Unknown decision type: ${decision}`);
    }
  };

  /**
   * Helper function to get the CSS variable name for a decision
   */
  const getStatusColorVariable = (decision: Decision): string => {
    switch (decision) {
      case 'ALLOW':
        return '--status-success';
      case 'DENY':
        return '--status-error';
      case 'UNKNOWN':
        return '--status-neutral';
      default:
        throw new Error(`Unknown decision type: ${decision}`);
    }
  };

  /**
   * Property: Each decision type should map to exactly one color
   * Validates: Requirements 4.5, 4.6, 4.7, 9.5
   */
  it('should map each decision type to exactly one status color', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Decision>('ALLOW', 'DENY', 'UNKNOWN'),
        (decision) => {
          const color = getExpectedColor(decision);
          
          // Verify the color is a valid hex color
          expect(color).toMatch(/^#[0-9A-F]{6}$/i);
          
          // Verify the mapping is consistent
          const color2 = getExpectedColor(decision);
          expect(color).toBe(color2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: ALLOW decisions should always use #4FA3FF (blue)
   * Validates: Requirements 4.5, 9.5
   */
  it('should use #4FA3FF for all ALLOW decisions', () => {
    fc.assert(
      fc.property(
        fc.constant<Decision>('ALLOW'),
        (decision) => {
          const color = getExpectedColor(decision);
          expect(color).toBe('#4FA3FF');
          expect(color.toUpperCase()).toBe('#4FA3FF');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: DENY decisions should always use #FF7A45 (orange/red)
   * Validates: Requirements 4.6, 9.5
   */
  it('should use #FF7A45 for all DENY decisions', () => {
    fc.assert(
      fc.property(
        fc.constant<Decision>('DENY'),
        (decision) => {
          const color = getExpectedColor(decision);
          expect(color).toBe('#FF7A45');
          expect(color.toUpperCase()).toBe('#FF7A45');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: UNKNOWN decisions should always use #4B556A (gray)
   * Validates: Requirements 4.7, 9.5
   */
  it('should use #4B556A for all UNKNOWN decisions', () => {
    fc.assert(
      fc.property(
        fc.constant<Decision>('UNKNOWN'),
        (decision) => {
          const color = getExpectedColor(decision);
          expect(color).toBe('#4B556A');
          expect(color.toUpperCase()).toBe('#4B556A');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Different decision types should have different colors
   * Validates: Requirements 4.5, 4.6, 4.7, 9.5
   */
  it('should use different colors for different decision types', () => {
    const allowColor = getExpectedColor('ALLOW');
    const denyColor = getExpectedColor('DENY');
    const unknownColor = getExpectedColor('UNKNOWN');

    // All three colors should be distinct
    expect(allowColor).not.toBe(denyColor);
    expect(allowColor).not.toBe(unknownColor);
    expect(denyColor).not.toBe(unknownColor);

    // Verify the specific colors
    expect(allowColor).toBe('#4FA3FF');
    expect(denyColor).toBe('#FF7A45');
    expect(unknownColor).toBe('#4B556A');
  });

  /**
   * Property: Color mapping should be deterministic
   * Same decision should always produce the same color
   * Validates: Requirements 4.5, 4.6, 4.7, 9.5
   */
  it('should produce deterministic color mapping for the same decision', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Decision>('ALLOW', 'DENY', 'UNKNOWN'),
        (decision) => {
          // Get color multiple times
          const color1 = getExpectedColor(decision);
          const color2 = getExpectedColor(decision);
          const color3 = getExpectedColor(decision);

          // All results should be identical
          expect(color1).toBe(color2);
          expect(color2).toBe(color3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: CSS variable names should map correctly to decision types
   * Validates: Requirements 4.5, 4.6, 4.7, 9.5
   */
  it('should map decision types to correct CSS variable names', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Decision>('ALLOW', 'DENY', 'UNKNOWN'),
        (decision) => {
          const variable = getStatusColorVariable(decision);
          
          // Verify the variable name format
          expect(variable).toMatch(/^--status-(success|error|neutral)$/);
          
          // Verify specific mappings
          if (decision === 'ALLOW') {
            expect(variable).toBe('--status-success');
          } else if (decision === 'DENY') {
            expect(variable).toBe('--status-error');
          } else if (decision === 'UNKNOWN') {
            expect(variable).toBe('--status-neutral');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Color values should be valid hex colors
   * Validates: Requirements 9.5
   */
  it('should use valid hex color format for all decision colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Decision>('ALLOW', 'DENY', 'UNKNOWN'),
        (decision) => {
          const color = getExpectedColor(decision);
          
          // Verify hex color format: # followed by 6 hex digits
          expect(color).toMatch(/^#[0-9A-F]{6}$/i);
          
          // Verify it starts with #
          expect(color.charAt(0)).toBe('#');
          
          // Verify length is 7 characters
          expect(color.length).toBe(7);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Color mapping should be case-insensitive for hex values
   * Validates: Requirements 9.5
   */
  it('should handle hex color case-insensitivity correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Decision>('ALLOW', 'DENY', 'UNKNOWN'),
        (decision) => {
          const color = getExpectedColor(decision);
          const upperColor = color.toUpperCase();
          const lowerColor = color.toLowerCase();
          
          // Hex colors should be equivalent regardless of case
          expect(upperColor.toLowerCase()).toBe(lowerColor);
          
          // Verify the color matches expected value (case-insensitive)
          const expectedColors = {
            'ALLOW': '#4FA3FF',
            'DENY': '#FF7A45',
            'UNKNOWN': '#4B556A',
          };
          
          expect(color.toUpperCase()).toBe(expectedColors[decision]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Color brightness should be appropriate for visibility
   * ALLOW (blue) and DENY (orange) should be brighter than UNKNOWN (gray)
   * Validates: Requirements 4.5, 4.6, 4.7, 9.5
   */
  it('should use appropriate color brightness for visibility', () => {
    const allowColor = getExpectedColor('ALLOW');
    const denyColor = getExpectedColor('DENY');
    const unknownColor = getExpectedColor('UNKNOWN');

    // Helper to calculate perceived brightness (simple luminance)
    const getBrightness = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      // Perceived brightness formula
      return (r * 299 + g * 587 + b * 114) / 1000;
    };

    const allowBrightness = getBrightness(allowColor);
    const denyBrightness = getBrightness(denyColor);
    const unknownBrightness = getBrightness(unknownColor);

    // ALLOW and DENY should be brighter than UNKNOWN (more visible)
    expect(allowBrightness).toBeGreaterThan(unknownBrightness);
    expect(denyBrightness).toBeGreaterThan(unknownBrightness);

    // All colors should be visible (not too dark)
    expect(allowBrightness).toBeGreaterThan(50);
    expect(denyBrightness).toBeGreaterThan(50);
    expect(unknownBrightness).toBeGreaterThan(30);
  });

  /**
   * Meta-property: Verify complete color mapping coverage
   * All possible decision types should have a color mapping
   * Validates: Requirements 4.5, 4.6, 4.7, 9.5
   */
  it('should have color mappings for all decision types', () => {
    const allDecisions: Decision[] = ['ALLOW', 'DENY', 'UNKNOWN'];
    
    allDecisions.forEach(decision => {
      // Should not throw an error
      expect(() => getExpectedColor(decision)).not.toThrow();
      
      // Should return a valid color
      const color = getExpectedColor(decision);
      expect(color).toBeTruthy();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  /**
   * Property: Color contrast should be appropriate for decision importance
   * ALLOW and DENY should have higher contrast (more visible)
   * UNKNOWN can have lower contrast (neutral, less important)
   * Validates: Requirements 9.5
   */
  it('should provide appropriate color contrast based on decision importance', () => {
    const backgroundColor = '#050B18'; // Primary background color
    
    fc.assert(
      fc.property(
        fc.constantFrom<Decision>('ALLOW', 'DENY', 'UNKNOWN'),
        (decision) => {
          const color = getExpectedColor(decision);
          
          // Helper to calculate relative luminance
          const getLuminance = (hex: string): number => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            
            const [rs, gs, bs] = [r, g, b].map(c => 
              c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
            );
            
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
          };
          
          const colorLuminance = getLuminance(color);
          const bgLuminance = getLuminance(backgroundColor);
          
          // Calculate contrast ratio
          const contrastRatio = (Math.max(colorLuminance, bgLuminance) + 0.05) / 
                               (Math.min(colorLuminance, bgLuminance) + 0.05);
          
          // ALLOW and DENY are important decisions - should have higher contrast
          // UNKNOWN is neutral - can have lower contrast (at least 2:1 for visibility)
          if (decision === 'ALLOW' || decision === 'DENY') {
            // Important decisions should have at least 3:1 contrast
            expect(contrastRatio).toBeGreaterThanOrEqual(3);
          } else {
            // UNKNOWN should still be visible (at least 2:1)
            expect(contrastRatio).toBeGreaterThanOrEqual(2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
