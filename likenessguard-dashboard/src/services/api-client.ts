import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { apiConfig } from '../config/api-config';

/**
 * Error types for API client
 */
export interface ApiError {
  type: 'validation' | 'server' | 'network' | 'unknown';
  message: string;
  details?: any;
  statusCode?: number;
}

/**
 * API Client configuration options
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * API Client class for making HTTP requests to LikenessGuard backend
 * Provides error handling, retry logic, and request/response interceptors
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: ApiClientConfig) {
    const {
      baseURL,
      timeout = 30000,
      maxRetries = 3,
      retryDelay = 1000,
    } = config;

    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;

    this.axiosInstance = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add API key if available
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      this.axiosInstance.defaults.headers.common['X-API-Key'] = apiKey;
    }

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors for error handling
   */
  private setupInterceptors(): void {
    // Request interceptor - add cache-busting and auth
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add cache-busting timestamp to prevent browser caching of CORS-less responses
        if (config.url && !config.url.includes('?')) {
          config.url += `?_t=${Date.now()}`;
        } else if (config.url) {
          config.url += `&_t=${Date.now()}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor for global error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle and format errors from API calls
   */
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      // Extract error message from various possible structures
      const errorMessage = 
        data?.error?.message ||  // Backend error structure
        data?.message ||         // Direct message
        data?.body?.message ||   // Wrapped message
        'Invalid request';       // Fallback

      const errorDetails = 
        data?.error?.details ||  // Backend error details
        data?.errors ||          // Validation errors
        data?.details ||         // Direct details
        [];

      if (status >= 400 && status < 500) {
        // Client error - validation or auth
        return {
          type: 'validation',
          message: errorMessage,
          details: errorDetails,
          statusCode: status,
        };
      } else if (status >= 500) {
        // Server error
        return {
          type: 'server',
          message: errorMessage,
          details: errorDetails,
          statusCode: status,
        };
      }
    } else if (error.request) {
      // Request made but no response
      return {
        type: 'network',
        message: 'Unable to connect to server',
      };
    }

    // Something else happened
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred',
    };
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const apiError = error as ApiError;

      // Don't retry validation errors
      if (apiError.type === 'validation') {
        throw error;
      }

      // Retry network and server errors
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.axiosInstance.get<T>(endpoint, {
          params,
          ...config,
        });
        return response.data;
      } catch (error) {
        throw this.handleError(error as AxiosError);
      }
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.axiosInstance.post<T>(endpoint, data, config);
        return response.data;
      } catch (error) {
        throw this.handleError(error as AxiosError);
      }
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.axiosInstance.put<T>(endpoint, data, config);
        return response.data;
      } catch (error) {
        throw this.handleError(error as AxiosError);
      }
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.axiosInstance.delete<T>(endpoint, config);
        return response.data;
      } catch (error) {
        throw this.handleError(error as AxiosError);
      }
    });
  }

  /**
   * Get the base URL for this client
   */
  getBaseURL(): string {
    return this.axiosInstance.defaults.baseURL || '';
  }

  /**
   * Update the base URL
   */
  setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * Add custom header
   */
  setHeader(key: string, value: string): void {
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  /**
   * Remove custom header
   */
  removeHeader(key: string): void {
    delete this.axiosInstance.defaults.headers.common[key];
  }
}

/**
 * Create a default API client instance
 * Base URL can be configured via environment variable
 */
let apiClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      maxRetries: apiConfig.retryAttempts,
      retryDelay: apiConfig.retryDelay,
    });
  }
  return apiClient;
}

export default getApiClient;
