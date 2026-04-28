/**
 * ActivityLog Component
 * Displays a list of log entries in descending chronological order
 * Shows timestamp, AI service, risk score, and data sources for each entry
 * Applies glassmorphism styling and limits to 100 most recent entries
 * 
 * Validates: Requirements 11.3, 11.4, 11.5
 */

import React from 'react';
import { LogEntry } from '../types';
import { theme, getRiskColor } from '../styles/theme';

interface ActivityLogProps {
  logs: LogEntry[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const displayLogs = sortedLogs.slice(0, 100);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDataSources = (dataSources: string[]): string => {
    if (dataSources.length === 0) return 'None';
    if (dataSources.length === 1) return dataSources[0];
    return dataSources[0] + ' +' + (dataSources.length - 1) + ' more';
  };

  return (
    <div style={styles.container} data-testid="activity-log-container">
      <h2 style={styles.title}>Activity Log</h2>
      <div style={styles.logList} data-testid="log-list">
        {displayLogs.length === 0 ? (
          <div style={styles.emptyState} data-testid="empty-state">No activity logs yet</div>
        ) : (
          displayLogs.map((log) => (
            <div key={log.log_id} style={styles.logEntry} data-testid="log-entry">
              <div style={styles.logHeader}>
                <span style={styles.timestamp}>{formatTimestamp(log.timestamp)}</span>
                <span 
                  style={{
                    ...styles.riskScore,
                    color: getRiskColor(log.risk_score)
                  }}
                >
                  Risk: {log.risk_score}
                </span>
              </div>
              <div style={styles.logBody}>
                <div style={styles.logRow}>
                  <span style={styles.label}>AI Service:</span>
                  <span style={styles.value}>{log.ai_service}</span>
                </div>
                <div style={styles.logRow}>
                  <span style={styles.label}>Data Sources:</span>
                  <span style={styles.value}>{formatDataSources(log.data_sources)}</span>
                </div>
                {log.sensitive_data_types.length > 0 && (
                  <div style={styles.logRow}>
                    <span style={styles.label}>Sensitive Data:</span>
                    <span style={styles.value}>{log.sensitive_data_types.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textShadow: '0 0 10px ' + theme.colors.accent.cyan,
  },
  logList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logEntry: {
    background: theme.effects.glassMorphism.background,
    backdropFilter: theme.effects.glassMorphism.backdropFilter,
    border: theme.effects.glassMorphism.border,
    borderRadius: '8px',
    padding: '16px',
    transition: 'all 0.3s ease',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid ' + theme.colors.accent.cyan + '33',
  },
  timestamp: {
    color: theme.colors.text.secondary,
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  riskScore: {
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  logBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  logRow: {
    display: 'flex',
    gap: '8px',
  },
  label: {
    color: theme.colors.text.secondary,
    fontSize: '14px',
    minWidth: '120px',
    fontWeight: '500',
  },
  value: {
    color: theme.colors.text.primary,
    fontSize: '14px',
    flex: 1,
    wordBreak: 'break-word',
  },
  emptyState: {
    color: theme.colors.text.muted,
    fontSize: '16px',
    textAlign: 'center',
    padding: '40px',
  },
};

export default ActivityLog;