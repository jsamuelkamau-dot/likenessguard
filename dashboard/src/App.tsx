import React, { useState, useMemo } from 'react';
import AuthForm from './components/AuthForm';
import ActivityLog from './components/ActivityLog';
import RiskGauge from './components/RiskGauge';
import SystemMap from './components/SystemMap';
import AlertCard from './components/AlertCard';
import TimelineChart from './components/TimelineChart';
import { useAuth } from './hooks/useAuth';
import { useLogStream } from './hooks/useLogStream';
import { theme } from './styles/theme';
import { generateMockLogs } from './data/mockLogs';
import './App.css';

const App: React.FC = () => {
  const { isAuthenticated, apiKey, error, login, logout } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { logs: realLogs } = useLogStream(apiKey || '');  // FIX: Destructure logs from the returned object
  const mockLogs = useMemo(() => generateMockLogs(), []);
  
  const logs = isDemoMode ? mockLogs : realLogs;

  const handleDemoMode = () => {
    setIsDemoMode(true);
  };

  const handleExitDemo = () => {
    setIsDemoMode(false);
  };

  if (!isAuthenticated && !isDemoMode) {
    return <AuthForm onLogin={login} onDemoMode={handleDemoMode} error={error || undefined} />;
  }

  const averageRiskScore = logs.length > 0
    ? Math.round(logs.reduce((sum, log) => sum + log.risk_score, 0) / logs.length)
    : 0;

  return (
    <div className='App' style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Interpose Dashboard</h1>
          <p style={styles.subtitle}>
            AI Access Intelligence Platform
            {isDemoMode && <span style={styles.demoLabel}> • DEMO MODE</span>}
          </p>
        </div>
        <button 
          onClick={isDemoMode ? handleExitDemo : logout} 
          style={styles.logoutButton}
        >
          {isDemoMode ? 'Exit Demo' : 'Logout'}
        </button>
      </header>

      <main style={styles.main}>
        <AlertCard logs={logs} />
        <TimelineChart logs={logs} />
        <div style={styles.gridContainer}>
          <div style={styles.leftColumn}>
            <div style={styles.riskGaugeSection}>
              <h3 style={styles.sectionTitle}>Average Risk Score</h3>
              <div style={styles.riskGaugeContainer}>
                <RiskGauge score={averageRiskScore} />
              </div>
              <p style={styles.riskGaugeLabel}>
                {logs.length} total log{logs.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={styles.systemMapSection}>
              <h3 style={styles.sectionTitle}>System Map</h3>
              <SystemMap logs={logs} />
            </div>
          </div>
          <div style={styles.rightColumn}>
            <ActivityLog logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: theme.colors.background.primary,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
  },
  title: {
    color: theme.colors.accent.cyan,
    margin: '0 0 8px 0',
    fontSize: '32px',
    fontWeight: 'bold',
    textShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
  },
  subtitle: {
    color: theme.colors.text.secondary,
    margin: 0,
    fontSize: '14px',
  },
  demoLabel: {
    color: theme.colors.accent.magenta,
    fontWeight: 'bold',
    textShadow: '0 0 10px rgba(255, 0, 255, 0.5)',
  },
  logoutButton: {
    background: 'transparent',
    border: '1px solid #00d9ff',
    borderRadius: '6px',
    color: theme.colors.accent.cyan,
    cursor: 'pointer',
    fontSize: '14px',
    padding: '10px 20px',
    transition: 'all 0.2s',
    fontWeight: '500',
  },
  main: {
    maxWidth: '1800px',
    margin: '0 auto',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '20px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  riskGaugeSection: {
    background: theme.effects.glassMorphism.background,
    backdropFilter: theme.effects.glassMorphism.backdropFilter,
    border: theme.effects.glassMorphism.border,
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 20px 0',
  },
  riskGaugeContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  riskGaugeLabel: {
    color: theme.colors.text.secondary,
    fontSize: '14px',
    margin: '10px 0 0 0',
  },
  systemMapSection: {
    background: theme.effects.glassMorphism.background,
    backdropFilter: theme.effects.glassMorphism.backdropFilter,
    border: theme.effects.glassMorphism.border,
    borderRadius: '8px',
    padding: '20px',
  },
};

export default App;
