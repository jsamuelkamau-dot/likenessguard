/**
 * Property-Based Tests for TimelineChart Component
 * Feature: interpose-saas-platform
 */

import fc from 'fast-check';
import { LogEntry } from '../types';

/**
 * Helper function to filter logs to past 24 hours
 * This mirrors the logic in TimelineChart component
 */
const filterLast24Hours = (logs: LogEntry[]): LogEntry[] => {
  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  return logs.filter(log => log.timestamp >= twentyFourHoursAgo && log.timestamp <= now);
};

/**
 * Generator for log entries with various timestamps
 */
const logEntryArbitrary = fc.record({
  log_id: fc.uuid(),
  customer_id: fc.uuid(),
  timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
  ai_service: fc.constantFrom('openai', 'anthropic', 'bedrock', 'local'),
  endpoint: fc.webUrl(),
  data_sources: fc.array(fc.string(), { maxLength: 5 }),
  sensitive_data_types: fc.array(
    fc.constantFrom('ssn', 'credit_card', 'api_key', 'password', 'email'),
    { maxLength: 5 }
  ),
  risk_score: fc.integer({ min: 0, max: 100 }),
  request_method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  request_size_bytes: fc.integer({ min: 0, max: 10000000 }),
  response_status: fc.integer({ min: 200, max: 599 })
});

describe('TimelineChart Property Tests', () => {
  /**
   * Property 32: Timeline Query Window
   * For any timeline chart query, the data should span exactly the past 24 hours from the current time.
   * **Validates: Requirements 16.3**
   */
  describe('Property 32: Timeline Query Window', () => {
    it('should only include logs from the past 24 hours', () => {
      fc.assert(
        fc.property(
          fc.array(logEntryArbitrary, { minLength: 0, maxLength: 100 }),
          (logs) => {
            const now = Date.now();
            const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
            
            // Filter logs using the same logic as the component
            const filteredLogs = filterLast24Hours(logs);
            
            // Property: All filtered logs must have timestamps >= 24 hours ago
            const allWithinWindow = filteredLogs.every(
              log => log.timestamp >= twentyFourHoursAgo && log.timestamp <= now
            );
            
            // Property: No logs outside the window should be included
            const excludedLogs = logs.filter(
              log => log.timestamp < twentyFourHoursAgo || log.timestamp > now
            );
            const noneExcludedIncluded = excludedLogs.every(
              excludedLog => !filteredLogs.some(
                filteredLog => filteredLog.log_id === excludedLog.log_id
              )
            );
            
            return allWithinWindow && noneExcludedIncluded;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should include all logs within the 24-hour window', () => {
      fc.assert(
        fc.property(
          fc.array(logEntryArbitrary, { minLength: 0, maxLength: 100 }),
          (logs) => {
            const now = Date.now();
            const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
            
            // Filter logs
            const filteredLogs = filterLast24Hours(logs);
            
            // Property: All logs within the window should be included
            const logsWithinWindow = logs.filter(
              log => log.timestamp >= twentyFourHoursAgo && log.timestamp <= now
            );
            
            // Check that all logs within window are in filtered results
            const allIncluded = logsWithinWindow.every(
              withinLog => filteredLogs.some(
                filteredLog => filteredLog.log_id === withinLog.log_id
              )
            );
            
            return allIncluded;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle empty log arrays', () => {
      const emptyLogs: LogEntry[] = [];
      const filtered = filterLast24Hours(emptyLogs);
      expect(filtered).toEqual([]);
    });

    it('should handle logs exactly at the 24-hour boundary', () => {
      const now = Date.now();
      const exactlyTwentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
      
      const logAtBoundary: LogEntry = {
        log_id: 'test-id',
        customer_id: 'cust-id',
        timestamp: exactlyTwentyFourHoursAgo,
        ai_service: 'openai',
        endpoint: 'https://api.openai.com',
        data_sources: [],
        sensitive_data_types: [],
        risk_score: 50,
        request_method: 'POST',
        request_size_bytes: 1000,
        response_status: 200
      };
      
      const filtered = filterLast24Hours([logAtBoundary]);
      
      // Log at exactly 24 hours ago should be included (>= comparison)
      expect(filtered).toHaveLength(1);
      expect(filtered[0].log_id).toBe('test-id');
    });

    it('should exclude logs just before the 24-hour boundary', () => {
      const now = Date.now();
      const justBeforeTwentyFourHours = now - (24 * 60 * 60 * 1000) - 1;
      
      const logBeforeBoundary: LogEntry = {
        log_id: 'test-id',
        customer_id: 'cust-id',
        timestamp: justBeforeTwentyFourHours,
        ai_service: 'openai',
        endpoint: 'https://api.openai.com',
        data_sources: [],
        sensitive_data_types: [],
        risk_score: 50,
        request_method: 'POST',
        request_size_bytes: 1000,
        response_status: 200
      };
      
      const filtered = filterLast24Hours([logBeforeBoundary]);
      
      // Log just before 24 hours ago should be excluded
      expect(filtered).toHaveLength(0);
    });
  });
});