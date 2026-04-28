import React from 'react';
import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
  className = '',
}) => {
  return (
    <div className={`${styles.container} ${className}`} role="status" aria-live="polite">
      <div className={`${styles.spinner} ${styles[size]}`}>
        <svg className={styles.spinnerSvg} viewBox="0 0 50 50">
          <circle
            className={styles.spinnerCircle}
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
          />
        </svg>
      </div>
      {text && (
        <p className={styles.text}>
          {text}
        </p>
      )}
      {!text && <span className={styles.srOnly}>Loading...</span>}
    </div>
  );
};
