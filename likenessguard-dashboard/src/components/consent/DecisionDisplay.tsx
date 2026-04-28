import React from 'react';
import type { ConsentCheckResponse, Decision } from '../../types/api-types';
import { StatusBadge } from '../common/StatusBadge';
import styles from './DecisionDisplay.module.css';

export interface DecisionDisplayProps {
  result: ConsentCheckResponse;
  className?: string;
}

export const DecisionDisplay: React.FC<DecisionDisplayProps> = ({
  result,
  className = '',
}) => {
  const { decision, reason_code, similarity_score, likeness_id } = result;

  const getDecisionIcon = (decision: Decision): string => {
    switch (decision) {
      case 'ALLOW':
        return '';
      case 'DENY':
        return '';
      case 'UNKNOWN':
        return '?';
      default:
        return '';
    }
  };

  const formatSimilarity = (score?: number): string => {
    if (score === undefined || score === null) return 'N/A';
    const percentage = (score * 100).toFixed(1);
    return percentage + '%';
  };

  const formatReasonCode = (code: string): string => {
    return code
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className={styles.container + ' ' + className} data-decision={decision}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{getDecisionIcon(decision)}</span>
        </div>
        <div className={styles.decisionInfo}>
          <h2 className={styles.decisionTitle}>Decision</h2>
          <StatusBadge status={decision} className={styles.badge} />
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Reason:</span>
          <span className={styles.detailValue}>{formatReasonCode(reason_code)}</span>
        </div>

        {similarity_score !== undefined && similarity_score !== null && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Similarity Score:</span>
            <span className={styles.detailValue}>{formatSimilarity(similarity_score)}</span>
          </div>
        )}

        {likeness_id && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Matched Likeness:</span>
            <span className={styles.detailValue}>{likeness_id}</span>
          </div>
        )}
      </div>
    </div>
  );
};
