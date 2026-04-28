import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ApiClient, ApiError } from './api-client';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: any;

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
      maxRetries: 2,
      retryDelay: 100,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should use default timeout if not provided', () => {
      vi.clearAllMocks();
      new ApiClient({ baseURL: 'http://test.com' });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should set up interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    describe('get', () => {
      it('should make GET request and return data', async () => {
        const mockData = { result: 'success' };
        mockAxiosInstance.get.mockResolvedValue({ data: mockData });

        const result = await apiClient.get('/test');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {});
        expect(result).toEqual(mockData);
      });

      it('should pass params to GET request', async () => {
        const mockData = { result: 'success' };
        const params = { userId: '123' };
        mockAxiosInstance.get.mockResolvedValue({ data: mockData });

        await apiClient.get('/test', params);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params });
      });
    });

    describe('post', () => {
      it('should make POST request and return data', async () => {
        const mockData = { result: 'created' };
        const postData = { name: 'test' };
        mockAxiosInstance.post.mockResolvedValue({ data: mockData });

        const result = await apiClient.post('/test', postData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined);
        expect(result).toEqual(mockData);
      });
    });

    describe('put', () => {
      it('should make PUT request and return data', async () => {
        const mockData = { result: 'updated' };
        const putData = { name: 'test' };
        mockAxiosInstance.put.mockResolvedValue({ data: mockData });

        const result = await apiClient.put('/test', putData);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', putData, undefined);
        expect(result).toEqual(mockData);
      });
    });

    describe('delete', () => {
      it('should make DELETE request and return data', async () => {
        const mockData = { result: 'deleted' };
        mockAxiosInstance.delete.mockResolvedValue({ data: mockData });

        const result = await apiClient.delete('/test');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
        expect(result).toEqual(mockData);
      });
    });
  });

  describe('error handling', () => {
    it('should handle validation errors (4xx)', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Invalid input',
            errors: ['Field required'],
          },
        },
        request: {},
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: 'validation',
        message: 'Invalid input',
        details: ['Field required'],
        statusCode: 400,
      });
    });

    it('should handle server errors (5xx)', async () => {
      const error = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error',
          },
        },
        request: {},
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: 'server',
        message: 'Server error occurred',
        statusCode: 500,
      });
    });

    it('should handle network errors', async () => {
      const error = {
        request: {},
        message: 'Network Error',
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: 'network',
        message: 'Unable to connect to server',
      });
    });

    it('should handle unknown errors', async () => {
      const error = {
        message: 'Something went wrong',
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: 'unknown',
        message: 'Something went wrong',
      });
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      const networkError = {
        request: {},
        message: 'Network Error',
      };
      const successData = { result: 'success' };

      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: successData });

      const result = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual(successData);
    });

    it('should retry on server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Server error' },
        },
        request: {},
      };
      const successData = { result: 'success' };

      mockAxiosInstance.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ data: successData });

      const result = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(successData);
    });

    it('should NOT retry on validation errors', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { message: 'Invalid input' },
        },
        request: {},
      };

      mockAxiosInstance.get.mockRejectedValue(validationError);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: 'validation',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max retries', async () => {
      const networkError = {
        request: {},
        message: 'Network Error',
      };

      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        type: 'network',
      });

      // Initial call + 2 retries = 3 total calls
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('utility methods', () => {
    it('should get base URL', () => {
      expect(apiClient.getBaseURL()).toBe('http://localhost:3000');
    });

    it('should set base URL', () => {
      apiClient.setBaseURL('http://newurl.com');
      expect(mockAxiosInstance.defaults.baseURL).toBe('http://newurl.com');
    });

    it('should set custom header', () => {
      apiClient.setHeader('Authorization', 'Bearer token');
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('Bearer token');
    });

    it('should remove custom header', () => {
      mockAxiosInstance.defaults.headers.common['Authorization'] = 'Bearer token';
      apiClient.removeHeader('Authorization');
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });
});
