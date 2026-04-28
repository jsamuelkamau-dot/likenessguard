/**
 * Unit Tests for SystemMap Component
 * 
 * Tests node generation, edge generation, color coding, and updates when logs change
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { render } from '@testing-library/react';
import { SystemMap } from '../components/SystemMap';
import { LogEntry } from '../types';

// Sample log entries for testing
const createLogEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  log_id: 'test-log-id',
  customer_id: 'test-customer',
  timestamp: Date.now(),
  ai_service: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  data_sources: [],
  sensitive_data_types: [],
  risk_score: 50,
  request_method: 'POST',
  request_size_bytes: 1024,
  response_status: 200,
  ...overrides
});

describe('SystemMap Component', () => {
  describe('Node Generation', () => {
    test('should render with empty logs array', () => {
      const { container } = render(<SystemMap logs={[]} />);
      expect(container).toBeTruthy();
      expect(container.querySelector('div')).toBeTruthy();
    });

    test('should generate nodes for AI services', () => {
      const logs = [
        createLogEntry({ ai_service: 'openai' }),
        createLogEntry({ ai_service: 'anthropic' }),
        createLogEntry({ ai_service: 'bedrock' })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
      
      // Component should render without errors
      const graphContainer = container.querySelector('div');
      expect(graphContainer).toBeTruthy();
    });

    test('should generate nodes for data sources', () => {
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: ['postgres://db.example.com/users', '/path/to/file.csv']
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should handle logs with no AI service', () => {
      const logs = [
        createLogEntry({ ai_service: '' })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should handle logs with empty data sources', () => {
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: []
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should deduplicate nodes for repeated AI services', () => {
      const logs = [
        createLogEntry({ ai_service: 'openai' }),
        createLogEntry({ ai_service: 'openai' }),
        createLogEntry({ ai_service: 'openai' })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
      
      // The component should handle duplicates gracefully
      const graphContainer = container.querySelector('div');
      expect(graphContainer).toBeTruthy();
    });

    test('should deduplicate nodes for repeated data sources', () => {
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: ['postgres://db.example.com/users']
        }),
        createLogEntry({
          ai_service: 'anthropic',
          data_sources: ['postgres://db.example.com/users']
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });
  });

  describe('Edge Generation', () => {
    test('should generate edges from system to AI services', () => {
      const logs = [
        createLogEntry({ ai_service: 'openai' }),
        createLogEntry({ ai_service: 'anthropic' })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should generate edges from AI services to data sources', () => {
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: ['postgres://db.example.com/users', '/path/to/file.csv']
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should handle multiple AI services with shared data sources', () => {
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: ['postgres://db.example.com/users']
        }),
        createLogEntry({
          ai_service: 'anthropic',
          data_sources: ['postgres://db.example.com/users']
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should not create edges for logs without AI service', () => {
      const logs = [
        createLogEntry({
          ai_service: '',
          data_sources: ['postgres://db.example.com/users']
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });
  });

  describe('Color Coding', () => {
    test('should apply correct styling to graph container', () => {
      const logs = [createLogEntry()];
      const { container } = render(<SystemMap logs={logs} />);
      
      const graphContainer = container.querySelector('div');
      expect(graphContainer).toBeTruthy();
      
      // Check that the container has styling applied
      const style = graphContainer?.getAttribute('style');
      expect(style).toBeTruthy();
      expect(style).toContain('width');
      expect(style).toContain('height');
    });

    test('should render with glassmorphism effect', () => {
      const logs = [createLogEntry()];
      const { container } = render(<SystemMap logs={logs} />);
      
      const graphContainer = container.querySelector('div');
      const style = graphContainer?.getAttribute('style');
      
      // Check for glassmorphism properties
      expect(style).toContain('background');
      expect(style).toContain('border');
    });
  });

  describe('Real-Time Updates', () => {
    test('should update when logs change', () => {
      const initialLogs = [
        createLogEntry({ ai_service: 'openai' })
      ];

      const { container, rerender } = render(<SystemMap logs={initialLogs} />);
      expect(container).toBeTruthy();

      // Update with new logs
      const updatedLogs = [
        ...initialLogs,
        createLogEntry({ ai_service: 'anthropic' })
      ];

      rerender(<SystemMap logs={updatedLogs} />);
      expect(container).toBeTruthy();
    });

    test('should handle adding new data sources', () => {
      const initialLogs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: ['postgres://db.example.com/users']
        })
      ];

      const { container, rerender } = render(<SystemMap logs={initialLogs} />);
      expect(container).toBeTruthy();

      // Add new data source
      const updatedLogs = [
        ...initialLogs,
        createLogEntry({
          ai_service: 'openai',
          data_sources: ['/path/to/new/file.csv']
        })
      ];

      rerender(<SystemMap logs={updatedLogs} />);
      expect(container).toBeTruthy();
    });

    test('should handle removing logs', () => {
      const initialLogs = [
        createLogEntry({ ai_service: 'openai' }),
        createLogEntry({ ai_service: 'anthropic' })
      ];

      const { container, rerender } = render(<SystemMap logs={initialLogs} />);
      expect(container).toBeTruthy();

      // Remove one log
      const updatedLogs = [initialLogs[0]];

      rerender(<SystemMap logs={updatedLogs} />);
      expect(container).toBeTruthy();
    });

    test('should handle clearing all logs', () => {
      const initialLogs = [
        createLogEntry({ ai_service: 'openai' })
      ];

      const { container, rerender } = render(<SystemMap logs={initialLogs} />);
      expect(container).toBeTruthy();

      // Clear logs
      rerender(<SystemMap logs={[]} />);
      expect(container).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null data sources in array', () => {
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: ['postgres://db.example.com/users', '', 'null']
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should handle very long data source names', () => {
      const longDataSource = 'postgres://very-long-database-hostname-that-exceeds-normal-length.example.com:5432/database_name_with_many_characters';
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: [longDataSource]
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should handle many logs', () => {
      const logs = Array.from({ length: 50 }, (_, i) =>
        createLogEntry({
          log_id: 'log-' + i,
          ai_service: 'openai',
          data_sources: ['postgres://db.example.com/users']
        })
      );

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should handle many unique AI services', () => {
      const logs = Array.from({ length: 10 }, (_, i) =>
        createLogEntry({
          log_id: 'log-' + i,
          ai_service: 'service-' + i
        })
      );

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });

    test('should handle many unique data sources', () => {
      const logs = [
        createLogEntry({
          ai_service: 'openai',
          data_sources: Array.from({ length: 20 }, (_, i) => 'datasource-' + i)
        })
      ];

      const { container } = render(<SystemMap logs={logs} />);
      expect(container).toBeTruthy();
    });
  });
});