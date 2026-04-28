/**
 * Property-Based Test: Error Response Handling
 * 
 * **Validates: Requirements 3.6, 10.4, 10.5, 10.6, 10.7**
 * 
 * Property 6: Error Response Handling
 * For any failed API response (network error, validation error, or server error),
 * the dashboard should display an error message and, where applicable, provide
 * retry options or field-specific error details.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import axios, { AxiosError } from 'axios';
import { ApiClient, type ApiError } from '../api-client';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Feature: likenessguard-web-dashboard, Property 6: Error Response Handling', () => {
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

    // Use shorter retry settings for tests
    apiClient = new ApiClient({
      baseURL: 'http://localhost:3000',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 10,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: Network errors should be identified and formatted correctly
   * Validates: Requirements 10.4
   */
  it('should identify and format network errors with appropriate message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/register', '/consent/check', '/consent', '/evidence'),
        async (endpoint) => {
          // Simulate network error (request made but no response)
          const networkError = new Error('Network Error') as AxiosError;
          networkError.request = {};
          networkError.isAxiosError = true;

          mockAxiosInstance.post.mockRejectedValue(networkError);
          mockAxiosInstance.get.mockRejectedValue(networkError);
          mockAxiosInstance.put.mockRejectedValue(networkError);
          mockAxiosInstance.delete.mockRejectedValue(networkError);

          try {
            if (endpoint === '/evidence') {
              await apiClient.get(endpoint);
            } else if (endpoint === '/consent' && Math.random() > 0.5) {
              await apiClient.put(endpoint, {});
            } else {
              await apiClient.post(endpoint, {});
            }
            expect.fail('Should have thrown an error');
          } catch (error) {
            const apiError = error as ApiError;

            // Should be identified as network error
            expect(apiError.type).toBe('network');

            // Should have user-friendly message
            expect(apiError.message).toBe('Unable to connect to server');

            // Should not have status code for network errors
            expect(apiError.statusCode).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: Validation errors (4xx) should be identified with field-specific details
   * Validates: Requirements 10.5
   */
  it('should identify validation errors and include field-specific error details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 499 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 })),
        async (statusCode, message, errors) => {
          const validationError = {
            response: {
              status: statusCode,
              data: {
                message,
                errors: errors || [],
              },
            },
            isAxiosError: true,
          } as AxiosError;

          mockAxiosInstance.post.mockRejectedValue(validationError);

          try {
            await apiClient.post('/register', {});
            expect.fail('Should have thrown an error');
          } catch (error) {
            const apiError = error as ApiError;

            // Should be identified as validation error
            expect(apiError.type).toBe('validation');

            // Should have message from response
            expect(apiError.message).toBe(message);

            // Should include error details if provided
            if (errors && errors.length > 0) {
              expect(apiError.details).toEqual(errors);
            }

            // Should include status code
            expect(apiError.statusCode).toBe(statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Server errors (5xx) should be identified with general error message
   * Validates: Requirements 10.6
   */
  it('should identify server errors and provide general error message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 500, max: 599 }),
        fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        async (statusCode, details) => {
          const serverError = {
            response: {
              status: statusCode,
              data: {
                message: details,
              },
            },
            isAxiosError: true,
          } as AxiosError;

          mockAxiosInstance.post.mockRejectedValue(serverError);

          try {
            await apiClient.post('/consent/check', {});
            expect.fail('Should have thrown an error');
          } catch (error) {
            const apiError = error as ApiError;

            // Should be identified as server error
            expect(apiError.type).toBe('server');

            // Should have general error message
            expect(apiError.message).toBe('Server error occurred');

            // Should include details if provided
            if (details) {
              expect(apiError.details).toBe(details);
            }

            // Should include status code
            expect(apiError.statusCode).toBe(statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: API errors should include error details from response body
   * Validates: Requirements 10.7
   */
  it('should include error details from API response body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        fc.record({
          message: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          body: fc.option(
            fc.record({
              message: fc.string({ minLength: 1, maxLength: 100 }),
            })
          ),
        }),
        async (statusCode, responseData) => {
          const error = {
            response: {
              status: statusCode,
              data: responseData,
            },
            isAxiosError: true,
          } as AxiosError;

          mockAxiosInstance.put.mockRejectedValue(error);

          try {
            await apiClient.put('/consent', {});
            expect.fail('Should have thrown an error');
          } catch (error) {
            const apiError = error as ApiError;

            // Should have error type
            expect(['validation', 'server']).toContain(apiError.type);

            // Should have message
            expect(apiError.message).toBeTruthy();

            // Should include details from response
            // Priority: data.message || data.body.message
            if (responseData.message) {
              // For validation errors, details can be data.errors or data.body.message
              if (statusCode >= 400 && statusCode < 500) {
                expect(apiError.details).toBeTruthy();
              } else {
                // For server errors, details is data.message
                expect(apiError.details).toBe(responseData.message);
              }
            } else if (responseData.body?.message) {
              // If no data.message, should use data.body.message
              expect(apiError.details).toContain(responseData.body.message);
            }

            // Should include status code
            expect(apiError.statusCode).toBe(statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: Unknown errors should be handled gracefully
   * Validates: Requirements 10.6
   */
  it('should handle unknown errors gracefully with appropriate message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          const unknownError = new Error(errorMessage) as AxiosError;
          unknownError.isAxiosError = true;

          mockAxiosInstance.post.mockRejectedValue(unknownError);

          try {
            await apiClient.post('/register', {});
            expect.fail('Should have thrown an error');
          } catch (error) {
            const apiError = error as ApiError;

            // Should be identified as unknown error
            expect(apiError.type).toBe('unknown');

            // Should have error message
            expect(apiError.message).toBe(errorMessage);

            // Should not have status code
            expect(apiError.statusCode).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: Error type should be deterministic based on status code
   * Validates: Requirements 10.4, 10.5, 10.6
   */
  it('should deterministically map status codes to error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          const error = {
            response: {
              status: statusCode,
              data: { message: 'Error' },
            },
            isAxiosError: true,
          } as AxiosError;

          mockAxiosInstance.post.mockRejectedValue(error);

          try {
            await apiClient.post('/register', {});
            expect.fail('Should have thrown an error');
          } catch (error) {
            const apiError = error as ApiError;

            // 4xx should be validation errors
            if (statusCode >= 400 && statusCode < 500) {
              expect(apiError.type).toBe('validation');
            }

            // 5xx should be server errors
            if (statusCode >= 500 && statusCode < 600) {
              expect(apiError.type).toBe('server');
            }

            // Should always include status code
            expect(apiError.statusCode).toBe(statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: Validation errors should not be retried
   * Validates: Requirements 10.5
   */
  it('should not retry validation errors (4xx)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 499 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (statusCode, message) => {
          const validationError = {
            response: {
              status: statusCode,
              data: { message },
            },
            isAxiosError: true,
          } as AxiosError;

          mockAxiosInstance.post.mockRejectedValue(validationError);

          try {
            await apiClient.post('/register', {});
            expect.fail('Should have thrown an error');
          } catch (error) {
            // Should only be called once (no retries)
            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
          }

          mockAxiosInstance.post.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Network and server errors should support retry
   * Validates: Requirements 10.4, 10.6
   */
  it('should retry network and server errors with exponential backoff', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('network', 'server'),
        async (errorType) => {
          let error: AxiosError;

          if (errorType === 'network') {
            error = new Error('Network Error') as AxiosError;
            error.request = {};
            error.isAxiosError = true;
          } else {
            error = {
              response: {
                status: 500,
                data: { message: 'Server error' },
              },
              isAxiosError: true,
            } as AxiosError;
          }

          mockAxiosInstance.post.mockRejectedValue(error);

          try {
            await apiClient.post('/register', {});
            expect.fail('Should have thrown an error');
          } catch (err) {
            // Should be called multiple times (with retries)
            // maxRetries is 2, so should be called 3 times total (initial + 2 retries)
            expect(mockAxiosInstance.post.mock.calls.length).toBeGreaterThan(1);
          }

          mockAxiosInstance.post.mockClear();
        }
      ),
      { numRuns: 50 } // Reduced runs due to retry delays
    );
  }, 30000);

  /**
   * Property: Error messages should be non-empty strings
   * Validates: Requirements 10.4, 10.5, 10.6
   */
  it('should always provide non-empty error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Network error
          fc.constant({
            type: 'network',
            error: (() => {
              const err = new Error('Network Error') as AxiosError;
              err.request = {};
              err.isAxiosError = true;
              return err;
            })(),
          }),
          // Validation error
          fc.record({
            type: fc.constant('validation'),
            error: fc.record({
              response: fc.record({
                status: fc.integer({ min: 400, max: 499 }),
                data: fc.record({
                  message: fc.option(fc.string({ minLength: 0, maxLength: 100 })),
                }),
              }),
              isAxiosError: fc.constant(true),
            }),
          }),
          // Server error
          fc.record({
            type: fc.constant('server'),
            error: fc.record({
              response: fc.record({
                status: fc.integer({ min: 500, max: 599 }),
                data: fc.record({
                  message: fc.option(fc.string({ minLength: 0, maxLength: 100 })),
                }),
              }),
              isAxiosError: fc.constant(true),
            }),
          })
        ),
        async (errorConfig) => {
          mockAxiosInstance.post.mockRejectedValue(errorConfig.error);

          try {
            await apiClient.post('/register', {});
            expect.fail('Should have thrown an error');
          } catch (error) {
            const apiError = error as ApiError;

            // Message should always be a non-empty string
            expect(apiError.message).toBeTruthy();
            expect(typeof apiError.message).toBe('string');
            expect(apiError.message.length).toBeGreaterThan(0);
          }

          mockAxiosInstance.post.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: Error handling should be consistent across all HTTP methods
   * Validates: Requirements 10.4, 10.5, 10.6
   */
  it('should handle errors consistently across GET, POST, PUT, DELETE methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (method, statusCode, message) => {
          const error = {
            response: {
              status: statusCode,
              data: { message },
            },
            isAxiosError: true,
          } as AxiosError;

          mockAxiosInstance.get.mockRejectedValue(error);
          mockAxiosInstance.post.mockRejectedValue(error);
          mockAxiosInstance.put.mockRejectedValue(error);
          mockAxiosInstance.delete.mockRejectedValue(error);

          try {
            switch (method) {
              case 'GET':
                await apiClient.get('/evidence');
                break;
              case 'POST':
                await apiClient.post('/register', {});
                break;
              case 'PUT':
                await apiClient.put('/consent', {});
                break;
              case 'DELETE':
                await apiClient.delete('/consent');
                break;
            }
            expect.fail('Should have thrown an error');
          } catch (err) {
            const apiError = err as ApiError;

            // Error type should be consistent based on status code
            const expectedType = statusCode >= 500 ? 'server' : 'validation';
            expect(apiError.type).toBe(expectedType);

            // Should have message
            expect(apiError.message).toBeTruthy();

            // Should have status code
            expect(apiError.statusCode).toBe(statusCode);
          }

          vi.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Meta-property: Error handling should be deterministic
   * Same error should always produce same ApiError structure
   * Validates: Requirements 10.4, 10.5, 10.6
   */
  it('should produce deterministic error handling for the same error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (statusCode, message) => {
          const error = {
            response: {
              status: statusCode,
              data: { message },
            },
            isAxiosError: true,
          } as AxiosError;

          mockAxiosInstance.post.mockRejectedValue(error);

          const errors: ApiError[] = [];

          // Handle the same error multiple times
          for (let i = 0; i < 3; i++) {
            try {
              await apiClient.post('/register', {});
              expect.fail('Should have thrown an error');
            } catch (err) {
              errors.push(err as ApiError);
            }
            mockAxiosInstance.post.mockClear();
            mockAxiosInstance.post.mockRejectedValue(error);
          }

          // All error objects should have the same structure
          expect(errors[0].type).toBe(errors[1].type);
          expect(errors[1].type).toBe(errors[2].type);

          expect(errors[0].message).toBe(errors[1].message);
          expect(errors[1].message).toBe(errors[2].message);

          expect(errors[0].statusCode).toBe(errors[1].statusCode);
          expect(errors[1].statusCode).toBe(errors[2].statusCode);
        }
      ),
      { numRuns: 50 } // Reduced runs due to multiple iterations per property
    );
  }, 30000);
});
