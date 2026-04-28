import { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { fetchLogs } from '../services/api';

/**
 * Custom hook for real-time log polling
 * Fetches logs on mount and sets up 2-second polling interval
 * Handles errors gracefully with retry logic
 * 
 * @param apiKey - Customer API key for authentication
 * @returns Array of log entries and error state
 */
export const useLogStream = (apiKey: string | null): { logs: LogEntry[], error: string | null } => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if no API key
    if (!apiKey) {
      return;
    }

    // Fetch logs immediately on mount
    const fetchLogsData = async () => {
      try {
        const newLogs = await fetchLogs(apiKey);
        setLogs(newLogs);
        setError(null); // Clear any previous errors
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch logs';
        console.error('Failed to fetch logs:', errorMessage);
        setError(errorMessage);
        // Don't clear logs on error - keep showing last successful fetch
      }
    };

    // Initial fetch
    fetchLogsData();

    // Set up polling interval (2 seconds)
    const interval = setInterval(fetchLogsData, 2000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [apiKey]);

  return { logs, error };
};

export default useLogStream;
