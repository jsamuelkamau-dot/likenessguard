/**
 * API Configuration
 * 
 * This file manages API endpoint configuration for different environments.
 * The API base URL can be configured via environment variables or defaults
 * to the development endpoint.
 */

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Environment-specific API configurations
 */
const environments = {
  development: {
    baseURL: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  staging: {
    baseURL: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  production: {
    baseURL: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/v1',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
} as const;

/**
 * Get the current environment from environment variables
 * Defaults to 'development' if not specified
 */
function getCurrentEnvironment(): keyof typeof environments {
  const env = import.meta.env.VITE_APP_ENV as keyof typeof environments;
  
  if (env && env in environments) {
    return env;
  }
  
  return 'development';
}

/**
 * Get API configuration for the current environment
 * 
 * Priority order:
 * 1. VITE_API_BASE_URL environment variable (overrides everything)
 * 2. Environment-specific configuration (development, staging, production)
 * 3. Development configuration (default)
 */
export function getApiConfig(): ApiConfig {
  const currentEnv = getCurrentEnvironment();
  const envConfig = environments[currentEnv];
  
  // Allow override via environment variable
  const baseURL = import.meta.env.VITE_API_BASE_URL || envConfig.baseURL;
  
  return {
    ...envConfig,
    baseURL,
  };
}

/**
 * Export the current API configuration
 */
export const apiConfig = getApiConfig();

/**
 * Export individual configuration values for convenience
 */
export const API_BASE_URL = apiConfig.baseURL;
export const API_TIMEOUT = apiConfig.timeout;
export const API_RETRY_ATTEMPTS = apiConfig.retryAttempts;
export const API_RETRY_DELAY = apiConfig.retryDelay;

/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
  REGISTER: '/register',
  CONSENT_GET: '/consent',
  CONSENT_UPDATE: '/consent/update',
  CONSENT_REVOKE: '/consent/revoke',
  CONSENT_CHECK: '/consent/check',
  EVIDENCE: '/evidence',
  UPLOAD_PRESIGNED_URL: '/upload/presigned-url',
  // v2 endpoints
  V2_CONSENT_CHECK: '/v2/consent/check',
  V2_PROOF_VERIFY: '/v2/proof/verify',
  V2_POLICY_NL: '/v2/policy/nl-to-json',
  V2_POLICY_UPDATE: '/v2/policy/update',
  V2_METRICS: '/v2/metrics/live',
  V2_EDGE_STATUS: '/v2/edge/status',
  V2_OPTOUT: '/v2/optout',
  V2_FEDERATION_PEERS: '/v2/federation/peers',
} as const;

