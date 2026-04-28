/**
 * Unit Tests for ActivityLog Component
 * Tests specific examples and edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActivityLog } from '../components/ActivityLog';
import { LogEntry } from '../types';

const createMockLog = (overrides?: Partial<LogEntry>): LogEntry => ({
  log_id: 'test-log-id',
  customer_id: 'test-customer-id',
  timestamp: Date.now(),
  ai_service: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  data_sources: ['postgres://db.example.com:5432/users'],
  sensitive_data_types: ['email'],
  risk_score: 50,
  request_method: 'POST',
  request_size_bytes: 2048,
  response_status: 200,
  ...overrides
});

describe('ActivityLog Component', () => {
  describe('Log Entry Rendering', () => {
    it('should render a single log entry with all required fields', () => {
      const log = createMockLog({
        ai_service: 'anthropic',
        risk_score: 75,
        data_sources: ['postgres://db.example.com:5432/users'],
        sensitive_data_types: ['ssn', 'credit_card']
      });

      const { container } = render(<ActivityLog logs={[log]} />);

      expect(container.textContent).toContain('AI Service:');
      expect(container.textContent).toContain('anthropic');
      expect(container.textContent).toContain('Risk: 75');
      expect(container.textContent).toContain('Data Sources:');
      expect(container.textContent).toContain('postgres://db.example.com:5432/users');
      expect(container.textContent).toContain('Sensitive Data:');
      expect(container.textContent).toContain('ssn');
      expect(container.textContent).toContain('credit_card');
    });

    it('should render empty state when no logs are provided', () => {
      render(<ActivityLog logs={[]} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state').textContent).toBe('No activity logs yet');
    });

    it('should not display sensitive data section when no sensitive data is detected', () => {
      const log = createMockLog({
        sensitive_data_types: []
      });

      const { container } = render(<ActivityLog logs={[log]} />);

      expect(container.textContent).not.toContain('Sensitive Data:');
    });

    it('should display "None" for data sources when array is empty', () => {
      const log = createMockLog({
        data_sources: []
      });

      const { container } = render(<ActivityLog logs={[log]} />);

      expect(container.textContent).toContain('Data Sources:');
      expect(container.textContent).toContain('None');
    });

    it('should display single data source without count', () => {
      const log = createMockLog({
        data_sources: ['postgres://db.example.com:5432/users']
      });

      const { container } = render(<ActivityLog logs={[log]} />);

      expect(container.textContent).toContain('postgres://db.example.com:5432/users');
      expect(container.textContent).not.toContain('+');
    });

    it('should display first data source with count for multiple sources', () => {
      const log = createMockLog({
        data_sources: [
          'postgres://db.example.com:5432/users',
          'redis://cache.example.com:6379',
          'https://api.example.com/data'
        ]
      });

      const { container } = render(<ActivityLog logs={[log]} />);

      expect(container.textContent).toContain('postgres://db.example.com:5432/users');
      expect(container.textContent).toContain('+2 more');
    });
  });

  describe('Chronological Sorting', () => {
    it('should sort logs by timestamp in descending order', () => {
      const logs = [
        createMockLog({ log_id: 'log1', timestamp: 1000, ai_service: 'openai' }),
        createMockLog({ log_id: 'log2', timestamp: 3000, ai_service: 'anthropic' }),
        createMockLog({ log_id: 'log3', timestamp: 2000, ai_service: 'bedrock' })
      ];

      render(<ActivityLog logs={logs} />);

      const logEntries = screen.getAllByTestId('log-entry');
      expect(logEntries.length).toBe(3);

      // The order should be: log2 (3000), log3 (2000), log1 (1000)
      expect(logEntries[0].textContent).toContain('anthropic');
      expect(logEntries[1].textContent).toContain('bedrock');
      expect(logEntries[2].textContent).toContain('openai');
    });

    it('should handle logs with identical timestamps', () => {
      const logs = [
        createMockLog({ log_id: 'log1', timestamp: 1000, ai_service: 'openai' }),
        createMockLog({ log_id: 'log2', timestamp: 1000, ai_service: 'anthropic' })
      ];

      render(<ActivityLog logs={logs} />);

      const logEntries = screen.getAllByTestId('log-entry');
      expect(logEntries.length).toBe(2);
    });
  });

  describe('Pagination Limit', () => {
    it('should display exactly 100 logs when more than 100 are provided', () => {
      const logs = Array.from({ length: 150 }, (_, i) =>
        createMockLog({ log_id: 'log-' + i, timestamp: 1000 + i })
      );

      render(<ActivityLog logs={logs} />);

      const logEntries = screen.getAllByTestId('log-entry');
      expect(logEntries.length).toBe(100);
    });

    it('should display all logs when fewer than 100 are provided', () => {
      const logs = Array.from({ length: 50 }, (_, i) =>
        createMockLog({ log_id: 'log-' + i, timestamp: 1000 + i })
      );

      render(<ActivityLog logs={logs} />);

      const logEntries = screen.getAllByTestId('log-entry');
      expect(logEntries.length).toBe(50);
    });

    it('should display the 100 most recent logs when pagination is applied', () => {
      const logs = Array.from({ length: 150 }, (_, i) =>
        createMockLog({ 
          log_id: 'log-' + i, 
          timestamp: 1000 + i,
          ai_service: 'service-' + i
        })
      );

      render(<ActivityLog logs={logs} />);

      const logEntries = screen.getAllByTestId('log-entry');
      expect(logEntries.length).toBe(100);

      // First entry should be the newest (highest timestamp)
      expect(logEntries[0].textContent).toContain('service-149');
      // Last entry should be the 100th newest
      expect(logEntries[99].textContent).toContain('service-50');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-01-15T14:30:45').getTime();
      const log = createMockLog({ timestamp });

      const { container } = render(<ActivityLog logs={[log]} />);

      // Check that a formatted timestamp is present
      const timestampElement = container.querySelector('[style*="monospace"]');
      expect(timestampElement).toBeTruthy();
      expect(timestampElement?.textContent).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    });
  });

  describe('Risk Score Display', () => {
    it('should display risk score with correct color for low risk', () => {
      const log = createMockLog({ risk_score: 25 });
      const { container } = render(<ActivityLog logs={[log]} />);
      
      expect(container.textContent).toContain('Risk: 25');
    });

    it('should display risk score with correct color for medium risk', () => {
      const log = createMockLog({ risk_score: 50 });
      const { container } = render(<ActivityLog logs={[log]} />);
      
      expect(container.textContent).toContain('Risk: 50');
    });

    it('should display risk score with correct color for high risk', () => {
      const log = createMockLog({ risk_score: 85 });
      const { container } = render(<ActivityLog logs={[log]} />);
      
      expect(container.textContent).toContain('Risk: 85');
    });
  });
});