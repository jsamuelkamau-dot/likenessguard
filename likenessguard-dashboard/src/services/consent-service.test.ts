/**
 * Unit tests for Consent Service
 * 
 * Tests the consent policy management and consent checking functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPolicy,
  updatePolicy,
  revokeConsent,
  checkConsent,
  validateConsentPolicy,
} from './consent-service';
import { getApiClient } from './api-client';
import type {
  ConsentPolicy,
  ConsentGetResponse,
  ConsentUpdateResponse,
  ConsentRevokeResponse,
  ConsentCheckResponse,
  UsageType,
  Decision,
  ReasonCode,
} from '../types/api-types';

// Mock the API client
vi.mock('./api-client');
vi.mock('./registration-service', () => ({
  fileToBase64: vi.fn((file: File) => Promise.resolve('base64encodedimage')),
}));

describe('Consent Service', () => {
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    // Mock getApiClient to return our mock
    vi.mocked(getApiClient).mockReturnValue(mockApiClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPolicy', () => {
    it('should retrieve consent policy successfully', async () => {
      const mockResponse: ConsentGetResponse = {
        likeness_id: 'test-likeness-123',
        consent_policy: {
          allow_self_edits: true,
          deny_third_party_edits: true,
          deny_face_swaps: true,
          deny_sexualized_content: true,
          deny_impersonation: true,
          deny_political_use: true,
        },
        user_metadata: {
          user_id: 'test-user-123',
          email: 'test@example.com',
          registration_source: 'dashboard',
        },
        created_at: 1234567890,
        modified_at: 1234567890,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getPolicy('test-likeness-123');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/consent',
        { likeness_id: 'test-likeness-123' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle response with body wrapper', async () => {
      const mockResponseBody: ConsentGetResponse = {
        likeness_id: 'test-likeness-123',
        consent_policy: {
          allow_self_edits: true,
          deny_third_party_edits: false,
          deny_face_swaps: false,
          deny_sexualized_content: true,
          deny_impersonation: true,
          deny_political_use: false,
        },
        user_metadata: {
          user_id: 'test-user-123',
          registration_source: 'dashboard',
        },
        created_at: 1234567890,
        modified_at: 1234567890,
      };

      mockApiClient.get.mockResolvedValue({ body: mockResponseBody });

      const result = await getPolicy('test-likeness-123');

      expect(result).toEqual(mockResponseBody);
    });

    it('should throw validation error for empty likeness ID', async () => {
      await expect(getPolicy('')).rejects.toMatchObject({
        type: 'validation',
        message: 'Likeness ID is required',
      });

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw validation error for whitespace-only likeness ID', async () => {
      await expect(getPolicy('   ')).rejects.toMatchObject({
        type: 'validation',
        message: 'Likeness ID is required',
      });

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('updatePolicy', () => {
    const testPolicy: ConsentPolicy = {
      allow_self_edits: true,
      deny_third_party_edits: true,
      deny_face_swaps: true,
      deny_sexualized_content: true,
      deny_impersonation: true,
      deny_political_use: true,
    };

    it('should update consent policy successfully', async () => {
      const mockResponse: ConsentUpdateResponse = {
        likeness_id: 'test-likeness-123',
        status: 'SUCCESS',
        message: 'Consent policy updated successfully',
        modified_at: 1234567890,
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await updatePolicy('test-likeness-123', testPolicy);

      expect(mockApiClient.put).toHaveBeenCalledWith('/consent', {
        likeness_id: 'test-likeness-123',
        new_policy: testPolicy,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle response with body wrapper', async () => {
      const mockResponseBody: ConsentUpdateResponse = {
        likeness_id: 'test-likeness-123',
        status: 'SUCCESS',
        message: 'Policy updated',
        modified_at: 1234567890,
      };

      mockApiClient.put.mockResolvedValue({ body: mockResponseBody });

      const result = await updatePolicy('test-likeness-123', testPolicy);

      expect(result).toEqual(mockResponseBody);
    });

    it('should throw validation error for empty likeness ID', async () => {
      await expect(updatePolicy('', testPolicy)).rejects.toMatchObject({
        type: 'validation',
        message: 'Likeness ID is required',
      });

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw validation error for missing policy', async () => {
      await expect(updatePolicy('test-likeness-123', null as any)).rejects.toMatchObject({
        type: 'validation',
        message: 'Consent policy is required',
      });

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent successfully', async () => {
      const mockResponse: ConsentRevokeResponse = {
        likeness_id: 'test-likeness-123',
        status: 'SUCCESS',
        message: 'Consent revoked successfully',
        revoked_at: 1234567890,
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await revokeConsent('test-likeness-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/consent', {
        data: { likeness_id: 'test-likeness-123' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle response with body wrapper', async () => {
      const mockResponseBody: ConsentRevokeResponse = {
        likeness_id: 'test-likeness-123',
        status: 'SUCCESS',
        message: 'Consent revoked',
        revoked_at: 1234567890,
      };

      mockApiClient.delete.mockResolvedValue({ body: mockResponseBody });

      const result = await revokeConsent('test-likeness-123');

      expect(result).toEqual(mockResponseBody);
    });

    it('should throw validation error for empty likeness ID', async () => {
      await expect(revokeConsent('')).rejects.toMatchObject({
        type: 'validation',
        message: 'Likeness ID is required',
      });

      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should throw validation error for whitespace-only likeness ID', async () => {
      await expect(revokeConsent('   ')).rejects.toMatchObject({
        type: 'validation',
        message: 'Likeness ID is required',
      });

      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('checkConsent', () => {
    let mockFile: File;

    beforeEach(() => {
      // Create a mock File object
      mockFile = new File(['test image content'], 'test.jpg', {
        type: 'image/jpeg',
      });
    });

    it('should check consent successfully', async () => {
      const mockResponse: ConsentCheckResponse = {
        decision: 'ALLOW' as Decision,
        reason_code: 'ALLOW_SELF_EDIT' as ReasonCode,
        timestamp: 1234567890,
        likeness_id: 'test-likeness-123',
        similarity_score: 0.95,
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await checkConsent(
        mockFile,
        'SELF_EDIT' as UsageType,
        'test-requester-123',
        'test-user-123'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/consent/check', {
        referenceImage: 'base64encodedimage',
        usageType: 'SELF_EDIT',
        requesterId: 'test-requester-123',
        userId: 'test-user-123',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should check consent without optional userId', async () => {
      const mockResponse: ConsentCheckResponse = {
        decision: 'DENY' as Decision,
        reason_code: 'DENY_POLICY_VIOLATION' as ReasonCode,
        timestamp: 1234567890,
        likeness_id: 'test-likeness-123',
        similarity_score: 0.88,
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await checkConsent(
        mockFile,
        'FACE_SWAP' as UsageType,
        'test-requester-123'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/consent/check', {
        referenceImage: 'base64encodedimage',
        usageType: 'FACE_SWAP',
        requesterId: 'test-requester-123',
        userId: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle response with body wrapper', async () => {
      const mockResponseBody: ConsentCheckResponse = {
        decision: 'UNKNOWN' as Decision,
        reason_code: 'UNKNOWN_NO_MATCH' as ReasonCode,
        timestamp: 1234567890,
      };

      mockApiClient.post.mockResolvedValue({ body: mockResponseBody });

      const result = await checkConsent(
        mockFile,
        'GENERAL_GENERATION' as UsageType,
        'test-requester-123'
      );

      expect(result).toEqual(mockResponseBody);
    });

    it('should throw validation error for missing reference image', async () => {
      await expect(
        checkConsent(null as any, 'SELF_EDIT' as UsageType, 'test-requester-123')
      ).rejects.toMatchObject({
        type: 'validation',
        message: 'Reference image is required',
      });

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw validation error for missing usage type', async () => {
      await expect(
        checkConsent(mockFile, null as any, 'test-requester-123')
      ).rejects.toMatchObject({
        type: 'validation',
        message: 'Usage type is required',
      });

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw validation error for empty requester ID', async () => {
      await expect(
        checkConsent(mockFile, 'SELF_EDIT' as UsageType, '')
      ).rejects.toMatchObject({
        type: 'validation',
        message: 'Requester ID is required',
      });

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('validateConsentPolicy', () => {
    it('should validate a correct policy', () => {
      const validPolicy: ConsentPolicy = {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      };

      const result = validateConsentPolicy(validPolicy);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing allow_self_edits', () => {
      const invalidPolicy = {
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      } as any;

      const result = validateConsentPolicy(invalidPolicy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('allow_self_edits must be a boolean');
    });

    it('should detect invalid type for deny_face_swaps', () => {
      const invalidPolicy = {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: 'yes' as any,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      };

      const result = validateConsentPolicy(invalidPolicy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deny_face_swaps must be a boolean');
    });

    it('should detect multiple invalid fields', () => {
      const invalidPolicy = {
        allow_self_edits: 'true' as any,
        deny_third_party_edits: 1 as any,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      };

      const result = validateConsentPolicy(invalidPolicy);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
