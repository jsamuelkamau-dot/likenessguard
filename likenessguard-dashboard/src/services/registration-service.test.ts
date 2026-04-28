/**
 * Unit tests for Registration Service
 * 
 * Tests file conversion, validation, and API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fileToBase64,
  filesToBase64,
  registerLikeness,
  validateImageFormat,
  validateImageFiles,
  createDefaultConsentPolicy,
} from './registration-service';
import { getApiClient } from './api-client';
import type { ConsentPolicy, RegistrationResponse } from '../types/api-types';

// Mock the API client
vi.mock('./api-client');

describe('Registration Service', () => {
  describe('fileToBase64', () => {
    it('should convert a file to base64 string', async () => {
      // Create a mock file
      const content = 'test image content';
      const blob = new Blob([content], { type: 'image/jpeg' });
      const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
      
      const base64 = await fileToBase64(file);
      
      expect(base64).toBeDefined();
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });
    
    it('should handle file read errors', async () => {
      // Create a mock file that will fail to read
      const file = new File([], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Read error'));
            }
          }, 0);
        }
      } as any;
      
      await expect(fileToBase64(file)).rejects.toThrow();
      
      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });
  
  describe('filesToBase64', () => {
    it('should convert multiple files to base64 strings', async () => {
      const files = [
        new File([new Blob(['content1'])], 'test1.jpg', { type: 'image/jpeg' }),
        new File([new Blob(['content2'])], 'test2.jpg', { type: 'image/jpeg' }),
        new File([new Blob(['content3'])], 'test3.jpg', { type: 'image/jpeg' }),
      ];
      
      const base64Array = await filesToBase64(files);
      
      expect(base64Array).toHaveLength(3);
      base64Array.forEach(base64 => {
        expect(typeof base64).toBe('string');
        expect(base64.length).toBeGreaterThan(0);
      });
    });
    
    it('should handle empty array', async () => {
      const base64Array = await filesToBase64([]);
      expect(base64Array).toHaveLength(0);
    });
  });
  
  describe('validateImageFormat', () => {
    it('should accept JPEG files', () => {
      const file = new File([], 'test.jpg', { type: 'image/jpeg' });
      expect(validateImageFormat(file)).toBe(true);
    });
    
    it('should accept PNG files', () => {
      const file = new File([], 'test.png', { type: 'image/png' });
      expect(validateImageFormat(file)).toBe(true);
    });
    
    it('should accept WebP files', () => {
      const file = new File([], 'test.webp', { type: 'image/webp' });
      expect(validateImageFormat(file)).toBe(true);
    });
    
    it('should reject PDF files', () => {
      const file = new File([], 'test.pdf', { type: 'application/pdf' });
      expect(validateImageFormat(file)).toBe(false);
    });
    
    it('should reject text files', () => {
      const file = new File([], 'test.txt', { type: 'text/plain' });
      expect(validateImageFormat(file)).toBe(false);
    });
    
    it('should handle case-insensitive MIME types', () => {
      const file = new File([], 'test.jpg', { type: 'IMAGE/JPEG' });
      expect(validateImageFormat(file)).toBe(true);
    });
  });
  
  describe('validateImageFiles', () => {
    it('should validate correct number of files with valid formats', () => {
      const files = Array.from({ length: 5 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const result = validateImageFiles(files);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject too few files', () => {
      const files = Array.from({ length: 3 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const result = validateImageFiles(files);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('At least 5 photos required');
    });
    
    it('should reject too many files', () => {
      const files = Array.from({ length: 12 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const result = validateImageFiles(files);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Maximum 10 photos allowed');
    });
    
    it('should reject files with invalid formats', () => {
      const files = [
        ...Array.from({ length: 4 }, (_, i) =>
          new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
        ),
        new File([new Blob(['content'])], 'test.pdf', { type: 'application/pdf' }),
      ];
      
      const result = validateImageFiles(files);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('invalid format'))).toBe(true);
    });
    
    it('should reject files that are too large', () => {
      const largeContent = new Blob([new ArrayBuffer(11 * 1024 * 1024)]); // 11MB
      const files = [
        ...Array.from({ length: 4 }, (_, i) =>
          new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
        ),
        new File([largeContent], 'large.jpg', { type: 'image/jpeg' }),
      ];
      
      const result = validateImageFiles(files);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('too large'))).toBe(true);
    });
  });
  
  describe('createDefaultConsentPolicy', () => {
    it('should create a restrictive default policy', () => {
      const policy = createDefaultConsentPolicy();
      
      expect(policy.allow_self_edits).toBe(true);
      expect(policy.deny_third_party_edits).toBe(true);
      expect(policy.deny_face_swaps).toBe(true);
      expect(policy.deny_sexualized_content).toBe(true);
      expect(policy.deny_impersonation).toBe(true);
      expect(policy.deny_political_use).toBe(true);
    });
  });
  
  describe('registerLikeness', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    
    it('should successfully register a likeness', async () => {
      const mockResponse: RegistrationResponse = {
        likeness_id: 'test-likeness-id',
        status: 'SUCCESS',
        processed_photos: 5,
      };
      
      const mockApiClient = {
        post: vi.fn().mockResolvedValue(mockResponse),
      };
      
      vi.mocked(getApiClient).mockReturnValue(mockApiClient as any);
      
      const files = Array.from({ length: 5 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const policy = createDefaultConsentPolicy();
      const result = await registerLikeness('user123', files, policy, 'user@example.com');
      
      expect(result.likeness_id).toBe('test-likeness-id');
      expect(result.status).toBe('SUCCESS');
      expect(result.processed_photos).toBe(5);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/register',
        expect.objectContaining({
          user_id: 'user123',
          email: 'user@example.com',
          consent_policy: policy,
        })
      );
    });
    
    it('should reject registration with too few photos', async () => {
      const files = Array.from({ length: 3 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const policy = createDefaultConsentPolicy();
      
      await expect(
        registerLikeness('user123', files, policy)
      ).rejects.toMatchObject({
        type: 'validation',
        message: expect.stringContaining('between 5 and 10 photos'),
      });
    });
    
    it('should reject registration with too many photos', async () => {
      const files = Array.from({ length: 12 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const policy = createDefaultConsentPolicy();
      
      await expect(
        registerLikeness('user123', files, policy)
      ).rejects.toMatchObject({
        type: 'validation',
        message: expect.stringContaining('between 5 and 10 photos'),
      });
    });
    
    it('should handle API errors', async () => {
      const mockApiClient = {
        post: vi.fn().mockRejectedValue({
          type: 'server',
          message: 'Server error occurred',
        }),
      };
      
      vi.mocked(getApiClient).mockReturnValue(mockApiClient as any);
      
      const files = Array.from({ length: 5 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const policy = createDefaultConsentPolicy();
      
      await expect(
        registerLikeness('user123', files, policy)
      ).rejects.toMatchObject({
        type: 'server',
        message: 'Server error occurred',
      });
    });
    
    it('should handle partial success responses', async () => {
      const mockResponse: RegistrationResponse = {
        likeness_id: 'test-likeness-id',
        status: 'PARTIAL_SUCCESS',
        processed_photos: 4,
        errors: ['No face detected in photo 5'],
      };
      
      const mockApiClient = {
        post: vi.fn().mockResolvedValue(mockResponse),
      };
      
      vi.mocked(getApiClient).mockReturnValue(mockApiClient as any);
      
      const files = Array.from({ length: 5 }, (_, i) =>
        new File([new Blob(['content'])], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const policy = createDefaultConsentPolicy();
      const result = await registerLikeness('user123', files, policy);
      
      expect(result.status).toBe('PARTIAL_SUCCESS');
      expect(result.processed_photos).toBe(4);
      expect(result.errors).toHaveLength(1);
    });
  });
});
