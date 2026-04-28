import React from 'react';
import type { Violation } from '../../types/api-types';
import { formatTimestamp } from '../../services/logs-service';
import styles from './ViolationsList.module.css';

export interface ViolationsListProps {
  violations: Violation[];
  loading: boolean;
}

export const ViolationsList: React.FC<ViolationsListProps> = ({ violations, loading }) => {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading violations...</div>
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}></div>
          <div className={styles.emptyTitle}>No Violations Detected</div>
          <div className={styles.emptyMessage}>
            Your likeness protection is working well. No unauthorized uses have been detected.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {violations.map((violation) => (
          <div key={violation.query_id} className={styles.card}>
            <div className={styles.alertIndicator} />
            <div className={styles.header}>
              <div className={styles.title}>Unauthorized Use Detected</div>
              <div className={styles.timestamp}>
                {formatTimestamp(violation.timestamp)}
              </div>
            </div>
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Requester ID:</span>
                <span className={styles.value}>{violation.requester_id}</span>
              </div>
              {violation.similarity_score !== undefined && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>Similarity:</span>
                  <span className={styles.value}>
                    {(violation.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {violation.source && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>Source:</span>
                  <span className={styles.value}>{violation.source}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.label}>Usage Type:</span>
                <span className={styles.value}>{violation.usage_type}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Reason:</span>
                <span className={styles.reasonValue}>{formatReasonCode(violation.reason_code)}</span>
              </div>
            </div>
            <div className={styles.footer}>
              <span className={styles.queryId}>ID: {violation.query_id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatReasonCode = (reasonCode: string): string => {
  const reasonMap: Record<string, string> = {
    DENY_POLICY_VIOLATION: 'Policy Violation',
    DENY_THIRD_PARTY: 'Third Party Use Denied',
    DENY_FACE_SWAP: 'Face Swap Denied',
    DENY_SEXUALIZED_CONTENT: 'Sexualized Content Denied',
    DENY_IMPERSONATION: 'Impersonation Denied',
    DENY_POLITICAL_USE: 'Political Use Denied',
  };
  return reasonMap[reasonCode] || reasonCode;
};

