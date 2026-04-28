/**
 * Property-Based Test: API Method Correctness
 * 
 * **Validates: Requirements 2.3, 3.1, 3.3, 3.5, 4.2, 5.1, 6.1, 10.1**
 * 
 * Property 4: API Method Correctness
 * For any API operation (register, consent check, policy update, policy revoke, log retrieval),
 * the dashboard should use the correct HTTP method:
 * - POST for register and consent check
 * - PUT for policy update
 * - DELETE for policy revoke
 * - GET for logs and evidence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import axios from 'axios';
import { ApiClient } from '../api-client';
import type { UsageType } from '../../types/api-types';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Feature: likenessguard-web-dashboard, Property 4: API Method Correctness', () => {
  let mockAxiosInstance: any;
  let apiClient: ApiClient;

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
      defaults: {
        baseURL: 'http://localhost:3000',
        headers: {
          common: {},
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    apiClient = new ApiClient({
      baseURL: 'http://localhost:3000',
      timeout: 5000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: Registration operations should always use POST method
   * Validates: Requirements 2.3, 10.1
   */
  it('should use POST method for registration operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          // Clear mocks for this iteration
          mockAxiosInstance.get.mockClear();
          mockAxiosInstance.post.mockClear();
          mockAxiosInstance.put.mockClear();
          mockAxiosInstance.delete.mockClear();
          
          mockAxiosInstance.post.mockResolvedValue({
            data: {
              message: 'Registration successful',
              user_id: userId,
            },
          });

          await apiClient.post('/register', { user_id: userId });

          // Verify POST method was used exactly once
          expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/register',
            { user_id: userId },
            undefined
          );
          
          // Verify other methods were NOT used
          expect(mockAxiosInstance.get).not.toHaveBeenCalled();
          expect(mockAxiosInstance.put).not.toHaveBeenCalled();
          expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Consent check operations should always use POST method
   * Validates: Requirements 4.2, 10.1
   */
  it('should use POST method for consent check operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('SELF_EDIT', 'THIRD_PARTY_EDIT', 'FACE_SWAP', 'GENERAL_GENERATION'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (usageType, requesterId) => {
          // Clear mocks for this iteration
          mockAxiosInstance.get.mockClear();
          mockAxiosInstance.post.mockClear();
          mockAxiosInstance.put.mockClear();
          mockAxiosInstance.delete.mockClear();
          
          mockAxiosInstance.post.mockResolvedValue({
            data: {
              decision: 'ALLOW',
              reason: 'Consent granted',
            },
          });

          await apiClient.post('/consent/check', {
            usageType,
            requesterId,
          });

          expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/consent/check',
            { usageType, requesterId },
            undefined
          );
          
          // Verify other methods were NOT used
          expect(mockAxiosInstance.get).not.toHaveBeenCalled();
          expect(mockAxiosInstance.put).not.toHaveBeenCalled();
          expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Policy retrieval operations should always use GET method
   * Validates: Requirements 3.1, 10.1
   */
  it('should use GET method for policy retrieval operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (likenessId) => {
          // Clear mocks for this iteration
          mockAxiosInstance.get.mockClear();
          mockAxiosInstance.post.mockClear();
          mockAxiosInstance.put.mockClear();
          mockAxiosInstance.delete.mockClear();
          
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              likeness_id: likenessId,
              consent_policy: {},
            },
          });

          await apiClient.get('/consent', { likeness_id: likenessId });

          expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/consent',
            { params: { likeness_id: likenessId } }
          );
          
          // Verify other methods were NOT used
          expect(mockAxiosInstance.post).not.toHaveBeenCalled();
          expect(mockAxiosInstance.put).not.toHaveBeenCalled();
          expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Policy update operations should always use PUT method
   * Validates: Requirements 3.3, 10.1
   */
  it('should use PUT method for policy update operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (likenessId) => {
          // Clear mocks for this iteration
          mockAxiosInstance.get.mockClear();
          mockAxiosInstance.post.mockClear();
          mockAxiosInstance.put.mockClear();
          mockAxiosInstance.delete.mockClear();
          
          mockAxiosInstance.put.mockResolvedValue({
            data: {
              message: 'Policy updated',
              likeness_id: likenessId,
            },
          });

          await apiClient.put('/consent', {
            likeness_id: likenessId,
            new_policy: {},
          });

          expect(mockAxiosInstance.put).toHaveBeenCalledTimes(1);
          expect(mockAxiosInstance.put).toHaveBeenCalledWith(
            '/consent',
            { likeness_id: likenessId, new_policy: {} },
            undefined
          );
          
          // Verify other methods were NOT used
          expect(mockAxiosInstance.get).not.toHaveBeenCalled();
          expect(mockAxiosInstance.post).not.toHaveBeenCalled();
          expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Consent revocation operations should always use DELETE method
   * Validates: Requirements 3.5, 10.1
   */
  it('should use DELETE method for consent revocation operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (likenessId) => {
          // Clear mocks for this iteration
          mockAxiosInstance.get.mockClear();
          mockAxiosInstance.post.mockClear();
          mockAxiosInstance.put.mockClear();
          mockAxiosInstance.delete.mockClear();
          
          mockAxiosInstance.delete.mockResolvedValue({
            data: {
              message: 'Consent revoked',
              likeness_id: likenessId,
            },
          });

          await apiClient.delete('/consent', {
            data: { likeness_id: likenessId },
          });

          expect(mockAxiosInstance.delete).toHaveBeenCalledTimes(1);
          expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
            '/consent',
            { data: { likeness_id: likenessId } }
          );
          
          // Verify other methods were NOT used
          expect(mockAxiosInstance.get).not.toHaveBeenCalled();
          expect(mockAxiosInstance.post).not.toHaveBeenCalled();
          expect(mockAxiosInstance.put).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Activity logs retrieval operations should always use GET method
   * Validates: Requirements 5.1, 10.1
   */
  it('should use GET method for activity logs retrieval operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (likenessId) => {
          // Clear mocks for this iteration
          mockAxiosInstance.get.mockClear();
          mockAxiosInstance.post.mockClear();
          mockAxiosInstance.put.mockClear();
          mockAxiosInstance.delete.mockClear();
          
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              likeness_id: likenessId,
              evidence_records: [],
            },
          });

          await apiClient.get('/evidence', { likeness_id: likenessId });

          expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/evidence',
            { params: { likeness_id: likenessId } }
          );
          
          // Verify other methods were NOT used
          expect(mockAxiosInstance.post).not.toHaveBeenCalled();
          expect(mockAxiosInstance.put).not.toHaveBeenCalled();
          expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Meta-property: Verify all API operations use exactly one HTTP method
   * This ensures no operation accidentally uses multiple methods
   */
  it('should use exactly one HTTP method per API operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (method, endpoint) => {
          mockAxiosInstance.get.mockResolvedValue({ data: {} });
          mockAxiosInstance.post.mockResolvedValue({ data: {} });
          mockAxiosInstance.put.mockResolvedValue({ data: {} });
          mockAxiosInstance.delete.mockResolvedValue({ data: {} });

          switch (method) {
            case 'GET':
              await apiClient.get(endpoint);
              expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
              expect(mockAxiosInstance.post).not.toHaveBeenCalled();
              expect(mockAxiosInstance.put).not.toHaveBeenCalled();
              expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
              break;
            case 'POST':
              await apiClient.post(endpoint, {});
              expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
              expect(mockAxiosInstance.get).not.toHaveBeenCalled();
              expect(mockAxiosInstance.put).not.toHaveBeenCalled();
              expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
              break;
            case 'PUT':
              await apiClient.put(endpoint, {});
              expect(mockAxiosInstance.put).toHaveBeenCalledTimes(1);
              expect(mockAxiosInstance.get).not.toHaveBeenCalled();
              expect(mockAxiosInstance.post).not.toHaveBeenCalled();
              expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
              break;
            case 'DELETE':
              await apiClient.delete(endpoint);
              expect(mockAxiosInstance.delete).toHaveBeenCalledTimes(1);
              expect(mockAxiosInstance.get).not.toHaveBeenCalled();
              expect(mockAxiosInstance.post).not.toHaveBeenCalled();
              expect(mockAxiosInstance.put).not.toHaveBeenCalled();
              break;
          }

          // Clear mocks for next iteration
          vi.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
