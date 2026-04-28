import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { theme } from '../styles/theme';

describe('Theme Configuration Property Tests', () => {
  it('all color values should be valid hex colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.values(theme.backgrounds),
          ...Object.values(theme.actions),
          ...Object.values(theme.accents),
          ...Object.values(theme.text),
          ...Object.values(theme.status),
          ...Object.values(theme.glow),
          ...Object.values(theme.depth)
        ),
        (color) => {
          // Valid hex color format: #RRGGBB
          const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
          expect(color).toMatch(hexColorRegex);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('all spacing values should be positive numbers', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(theme.spacing)),
        (spacing) => {
          expect(spacing).toBeGreaterThan(0);
          expect(typeof spacing).toBe('number');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('breakpoints should be in ascending order', () => {
    const { mobile, tablet, desktop } = theme.breakpoints;
    expect(mobile).toBeLessThan(tablet);
    expect(tablet).toBeLessThan(desktop);
  });
});
