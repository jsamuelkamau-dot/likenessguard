/**
 * Property-Based Tests for AlertCard Component
 * Tests Properties 30 and 31 from the design document
 * Feature: interpose-saas-platform
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { AlertCard } from '../components/AlertCard';
import { LogEntry } from '../types';

const highRiskLogEntryArbitrary = fc.record({
  log_id: fc.uuid(),
  customer_id: fc.uuid(),
  timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
  ai_service: fc.constantFrom('openai', 'anthropic', 'bedrock', 'local', 'unknown'),
  endpoint: fc.webUrl(),
  data_sources: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { maxLength: 10 }),
  sensitive_data_types: fc.array(
    fc.constantFrom('ssn', 'credit_card', 'api_key', 'password', 'email'),
    { minLength: 1, maxLength: 5 }
  ),
  risk_score: fc.integer({ min: 71, max: 100 }),
  request_method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  request_size_bytes: fc.integer({ min: 0, max: 10485760 }),
  response_status: fc.integer({ min: 200, max: 599 })
});

const lowMediumRiskLogEntryArbitrary = fc.record({
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
  risk_score: fc.integer({ min: 0, max: 70 }),
  request_method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  request_size_bytes: fc.integer({ min: 0, max: 10485760 }),
  response_status: fc.integer({ min: 200, max: 599 })
});

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

describe('AlertCard Property-Based Tests', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Property 30: High-Risk Alert Card Display', () => {
    test('should display alert card with pulsing animation for logs with risk_score > 70', () => {
      fc.assert(
        fc.property(
          highRiskLogEntryArbitrary,
          (log: LogEntry) => {
            const { container, unmount } = render(<AlertCard logs={[log]} />);
            const alertCard = container.querySelector('.alert-card');
            expect(alertCard).toBeTruthy();
            expect(alertCard?.className).toContain('pulse');
            expect(container.textContent).toContain(log.risk_score.toString());
            expect(container.textContent).toContain(log.ai_service);
            const formattedTimestamp = new Date(log.timestamp).toLocaleString();
            expect(container.textContent).toContain(formattedTimestamp);
            if (log.sensitive_data_types.length > 0) {
              log.sensitive_data_types.forEach(dataType => {
                expect(container.textContent).toContain(dataType);
              });
            }
            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should NOT display alert card for logs with risk_score <= 70', () => {
      fc.assert(
        fc.property(
          lowMediumRiskLogEntryArbitrary,
          (log: LogEntry) => {
            const { container, unmount } = render(<AlertCard logs={[log]} />);
            const alertCard = container.querySelector('.alert-card');
            expect(alertCard).toBeFalsy();
            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should filter and display only high-risk logs from mixed risk levels', () => {
      fc.assert(
        fc.property(
          fc.array(logEntryArbitrary, { minLength: 5, maxLength: 20 }),
          (logs: LogEntry[]) => {
            const { container, unmount } = render(<AlertCard logs={logs} />);
            const expectedHighRiskCount = logs.filter(log => log.risk_score > 70).length;
            const alertCards = container.querySelectorAll('.alert-card');
            expect(alertCards.length).toBe(expectedHighRiskCount);
            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 31: Alert Card Dismissal', () => {
    test('should remove alert card from view when dismiss button is clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          highRiskLogEntryArbitrary,
          async (log: LogEntry) => {
            const user = userEvent.setup();
            const { container, unmount } = render(<AlertCard logs={[log]} />);
            let alertCard = container.querySelector('.alert-card');
            expect(alertCard).toBeTruthy();
            const dismissButton = container.querySelector('.dismiss-button');
            expect(dismissButton).toBeTruthy();
            if (dismissButton) {
              await user.click(dismissButton);
            }
            alertCard = container.querySelector('.alert-card');
            expect(alertCard).toBeFalsy();
            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should have dismiss button accessible with aria-label', () => {
      fc.assert(
        fc.property(
          highRiskLogEntryArbitrary,
          (log: LogEntry) => {
            const { container, unmount } = render(<AlertCard logs={[log]} />);
            const dismissButton = container.querySelector('.dismiss-button');
            expect(dismissButton).toBeTruthy();
            expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss alert');
            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
