import axios, { AxiosError } from 'axios';
import { LoginCredentials, AuthResponse, LogEntry } from '../types';

// API base URL - use Vite environment variable  
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

console.log('API_BASE_URL:', API_BASE_URL);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }
      
      if (attempt < retries - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  
  throw lastError;
};

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>('/auth', credentials);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          (axiosError.response.data as any)?.error || 'Authentication failed'
        );
      } else if (axiosError.request) {
        throw new Error('Unable to reach authentication server');
      }
    }
    throw new Error('Authentication failed');
  }
};

export const fetchLogs = async (apiKey: string): Promise<LogEntry[]> => {
  return withRetry(async () => {
    try {
      const response = await apiClient.get<LogEntry[]>('/logs', {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      const logs = response.data || [];
      return logs.map(log => sanitizeLogEntry(log));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          throw new Error('Invalid API key');
        } else if (axiosError.response) {
          throw new Error('Failed to fetch logs');
        } else if (axiosError.request) {
          throw new Error('Unable to reach log server');
        }
      }
      throw new Error('Failed to fetch logs');
    }
  });
};

const sanitizeLogEntry = (log: any): LogEntry => {
  return {
    log_id: log.log_id || 'unknown',
    customer_id: log.customer_id || 'unknown',
    timestamp: log.timestamp || Date.now(),
    ai_service: log.ai_service || 'unknown',
    endpoint: log.endpoint || '',
    data_sources: Array.isArray(log.data_sources) ? log.data_sources : [],
    sensitive_data_types: Array.isArray(log.sensitive_data_types) 
      ? log.sensitive_data_types 
      : [],
    risk_score: clampRiskScore(log.risk_score),
    request_method: log.request_method || 'UNKNOWN',
    request_size_bytes: log.request_size_bytes || 0,
    response_status: log.response_status || 0
  };
};

const clampRiskScore = (score: any): number => {
  const numScore = typeof score === 'number' ? score : 0;
  return Math.max(0, Math.min(100, numScore));
};

export default {
  login,
  fetchLogs
};