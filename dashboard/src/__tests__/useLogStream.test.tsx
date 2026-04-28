/**
 * Unit Tests for useLogStream Hook
 * Feature: interpose-saas-platform
 */

import { renderHook, act } from '@testing-library/react';
import { useLogStream } from '../hooks/useLogStream';
import * as api from '../services/api';
import { LogEntry } from '../types';

jest.mock('../services/api');
const mockedFetchLogs = api.fetchLogs as jest.MockedFunction<typeof api.fetchLogs>;

describe('useLogStream Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial fetch', () => {
    test('should fetch logs immediately on mount', async () => {
      const apiKey = 'test-api-key';
      const mockLogs: LogEntry[] = [
        {
          log_id: 'log-1',
          customer_id: 'cust-1',
          timestamp: 1000000000000,
          ai_service: 'openai',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          data_sources: ['postgres://db.example.com'],
          sensitive_data_types: ['email'],
          risk_score: 45,
          request_method: 'POST',
          request_size_bytes: 1024,
          response_status: 200
        }
      ];

      mockedFetchLogs.mockResolvedValue(mockLogs);

      const { result } = renderHook(() => useLogStream(apiKey));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedFetchLogs).toHaveBeenCalledTimes(1);
      expect(mockedFetchLogs).toHaveBeenCalledWith(apiKey);
      expect(result.current).toEqual(mockLogs);
    });

    test('should return empty array initially', () => {
      const apiKey = 'test-api-key';
      mockedFetchLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useLogStream(apiKey));

      expect(result.current).toEqual([]);
    });

    test('should not fetch if API key is null', async () => {
      mockedFetchLogs.mockResolvedValue([]);

      renderHook(() => useLogStream(null));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedFetchLogs).not.toHaveBeenCalled();
    });
  });

  describe('Polling interval', () => {
    test('should poll every 2 seconds', async () => {
      const apiKey = 'test-api-key';
      mockedFetchLogs.mockResolvedValue([]);

      renderHook(() => useLogStream(apiKey));

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockedFetchLogs).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(mockedFetchLogs).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(mockedFetchLogs).toHaveBeenCalledTimes(3);
    });

    test('should update logs state when new data arrives', async () => {
      const apiKey = 'test-api-key';
      const initialLogs: LogEntry[] = [
        {
          log_id: 'log-1',
          customer_id: 'cust-1',
          timestamp: 1000000000000,
          ai_service: 'openai',
          endpoint: 'https://api.openai.com',
          data_sources: [],
          sensitive_data_types: [],
          risk_score: 30,
          request_method: 'POST',
          request_size_bytes: 500,
          response_status: 200
        }
      ];
      const updatedLogs: LogEntry[] = [
        ...initialLogs,
        {
          log_id: 'log-2',
          customer_id: 'cust-1',
          timestamp: 1000000001000,
          ai_service: 'anthropic',
          endpoint: 'https://api.anthropic.com',
          data_sources: ['file:///data/users.csv'],
          sensitive_data_types: ['ssn'],
          risk_score: 80,
          request_method: 'POST',
          request_size_bytes: 2048,
          response_status: 200
        }
      ];

      let callCount = 0;
      mockedFetchLogs.mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? initialLogs : updatedLogs;
      });

      const { result } = renderHook(() => useLogStream(apiKey));

      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current).toEqual(initialLogs);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(result.current).toEqual(updatedLogs);
    });
  });

  describe('Cleanup', () => {
    test('should clear interval on unmount', async () => {
      const apiKey = 'test-api-key';
      mockedFetchLogs.mockResolvedValue([]);

      const { unmount } = renderHook(() => useLogStream(apiKey));

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockedFetchLogs).toHaveBeenCalledTimes(1);

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      // Should not have made any more calls after unmount
      expect(mockedFetchLogs).toHaveBeenCalledTimes(1);
    });

    test('should clear interval when API key changes to null', async () => {
      const apiKey = 'test-api-key';
      mockedFetchLogs.mockResolvedValue([]);

      const { rerender } = renderHook(
        ({ key }) => useLogStream(key),
        { initialProps: { key: apiKey } }
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockedFetchLogs).toHaveBeenCalledTimes(1);

      // Change API key to null
      rerender({ key: null });

      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      // Should not have made any more calls
      expect(mockedFetchLogs).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    test('should handle fetch errors gracefully', async () => {
      const apiKey = 'test-api-key';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockedFetchLogs.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLogStream(apiKey));

      await act(async () => {
        await Promise.resolve();
      });

      // Should have logged the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch logs:',
        expect.any(Error)
      );

      // Should return empty array on error
      expect(result.current).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    test('should continue polling after an error', async () => {
      const apiKey = 'test-api-key';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockLogs: LogEntry[] = [
        {
          log_id: 'log-1',
          customer_id: 'cust-1',
          timestamp: 1000000000000,
          ai_service: 'openai',
          endpoint: 'https://api.openai.com',
          data_sources: [],
          sensitive_data_types: [],
          risk_score: 25,
          request_method: 'GET',
          request_size_bytes: 100,
          response_status: 200
        }
      ];

      let callCount = 0;
      mockedFetchLogs.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return mockLogs;
      });

      const { result } = renderHook(() => useLogStream(apiKey));

      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current).toEqual([]);

      // Next poll should succeed
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(result.current).toEqual(mockLogs);

      consoleErrorSpy.mockRestore();
    });
  });
});
