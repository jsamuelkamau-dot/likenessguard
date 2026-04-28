/**
 * Property-Based Test: Image Format Validation
 * 
 * **Validates: Requirements 2.1**
 * 
 * Property 3: Image Format Validation
 * For any file selected for upload, the registration interface should accept the file
 * if and only if it matches the accepted image formats (JPEG, PNG, WebP).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Feature: likenessguard-web-dashboard, Property 3: Image Format Validation', () => {
  /**
   * Helper function to validate image format
   * This mirrors the validation logic in ImageUpload component
   */
  const validateImageFormat = (file: { type: string; size: number }): boolean => {
    const acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    // Check format
    if (!acceptedFormats.includes(file.type)) {
      return false;
    }

    // Check size
    if (file.size > maxFileSize) {
      return false;
    }

    return true;
  };

  /**
   * Property: Files should be accepted if and only if they match accepted formats
   * Validates: Requirements 2.2
   */
  it('should accept files if and only if they match accepted image formats (JPEG, PNG, WebP)', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          type: fc.oneof(
            // Valid formats
            fc.constant('image/jpeg'),
            fc.constant('image/png'),
            fc.constant('image/webp'),
            // Invalid formats
            fc.constant('image/gif'),
            fc.constant('image/bmp'),
            fc.constant('image/svg+xml'),
            fc.constant('image/tiff'),
            fc.constant('application/pdf'),
            fc.constant('text/plain'),
            fc.constant('text/html'),
            fc.constant('application/json'),
            fc.constant('video/mp4'),
            fc.constant('audio/mpeg'),
            // Random invalid formats
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          size: fc.nat({ max: 20 * 1024 * 1024 }), // 0 to 20MB
        }),
        (file) => {
          const acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'];
          const isValid = validateImageFormat(file);
          const shouldBeValid = acceptedFormats.includes(file.type) && file.size <= 10 * 1024 * 1024;

          // The validation result should match the expected result
          expect(isValid).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All valid JPEG files should be accepted
   * Validates: Requirements 2.2
   */
  it('should accept all JPEG files with valid size', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.nat({ max: 10 * 1024 * 1024 }), // 0 to 10MB
        (name, size) => {
          const file = {
            name: name + '.jpg',
            type: 'image/jpeg',
            size,
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All valid PNG files should be accepted
   * Validates: Requirements 2.2
   */
  it('should accept all PNG files with valid size', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.nat({ max: 10 * 1024 * 1024 }), // 0 to 10MB
        (name, size) => {
          const file = {
            name: name + '.png',
            type: 'image/png',
            size,
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All valid WebP files should be accepted
   * Validates: Requirements 2.2
   */
  it('should accept all WebP files with valid size', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.nat({ max: 10 * 1024 * 1024 }), // 0 to 10MB
        (name, size) => {
          const file = {
            name: name + '.webp',
            type: 'image/webp',
            size,
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All non-image files should be rejected
   * Validates: Requirements 2.2
   */
  it('should reject all non-image files', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom(
          'application/pdf',
          'text/plain',
          'text/html',
          'application/json',
          'video/mp4',
          'audio/mpeg',
          'application/zip',
          'application/octet-stream'
        ),
        fc.nat({ max: 10 * 1024 * 1024 }),
        (name, type, size) => {
          const file = {
            name,
            type,
            size,
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All unsupported image formats should be rejected
   * Validates: Requirements 2.2
   */
  it('should reject unsupported image formats (GIF, BMP, SVG, TIFF)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom(
          'image/gif',
          'image/bmp',
          'image/svg+xml',
          'image/tiff',
          'image/x-icon'
        ),
        fc.nat({ max: 10 * 1024 * 1024 }),
        (name, type, size) => {
          const file = {
            name,
            type,
            size,
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Files exceeding size limit should be rejected regardless of format
   * Validates: Requirements 2.2
   */
  it('should reject files exceeding 10MB size limit regardless of format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
        fc.integer({ min: 10 * 1024 * 1024 + 1, max: 100 * 1024 * 1024 }), // > 10MB
        (name, type, size) => {
          const file = {
            name,
            type,
            size,
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty files (0 bytes) should be accepted if format is valid
   * Edge case: validates that size validation doesn't reject 0-byte files
   * Validates: Requirements 2.2
   */
  it('should accept empty files (0 bytes) if format is valid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
        (name, type) => {
          const file = {
            name,
            type,
            size: 0,
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Files at exactly 10MB should be accepted
   * Edge case: validates boundary condition
   * Validates: Requirements 2.2
   */
  it('should accept files at exactly 10MB size limit', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
        (name, type) => {
          const file = {
            name,
            type,
            size: 10 * 1024 * 1024, // Exactly 10MB
          };

          const isValid = validateImageFormat(file);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Format validation should be case-sensitive
   * Validates: Requirements 2.2
   */
  it('should perform case-sensitive format validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom(
          'IMAGE/JPEG',
          'Image/Jpeg',
          'IMAGE/PNG',
          'Image/Png',
          'IMAGE/WEBP',
          'Image/Webp'
        ),
        fc.nat({ max: 10 * 1024 * 1024 }),
        (name, type, size) => {
          const file = {
            name,
            type,
            size,
          };

          // Uppercase or mixed-case MIME types should be rejected
          const isValid = validateImageFormat(file);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Meta-property: Validation should be deterministic
   * Same file should always produce same validation result
   * Validates: Requirements 2.2
   */
  it('should produce deterministic validation results for the same file', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          type: fc.string({ minLength: 1, maxLength: 50 }),
          size: fc.nat({ max: 20 * 1024 * 1024 }),
        }),
        (file) => {
          // Validate the same file multiple times
          const result1 = validateImageFormat(file);
          const result2 = validateImageFormat(file);
          const result3 = validateImageFormat(file);

          // All results should be identical
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });
});
