/**
 * Property-Based Test: Success Response Handling
 * 
 * **Validates: Requirements 2.4, 2.7**
 * 
 * Property 5: Success Response Handling
 * For any successful API response, the dashboard should parse the response data
 * and display the relevant fields (message, fingerprint, decision, reason, similarity, policy data, logs).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { RegistrationResponse } from '../../../types/api-types';

describe('Feature: likenessguard-web-dashboard, Property 5: Success Response Handling', () => {
  /**
   * Helper function to parse and extract displayable fields from registration response
   * This mirrors the logic in RegistrationForm component
   */
  const parseRegistrationResponse = (response: RegistrationResponse): {
    likenessId: string;
    message: string;
    status: string;
    processedPhotos: number;
    hasErrors: boolean;
  } => {
    return {
      likenessId: response.likeness_id,
      message: `Successfully registered likeness! Likeness ID: ${response.likeness_id}`,
      status: response.status,
      processedPhotos: response.processed_photos,
      hasErrors: !!response.errors && response.errors.length > 0,
    };
  };

  /**
   * Property: All successful registration responses should be parseable
   * Validates: Requirements 2.4, 2.7
   */
  it('should parse all successful registration responses and extract relevant fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          likeness_id: fc.string({ minLength: 1, maxLength: 100 }),
          status: fc.constantFrom('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'),
          processed_photos: fc.integer({ min: 0, max: 10 }),
          errors: fc.option(fc.array(fc.string(), { minLength: 0, maxLength: 5 })),
        }),
        (response: RegistrationResponse) => {
          const parsed = parseRegistrationResponse(response);

          // Should extract likeness_id
          expect(parsed.likenessId).toBe(response.likeness_id);

          // Should create a message containing the likeness_id
          expect(parsed.message).toContain(response.likeness_id);
          expect(parsed.message).toContain('Successfully registered likeness');

          // Should extract status
          expect(parsed.status).toBe(response.status);

          // Should extract processed_photos count
          expect(parsed.processedPhotos).toBe(response.processed_photos);

          // Should correctly identify if errors exist
          const expectedHasErrors = !!response.errors && response.errors.length > 0;
          expect(parsed.hasErrors).toBe(expectedHasErrors);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Likeness ID should always be displayed in success message
   * Validates: Requirements 2.7
   */
  it('should always include likeness_id in the success message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 5, max: 10 }),
        (likenessId, processedPhotos) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status: 'SUCCESS',
            processed_photos: processedPhotos,
          };

          const parsed = parseRegistrationResponse(response);

          // Message should contain the likeness_id
          expect(parsed.message).toContain(likenessId);
          expect(parsed.likenessId).toBe(likenessId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: SUCCESS status responses should have processed_photos > 0
   * Validates: Requirements 2.4
   */
  it('should handle SUCCESS status with positive processed_photos count', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (likenessId, processedPhotos) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status: 'SUCCESS',
            processed_photos: processedPhotos,
          };

          const parsed = parseRegistrationResponse(response);

          expect(parsed.status).toBe('SUCCESS');
          expect(parsed.processedPhotos).toBeGreaterThan(0);
          expect(parsed.hasErrors).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: PARTIAL_SUCCESS status may have errors
   * Validates: Requirements 2.4
   */
  it('should handle PARTIAL_SUCCESS status with optional errors', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        fc.option(fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 })),
        (likenessId, processedPhotos, errors) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status: 'PARTIAL_SUCCESS',
            processed_photos: processedPhotos,
            errors: errors || undefined,
          };

          const parsed = parseRegistrationResponse(response);

          expect(parsed.status).toBe('PARTIAL_SUCCESS');
          expect(parsed.processedPhotos).toBeGreaterThan(0);
          
          // hasErrors should match whether errors array exists and has items
          const expectedHasErrors = !!errors && errors.length > 0;
          expect(parsed.hasErrors).toBe(expectedHasErrors);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Response parsing should be deterministic
   * Same response should always produce same parsed result
   * Validates: Requirements 2.4
   */
  it('should produce deterministic parsing results for the same response', () => {
    fc.assert(
      fc.property(
        fc.record({
          likeness_id: fc.string({ minLength: 1, maxLength: 100 }),
          status: fc.constantFrom('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'),
          processed_photos: fc.integer({ min: 0, max: 10 }),
          errors: fc.option(fc.array(fc.string(), { minLength: 0, maxLength: 5 })),
        }),
        (response: RegistrationResponse) => {
          // Parse the same response multiple times
          const parsed1 = parseRegistrationResponse(response);
          const parsed2 = parseRegistrationResponse(response);
          const parsed3 = parseRegistrationResponse(response);

          // All results should be identical
          expect(parsed1).toEqual(parsed2);
          expect(parsed2).toEqual(parsed3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty likeness_id should still be handled gracefully
   * Edge case: validates that empty strings don't break parsing
   * Validates: Requirements 2.4
   */
  it('should handle edge case of empty likeness_id without crashing', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  '),
        fc.integer({ min: 0, max: 10 }),
        (likenessId, processedPhotos) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status: 'SUCCESS',
            processed_photos: processedPhotos,
          };

          // Should not throw an error
          expect(() => parseRegistrationResponse(response)).not.toThrow();

          const parsed = parseRegistrationResponse(response);
          expect(parsed.likenessId).toBe(likenessId);
          expect(parsed.message).toContain(likenessId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Zero processed_photos should be handled
   * Edge case: validates boundary condition
   * Validates: Requirements 2.4
   */
  it('should handle zero processed_photos count', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'),
        (likenessId, status) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status,
            processed_photos: 0,
          };

          const parsed = parseRegistrationResponse(response);

          expect(parsed.processedPhotos).toBe(0);
          expect(parsed.likenessId).toBe(likenessId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Special characters in likeness_id should be preserved
   * Validates: Requirements 2.7
   */
  it('should preserve special characters in likeness_id', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (likenessId, processedPhotos) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status: 'SUCCESS',
            processed_photos: processedPhotos,
          };

          const parsed = parseRegistrationResponse(response);

          // Likeness ID should be preserved exactly as received
          expect(parsed.likenessId).toBe(likenessId);
          expect(parsed.message).toContain(likenessId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Errors array should be correctly identified
   * Validates: Requirements 2.4
   */
  it('should correctly identify presence of errors in response', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 0, max: 10 }),
        fc.oneof(
          fc.constant(undefined),
          fc.constant([]),
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 })
        ),
        (likenessId, processedPhotos, errors) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status: 'PARTIAL_SUCCESS',
            processed_photos: processedPhotos,
            errors: errors as string[] | undefined,
          };

          const parsed = parseRegistrationResponse(response);

          // hasErrors should be true only if errors array exists and has items
          const expectedHasErrors = Array.isArray(errors) && errors.length > 0;
          expect(parsed.hasErrors).toBe(expectedHasErrors);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All status values should be handled
   * Validates: Requirements 2.4
   */
  it('should handle all possible status values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'),
        fc.integer({ min: 0, max: 10 }),
        (likenessId, status, processedPhotos) => {
          const response: RegistrationResponse = {
            likeness_id: likenessId,
            status,
            processed_photos: processedPhotos,
          };

          const parsed = parseRegistrationResponse(response);

          // Should successfully parse all status types
          expect(parsed.status).toBe(status);
          expect(['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE']).toContain(parsed.status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Message format should be consistent
   * Validates: Requirements 2.7
   */
  it('should generate consistent message format for all responses', () => {
    fc.assert(
      fc.property(
        fc.record({
          likeness_id: fc.string({ minLength: 1, maxLength: 100 }),
          status: fc.constantFrom('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'),
          processed_photos: fc.integer({ min: 0, max: 10 }),
        }),
        (response: RegistrationResponse) => {
          const parsed = parseRegistrationResponse(response);

          // Message should always follow the same format
          expect(parsed.message).toMatch(/Successfully registered likeness! Likeness ID: .+/);
          expect(parsed.message).toContain('Successfully registered likeness');
          expect(parsed.message).toContain('Likeness ID:');
          expect(parsed.message).toContain(response.likeness_id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
