import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { RegistrationForm } from '../registration/RegistrationForm';
import { PolicyForm } from '../consent/PolicyForm';
import type { ConsentPolicy } from '../../types/api-types';

/**
 * Feature: likenessguard-web-dashboard, Property 19: Form Accessibility
 * 
 * Property: For any form input, the input should have proper focus states
 * (visible outline or border change) and support keyboard navigation
 * (tab order follows visual order).
 * 
 * Validates: Requirements 11.6
 */
describe('Feature: likenessguard-web-dashboard, Property 19: Form Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have visible focus states on all form inputs', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.string(),
        }),
        () => {
          const { container } = render(<RegistrationForm />);
          
          const inputs = container.querySelectorAll('input, button, textarea, select');
          
          inputs.forEach((element) => {
            (element as HTMLElement).focus();
            
            const styles = window.getComputedStyle(element);
            
            const hasOutline = styles.outline !== 'none' && styles.outline !== '';
            const hasBorder = styles.border !== 'none' && styles.border !== '';
            const hasBoxShadow = styles.boxShadow !== 'none' && styles.boxShadow !== '';
            
            const hasFocusIndicator = hasOutline || hasBorder || hasBoxShadow;
            
            expect(hasFocusIndicator).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have tab order that follows visual order', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.record({
          allowCommercial: fc.boolean(),
          allowEditorial: fc.boolean(),
          allowResearch: fc.boolean(),
        }),
        (policyData) => {
          const mockPolicy: ConsentPolicy = {
            allowCommercial: policyData.allowCommercial,
            allowEditorial: policyData.allowEditorial,
            allowResearch: policyData.allowResearch,
          };
          
          const mockOnSave = async () => {};
          const mockOnRevoke = async () => {};
          
          const { container } = render(
            <PolicyForm
              currentPolicy={mockPolicy}
              onSave={mockOnSave}
              onRevoke={mockOnRevoke}
            />
          );
          
          const focusableElements = container.querySelectorAll(
            'input, button, textarea, select, [tabindex]:not([tabindex="-1"])'
          );
          
          const tabIndices: number[] = [];
          focusableElements.forEach((element) => {
            const tabIndex = element.getAttribute('tabindex');
            if (tabIndex !== null) {
              tabIndices.push(parseInt(tabIndex, 10));
            }
          });
          
          tabIndices.forEach((tabIndex) => {
            expect(tabIndex).toBeGreaterThanOrEqual(0);
          });
          
          const hasInvalidTabIndex = tabIndices.some((idx) => idx > 0);
          expect(hasInvalidTabIndex).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow keyboard interaction with all form inputs', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.string(),
        () => {
          const { container } = render(<RegistrationForm />);
          
          const interactiveElements = container.querySelectorAll(
            'input, button, textarea, select'
          );
          
          interactiveElements.forEach((element) => {
            const isDisabled = element.hasAttribute('disabled');
            const tabIndex = element.getAttribute('tabindex');
            const isFocusable = !isDisabled && tabIndex !== '-1';
            
            if (!isDisabled) {
              expect(isFocusable).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have proper label associations for all form inputs', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.record({
          allowCommercial: fc.boolean(),
          allowEditorial: fc.boolean(),
          allowResearch: fc.boolean(),
        }),
        (policyData) => {
          const mockPolicy: ConsentPolicy = {
            allowCommercial: policyData.allowCommercial,
            allowEditorial: policyData.allowEditorial,
            allowResearch: policyData.allowResearch,
          };
          
          const mockOnSave = async () => {};
          const mockOnRevoke = async () => {};
          
          const { container } = render(
            <PolicyForm
              currentPolicy={mockPolicy}
              onSave={mockOnSave}
              onRevoke={mockOnRevoke}
            />
          );
          
          const inputs = container.querySelectorAll('input[type="checkbox"], input[type="text"], input[type="email"]');
          
          inputs.forEach((input) => {
            const id = input.getAttribute('id');
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledBy = input.getAttribute('aria-labelledby');
            
            let hasLabel = false;
            
            if (id) {
              const selector = 'label[for="' + id + '"]';
              const label = container.querySelector(selector);
              hasLabel = label !== null;
            }
            
            if (ariaLabel || ariaLabelledBy) {
              hasLabel = true;
            }
            
            expect(hasLabel).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});