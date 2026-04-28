import React, { useState } from 'react';
import { LogEntry } from '../types';
import './AlertCard.css';

interface AlertCardProps {
  logs: LogEntry[];
}

export const AlertCard: React.FC<AlertCardProps> = ({ logs }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const highRiskLogs = logs.filter(
    log => log.risk_score > 70 && !dismissedAlerts.has(log.log_id)
  );

  const handleDismiss = (logId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(logId));
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (highRiskLogs.length === 0) {
    return null;
  }

  return (
    <div className="alert-card-container">
      {highRiskLogs.map(log => (
        <div key={log.log_id} className="alert-card pulse">
          <div className="alert-card-header">
            <div className="alert-card-title">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">HIGH RISK ALERT</span>
            </div>
            <button
              className="dismiss-button"
              onClick={() => handleDismiss(log.log_id)}
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>

          <div className="alert-card-content">
            <div className="alert-info-row">
              <span className="alert-label">Risk Score:</span>
              <span className="alert-value risk-score">{log.risk_score}</span>
            </div>

            <div className="alert-info-row">
              <span className="alert-label">AI Service:</span>
              <span className="alert-value">{log.ai_service}</span>
            </div>

            <div className="alert-info-row">
              <span className="alert-label">Timestamp:</span>
              <span className="alert-value">{formatTimestamp(log.timestamp)}</span>
            </div>

            {log.sensitive_data_types.length > 0 && (
              <div className="alert-info-row">
                <span className="alert-label">Sensitive Data:</span>
                <span className="alert-value">
                  {log.sensitive_data_types.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertCard;
