/**
 * Unit Tests for Authentication Components
 * Feature: interpose-saas-platform
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../hooks/useAuth';
import { renderHook, act } from '@testing-library/react';
import * as api from '../services/api';

// Mock the API module
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('AuthForm Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test('renders login form with email and password inputs', () => {
    const mockOnLogin = jest.fn();
    const mockOnDemoMode = jest.fn();
    render(<AuthForm onLogin={mockOnLogin} onDemoMode={mockOnDemoMode} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('displays error message when error prop is provided', () => {
    const mockOnLogin = jest.fn();
    const errorMessage = 'Invalid email or password';
    
    render(<AuthForm onLogin={mockOnLogin} onDemoMode={jest.fn()} error={errorMessage} />);

    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
  });

  test('calls onLogin with credentials when form is submitted', async () => {
    const mockOnLogin = jest.fn().mockResolvedValue(undefined);
    render(<AuthForm onLogin={mockOnLogin} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  test('disables submit button while loading', async () => {
    const mockOnLogin = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<AuthForm onLogin={mockOnLogin} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Button should be disabled during loading
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/logging in/i);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('initializes with unauthenticated state when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBeNull();
    expect(result.current.customerId).toBeNull();
  });

  test('initializes with authenticated state when localStorage has valid data', () => {
    localStorageMock.setItem('interpose_api_key', 'test-api-key');
    localStorageMock.setItem('interpose_customer_id', 'test-customer-id');

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.apiKey).toBe('test-api-key');
    expect(result.current.customerId).toBe('test-customer-id');
  });

  test('login function stores credentials in localStorage on success', async () => {
    const mockAuthResponse = {
      api_key: 'new-api-key',
      customer_id: 'new-customer-id'
    };
    mockedApi.login.mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password123' });
    });

    expect(localStorageMock.getItem('interpose_api_key')).toBe('new-api-key');
    expect(localStorageMock.getItem('interpose_customer_id')).toBe('new-customer-id');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.apiKey).toBe('new-api-key');
    expect(result.current.customerId).toBe('new-customer-id');
  });

  test('login function sets error state on failure', async () => {
    const mockError = {
      response: {
        data: {
          error: 'Invalid credentials'
        }
      }
    };
    mockedApi.login.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login({ email: 'test@example.com', password: 'wrong' });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('logout function clears localStorage and resets state', () => {
    localStorageMock.setItem('interpose_api_key', 'test-api-key');
    localStorageMock.setItem('interpose_customer_id', 'test-customer-id');

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(localStorageMock.getItem('interpose_api_key')).toBeNull();
    expect(localStorageMock.getItem('interpose_customer_id')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBeNull();
    expect(result.current.customerId).toBeNull();
  });

  test('login function uses default error message when response has no error field', async () => {
    const mockError = {
      response: {
        data: {}
      }
    };
    mockedApi.login.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login({ email: 'test@example.com', password: 'wrong' });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Invalid email or password');
  });
});

describe('localStorage Persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('API key persists in localStorage after successful login', async () => {
    const mockAuthResponse = {
      api_key: 'persistent-api-key',
      customer_id: 'persistent-customer-id'
    };
    mockedApi.login.mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password123' });
    });

    // Verify localStorage has the values
    expect(localStorageMock.getItem('interpose_api_key')).toBe('persistent-api-key');
    expect(localStorageMock.getItem('interpose_customer_id')).toBe('persistent-customer-id');

    // Create a new hook instance to simulate page reload
    const { result: newResult } = renderHook(() => useAuth());

    // Should be authenticated from localStorage
    expect(newResult.current.isAuthenticated).toBe(true);
    expect(newResult.current.apiKey).toBe('persistent-api-key');
    expect(newResult.current.customerId).toBe('persistent-customer-id');
  });

  test('logout removes all authentication data from localStorage', () => {
    localStorageMock.setItem('interpose_api_key', 'test-key');
    localStorageMock.setItem('interpose_customer_id', 'test-id');

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(localStorageMock.getItem('interpose_api_key')).toBeNull();
    expect(localStorageMock.getItem('interpose_customer_id')).toBeNull();
  });
});

