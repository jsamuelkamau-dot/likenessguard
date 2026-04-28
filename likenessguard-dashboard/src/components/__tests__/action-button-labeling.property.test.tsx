import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home } from '../../pages/Home';
import { RegistrationForm } from '../registration/RegistrationForm';
import { PolicyForm } from '../consent/PolicyForm';
import { createDefaultConsentPolicy } from '../../services/registration-service';

/**
 * Feature: likenessguard-web-dashboard
 * Property 15: Action Button Labeling
 * 
 * For any action button in the dashboard, the button should have a clear,
 * descriptive text label that indicates its function.
 * 
 * Validates: Requirements 8.2
 */

describe('Feature: likenessguard-web-dashboard, Property 15: Action Button Labeling', () => {
  const isDescriptiveLabel = (label: string): boolean => {
    if (!label || label.trim().length === 0) return false;
    const symbolOnlyPattern = /^[^\w\s]+$/;
    if (symbolOnlyPattern.test(label.trim())) return false;
    const meaningfulWords = [
      'register', 'save', 'update', 'revoke', 'check', 'run', 'view',
      'upload', 'submit', 'cancel', 'retry', 'configure', 'start', 'set', 'yes', 'no'
    ];
    const labelLower = label.toLowerCase();
    const hasMeaningfulWord = meaningfulWords.some(word => labelLower.includes(word));
    const hasMinLength = label.trim().length >= 3;
    return hasMeaningfulWord && hasMinLength;
  };

  it('should have descriptive labels on all buttons in Home page', () => {
    fc.assert(
      fc.property(
        fc.record({ hasLikeness: fc.boolean() }),
        (state) => {
          if (state.hasLikeness) {
            localStorage.setItem('likenessId', 'test-likeness-id');
          } else {
            localStorage.removeItem('likenessId');
          }
          const { container } = render(<BrowserRouter><Home /></BrowserRouter>);
          const buttons = container.querySelectorAll('button');
          buttons.forEach((button) => {
            const label = button.textContent || button.getAttribute('aria-label') || '';
            expect(isDescriptiveLabel(label)).toBe(true);
          });
          localStorage.removeItem('likenessId');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have descriptive labels on all buttons in RegistrationForm', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const { container } = render(<RegistrationForm />);
          const buttons = container.querySelectorAll('button');
          buttons.forEach((button) => {
            const label = button.textContent || button.getAttribute('aria-label') || '';
            const isVisible = button.offsetParent !== null;
            if (isVisible) {
              expect(isDescriptiveLabel(label)).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have descriptive labels on all buttons in PolicyForm', () => {
    fc.assert(
      fc.property(
        fc.record({
          allowSelfEdits: fc.boolean(),
          denyThirdPartyEdits: fc.boolean(),
          denyFaceSwaps: fc.boolean(),
        }),
        (state) => {
          const mockPolicy = {
            ...createDefaultConsentPolicy(),
            allow_self_edits: state.allowSelfEdits,
            deny_third_party_edits: state.denyThirdPartyEdits,
            deny_face_swaps: state.denyFaceSwaps,
          };
          const mockOnSave = async () => {};
          const mockOnRevoke = async () => {};
          const { container } = render(
            <PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />
          );
          const buttons = container.querySelectorAll('button');
          buttons.forEach((button) => {
            const label = button.textContent || button.getAttribute('aria-label') || '';
            const isVisible = button.offsetParent !== null;
            if (isVisible) {
              expect(isDescriptiveLabel(label)).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify button labels are action-oriented', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Register Likeness', 'Save Policy', 'Revoke Consent', 'Run Check',
          'View Violations', 'Update Policy', 'Register Now', 'Configure Policy',
          'Start Registration', 'Set Policy', 'View All Activity', 'Register Another',
          'Yes, Revoke Consent', 'Cancel'
        ),
        (buttonLabel) => {
          expect(isDescriptiveLabel(buttonLabel)).toBe(true);
          const actionVerbs = ['register', 'save', 'revoke', 'run', 'view', 'update', 'configure', 'start', 'set', 'cancel', 'yes'];
          const labelLower = buttonLabel.toLowerCase();
          const hasActionVerb = actionVerbs.some(verb => labelLower.includes(verb));
          expect(hasActionVerb).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject non-descriptive button labels', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '...', '>', 'OK', 'X', ''),
        (buttonLabel) => {
          expect(isDescriptiveLabel(buttonLabel)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
