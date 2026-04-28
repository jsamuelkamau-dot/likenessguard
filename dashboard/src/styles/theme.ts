/**
 * Interpose Dashboard Theme Configuration
 * Deep dark cyberpunk theme with glassmorphism effects and risk-based glow animations
 */

export const theme = {
  colors: {
    background: {
      primary: '#0a0e1a',    // Deep space black
      secondary: '#131720',   // Dark slate
      tertiary: '#1a1f2e'     // Midnight blue
    },
    accent: {
      cyan: '#00d9ff',        // Primary accent
      magenta: '#ff00ff',     // Secondary accent
      green: '#00ffaa',       // Success/low risk
      yellow: '#ffd700',      // Warning/medium risk
      red: '#ff0055'          // Danger/high risk
    },
    text: {
      primary: '#ffffff',
      secondary: '#a0a0a0',
      muted: '#606060'
    }
  },
  effects: {
    glassMorphism: {
      background: 'rgba(26, 31, 46, 0.6)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 217, 255, 0.2)'
    },
    glow: {
      low: '0 0 10px rgba(0, 255, 170, 0.5)',
      medium: '0 0 10px rgba(255, 215, 0, 0.5)',
      high: '0 0 20px rgba(255, 0, 85, 0.8)'
    }
  },
  riskLevels: {
    low: {
      threshold: { min: 0, max: 30 },
      color: '#00ffaa',
      glow: '0 0 10px rgba(0, 255, 170, 0.5)'
    },
    medium: {
      threshold: { min: 31, max: 70 },
      color: '#ffd700',
      glow: '0 0 10px rgba(255, 215, 0, 0.5)'
    },
    high: {
      threshold: { min: 71, max: 100 },
      color: '#ff0055',
      glow: '0 0 20px rgba(255, 0, 85, 0.8)'
    }
  }
};

/**
 * Get risk level configuration based on risk score
 */
export const getRiskLevel = (score: number): 'low' | 'medium' | 'high' => {
  if (score <= 30) return 'low';
  if (score <= 70) return 'medium';
  return 'high';
};

/**
 * Get color for risk score
 */
export const getRiskColor = (score: number): string => {
  const level = getRiskLevel(score);
  return theme.riskLevels[level].color;
};

/**
 * Get glow effect for risk score
 */
export const getRiskGlow = (score: number): string => {
  const level = getRiskLevel(score);
  return theme.riskLevels[level].glow;
};

export default theme;
