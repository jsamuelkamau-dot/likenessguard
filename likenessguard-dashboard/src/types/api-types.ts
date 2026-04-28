/**
 * TypeScript type definitions for LikenessGuard API contracts
 * 
 * These types match the backend API request/response structures defined in:
 * - likenessguard-aws/src/shared/models/data_models.py
 * - likenessguard-aws/src/lambdas handlers
 * 
 * Requirements: 10.3
 */

// ============================================================================
// Enums (as const objects for erasableSyntaxOnly compatibility)
// ============================================================================

/**
 * Types of AI generation usage that can be requested
 */
export const UsageType = {
  SELF_EDIT: 'SELF_EDIT',
  THIRD_PARTY_EDIT: 'THIRD_PARTY_EDIT',
  FACE_SWAP: 'FACE_SWAP',
  GENERAL_GENERATION: 'GENERAL_GENERATION',
} as const;

export type UsageType = typeof UsageType[keyof typeof UsageType];

/**
 * Possible consent check decisions
 */
export const Decision = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  UNKNOWN: 'UNKNOWN',
} as const;

export type Decision = typeof Decision[keyof typeof Decision];

/**
 * Reason codes explaining consent check decisions
 */
export const ReasonCode = {
  // ALLOW reasons
  ALLOW_SELF_EDIT: 'ALLOW_SELF_EDIT',
  ALLOW_POLICY_PERMITS: 'ALLOW_POLICY_PERMITS',
  
  // DENY reasons
  DENY_POLICY_VIOLATION: 'DENY_POLICY_VIOLATION',
  DENY_THIRD_PARTY: 'DENY_THIRD_PARTY',
  DENY_FACE_SWAP: 'DENY_FACE_SWAP',
  DENY_SEXUALIZED_CONTENT: 'DENY_SEXUALIZED_CONTENT',
  DENY_IMPERSONATION: 'DENY_IMPERSONATION',
  DENY_POLITICAL_USE: 'DENY_POLITICAL_USE',
  
  // UNKNOWN reasons
  UNKNOWN_NO_MATCH: 'UNKNOWN_NO_MATCH',
  UNKNOWN_NO_FACE: 'UNKNOWN_NO_FACE',
  UNKNOWN_SERVICE_ERROR: 'UNKNOWN_SERVICE_ERROR',
} as const;

export type ReasonCode = typeof ReasonCode[keyof typeof ReasonCode];

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Machine-readable consent policy defining how a likeness may be used
 */
export interface ConsentPolicy {
  allow_self_edits: boolean;
  deny_third_party_edits: boolean;
  deny_face_swaps: boolean;
  deny_sexualized_content: boolean;
  deny_impersonation: boolean;
  deny_political_use: boolean;
}

/**
 * User metadata associated with a likeness registration
 */
export interface UserMetadata {
  user_id: string;
  email?: string;
  registration_source: string;
}

/**
 * Complete consent record from the registry
 */
export interface ConsentRecord {
  likeness_id: string;
  fingerprint_hash: string;
  fingerprint_embedding: number[];
  consent_policy: ConsentPolicy;
  user_metadata: UserMetadata;
  created_at: number;
  modified_at: number;
}

/**
 * Audit log record for consent check history
 */
export interface AuditRecord {
  query_id: string;
  timestamp: number;
  decision: Decision;
  reason_code: ReasonCode;
  requester_id: string;
  usage_type: string;
  likeness_id?: string;
  similarity_score?: number;
  ttl?: number;
}

// ============================================================================
// Registration API Types
// ============================================================================

/**
 * Request body for POST /register
 */
export interface RegistrationRequest {
  user_id: string;
  photo_keys: string[];
  consent_policy: ConsentPolicy;
  email?: string;
}

/**
 * Response body for POST /register
 */
export interface RegistrationResponse {
  likeness_id: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
  processed_photos: number;
  errors?: string[];
}

/**
 * Complete API response wrapper for registration
 */
export interface RegistrationApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: RegistrationResponse;
}

// ============================================================================
// Consent Check API Types
// ============================================================================

/**
 * Request body for POST /consent/check
 */
export interface ConsentCheckRequest {
  referenceImage: string;
  usageType: UsageType;
  requesterId: string;
  userId?: string;
}

/**
 * Response body for POST /consent/check
 */
export interface ConsentCheckResponse {
  decision: Decision;
  reason_code: ReasonCode;
  timestamp: number;
  likeness_id?: string;
  similarity_score?: number;
}

/**
 * Complete API response wrapper for consent check
 */
export interface ConsentCheckApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: ConsentCheckResponse;
}

// ============================================================================
// Consent Policy API Types
// ============================================================================

/**
 * Request body for PUT /consent
 */
export interface ConsentUpdateRequest {
  likeness_id: string;
  new_policy: ConsentPolicy;
}

/**
 * Response body for PUT /consent
 */
export interface ConsentUpdateResponse {
  likeness_id: string;
  status: 'SUCCESS' | 'FAILURE';
  message: string;
  modified_at: number;
}

/**
 * Complete API response wrapper for consent update
 */
export interface ConsentUpdateApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: ConsentUpdateResponse;
}

/**
 * Request body for DELETE /consent
 */
export interface ConsentRevokeRequest {
  likeness_id: string;
}

/**
 * Response body for DELETE /consent
 */
export interface ConsentRevokeResponse {
  likeness_id: string;
  status: 'SUCCESS' | 'FAILURE';
  message: string;
  revoked_at: number;
}

/**
 * Complete API response wrapper for consent revoke
 */
export interface ConsentRevokeApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: ConsentRevokeResponse;
}

/**
 * Request query parameters for GET /consent
 */
export interface ConsentGetRequest {
  likeness_id: string;
}

/**
 * Response body for GET /consent
 */
export interface ConsentGetResponse {
  likeness_id: string;
  consent_policy: ConsentPolicy;
  user_metadata: UserMetadata;
  created_at: number;
  modified_at: number;
}

/**
 * Complete API response wrapper for consent get
 */
export interface ConsentGetApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: ConsentGetResponse;
}

// ============================================================================
// Activity Logs API Types
// ============================================================================

/**
 * Evidence record for a consent check decision
 */
export interface EvidenceRecord {
  query_id: string;
  timestamp: number;
  decision: string;
  reason_code: string;
  similarity_score?: number;
  requester_id: string;
  usage_type: string;
}

/**
 * Request query parameters for GET /evidence
 */
export interface EvidenceRetrievalRequest {
  likeness_id: string;
  limit?: number;
  last_evaluated_key?: string;
}

/**
 * Response body for GET /evidence
 */
export interface EvidenceRetrievalResponse {
  likeness_id: string;
  evidence_records: EvidenceRecord[];
  count: number;
  last_evaluated_key?: string;
}

/**
 * Complete API response wrapper for evidence retrieval
 */
export interface EvidenceRetrievalApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: EvidenceRetrievalResponse;
}

/**
 * Activity log entry (alias for EvidenceRecord for dashboard use)
 */
export type ActivityLog = EvidenceRecord;

// ============================================================================
// Violations API Types
// ============================================================================

/**
 * Violation record (filtered evidence records with DENY decisions)
 */
export interface Violation {
  query_id: string;
  timestamp: number;
  reason_code: string;
  similarity_score?: number;
  requester_id: string;
  usage_type: string;
  source?: string;
}

/**
 * Response body for violations (filtered evidence records)
 */
export interface ViolationsResponse {
  likeness_id: string;
  violations: Violation[];
  count: number;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: string | string[];
  timestamp?: number;
  requestId?: string;
}

/**
 * API error response wrapper
 */
export interface ApiErrorResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: {
    error: ApiError;
  };
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Generic API response that can be either success or error
 */
export type ApiResponse<T> = 
  | { statusCode: number; headers: Record<string, string>; body: T }
  | ApiErrorResponse;

/**
 * HTTP methods used by the API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * API endpoint paths
 */
export const ApiEndpoint = {
  REGISTER: '/register',
  CONSENT_CHECK: '/consent/check',
  CONSENT_UPDATE: '/consent',
  CONSENT_REVOKE: '/consent',
  CONSENT_GET: '/consent',
  EVIDENCE: '/evidence',
} as const;

export type ApiEndpoint = typeof ApiEndpoint[keyof typeof ApiEndpoint];
