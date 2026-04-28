/**
 * Type definitions for Interpose Dashboard
 */

export interface LogEntry {
  log_id: string;
  customer_id: string;
  timestamp: number;
  ai_service: string;
  endpoint: string;
  data_sources: string[];
  sensitive_data_types: string[];
  risk_score: number;
  request_method: string;
  request_size_bytes: number;
  response_status: number;
}

export interface Customer {
  customer_id: string;
  email: string;
  api_key: string;
  alert_email: string;
  company_name: string;
  created_at: number;
  subscription_tier: string;
}

export interface AuthResponse {
  api_key: string;
  customer_id: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiError {
  error: string;
  message?: string;
}
