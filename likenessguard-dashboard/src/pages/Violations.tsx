/**
 * Violations Page
 * 
 * Displays detected violations and misuse events
 * Requirements: 6.1
 */

import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { ViolationsList } from '../components/violations/ViolationsList';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { getViolations } from '../services/logs-service';
import type { Violation } from '../types/api-types';

export const Violations: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get likeness ID from localStorage (set during registration)
  const likenessId = localStorage.getItem('likenessId') || 'demo-likeness-id';

  const fetchViolations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getViolations(likenessId);
      setViolations(response.violations);
    } catch (err: any) {
      console.error('Failed to fetch violations:', err);
      setError(err.message || 'Failed to load violations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [likenessId]);

  const handleRetry = () => {
    fetchViolations();
  };

  return (
    <PageContainer title="Violations & Monitoring">
      {error ? (
        <ErrorDisplay
          type="server"
          message={error}
          onRetry={handleRetry}
        />
      ) : (
        <ViolationsList violations={violations} loading={loading} />
      )}
    </PageContainer>
  );
};

