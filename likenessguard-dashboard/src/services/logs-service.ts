/**
 * Logs Service
 * 
 * Handles activity logs and violations retrieval operations including:
 * - Retrieving activity logs from evidence endpoint
 * - Filtering logs for violations (DENY decisions)
 * - Parsing and formatting timestamps for display
 * 
 * Requirements: 5.1, 6.1, 6.2
 */

import { getApiClient } from './api-client';
import { API_ENDPOINTS } from '../config/api-config';
import { Decision } from '../types/api-types';
import type {
  EvidenceRetrievalRequest,
  EvidenceRetrievalResponse,
  EvidenceRetrievalApiResponse,
  ActivityLog,
  Violation,
  ViolationsResponse,
} from '../types/api-types';

/**
 * Get activity logs for a likeness
 * 
 * This function:
 * 1. Sends GET request to /evidence with likeness_id
 * 2. Parses and returns activity logs
 * 3. Formats timestamps for display
 * 
 * @param likenessId - Likeness identifier
 * @param limit - Optional maximum number of records to retrieve
 * @param lastEvaluatedKey - Optional pagination key for retrieving next page
 * @returns Promise resolving to activity logs and metadata
 * @throws ApiError if retrieval fails
 * 
 * Requirements: 5.1
 */
export const getActivityLogs = async (
  likenessId: string,
  limit?: number,
  lastEvaluatedKey?: string
): Promise<EvidenceRetrievalResponse> => {
  const apiClient = getApiClient();
  
  // Validate likeness ID
  if (!likenessId || likenessId.trim() === '') {
    throw {
      type: 'validation',
      message: 'Likeness ID is required',
      details: 'Please provide a valid likeness ID',
    };
  }
  
  // Build query parameters
  const params: EvidenceRetrievalRequest = {
    likeness_id: likenessId,
  };
  
  if (limit !== undefined && limit > 0) {
    params.limit = limit;
  }
  
  if (lastEvaluatedKey) {
    params.last_evaluated_key = lastEvaluatedKey;
  }
  
  // Send GET request
  const response = await apiClient.get<EvidenceRetrievalApiResponse>(
    API_ENDPOINTS.EVIDENCE,
    params
  );
  
  // Parse response
  const responseBody = 'body' in response ? response.body : response;
  
  return responseBody as EvidenceRetrievalResponse;
};

/**
 * Get all activity logs without filtering by likeness
 * 
 * This function:
 * 1. Sends GET request to /evidence WITHOUT likeness_id parameter
 * 2. Retrieves all audit records from the system
 * 3. Formats timestamps for display
 * 
 * @param limit - Optional maximum number of records to retrieve
 * @param lastEvaluatedKey - Optional pagination key for retrieving next page
 * @returns Promise resolving to all activity logs and metadata
 * @throws ApiError if retrieval fails
 * 
 * Requirements: Activity Logs Show All Records Fix
 */
export const getAllActivityLogs = async (
  limit?: number,
  lastEvaluatedKey?: string
): Promise<EvidenceRetrievalResponse> => {
  const apiClient = getApiClient();
  
  // Build query parameters without likeness_id
  const params: Partial<EvidenceRetrievalRequest> = {};
  
  if (limit !== undefined && limit > 0) {
    params.limit = limit;
  }
  
  if (lastEvaluatedKey) {
    params.last_evaluated_key = lastEvaluatedKey;
  }
  
  // Send GET request without likeness_id parameter
  const response = await apiClient.get<EvidenceRetrievalApiResponse>(
    API_ENDPOINTS.EVIDENCE,
    params
  );
  
  // Parse response
  const responseBody = 'body' in response ? response.body : response;
  
  return responseBody as EvidenceRetrievalResponse;
};

/**
 * Get violations for a likeness (filtered logs with DENY decisions)
 * 
 * This function:
 * 1. Retrieves all activity logs for the likeness
 * 2. Filters logs to include only DENY decisions
 * 3. Formats the results as violations
 * 
 * @param likenessId - Likeness identifier
 * @param limit - Optional maximum number of records to retrieve
 * @returns Promise resolving to violations and count
 * @throws ApiError if retrieval fails
 * 
 * Requirements: 6.1, 6.2
 */
export const getViolations = async (
  likenessId: string,
  limit?: number
): Promise<ViolationsResponse> => {
  // Get all activity logs
  const logsResponse = await getActivityLogs(likenessId, limit);
  
  // Filter for DENY decisions
  const violations: Violation[] = logsResponse.evidence_records
    .filter((record) => record.decision === Decision.DENY || record.decision === 'DENY')
    .map((record) => ({
      query_id: record.query_id,
      timestamp: record.timestamp,
      reason_code: record.reason_code,
      similarity_score: record.similarity_score,
      requester_id: record.requester_id,
      usage_type: record.usage_type,
      source: record.requester_id, // Use requester_id as source
    }));
  
  return {
    likeness_id: likenessId,
    violations,
    count: violations.length,
  };
};

/**
 * Format Unix timestamp to human-readable date string
 * 
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024 3:45 PM")
 */
export const formatTimestamp = (timestamp: number): string => {
  // Handle both seconds and milliseconds timestamps
  const timestampMs = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  
  const date = new Date(timestampMs);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Format: "Jan 15, 2024 3:45 PM"
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format Unix timestamp to ISO 8601 string
 * 
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns ISO 8601 formatted string (e.g., "2024-01-15T15:45:30.000Z")
 */
export const formatTimestampISO = (timestamp: number): string => {
  // Handle both seconds and milliseconds timestamps
  const timestampMs = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  
  const date = new Date(timestampMs);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return date.toISOString();
};

/**
 * Format Unix timestamp to relative time string
 * 
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Relative time string (e.g., "2 hours ago", "3 days ago")
 */
export const formatTimestampRelative = (timestamp: number): string => {
  // Handle both seconds and milliseconds timestamps
  const timestampMs = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  
  const date = new Date(timestampMs);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const now = Date.now();
  const diffMs = now - timestampMs;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatTimestamp(timestamp);
  }
};

/**
 * Sort activity logs by timestamp in reverse chronological order (newest first)
 * 
 * @param logs - Array of activity logs to sort
 * @returns Sorted array of activity logs
 */
export const sortLogsByTimestamp = (logs: ActivityLog[]): ActivityLog[] => {
  return [...logs].sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Filter activity logs by decision type
 * 
 * @param logs - Array of activity logs to filter
 * @param decision - Decision type to filter by (ALLOW, DENY, UNKNOWN)
 * @returns Filtered array of activity logs
 */
export const filterLogsByDecision = (
  logs: ActivityLog[],
  decision: Decision | string
): ActivityLog[] => {
  return logs.filter((log) => log.decision === decision);
};

/**
 * Filter activity logs by date range
 * 
 * @param logs - Array of activity logs to filter
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Filtered array of activity logs
 */
export const filterLogsByDateRange = (
  logs: ActivityLog[],
  startDate: Date,
  endDate: Date
): ActivityLog[] => {
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();
  
  return logs.filter((log) => {
    const logTimestampMs = log.timestamp > 10000000000 ? log.timestamp : log.timestamp * 1000;
    return logTimestampMs >= startTimestamp && logTimestampMs <= endTimestamp;
  });
};

/**
 * Get summary statistics from activity logs
 * 
 * @param logs - Array of activity logs
 * @returns Summary statistics object
 */
export const getLogsSummary = (logs: ActivityLog[]): {
  total: number;
  allowCount: number;
  denyCount: number;
  unknownCount: number;
  averageSimilarity?: number;
} => {
  const allowCount = logs.filter((log) => log.decision === Decision.ALLOW || log.decision === 'ALLOW').length;
  const denyCount = logs.filter((log) => log.decision === Decision.DENY || log.decision === 'DENY').length;
  const unknownCount = logs.filter((log) => log.decision === Decision.UNKNOWN || log.decision === 'UNKNOWN').length;
  
  // Calculate average similarity score for logs that have it
  const logsWithSimilarity = logs.filter((log) => log.similarity_score !== undefined);
  const averageSimilarity = logsWithSimilarity.length > 0
    ? logsWithSimilarity.reduce((sum, log) => sum + (log.similarity_score || 0), 0) / logsWithSimilarity.length
    : undefined;
  
  return {
    total: logs.length,
    allowCount,
    denyCount,
    unknownCount,
    averageSimilarity,
  };
};
