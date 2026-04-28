import React, { useState } from 'react';
import { LoginCredentials } from '../types';
import { theme } from '../styles/theme';

interface AuthFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onDemoMode: () => void;
  error?: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onDemoMode, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin({ email, password });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h1 style={styles.title}>Interpose</h1>
        <p style={styles.subtitle}>AI Access Intelligence Platform</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="your@email.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={styles.error} role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {})
            }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>

        <button
          type="button"
          onClick={onDemoMode}
          style={styles.demoButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 0 30px ${theme.colors.accent.magenta}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 0 20px ${theme.colors.accent.magenta}40`;
          }}
        >
          <span style={styles.demoButtonIcon}>🚀</span>
          View Demo
        </button>
        
        <p style={styles.demoDescription}>
          Explore the dashboard with realistic sample data
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: theme.colors.background.primary,
    padding: '20px'
  },
  formCard: {
    background: theme.effects.glassMorphism.background,
    backdropFilter: theme.effects.glassMorphism.backdropFilter,
    border: theme.effects.glassMorphism.border,
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: `0 0 30px ${theme.colors.accent.cyan}33`
  },
  title: {
    color: theme.colors.accent.cyan,
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    textAlign: 'center',
    textShadow: `0 0 10px ${theme.colors.accent.cyan}80`
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: '14px',
    margin: '0 0 32px 0',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: theme.colors.text.primary,
    fontSize: '14px',
    fontWeight: '500'
  },
  input: {
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.accent.cyan}40`,
    borderRadius: '6px',
    color: theme.colors.text.primary,
    fontSize: '14px',
    padding: '12px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  button: {
    background: `linear-gradient(135deg, ${theme.colors.accent.cyan}, ${theme.colors.accent.magenta})`,
    border: 'none',
    borderRadius: '6px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '14px',
    marginTop: '8px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: `0 0 20px ${theme.colors.accent.cyan}40`
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  error: {
    background: `${theme.colors.accent.red}20`,
    border: `1px solid ${theme.colors.accent.red}`,
    borderRadius: '6px',
    color: theme.colors.accent.red,
    fontSize: '14px',
    padding: '12px',
    textAlign: 'center'
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '24px 0',
    height: '1px',
    background: `${theme.colors.accent.cyan}20`
  },
  dividerText: {
    position: 'relative',
    top: '-10px',
    background: theme.effects.glassMorphism.background,
    color: theme.colors.text.secondary,
    fontSize: '12px',
    padding: '0 12px',
    fontWeight: '500'
  },
  demoButton: {
    background: `linear-gradient(135deg, ${theme.colors.accent.magenta}, ${theme.colors.accent.cyan})`,
    border: `2px solid ${theme.colors.accent.magenta}`,
    borderRadius: '8px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '16px',
    transition: 'all 0.3s ease',
    boxShadow: `0 0 20px ${theme.colors.accent.magenta}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  demoButtonIcon: {
    fontSize: '20px'
  },
  demoDescription: {
    color: theme.colors.text.secondary,
    fontSize: '12px',
    textAlign: 'center',
    margin: '12px 0 0 0',
    fontStyle: 'italic'
  }
};

export default AuthForm;
