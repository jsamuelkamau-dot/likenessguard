/**
 * Unit Tests for AlertCard Component
 * Feature: interpose-saas-platform
 * Requirements: 14.1, 14.3, 14.4, 14.5
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertCard } from '../components/AlertCard';
import { LogEntry } from '../types';

const createMockLog = (overrides?: Partial<LogEntry>): LogEntry => ({
  log_id: 'test-log-id-1',
  customer_id: 'test-customer-1',
  timestamp: 1704067200000,
  ai_service: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  data_sources: ['postgres://db.example.com:5432/users'],
  sensitive_data_types: ['email', 'ssn'],
  risk_score: 75,
  request_method: 'POST',
  request_size_bytes: 2048,
  response_status: 200,
  ...overrides
});

describe('AlertCard Unit Tests', () => {
  describe('High-Risk Alert Display', () => {
    test('should render alert card for log with risk_score = 71', () => {
      const log = createMockLog({ risk_score: 71 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const alertCard = container.querySelector('.alert-card');
      expect(alertCard).toBeInTheDocument();
    });

    test('should render alert card for log with risk_score = 100', () => {
      const log = createMockLog({ risk_score: 100 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const alertCard = container.querySelector('.alert-card');
      expect(alertCard).toBeInTheDocument();
    });

    test('should NOT render alert card for log with risk_score = 70', () => {
      const log = createMockLog({ risk_score: 70 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const alertCard = container.querySelector('.alert-card');
      expect(alertCard).not.toBeInTheDocument();
    });

    test('should NOT render alert card for log with risk_score = 0', () => {
      const log = createMockLog({ risk_score: 0 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const alertCard = container.querySelector('.alert-card');
      expect(alertCard).not.toBeInTheDocument();
    });

    test('should display risk score in alert card', () => {
      const log = createMockLog({ risk_score: 85 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      expect(container.textContent).toContain('85');
    });

    test('should display AI service in alert card', () => {
      const log = createMockLog({ ai_service: 'anthropic', risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      expect(container.textContent).toContain('anthropic');
    });

    test('should display formatted timestamp in alert card', () => {
      const timestamp = 1704067200000;
      const log = createMockLog({ timestamp, risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const formattedTimestamp = new Date(timestamp).toLocaleString();
      expect(container.textContent).toContain(formattedTimestamp);
    });

    test('should display sensitive data types in alert card', () => {
      const log = createMockLog({ 
        sensitive_data_types: ['ssn', 'credit_card', 'api_key'],
        risk_score: 90 
      });
      const { container } = render(<AlertCard logs={[log]} />);
      
      expect(container.textContent).toContain('ssn');
      expect(container.textContent).toContain('credit_card');
      expect(container.textContent).toContain('api_key');
    });

    test('should not display sensitive data section when no sensitive data detected', () => {
      const log = createMockLog({ 
        sensitive_data_types: [],
        risk_score: 75 
      });
      const { container } = render(<AlertCard logs={[log]} />);
      
      expect(container.textContent).not.toContain('Sensitive Data:');
    });
  });

  describe('Pulsing Animation', () => {
    test('should apply pulse class to high-risk alert cards', () => {
      const log = createMockLog({ risk_score: 85 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const alertCard = container.querySelector('.alert-card');
      expect(alertCard?.className).toContain('pulse');
    });

    test('should apply pulse class to all high-risk alert cards', () => {
      const logs = [
        createMockLog({ log_id: 'log-1', risk_score: 75 }),
        createMockLog({ log_id: 'log-2', risk_score: 85 }),
        createMockLog({ log_id: 'log-3', risk_score: 95 })
      ];
      const { container } = render(<AlertCard logs={logs} />);
      
      const alertCards = container.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(3);
      alertCards.forEach(card => {
        expect(card.className).toContain('pulse');
      });
    });
  });

  describe('Dismiss Functionality', () => {
    test('should have dismiss button in alert card', () => {
      const log = createMockLog({ risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const dismissButton = container.querySelector('.dismiss-button');
      expect(dismissButton).toBeInTheDocument();
    });

    test('should remove alert card when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const log = createMockLog({ risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      let alertCard = container.querySelector('.alert-card');
      expect(alertCard).toBeInTheDocument();
      
      const dismissButton = container.querySelector('.dismiss-button');
      if (dismissButton) {
        await user.click(dismissButton);
      }
      
      alertCard = container.querySelector('.alert-card');
      expect(alertCard).not.toBeInTheDocument();
    });

    test('should only dismiss the clicked alert card when multiple are present', async () => {
      const user = userEvent.setup();
      const logs = [
        createMockLog({ log_id: 'log-1', risk_score: 75 }),
        createMockLog({ log_id: 'log-2', risk_score: 85 }),
        createMockLog({ log_id: 'log-3', risk_score: 95 })
      ];
      const { container } = render(<AlertCard logs={logs} />);
      
      let alertCards = container.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(3);
      
      const firstDismissButton = alertCards[0].querySelector('.dismiss-button');
      if (firstDismissButton) {
        await user.click(firstDismissButton);
      }
      
      alertCards = container.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(2);
    });

    test('should have aria-label on dismiss button for accessibility', () => {
      const log = createMockLog({ risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const dismissButton = container.querySelector('.dismiss-button');
      expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss alert');
    });

    test('should not re-display dismissed alert when logs prop updates with same log', async () => {
      const user = userEvent.setup();
      const log = createMockLog({ risk_score: 75 });
      const { container, rerender } = render(<AlertCard logs={[log]} />);
      
      const dismissButton = container.querySelector('.dismiss-button');
      if (dismissButton) {
        await user.click(dismissButton);
      }
      
      let alertCard = container.querySelector('.alert-card');
      expect(alertCard).not.toBeInTheDocument();
      
      rerender(<AlertCard logs={[log]} />);
      
      alertCard = container.querySelector('.alert-card');
      expect(alertCard).not.toBeInTheDocument();
    });
  });

  describe('Multiple Alerts', () => {
    test('should render multiple alert cards for multiple high-risk logs', () => {
      const logs = [
        createMockLog({ log_id: 'log-1', risk_score: 75 }),
        createMockLog({ log_id: 'log-2', risk_score: 85 })
      ];
      const { container } = render(<AlertCard logs={logs} />);
      
      const alertCards = container.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(2);
    });

    test('should filter and display only high-risk logs', () => {
      const logs = [
        createMockLog({ log_id: 'log-1', risk_score: 30 }),
        createMockLog({ log_id: 'log-2', risk_score: 75 }),
        createMockLog({ log_id: 'log-3', risk_score: 50 }),
        createMockLog({ log_id: 'log-4', risk_score: 85 })
      ];
      const { container } = render(<AlertCard logs={logs} />);
      
      const alertCards = container.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(2);
    });

    test('should render nothing when no high-risk logs are present', () => {
      const logs = [
        createMockLog({ log_id: 'log-1', risk_score: 30 }),
        createMockLog({ log_id: 'log-2', risk_score: 50 }),
        createMockLog({ log_id: 'log-3', risk_score: 70 })
      ];
      const { container } = render(<AlertCard logs={logs} />);
      
      const alertCards = container.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(0);
    });

    test('should render nothing when logs array is empty', () => {
      const { container } = render(<AlertCard logs={[]} />);
      
      const alertCards = container.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(0);
    });
  });

  describe('Alert Card Content', () => {
    test('should display HIGH RISK ALERT title', () => {
      const log = createMockLog({ risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      expect(container.textContent).toContain('HIGH RISK ALERT');
    });

    test('should display warning icon', () => {
      const log = createMockLog({ risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      const icon = container.querySelector('.alert-icon');
      expect(icon).toBeInTheDocument();
      expect(icon?.textContent).toContain('⚠️');
    });

    test('should display all required labels', () => {
      const log = createMockLog({ risk_score: 75 });
      const { container } = render(<AlertCard logs={[log]} />);
      
      expect(container.textContent).toContain('Risk Score:');
      expect(container.textContent).toContain('AI Service:');
      expect(container.textContent).toContain('Timestamp:');
    });
  });
});
