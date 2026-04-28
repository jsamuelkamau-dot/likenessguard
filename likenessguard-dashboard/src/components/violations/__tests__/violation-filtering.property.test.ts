/**
 * Property-Based Test: Violation Filtering
 * 
 * **Validates: Requirements 6.2**
 * 
 * Property 11: Violation Filtering
 * For any set of activity logs, the violations panel should display only entries
 * where the decision is DENY.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { filterLogsByDecision } from '../../../services/logs-service';
import type { ActivityLog, Decision } from '../../../types/api-types';

describe('Feature: likenessguard-web-dashboard, Property 11: Violation Filtering', () => {
  const activityLogArbitrary = fc.record({
    query_id: fc.uuid(),
    timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
    decision: fc.constantFrom('ALLOW', 'DENY', 'UNKNOWN') as fc.Arbitrary<Decision>,
    reason_code: fc.constantFrom(
      'ALLOW_SELF_EDIT',
      'ALLOW_POLICY_PERMITS',
      'DENY_POLICY_VIOLATION',
      'DENY_THIRD_PARTY',
      'DENY_FACE_SWAP',
      'DENY_SEXUALIZED_CONTENT',
      'DENY_IMPERSONATION',
      'DENY_POLITICAL_USE',
      'UNKNOWN_NO_MATCH',
      'UNKNOWN_NO_FACE',
      'UNKNOWN_SERVICE_ERROR'
    ),
    requester_id: fc.string({ minLength: 1, maxLength: 50 }),
    usage_type: fc.constantFrom('SELF_EDIT', 'THIRD_PARTY_EDIT', 'FACE_SWAP', 'GENERAL_GENERATION'),
    similarity_score: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
  });

  it('should filter and return only DENY decisions as violations', () => {
    fc.assert(
      fc.property(
        fc.array(activityLogArbitrary, { minLength: 0, maxLength: 50 }),
        (logs) => {
          // Filter logs to get only DENY decisions
          const violations = filterLogsByDecision(logs, 'DENY');

          // Count expected DENY decisions
          const expectedDenyCount = logs.filter(
            (log) => log.decision === 'DENY'
          ).length;

          // Verify that violations count matches DENY count
          expect(violations.length).toBe(expectedDenyCount);

          // Verify that all returned violations have DENY decision
          violations.forEach((violation) => {
            expect(violation.decision).toBe('DENY');
          });

          // Verify that no ALLOW or UNKNOWN decisions are included
          const nonDenyDecisions = logs.filter(
            (log) => log.decision === 'ALLOW' || log.decision === 'UNKNOWN'
          );
          nonDenyDecisions.forEach((log) => {
            const foundInViolations = violations.some(
              (v) => v.query_id === log.query_id
            );
            expect(foundInViolations).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty violations array when no DENY decisions exist', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            query_id: fc.uuid(),
            timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
            decision: fc.constantFrom('ALLOW', 'UNKNOWN') as fc.Arbitrary<Decision>,
            reason_code: fc.constantFrom(
              'ALLOW_SELF_EDIT',
              'ALLOW_POLICY_PERMITS',
              'UNKNOWN_NO_MATCH',
              'UNKNOWN_NO_FACE'
            ),
            requester_id: fc.string({ minLength: 1, maxLength: 50 }),
            usage_type: fc.constantFrom('SELF_EDIT', 'THIRD_PARTY_EDIT', 'FACE_SWAP', 'GENERAL_GENERATION'),
            similarity_score: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (logs) => {
          // Filter logs to get only DENY decisions
          const violations = filterLogsByDecision(logs, 'DENY');

          // Should return empty violations
          expect(violations.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all logs when all are DENY decisions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            query_id: fc.uuid(),
            timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
            decision: fc.constant('DENY') as fc.Arbitrary<Decision>,
            reason_code: fc.constantFrom(
              'DENY_POLICY_VIOLATION',
              'DENY_THIRD_PARTY',
              'DENY_FACE_SWAP',
              'DENY_SEXUALIZED_CONTENT',
              'DENY_IMPERSONATION',
              'DENY_POLITICAL_USE'
            ),
            requester_id: fc.string({ minLength: 1, maxLength: 50 }),
            usage_type: fc.constantFrom('SELF_EDIT', 'THIRD_PARTY_EDIT', 'FACE_SWAP', 'GENERAL_GENERATION'),
            similarity_score: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (logs) => {
          // Filter logs to get only DENY decisions
          const violations = filterLogsByDecision(logs, 'DENY');

          // Should return all logs as violations
          expect(violations.length).toBe(logs.length);

          // Verify all violations are present
          logs.forEach((log) => {
            const foundViolation = violations.find(
              (v) => v.query_id === log.query_id
            );
            expect(foundViolation).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty log array', () => {
    const emptyLogs: ActivityLog[] = [];
    const violations = filterLogsByDecision(emptyLogs, 'DENY');

    // Should return empty violations
    expect(violations.length).toBe(0);
  });

  it('should preserve violation properties correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            query_id: fc.uuid(),
            timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
            decision: fc.constant('DENY') as fc.Arbitrary<Decision>,
            reason_code: fc.constantFrom(
              'DENY_POLICY_VIOLATION',
              'DENY_THIRD_PARTY',
              'DENY_FACE_SWAP'
            ),
            requester_id: fc.string({ minLength: 1, maxLength: 50 }),
            usage_type: fc.constantFrom('SELF_EDIT', 'THIRD_PARTY_EDIT', 'FACE_SWAP', 'GENERAL_GENERATION'),
            similarity_score: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (logs) => {
          // Filter logs to get only DENY decisions
          const violations = filterLogsByDecision(logs, 'DENY');

          // Verify each violation preserves all properties
          violations.forEach((violation) => {
            const originalLog = logs.find((log) => log.query_id === violation.query_id);
            expect(originalLog).toBeDefined();
            expect(violation.query_id).toBe(originalLog?.query_id);
            expect(violation.timestamp).toBe(originalLog?.timestamp);
            expect(violation.reason_code).toBe(originalLog?.reason_code);
            expect(violation.requester_id).toBe(originalLog?.requester_id);
            expect(violation.usage_type).toBe(originalLog?.usage_type);
            expect(violation.similarity_score).toBe(originalLog?.similarity_score);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be idempotent - filtering twice should give same result', () => {
    fc.assert(
      fc.property(
        fc.array(activityLogArbitrary, { minLength: 0, maxLength: 30 }),
        (logs) => {
          // Filter once
          const violations1 = filterLogsByDecision(logs, 'DENY');
          
          // Filter again
          const violations2 = filterLogsByDecision(logs, 'DENY');

          // Should return same results
          expect(violations1.length).toBe(violations2.length);
          
          // Should have same query IDs
          const ids1 = violations1.map(v => v.query_id).sort();
          const ids2 = violations2.map(v => v.query_id).sort();
          expect(ids1).toEqual(ids2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain referential integrity - filtered logs should be from original set', () => {
    fc.assert(
      fc.property(
        fc.array(activityLogArbitrary, { minLength: 1, maxLength: 30 }),
        (logs) => {
          const violations = filterLogsByDecision(logs, 'DENY');

          // Every violation should exist in original logs
          violations.forEach((violation) => {
            const foundInOriginal = logs.some(
              (log) => log.query_id === violation.query_id
            );
            expect(foundInOriginal).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
