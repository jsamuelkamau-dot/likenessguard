/**
 * Property-Based Tests for Real-Time Log Polling
 * Feature: interpose-saas-platform
 * 
 * Property 20: Real-Time Log Updates
 * Validates: Requirements 11.2
 */

import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useLogStream } from '../hooks/useLogStream';
import * as api from '../services/api';

jest.mock('../services/api');
const mockedFetchLogs = api.fetchLogs as jest.MockedFunction<typeof api.fetchLogs>;

describe('Real-Time Log Polling Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Property 20: Real-Time Log Updates - dashboard automatically updates when new logs arrive', async () => {
    const apiKey = 'test-api-key-12345';
    const initialLogs = [
      {
        log_id: 'log-1',
        customer_id: 'cust-1',
        timestamp: 1000000000000,
        ai_service: 'openai',
        endpoint: 'https://api.openai.com',
        data_sources: [],
        sensitive_data_types: [],
        risk_score: 50,
        request_method: 'POST',
        request_size_bytes: 1000,
        response_status: 200
      }
    ];
    const newLogs = [
      {
        log_id: 'log-2',
        customer_id: 'cust-1',
        timestamp: 1000000001000,
        ai_service: 'anthropic',
        endpoint: 'https://api.anthropic.com',
        data_sources: [],
        sensitive_data_types: ['email'],
        risk_score: 75,
        request_method: 'POST',
        request_size_bytes: 2000,
        response_status: 200
      }
    ];

    let callCount = 0;
    mockedFetchLogs.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return initialLogs;
      } else {
        return [...initialLogs, ...newLogs];
      }
    });

    const { result } = renderHook(() => useLogStream(apiKey));

    // Wait for initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toEqual(initialLogs);

    // Advance timers by 2 seconds to trigger next poll
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Verify new logs are now present
    expect(result.current.length).toBe(2);
    expect(result.current).toEqual([...initialLogs, ...newLogs]);
  });

  test('Property: Polling occurs at 2-second intervals', async () => {
    const apiKey = 'test-api-key';
    mockedFetchLogs.mockResolvedValue([]);

    renderHook(() => useLogStream(apiKey));

    // Initial call on mount
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedFetchLogs).toHaveBeenCalledTimes(1);

    // After 2 seconds
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(mockedFetchLogs).toHaveBeenCalledTimes(2);

    // After another 2 seconds
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(mockedFetchLogs).toHaveBeenCalledTimes(3);
  });

  test('Property: No polling without API key', async () => {
    mockedFetchLogs.mockResolvedValue([]);

    renderHook(() => useLogStream(null));

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(mockedFetchLogs).not.toHaveBeenCalled();
  });

  test('Property: Polling stops after unmount', async () => {
    const apiKey = 'test-api-key';
    mockedFetchLogs.mockResolvedValue([]);

    const { unmount } = renderHook(() => useLogStream(apiKey));

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedFetchLogs).toHaveBeenCalledTimes(1);

    const callCountBeforeUnmount = mockedFetchLogs.mock.calls.length;

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(mockedFetchLogs).toHaveBeenCalledTimes(callCountBeforeUnmount);
  });
});
