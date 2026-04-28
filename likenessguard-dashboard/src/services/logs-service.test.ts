/**
 * Unit tests for Logs Service
 * 
 * Tests activity logs retrieval, violations filtering, and timestamp formatting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getActivityLogs,
  getViolations,
  formatTimestamp,
  formatTimestampISO,
  formatTimestampRelative,
  sortLogsByTimestamp,
  filterLogsByDecision,
  filterLogsByDateRange,
  getLogsSummary,
} from './logs-service';
import { getApiClient } from './api-client';
import { Decision } from '../types/api-types';
import type { ActivityLog, EvidenceRetrievalResponse } from '../types/api-types';

// Mock the API client
vi.mock('./api-client');

describe('Logs Service', () => {
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      get: vi.fn(),
    };
    
    // Mock getApiClient to return our mock
    vi.mocked(getApiClient).mockReturnValue(mockApiClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getActivityLogs', () => {
    it('should retrieve activity logs successfully', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [
          {
            query_id: 'query-1',
            timestamp: 1704067200,
            decision: 'ALLOW',
            reason_code: 'ALLOW_POLICY_PERMITS',
            requester_id: 'requester-1',
            usage_type: 'SELF_EDIT',
            similarity_score: 0.95,
          },
          {
            query_id: 'query-2',
            timestamp: 1704070800,
            decision: 'DENY',
            reason_code: 'DENY_POLICY_VIOLATION',
            requester_id: 'requester-2',
            usage_type: 'THIRD_PARTY_EDIT',
            similarity_score: 0.88,
          },
        ],
        count: 2,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getActivityLogs('test-likeness-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/evidence', {
        likeness_id: 'test-likeness-123',
      });
      expect(result).toEqual(mockResponse);
      expect(result.evidence_records).toHaveLength(2);
    });

    it('should handle API response with body wrapper', async () => {
      const mockResponseBody: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [],
        count: 0,
      };

      const mockApiResponse = {
        statusCode: 200,
        body: mockResponseBody,
      };

      mockApiClient.get.mockResolvedValue(mockApiResponse);

      const result = await getActivityLogs('test-likeness-123');

      expect(result).toEqual(mockResponseBody);
    });

    it('should include limit parameter when provided', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [],
        count: 0,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getActivityLogs('test-likeness-123', 10);

      expect(mockApiClient.get).toHaveBeenCalledWith('/evidence', {
        likeness_id: 'test-likeness-123',
        limit: 10,
      });
    });

    it('should include pagination key when provided', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [],
        count: 0,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getActivityLogs('test-likeness-123', undefined, 'pagination-key-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/evidence', {
        likeness_id: 'test-likeness-123',
        last_evaluated_key: 'pagination-key-123',
      });
    });

    it('should throw validation error for empty likeness ID', async () => {
      await expect(getActivityLogs('')).rejects.toEqual({
        type: 'validation',
        message: 'Likeness ID is required',
        details: 'Please provide a valid likeness ID',
      });

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw validation error for whitespace-only likeness ID', async () => {
      await expect(getActivityLogs('   ')).rejects.toEqual({
        type: 'validation',
        message: 'Likeness ID is required',
        details: 'Please provide a valid likeness ID',
      });

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      const mockError = {
        type: 'network',
        message: 'Unable to connect to server',
      };

      mockApiClient.get.mockRejectedValue(mockError);

      await expect(getActivityLogs('test-likeness-123')).rejects.toEqual(mockError);
    });
  });

  describe('getViolations', () => {
    it('should filter logs for DENY decisions', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [
          {
            query_id: 'query-1',
            timestamp: 1704067200,
            decision: 'ALLOW',
            reason_code: 'ALLOW_POLICY_PERMITS',
            requester_id: 'requester-1',
            usage_type: 'SELF_EDIT',
          },
          {
            query_id: 'query-2',
            timestamp: 1704070800,
            decision: 'DENY',
            reason_code: 'DENY_POLICY_VIOLATION',
            requester_id: 'requester-2',
            usage_type: 'THIRD_PARTY_EDIT',
            similarity_score: 0.88,
          },
          {
            query_id: 'query-3',
            timestamp: 1704074400,
            decision: 'DENY',
            reason_code: 'DENY_FACE_SWAP',
            requester_id: 'requester-3',
            usage_type: 'FACE_SWAP',
            similarity_score: 0.92,
          },
        ],
        count: 3,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getViolations('test-likeness-123');

      expect(result.likeness_id).toBe('test-likeness-123');
      expect(result.violations).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.violations[0].query_id).toBe('query-2');
      expect(result.violations[1].query_id).toBe('query-3');
    });

    it('should return empty violations when no DENY decisions exist', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [
          {
            query_id: 'query-1',
            timestamp: 1704067200,
            decision: 'ALLOW',
            reason_code: 'ALLOW_POLICY_PERMITS',
            requester_id: 'requester-1',
            usage_type: 'SELF_EDIT',
          },
          {
            query_id: 'query-2',
            timestamp: 1704070800,
            decision: 'UNKNOWN',
            reason_code: 'UNKNOWN_NO_MATCH',
            requester_id: 'requester-2',
            usage_type: 'GENERAL_GENERATION',
          },
        ],
        count: 2,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getViolations('test-likeness-123');

      expect(result.violations).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should handle Decision enum values', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [
          {
            query_id: 'query-1',
            timestamp: 1704067200,
            decision: Decision.DENY,
            reason_code: 'DENY_POLICY_VIOLATION',
            requester_id: 'requester-1',
            usage_type: 'THIRD_PARTY_EDIT',
          },
        ],
        count: 1,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getViolations('test-likeness-123');

      expect(result.violations).toHaveLength(1);
    });

    it('should map violation fields correctly', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [
          {
            query_id: 'query-1',
            timestamp: 1704067200,
            decision: 'DENY',
            reason_code: 'DENY_POLICY_VIOLATION',
            requester_id: 'requester-1',
            usage_type: 'THIRD_PARTY_EDIT',
            similarity_score: 0.88,
          },
        ],
        count: 1,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getViolations('test-likeness-123');

      const violation = result.violations[0];
      expect(violation.query_id).toBe('query-1');
      expect(violation.timestamp).toBe(1704067200);
      expect(violation.reason_code).toBe('DENY_POLICY_VIOLATION');
      expect(violation.similarity_score).toBe(0.88);
      expect(violation.requester_id).toBe('requester-1');
      expect(violation.usage_type).toBe('THIRD_PARTY_EDIT');
      expect(violation.source).toBe('requester-1');
    });

    it('should pass limit parameter to getActivityLogs', async () => {
      const mockResponse: EvidenceRetrievalResponse = {
        likeness_id: 'test-likeness-123',
        evidence_records: [],
        count: 0,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getViolations('test-likeness-123', 50);

      expect(mockApiClient.get).toHaveBeenCalledWith('/evidence', {
        likeness_id: 'test-likeness-123',
        limit: 50,
      });
    });
  });

  describe('formatTimestamp', () => {
    it('should format Unix timestamp in seconds', () => {
      const timestamp = 1704067200; // Jan 1, 2024 00:00:00 UTC
      const result = formatTimestamp(timestamp);
      
      // Result will vary by timezone, so just check it's a valid format
      expect(result).toMatch(/\w+ \d+, \d{4},? \d+:\d+ (AM|PM)/);
    });

    it('should format Unix timestamp in milliseconds', () => {
      const timestamp = 1704067200000; // Jan 1, 2024 00:00:00 UTC
      const result = formatTimestamp(timestamp);
      
      expect(result).toMatch(/\w+ \d+, \d{4},? \d+:\d+ (AM|PM)/);
    });

    it('should return "Invalid date" for invalid timestamp', () => {
      const result = formatTimestamp(NaN);
      expect(result).toBe('Invalid date');
    });

    it('should handle negative timestamps', () => {
      const timestamp = -1000000; // Before Unix epoch
      const result = formatTimestamp(timestamp);
      
      // Should still format, even if it's a date before 1970
      expect(result).toMatch(/\w+ \d+, \d{4},? \d+:\d+ (AM|PM)/);
    });
  });

  describe('formatTimestampISO', () => {
    it('should format Unix timestamp to ISO 8601', () => {
      const timestamp = 1704067200; // Jan 1, 2024 00:00:00 UTC
      const result = formatTimestampISO(timestamp);
      
      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle milliseconds timestamp', () => {
      const timestamp = 1704067200000;
      const result = formatTimestampISO(timestamp);
      
      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should return empty string for invalid timestamp', () => {
      const result = formatTimestampISO(NaN);
      expect(result).toBe('');
    });
  });

  describe('formatTimestampRelative', () => {
    it('should return "Just now" for recent timestamps', () => {
      const now = Date.now();
      const timestamp = Math.floor(now / 1000) - 30; // 30 seconds ago
      
      const result = formatTimestampRelative(timestamp);
      expect(result).toBe('Just now');
    });

    it('should return minutes for timestamps within an hour', () => {
      const now = Date.now();
      const timestamp = Math.floor(now / 1000) - 300; // 5 minutes ago
      
      const result = formatTimestampRelative(timestamp);
      expect(result).toBe('5 minutes ago');
    });

    it('should return hours for timestamps within a day', () => {
      const now = Date.now();
      const timestamp = Math.floor(now / 1000) - 7200; // 2 hours ago
      
      const result = formatTimestampRelative(timestamp);
      expect(result).toBe('2 hours ago');
    });

    it('should return days for timestamps within a month', () => {
      const now = Date.now();
      const timestamp = Math.floor(now / 1000) - 259200; // 3 days ago
      
      const result = formatTimestampRelative(timestamp);
      expect(result).toBe('3 days ago');
    });

    it('should return formatted date for older timestamps', () => {
      const timestamp = 1640995200; // Jan 1, 2022
      const result = formatTimestampRelative(timestamp);
      
      expect(result).toMatch(/\w+ \d+, \d{4},? \d+:\d+ (AM|PM)/);
    });

    it('should handle singular units correctly', () => {
      const now = Date.now();
      
      const oneMinuteAgo = Math.floor(now / 1000) - 60;
      expect(formatTimestampRelative(oneMinuteAgo)).toBe('1 minute ago');
      
      const oneHourAgo = Math.floor(now / 1000) - 3600;
      expect(formatTimestampRelative(oneHourAgo)).toBe('1 hour ago');
      
      const oneDayAgo = Math.floor(now / 1000) - 86400;
      expect(formatTimestampRelative(oneDayAgo)).toBe('1 day ago');
    });

    it('should return "Invalid date" for invalid timestamp', () => {
      const result = formatTimestampRelative(NaN);
      expect(result).toBe('Invalid date');
    });
  });

  describe('sortLogsByTimestamp', () => {
    it('should sort logs in reverse chronological order', () => {
      const logs: ActivityLog[] = [
        {
          query_id: 'query-1',
          timestamp: 1704067200,
          decision: 'ALLOW',
          reason_code: 'ALLOW_POLICY_PERMITS',
          requester_id: 'requester-1',
          usage_type: 'SELF_EDIT',
        },
        {
          query_id: 'query-2',
          timestamp: 1704074400,
          decision: 'DENY',
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'requester-2',
          usage_type: 'THIRD_PARTY_EDIT',
        },
        {
          query_id: 'query-3',
          timestamp: 1704070800,
          decision: 'UNKNOWN',
          reason_code: 'UNKNOWN_NO_MATCH',
          requester_id: 'requester-3',
          usage_type: 'GENERAL_GENERATION',
        },
      ];

      const sorted = sortLogsByTimestamp(logs);

      expect(sorted[0].query_id).toBe('query-2'); // Newest
      expect(sorted[1].query_id).toBe('query-3');
      expect(sorted[2].query_id).toBe('query-1'); // Oldest
    });

    it('should not mutate original array', () => {
      const logs: ActivityLog[] = [
        {
          query_id: 'query-1',
          timestamp: 1704067200,
          decision: 'ALLOW',
          reason_code: 'ALLOW_POLICY_PERMITS',
          requester_id: 'requester-1',
          usage_type: 'SELF_EDIT',
        },
        {
          query_id: 'query-2',
          timestamp: 1704074400,
          decision: 'DENY',
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'requester-2',
          usage_type: 'THIRD_PARTY_EDIT',
        },
      ];

      const originalOrder = logs.map((log) => log.query_id);
      sortLogsByTimestamp(logs);

      expect(logs.map((log) => log.query_id)).toEqual(originalOrder);
    });

    it('should handle empty array', () => {
      const sorted = sortLogsByTimestamp([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('filterLogsByDecision', () => {
    const logs: ActivityLog[] = [
      {
        query_id: 'query-1',
        timestamp: 1704067200,
        decision: 'ALLOW',
        reason_code: 'ALLOW_POLICY_PERMITS',
        requester_id: 'requester-1',
        usage_type: 'SELF_EDIT',
      },
      {
        query_id: 'query-2',
        timestamp: 1704070800,
        decision: 'DENY',
        reason_code: 'DENY_POLICY_VIOLATION',
        requester_id: 'requester-2',
        usage_type: 'THIRD_PARTY_EDIT',
      },
      {
        query_id: 'query-3',
        timestamp: 1704074400,
        decision: 'UNKNOWN',
        reason_code: 'UNKNOWN_NO_MATCH',
        requester_id: 'requester-3',
        usage_type: 'GENERAL_GENERATION',
      },
    ];

    it('should filter logs by ALLOW decision', () => {
      const filtered = filterLogsByDecision(logs, Decision.ALLOW);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].query_id).toBe('query-1');
    });

    it('should filter logs by DENY decision', () => {
      const filtered = filterLogsByDecision(logs, Decision.DENY);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].query_id).toBe('query-2');
    });

    it('should filter logs by UNKNOWN decision', () => {
      const filtered = filterLogsByDecision(logs, Decision.UNKNOWN);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].query_id).toBe('query-3');
    });

    it('should handle string decision values', () => {
      const filtered = filterLogsByDecision(logs, 'ALLOW');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].query_id).toBe('query-1');
    });

    it('should return empty array when no matches', () => {
      const filtered = filterLogsByDecision(logs, 'NONEXISTENT' as any);
      expect(filtered).toEqual([]);
    });
  });

  describe('filterLogsByDateRange', () => {
    const logs: ActivityLog[] = [
      {
        query_id: 'query-1',
        timestamp: 1704067200, // Jan 1, 2024
        decision: 'ALLOW',
        reason_code: 'ALLOW_POLICY_PERMITS',
        requester_id: 'requester-1',
        usage_type: 'SELF_EDIT',
      },
      {
        query_id: 'query-2',
        timestamp: 1704153600, // Jan 2, 2024
        decision: 'DENY',
        reason_code: 'DENY_POLICY_VIOLATION',
        requester_id: 'requester-2',
        usage_type: 'THIRD_PARTY_EDIT',
      },
      {
        query_id: 'query-3',
        timestamp: 1704240000, // Jan 3, 2024
        decision: 'UNKNOWN',
        reason_code: 'UNKNOWN_NO_MATCH',
        requester_id: 'requester-3',
        usage_type: 'GENERAL_GENERATION',
      },
    ];

    it('should filter logs within date range', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T23:59:59Z');
      
      const filtered = filterLogsByDateRange(logs, startDate, endDate);
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0].query_id).toBe('query-1');
      expect(filtered[1].query_id).toBe('query-2');
    });

    it('should include logs on boundary dates', () => {
      const startDate = new Date('2024-01-02T00:00:00Z');
      const endDate = new Date('2024-01-02T23:59:59Z');
      
      const filtered = filterLogsByDateRange(logs, startDate, endDate);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].query_id).toBe('query-2');
    });

    it('should return empty array when no logs in range', () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-20T00:00:00Z');
      
      const filtered = filterLogsByDateRange(logs, startDate, endDate);
      
      expect(filtered).toEqual([]);
    });

    it('should handle milliseconds timestamps', () => {
      const logsWithMs: ActivityLog[] = [
        {
          query_id: 'query-1',
          timestamp: 1704067200000, // Milliseconds
          decision: 'ALLOW',
          reason_code: 'ALLOW_POLICY_PERMITS',
          requester_id: 'requester-1',
          usage_type: 'SELF_EDIT',
        },
      ];

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');
      
      const filtered = filterLogsByDateRange(logsWithMs, startDate, endDate);
      
      expect(filtered).toHaveLength(1);
    });
  });

  describe('getLogsSummary', () => {
    it('should calculate summary statistics correctly', () => {
      const logs: ActivityLog[] = [
        {
          query_id: 'query-1',
          timestamp: 1704067200,
          decision: 'ALLOW',
          reason_code: 'ALLOW_POLICY_PERMITS',
          requester_id: 'requester-1',
          usage_type: 'SELF_EDIT',
          similarity_score: 0.95,
        },
        {
          query_id: 'query-2',
          timestamp: 1704070800,
          decision: 'DENY',
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'requester-2',
          usage_type: 'THIRD_PARTY_EDIT',
          similarity_score: 0.88,
        },
        {
          query_id: 'query-3',
          timestamp: 1704074400,
          decision: 'DENY',
          reason_code: 'DENY_FACE_SWAP',
          requester_id: 'requester-3',
          usage_type: 'FACE_SWAP',
          similarity_score: 0.92,
        },
        {
          query_id: 'query-4',
          timestamp: 1704078000,
          decision: 'UNKNOWN',
          reason_code: 'UNKNOWN_NO_MATCH',
          requester_id: 'requester-4',
          usage_type: 'GENERAL_GENERATION',
        },
      ];

      const summary = getLogsSummary(logs);

      expect(summary.total).toBe(4);
      expect(summary.allowCount).toBe(1);
      expect(summary.denyCount).toBe(2);
      expect(summary.unknownCount).toBe(1);
      expect(summary.averageSimilarity).toBeCloseTo(0.9167, 2);
    });

    it('should handle logs without similarity scores', () => {
      const logs: ActivityLog[] = [
        {
          query_id: 'query-1',
          timestamp: 1704067200,
          decision: 'ALLOW',
          reason_code: 'ALLOW_POLICY_PERMITS',
          requester_id: 'requester-1',
          usage_type: 'SELF_EDIT',
        },
        {
          query_id: 'query-2',
          timestamp: 1704070800,
          decision: 'DENY',
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'requester-2',
          usage_type: 'THIRD_PARTY_EDIT',
        },
      ];

      const summary = getLogsSummary(logs);

      expect(summary.total).toBe(2);
      expect(summary.averageSimilarity).toBeUndefined();
    });

    it('should handle empty logs array', () => {
      const summary = getLogsSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.allowCount).toBe(0);
      expect(summary.denyCount).toBe(0);
      expect(summary.unknownCount).toBe(0);
      expect(summary.averageSimilarity).toBeUndefined();
    });

    it('should handle Decision enum values', () => {
      const logs: ActivityLog[] = [
        {
          query_id: 'query-1',
          timestamp: 1704067200,
          decision: Decision.ALLOW,
          reason_code: 'ALLOW_POLICY_PERMITS',
          requester_id: 'requester-1',
          usage_type: 'SELF_EDIT',
        },
        {
          query_id: 'query-2',
          timestamp: 1704070800,
          decision: Decision.DENY,
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'requester-2',
          usage_type: 'THIRD_PARTY_EDIT',
        },
      ];

      const summary = getLogsSummary(logs);

      expect(summary.allowCount).toBe(1);
      expect(summary.denyCount).toBe(1);
    });
  });
});
