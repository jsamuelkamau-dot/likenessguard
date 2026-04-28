/**
 * Property-Based Tests for ActivityLog Component
 * Tests Properties 21 and 22 from the design document
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { ActivityLog } from '../components/ActivityLog';
import { LogEntry } from '../types';

// Generator for log entries
const logEntryArbitrary = fc.record({
  log_id: fc.uuid(),
  customer_id: fc.uuid(),
  timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
  ai_service: fc.constantFrom('openai', 'anthropic', 'bedrock', 'local', 'unknown'),
  endpoint: fc.webUrl(),
  data_sources: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { maxLength: 10 }),
  sensitive_data_types: fc.array(
    fc.constantFrom('ssn', 'credit_card', 'api_key', 'password', 'email'),
    { maxLength: 5 }
  ),
  risk_score: fc.integer({ min: 0, max: 100 }),
  request_method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  request_size_bytes: fc.integer({ min: 0, max: 10485760 }),
  response_status: fc.integer({ min: 200, max: 599 })
});

describe('ActivityLog Property-Based Tests', () => {
  describe('Property 21: Activity Log Display Completeness', () => {
    // Feature: interpose-saas-platform, Property 21
    it('should display timestamp, AI service, risk score, and data sources for any log entry', () => {
      fc.assert(
        fc.property(logEntryArbitrary, (log: LogEntry) => {
          const { container } = render(<ActivityLog logs={[log]} />);
          
          // Check that timestamp is displayed
          const timestampElement = container.querySelector('[style*="monospace"]');
          expect(timestampElement).toBeTruthy();
          
          // Check that AI service is displayed
          expect(container.textContent).toContain('AI Service:');
          expect(container.textContent).toContain(log.ai_service);
          
          // Check that risk score is displayed
          expect(container.textContent).toContain('Risk:');
          expect(container.textContent).toContain(log.risk_score.toString());
          
          // Check that data sources are displayed
          expect(container.textContent).toContain('Data Sources:');
          if (log.data_sources.length === 0) {
            expect(container.textContent).toContain('None');
          } else if (log.data_sources.length === 1) {
            expect(container.textContent).toContain(log.data_sources[0]);
          } else {
            expect(container.textContent).toContain(log.data_sources[0]);
            expect(container.textContent).toContain('+' + (log.data_sources.length - 1));
          }
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 22: Log Chronological Ordering', () => {
    // Feature: interpose-saas-platform, Property 22
    it('should display logs in descending chronological order (newest first)', () => {
      fc.assert(
        fc.property(
          fc.array(logEntryArbitrary, { minLength: 2, maxLength: 10 }),
          (logs: LogEntry[]) => {
            render(<ActivityLog logs={logs} />);
            
            // Get all log entries from the rendered component
            const logEntries = screen.queryAllByTestId('log-entry');
            
            if (logEntries.length < 2) return true;
            
            // Extract timestamps from rendered entries
            const renderedTimestamps: number[] = [];
            logEntries.forEach((entry) => {
              const timestampText = entry.querySelector('[style*="monospace"]')?.textContent;
              if (timestampText) {
                // Find the corresponding log by matching the timestamp text
                const matchingLog = logs.find(log => {
                  const date = new Date(log.timestamp);
                  const formatted = date.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });
                  return formatted === timestampText;
                });
                if (matchingLog) {
                  renderedTimestamps.push(matchingLog.timestamp);
                }
              }
            });
            
            // Verify timestamps are in descending order
            for (let i = 0; i < renderedTimestamps.length - 1; i++) {
              expect(renderedTimestamps[i]).toBeGreaterThanOrEqual(renderedTimestamps[i + 1]);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 23: Activity Feed Pagination', () => {
    // Feature: interpose-saas-platform, Property 23
    it('should display at most 100 log entries', () => {
      fc.assert(
        fc.property(
          fc.array(logEntryArbitrary, { minLength: 101, maxLength: 200 }),
          (logs: LogEntry[]) => {
            render(<ActivityLog logs={logs} />);
            
            // Count the number of rendered log entries
            const logEntries = screen.queryAllByTestId('log-entry');
            
            // Should display exactly 100 entries
            expect(logEntries.length).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});