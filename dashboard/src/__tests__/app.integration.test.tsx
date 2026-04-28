/**
 * Integration Tests for Dashboard
 * Tests the full authentication flow, log display after login, and real-time updates
 * Validates: Requirements 10.1, 11.1, 11.2
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as api from '../services/api';
import { LogEntry } from '../types';

jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

const createMockLog = (overrides?: Partial<LogEntry>): LogEntry => ({
  log_id: 'log-' + Math.random().toString(36).substr(2, 9),
  customer_id: 'cust-123',
  timestamp: Date.now(),
  ai_service: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  data_sources: ['postgres://db.example.com:5432/users'],
  sensitive_data_types: ['email'],
  risk_score: 45,
  request_method: 'POST',
  request_size_bytes: 2048,
  response_status: 200,
  ...overrides
});

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    mockedApi.fetchLogs.mockResolvedValue([]);
  });

  describe('Full Authentication Flow', () => {
    it('should display login form when not authenticated', () => {
      render(<App />);
      expect(screen.getByText('Interpose')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('should display dashboard after successful login', async () => {
      mockedApi.login.mockResolvedValue({
        api_key: 'test-api-key',
        customer_id: 'cust-123'
      });

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('Interpose Dashboard')).toBeInTheDocument();
      });
      
      expect(screen.getByText('AI Access Intelligence Platform')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      expect(screen.getByText('Average Risk Score')).toBeInTheDocument();
      expect(screen.getByText('System Map')).toBeInTheDocument();
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
    });

    it('should display error message on failed login', async () => {
      mockedApi.login.mockRejectedValue({
        response: {
          data: {
            error: 'Invalid credentials'
          }
        }
      });

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should return to login page after logout', async () => {
      mockedApi.login.mockResolvedValue({
        api_key: 'test-api-key',
        customer_id: 'cust-123'
      });

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('Interpose Dashboard')).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(screen.getByText('Interpose')).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Log Display After Login', () => {
    it('should display logs after successful login', async () => {
      const mockLogs = [
        createMockLog({
          log_id: 'log-1',
          ai_service: 'openai',
          risk_score: 25,
          timestamp: Date.now() - 1000
        }),
        createMockLog({
          log_id: 'log-2',
          ai_service: 'anthropic',
          risk_score: 55,
          timestamp: Date.now() - 2000
        })
      ];

      mockedApi.login.mockResolvedValue({
        api_key: 'test-api-key',
        customer_id: 'cust-123'
      });
      mockedApi.fetchLogs.mockResolvedValue(mockLogs);

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('openai')).toBeInTheDocument();
        expect(screen.getByText('anthropic')).toBeInTheDocument();
      });
      
      const logEntries = screen.getAllByTestId('log-entry');
      expect(logEntries).toHaveLength(2);
    });

    it('should display empty state when no logs are available', async () => {
      mockedApi.login.mockResolvedValue({
        api_key: 'test-api-key',
        customer_id: 'cust-123'
      });
      mockedApi.fetchLogs.mockResolvedValue([]);

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('Interpose Dashboard')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/no activity logs yet/i)).toBeInTheDocument();
    });

    it('should display high-risk alert cards for logs with risk score > 70', async () => {
      const mockLogs = [
        createMockLog({
          log_id: 'log-1',
          ai_service: 'openai',
          risk_score: 85,
          sensitive_data_types: ['ssn', 'credit_card']
        }),
        createMockLog({
          log_id: 'log-2',
          ai_service: 'anthropic',
          risk_score: 45
        })
      ];

      mockedApi.login.mockResolvedValue({
        api_key: 'test-api-key',
        customer_id: 'cust-123'
      });
      mockedApi.fetchLogs.mockResolvedValue(mockLogs);

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/high risk alert/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getAllByText('ssn, credit_card')[0]).toBeInTheDocument();
    });
  });

  describe('Real-Time Updates', () => {
    it('should poll for new logs at regular intervals', async () => {
      jest.useFakeTimers();

      const initialLogs = [createMockLog({ log_id: 'log-1' })];
      const updatedLogs = [
        createMockLog({ log_id: 'log-1' }),
        createMockLog({ log_id: 'log-2' })
      ];

      mockedApi.login.mockResolvedValue({
        api_key: 'test-api-key',
        customer_id: 'cust-123'
      });
      
      mockedApi.fetchLogs
        .mockResolvedValueOnce(initialLogs)
        .mockResolvedValueOnce(updatedLogs);

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(mockedApi.fetchLogs).toHaveBeenCalledTimes(1);
      });
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(mockedApi.fetchLogs).toHaveBeenCalledTimes(2);
      });
      
      jest.useRealTimers();
    });

    it('should update display when new logs arrive', async () => {
      jest.useFakeTimers();

      const initialLogs = [createMockLog({ log_id: 'log-1', ai_service: 'openai' })];
      const updatedLogs = [
        createMockLog({ log_id: 'log-1', ai_service: 'openai' }),
        createMockLog({ log_id: 'log-2', ai_service: 'anthropic' })
      ];

      mockedApi.login.mockResolvedValue({
        api_key: 'test-api-key',
        customer_id: 'cust-123'
      });
      
      mockedApi.fetchLogs
        .mockResolvedValueOnce(initialLogs)
        .mockResolvedValueOnce(updatedLogs);

      render(<App />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        const logEntries = screen.getAllByTestId('log-entry');
        expect(logEntries).toHaveLength(1);
      });
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        const logEntries = screen.getAllByTestId('log-entry');
        expect(logEntries).toHaveLength(2);
      });
      
      expect(screen.getByText('anthropic')).toBeInTheDocument();
      
      jest.useRealTimers();
    });
  });
});


