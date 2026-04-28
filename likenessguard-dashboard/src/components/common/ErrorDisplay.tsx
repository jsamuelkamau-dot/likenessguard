import React from 'react';
import { Button } from './Button';
import styles from './ErrorDisplay.module.css';

export type ErrorType = 'network' | 'validation' | 'server' | 'unknown';

export interface ErrorDisplayProps {
  type: ErrorType;
  message: string;
  details?: string | string[];
  onRetry?: () => void;
  className?: string;
}

// Helper function to get user-friendly suggestions based on error type
const getErrorSuggestions = (type: ErrorType, message: string): string[] => {
  switch (type) {
    case 'network':
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'If the problem persists, the service may be temporarily unavailable',
      ];
    case 'validation':
      if (message.toLowerCase().includes('image') || message.toLowerCase().includes('photo')) {
        return [
          'Ensure your images are in JPEG, PNG, or WebP format',
          'Check that image files are not corrupted',
          'Try uploading different photos',
        ];
      }
      if (message.toLowerCase().includes('user id') || message.toLowerCase().includes('userid')) {
        return [
          'User ID must be at least 3 characters long',
          'Use only letters, numbers, and underscores',
          'Choose a unique identifier',
        ];
      }
      return [
        'Review the form fields and correct any errors',
        'Ensure all required fields are filled',
        'Check that your input meets the specified requirements',
      ];
    case 'server':
      return [
        'The service is experiencing issues',
        'Please wait a moment and try again',
        'If the problem continues, contact support',
      ];
    default:
      return [
        'Please try your action again',
        'If the error persists, refresh the page',
      ];
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  type,
  message,
  details,
  onRetry,
  className = '',
}) => {
  const showRetryButton = (type === 'network' || type === 'server') && onRetry;
  const isArrayDetails = Array.isArray(details);
  const suggestions = getErrorSuggestions(type, message);

  const getIcon = () => {
    switch (type) {
      case 'network':
        return (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
        );
      case 'validation':
        return (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'server':
        return (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        );
      default:
        return (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const containerClasses = [styles.errorContainer, styles[type], className].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} role="alert">
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          {getIcon()}
        </div>
        <div className={styles.messageWrapper}>
          <h4 className={styles.title}>
            {type === 'network' && 'Connection Error'}
            {type === 'validation' && 'Validation Error'}
            {type === 'server' && 'Server Error'}
            {type === 'unknown' && 'Error'}
          </h4>
          <p className={styles.message}>{message}</p>
        </div>
      </div>

      {isArrayDetails && (
        <div className={styles.errorDetails}>
          <ul className={styles.errorList}>
            {(details as string[]).map((error, index) => (
              <li key={index} className={styles.errorItem}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isArrayDetails && details && typeof details === 'string' && (
        <div className={styles.details}>
          <p className={styles.detailsText}>{details}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className={styles.suggestions}>
          <h5 className={styles.suggestionsTitle}>Suggestions:</h5>
          <ul className={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => (
              <li key={index} className={styles.suggestionItem}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showRetryButton && (
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};
