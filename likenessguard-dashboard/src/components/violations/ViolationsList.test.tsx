/**
 * ViolationsList Component Unit Tests
 * 
 * Tests rendering, loading states, empty states, and violation display
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ViolationsList } from './ViolationsList';
import { Violation } from '../../types/api-types';

describe('ViolationsList Component', () => {
  describe('Loading State', () => {
    it('should display loading message when loading is true', () => {
      render(<ViolationsList violations={[]} loading={true} />);
      
      expect(screen.getByText('Loading violations...')).toBeInTheDocument();
    });

    it('should not display violations when loading', () => {
      const mockViolations: Violation[] = [
        {
          query_id: 'test-1',
          timestamp: 1704067200,
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'user-123',
          usage_type: 'THIRD_PARTY_EDIT',
        },
      ];

      render(<ViolationsList violations={mockViolations} loading={true} />);
      
      expect(screen.queryByText('Unauthorized Use Detected')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no violations and not loading', () => {
      render(<ViolationsList violations={[]} loading={false} />);
      
      expect(screen.getByText('No Violations Detected')).toBeInTheDocument();
      expect(screen.getByText(/Your likeness protection is working well/)).toBeInTheDocument();
    });

    it('should not display empty state when loading', () => {
      render(<ViolationsList violations={[]} loading={true} />);
      
      expect(screen.queryByText('No Violations Detected')).not.toBeInTheDocument();
    });

    it('should not display empty state when violations exist', () => {
      const mockViolations: Violation[] = [
        {
          query_id: 'test-1',
          timestamp: 1704067200,
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'user-123',
          usage_type: 'THIRD_PARTY_EDIT',
        },
      ];

      render(<ViolationsList violations={mockViolations} loading={false} />);
      
      expect(screen.queryByText('No Violations Detected')).not.toBeInTheDocument();
    });
  });

  describe('Violations Display', () => {
    it('should render single violation with all details', () => {
      const mockViolation: Violation = {
        query_id: 'query-abc-123',
        timestamp: 1704067200,
        reason_code: 'DENY_POLICY_VIOLATION',
        requester_id: 'user-456',
        usage_type: 'FACE_SWAP',
        similarity_score: 0.92,
        source: 'external-app',
      };

      render(<ViolationsList violations={[mockViolation]} loading={false} />);
      
      expect(screen.getByText('Unauthorized Use Detected')).toBeInTheDocument();
      expect(screen.getByText('Requester ID:')).toBeInTheDocument();
      expect(screen.getByText('user-456')).toBeInTheDocument();
      expect(screen.getByText('Similarity:')).toBeInTheDocument();
      expect(screen.getByText('92.0%')).toBeInTheDocument();
      expect(screen.getByText('Source:')).toBeInTheDocument();
      expect(screen.getByText('external-app')).toBeInTheDocument();
      expect(screen.getByText('Usage Type:')).toBeInTheDocument();
      expect(screen.getByText('FACE_SWAP')).toBeInTheDocument();
      expect(screen.getByText('Reason:')).toBeInTheDocument();
      expect(screen.getByText('Policy Violation')).toBeInTheDocument();
      expect(screen.getByText('ID: query-abc-123')).toBeInTheDocument();
    });

    it('should render multiple violations', () => {
      const mockViolations: Violation[] = [
        {
          query_id: 'query-1',
          timestamp: 1704067200,
          reason_code: 'DENY_POLICY_VIOLATION',
          requester_id: 'user-1',
          usage_type: 'THIRD_PARTY_EDIT',
        },
        {
          query_id: 'query-2',
          timestamp: 1704153600,
          reason_code: 'DENY_FACE_SWAP',
          requester_id: 'user-2',
          usage_type: 'FACE_SWAP',
        },
        {
          query_id: 'query-3',
          timestamp: 1704240000,
          reason_code: 'DENY_SEXUALIZED_CONTENT',
          requester_id: 'user-3',
          usage_type: 'GENERAL_GENERATION',
        },
      ];

      render(<ViolationsList violations={mockViolations} loading={false} />);
      
      const titles = screen.getAllByText('Unauthorized Use Detected');
      expect(titles).toHaveLength(3);
      expect(screen.getByText('ID: query-1')).toBeInTheDocument();
      expect(screen.getByText('ID: query-2')).toBeInTheDocument();
      expect(screen.getByText('ID: query-3')).toBeInTheDocument();
    });

    it('should handle violation without optional fields', () => {
      const mockViolation: Violation = {
        query_id: 'query-minimal',
        timestamp: 1704067200,
        reason_code: 'DENY_THIRD_PARTY',
        requester_id: 'user-789',
        usage_type: 'THIRD_PARTY_EDIT',
      };

      render(<ViolationsList violations={[mockViolation]} loading={false} />);
      
      expect(screen.getByText('user-789')).toBeInTheDocument();
      expect(screen.getByText('THIRD_PARTY_EDIT')).toBeInTheDocument();
      expect(screen.queryByText('Similarity:')).not.toBeInTheDocument();
      expect(screen.queryByText('Source:')).not.toBeInTheDocument();
    });
  });
});
