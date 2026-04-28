import { useState, useEffect } from 'react';
import { LoginCredentials, AuthResponse } from '../types';
import { login as apiLogin } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  apiKey: string | null;
  customerId: string | null;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    apiKey: null,
    customerId: null,
    error: null
  });

  // Check localStorage for existing API key on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('interpose_api_key');
    const storedCustomerId = localStorage.getItem('interpose_customer_id');
    
    if (storedApiKey && storedCustomerId) {
      setAuthState({
        isAuthenticated: true,
        apiKey: storedApiKey,
        customerId: storedCustomerId,
        error: null
      });
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      
      const response: AuthResponse = await apiLogin(credentials);
      
      // Store in localStorage
      localStorage.setItem('interpose_api_key', response.api_key);
      localStorage.setItem('interpose_customer_id', response.customer_id);
      
      setAuthState({
        isAuthenticated: true,
        apiKey: response.api_key,
        customerId: response.customer_id,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Invalid email or password';
      setAuthState(prev => ({
        ...prev,
        error: errorMessage
      }));
      throw error;
    }
  };

  const logout = (): void => {
    // Clear localStorage
    localStorage.removeItem('interpose_api_key');
    localStorage.removeItem('interpose_customer_id');
    
    setAuthState({
      isAuthenticated: false,
      apiKey: null,
      customerId: null,
      error: null
    });
  };

  return {
    isAuthenticated: authState.isAuthenticated,
    apiKey: authState.apiKey,
    customerId: authState.customerId,
    error: authState.error,
    login,
    logout
  };
};

export default useAuth;
