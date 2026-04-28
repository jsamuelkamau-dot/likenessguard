import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  onClick,
  loading = false,
  disabled = false,
  children,
  type = 'button',
  className = '',
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${isDisabled ? styles.disabled : ''} ${className}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {loading && (
        <span className={styles.spinner} aria-label="Loading">
          <svg className={styles.spinnerSvg} viewBox="0 0 24 24">
            <circle
              className={styles.spinnerCircle}
              cx="12"
              cy="12"
              r="10"
              fill="none"
              strokeWidth="3"
            />
          </svg>
        </span>
      )}
      <span className={loading ? styles.loadingText : ''}>{children}</span>
    </button>
  );
};
