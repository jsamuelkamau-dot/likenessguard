import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Registration } from './Registration';

// Mock the RegistrationForm component
vi.mock('../components/registration/RegistrationForm', () => ({
  RegistrationForm: ({ onSuccess, onError }: any) => (
    <div data-testid="registration-form">
      <button onClick={() => onSuccess('test-likeness-id')}>Success</button>
      <button onClick={() => onError('test error')}>Error</button>
    </div>
  ),
}));

describe('Registration Page', () => {
  const renderRegistration = () => {
    return render(
      <BrowserRouter>
        <Registration />
      </BrowserRouter>
    );
  };

  it('should render the page title', () => {
    renderRegistration();
    expect(screen.getByText('Register Your Likeness')).toBeInTheDocument();
  });

  it('should render the intro text', () => {
    renderRegistration();
    expect(
      screen.getByText(/Create a protected likeness fingerprint/)
    ).toBeInTheDocument();
  });

  it('should render the RegistrationForm component', () => {
    renderRegistration();
    expect(screen.getByTestId('registration-form')).toBeInTheDocument();
  });

  it('should store likeness ID in localStorage on success', () => {
    const localStorageMock = {
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    renderRegistration();
    
    const successButton = screen.getByText('Success');
    successButton.click();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'likenessId',
      'test-likeness-id'
    );
  });

  it('should log error to console on error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderRegistration();
    
    const errorButton = screen.getByText('Error');
    errorButton.click();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Registration error:',
      'test error'
    );

    consoleErrorSpy.mockRestore();
  });
});
