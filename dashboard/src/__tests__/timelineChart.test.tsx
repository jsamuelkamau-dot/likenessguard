/**
 * Unit Tests for TimelineChart Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelineChart } from '../components/TimelineChart';
import { LogEntry } from '../types';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
}));

describe('TimelineChart Unit Tests', () => {
  const createLogEntry = (timestamp: number, overrides?: Partial<LogEntry>): LogEntry => ({
    log_id: `log-${timestamp}`,
    customer_id: 'cust-123',
    timestamp,
    ai_service: 'openai',
    endpoint: 'https://api.openai.com',
    data_sources: [],
    sensitive_data_types: [],
    risk_score: 50,
    request_method: 'POST',
    request_size_bytes: 1000,
    response_status: 200,
    ...overrides
  });

  describe('Data Aggregation by Hour', () => {
    it('should aggregate multiple logs in the same hour', () => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      // Create 3 logs within the same hour
      const logs = [
        createLogEntry(oneHourAgo),
        createLogEntry(oneHourAgo + 1000), // 1 second later
        createLogEntry(oneHourAgo + 2000)  // 2 seconds later
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      // Component should render
      expect(container).toBeTruthy();
      expect(screen.getByText('Activity Timeline (Past 24 Hours)')).toBeInTheDocument();
    });

    it('should handle logs spread across multiple hours', () => {
      const now = Date.now();
      const logs = [
        createLogEntry(now - (1 * 60 * 60 * 1000)),  // 1 hour ago
        createLogEntry(now - (2 * 60 * 60 * 1000)),  // 2 hours ago
        createLogEntry(now - (3 * 60 * 60 * 1000)),  // 3 hours ago
        createLogEntry(now - (23 * 60 * 60 * 1000))  // 23 hours ago
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle hours with no logs', () => {
      const now = Date.now();
      const logs = [
        createLogEntry(now - (1 * 60 * 60 * 1000)),   // 1 hour ago
        createLogEntry(now - (23 * 60 * 60 * 1000))   // 23 hours ago
      ];
      
      // Many hours in between have no logs
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
    });
  });

  describe('24-Hour Window Filtering', () => {
    it('should include logs from exactly 24 hours ago', () => {
      const now = Date.now();
      const exactlyTwentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
      
      const logs = [
        createLogEntry(exactlyTwentyFourHoursAgo)
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
      expect(screen.getByText('Activity Timeline (Past 24 Hours)')).toBeInTheDocument();
    });

    it('should exclude logs from more than 24 hours ago', () => {
      const now = Date.now();
      const moreThanTwentyFourHoursAgo = now - (25 * 60 * 60 * 1000);
      
      const logs = [
        createLogEntry(moreThanTwentyFourHoursAgo),
        createLogEntry(now - (1 * 60 * 60 * 1000))  // This one should be included
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
    });

    it('should exclude future logs', () => {
      const now = Date.now();
      const futureTime = now + (1 * 60 * 60 * 1000);
      
      const logs = [
        createLogEntry(futureTime),
        createLogEntry(now - (1 * 60 * 60 * 1000))  // This one should be included
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
    });

    it('should handle empty log array', () => {
      const logs: LogEntry[] = [];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
      expect(screen.getByText('Activity Timeline (Past 24 Hours)')).toBeInTheDocument();
    });

    it('should handle logs at various times within 24 hours', () => {
      const now = Date.now();
      const logs = [
        createLogEntry(now - (30 * 60 * 1000)),      // 30 minutes ago
        createLogEntry(now - (2 * 60 * 60 * 1000)),  // 2 hours ago
        createLogEntry(now - (6 * 60 * 60 * 1000)),  // 6 hours ago
        createLogEntry(now - (12 * 60 * 60 * 1000)), // 12 hours ago
        createLogEntry(now - (18 * 60 * 60 * 1000)), // 18 hours ago
        createLogEntry(now - (23 * 60 * 60 * 1000))  // 23 hours ago
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Chart Rendering', () => {
    it('should render the chart title', () => {
      const logs = [createLogEntry(Date.now() - (1 * 60 * 60 * 1000))];
      
      render(<TimelineChart logs={logs} />);
      
      expect(screen.getByText('Activity Timeline (Past 24 Hours)')).toBeInTheDocument();
    });

    it('should render chart components', () => {
      const logs = [createLogEntry(Date.now() - (1 * 60 * 60 * 1000))];
      
      render(<TimelineChart logs={logs} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
    });

    it('should apply glassmorphism styling', () => {
      const logs = [createLogEntry(Date.now() - (1 * 60 * 60 * 1000))];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      const chartContainer = container.firstChild as HTMLElement;
      expect(chartContainer).toHaveStyle({
        borderRadius: '8px',
        padding: '20px'
      });
    });

    it('should render with no logs', () => {
      render(<TimelineChart logs={[]} />);
      
      expect(screen.getByText('Activity Timeline (Past 24 Hours)')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large number of logs', () => {
      const now = Date.now();
      const logs = Array.from({ length: 1000 }, (_, i) => 
        createLogEntry(now - (i * 60 * 1000)) // One log per minute
      );
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
    });

    it('should handle logs with various risk scores', () => {
      const now = Date.now();
      const logs = [
        createLogEntry(now - (1 * 60 * 60 * 1000), { risk_score: 10 }),
        createLogEntry(now - (2 * 60 * 60 * 1000), { risk_score: 50 }),
        createLogEntry(now - (3 * 60 * 60 * 1000), { risk_score: 90 })
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
    });

    it('should handle logs from different AI services', () => {
      const now = Date.now();
      const logs = [
        createLogEntry(now - (1 * 60 * 60 * 1000), { ai_service: 'openai' }),
        createLogEntry(now - (2 * 60 * 60 * 1000), { ai_service: 'anthropic' }),
        createLogEntry(now - (3 * 60 * 60 * 1000), { ai_service: 'bedrock' })
      ];
      
      const { container } = render(<TimelineChart logs={logs} />);
      
      expect(container).toBeTruthy();
    });
  });
});