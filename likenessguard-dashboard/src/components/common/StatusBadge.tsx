import React from 'react';
import styles from './StatusBadge.module.css';

export type StatusType = 'ALLOW' | 'DENY' | 'UNKNOWN' | 'SUCCESS' | 'ERROR';

export interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  className = '',
}) => {
  const displayText = text || status;

  return (
    <span className={`${styles.badge} ${styles[status.toLowerCase()]} ${className}`}>
      {displayText}
    </span>
  );
};
