import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityLogs } from './ActivityLogs';
import * as logsService from '../services/logs-service';
import { Decision } from '../types/api-types';

vi.mock('../services/logs-service');

const mockLogs = [
  {
    query_id: 'query-1',
    timestamp: 1704067200,
    decision: Decision.ALLOW,
    reason_code: 'ALLOW_POLICY_PERMITS',
    requester_id: 'requester-1',
    usage_type: 'GENERAL_GENERATION',
    similarity_score: 0.95,
  },
  {
    query_id: 'query-2',
    timestamp: 1704063600,
    decision: Decision.DENY,
    reason_code: 'DENY_POLICY_VIOLATION',
    requester_id: 'requester-2',
    usage_type: 'FACE_SWAP',
    similarity_score: 0.88,
  },
  {
    query_id: 'query-3',
    timestamp: 1704060000,
    decision: Decision.UNKNOWN,
    reason_code: 'UNKNOWN_NO_MATCH',
    requester_id: 'requester-3',
    usage_type: 'SELF_EDIT',
  },
];

describe('ActivityLogs Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'test-likeness',
      evidence_records: [],
      count: 0,
    });

    render(<ActivityLogs />);
    expect(screen.getByText('Activity Logs')).toBeInTheDocument();
  });

  it('should fetch logs on page load', async () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'demo-likeness-001',
      evidence_records: mockLogs,
      count: mockLogs.length,
    });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(logsService.getActivityLogs).toHaveBeenCalledWith('demo-likeness-001');
    });
  });

  it('should display loading state while fetching logs', () => {
    vi.mocked(logsService.getActivityLogs).mockImplementation(
      () => new Promise(() => {})
    );

    render(<ActivityLogs />);
    expect(screen.getByText('Loading activity logs...')).toBeInTheDocument();
  });

  it('should display logs table when logs are loaded', async () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'demo-likeness-001',
      evidence_records: mockLogs,
      count: mockLogs.length,
    });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(screen.getByText('Activity History')).toBeInTheDocument();
    });
  });

  it('should display error message when fetch fails', async () => {
    vi.mocked(logsService.getActivityLogs).mockRejectedValue(
      new Error('Failed to fetch logs')
    );

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch logs/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no logs exist', async () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'demo-likeness-001',
      evidence_records: [],
      count: 0,
    });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(screen.getAllByText('No activity logs found').length).toBeGreaterThan(0);
    });
  });

  it('should allow changing likeness ID', async () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'demo-likeness-001',
      evidence_records: [],
      count: 0,
    });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(logsService.getActivityLogs).toHaveBeenCalledWith('demo-likeness-001');
    });

    const input = screen.getByLabelText('Likeness ID');
    fireEvent.change(input, { target: { value: 'new-likeness-id' } });

    const loadButton = screen.getByText('Load Logs');
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(logsService.getActivityLogs).toHaveBeenCalledWith('new-likeness-id');
    });
  });

  it('should integrate LogsFilter component', async () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'demo-likeness-001',
      evidence_records: mockLogs,
      count: mockLogs.length,
    });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(screen.getByText('Filter Logs')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Decision Type')).toBeInTheDocument();
    expect(screen.getByLabelText('User ID')).toBeInTheDocument();
  });

  it('should filter logs by decision type', async () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'demo-likeness-001',
      evidence_records: mockLogs,
      count: mockLogs.length,
    });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(screen.getByText('Activity History')).toBeInTheDocument();
    });

    const decisionSelect = screen.getByLabelText('Decision Type');
    fireEvent.change(decisionSelect, { target: { value: 'ALLOW' } });

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });

  it('should handle retry after error', async () => {
    vi.mocked(logsService.getActivityLogs)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        likeness_id: 'demo-likeness-001',
        evidence_records: mockLogs,
        count: mockLogs.length,
      });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Activity History')).toBeInTheDocument();
    });
  });

  it('should display total count of logs', async () => {
    vi.mocked(logsService.getActivityLogs).mockResolvedValue({
      likeness_id: 'demo-likeness-001',
      evidence_records: mockLogs,
      count: mockLogs.length,
    });

    render(<ActivityLogs />);

    await waitFor(() => {
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
