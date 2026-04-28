// Jest setup file for React Testing Library
import '@testing-library/jest-dom';

// Mock import.meta for Vite environment variables
(global as any).import = {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3000'
    }
  }
};

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// Filter out React act() warnings from console.error
// These are false positives when using @testing-library/user-event
// which already wraps interactions in act() internally
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('inside a test was not wrapped in act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
