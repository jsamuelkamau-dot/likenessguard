/**
 * LikenessGuard Dashboard Theme Configuration
 * 
 * Futuristic AI cybersecurity color scheme
 */

export const theme = {
  // Primary background colors - dark, deep backgrounds
  backgrounds: {
    primary: '#050B18',
    secondary: '#0B1224',
    tertiary: '#0E1A2F',
    quaternary: '#111F3A',
  },

  // Action colors - vibrant greens for primary actions
  actions: {
    primary: '#62D84E',
    secondary: '#4BC236',
    tertiary: '#7CFF6B',
  },

  // AI accent colors - purple/violet for highlights
  accents: {
    primary: '#7B4CFF',
    secondary: '#A37BFF',
    tertiary: '#2C1D75',
  },

  // Text colors - light to dark for hierarchy
  text: {
    primary: '#E6ECF5',
    secondary: '#A9B4C8',
    tertiary: '#6E7C99',
  },

  // Status colors - for decisions and states
  status: {
    error: '#FF7A45',    // DENY, errors
    success: '#4FA3FF',  // ALLOW, success
    neutral: '#4B556A',  // UNKNOWN, neutral
  },

  // Glow effects - for interactive elements
  glow: {
    green: '#76FF63',
    purple: '#8A63FF',
  },

  // Grid and depth colors - for tables and cards
  depth: {
    grid: '#1B2948',
    deep: '#0A1428',
  },

  // Spacing scale (in pixels)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Typography scale
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"Fira Code", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      xxl: '1.5rem',   // 24px
      xxxl: '2rem',    // 32px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // Breakpoints for responsive design
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  },

  // Border radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(123, 76, 255, 0.5)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
} as const;

export type Theme = typeof theme;
