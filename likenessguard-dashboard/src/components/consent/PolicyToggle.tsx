import React from 'react';
import styles from './PolicyToggle.module.css';

export interface PolicyToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export const PolicyToggle: React.FC<PolicyToggleProps> = ({
  label,
  value,
  onChange,
  description,
  disabled = false,
  id,
}) => {
  const toggleId = id || `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const handleToggle = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.toggleRow}>
        <label htmlFor={toggleId} className={styles.label}>
          {label}
        </label>
        <button
          id={toggleId}
          role="switch"
          aria-checked={value}
          aria-label={label}
          className={`${styles.toggle} ${value ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          type="button"
        >
          <span className={styles.slider} />
        </button>
      </div>
      {description && (
        <p className={styles.description}>{description}</p>
      )}
    </div>
  );
};
