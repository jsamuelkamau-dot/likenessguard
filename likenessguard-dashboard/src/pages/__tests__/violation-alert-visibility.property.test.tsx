/**
 * Property-Based Test: Violation Alert Visibility
 * 
 * **Validates: Requirements 1.4**
 * 
 * Property 2: Violation Alert Visibility
 * For any dashboard state, violation alerts should be visible on the home page
 * if and only if violations exist in the data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import { Home } from '../Home';
import * as consentService from '../../services/consent-service';
import * as logsService from '../../services/logs-service';
import type { EvidenceRecord } from '../../types/api-types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const renderHome = () => {
  return render(
    <BrowserRouter>
      <Home />
    </BrowserRouter>
  );
};

describe('Feature: likenessguard-web-dashboard, Property 2: Violation Alert Visibility', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorageMock.getItem.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const violationArbitrary = fc.record({
    query_id: fc.string({ minLength: 1, maxLength: 50 }),
    timestamp: fc.integer({ min: 1000000000, max: 9999999999 }),
    reason_code: fc.constantFrom(
      'POLICY_DENY',
      'NO_CONSENT',
      'RESTRICTED_USE',
      'UNAUTHORIZED_ACCESS'
    ),
    similarity_score: fc.float({ min: 0, max: 1 }),
    requester_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    usage_type: fc.constantFrom(
      'SELF_EDIT',
      'THIRD_PARTY_EDIT',
      'FACE_SWAP',
      'GENERAL_GENERATION'
    ),
  });

  it('should display violation alert if and only if violations exist in dashboard state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(violationArbitrary, { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (violations, likenessId) => {
          localStorageMock.getItem.mockReturnValue(likenessId);

          vi.spyOn(consentService, 'getPolicy').mockRejectedValue({
            type: 'validation',
            message: 'Policy not found',
          });

          vi.spyOn(logsService, 'getActivityLogs').mockResolvedValue({
            likeness_id: likenessId,
            evidence_records: [],
            count: 0,
          });

          vi.spyOn(logsService, 'getViolations').mockResolvedValue({
            likeness_id: likenessId,
            violations: violations,
            count: violations.length,
          });

          const { unmount } = renderHome();

          await waitFor(
            () => {
              expect(screen.queryByText(/loading dashboard data/i)).not.toBeInTheDocument();
            },
            { timeout: 2000 }
          );

          const hasViolations = violations.length > 0;
          const violationAlertText = screen.queryByText(/violation detected/i);

          if (hasViolations) {
            expect(violationAlertText).toBeInTheDocument();

            const countText = violations.length === 1 
              ? '1 unauthorized use of your likeness detected'
              : violations.length + ' unauthorized uses of your likeness detected';
            expect(screen.queryByText(countText)).toBeInTheDocument();

            expect(screen.queryByRole('button', { name: /view violations/i })).toBeInTheDocument();
          } else {
            expect(violationAlertText).not.toBeInTheDocument();
            expect(screen.queryByText(/unauthorized use/i)).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /view violations/i })).not.toBeInTheDocument();
          }

          unmount();
          cleanup();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);
});