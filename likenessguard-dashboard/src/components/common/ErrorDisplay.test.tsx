import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from './ErrorDisplay';

describe('ErrorDisplay Component', () => {
  describe('Rendering', () => {
    it('should render with error message', () => {
      render(
        <ErrorDisplay
          type="network"
          message="Connection failed"
        />
      );
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should render error icon', () => {
      const { container } = render(
        <ErrorDisplay type="network" message="Error" />
      );
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Error Types', () => {
    it('should display "Connection Error" title for network type', () => {
      render(<ErrorDisplay type="network" message="Network issue" />);
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    it('should display "Validation Error" title for validation type', () => {
      render(<ErrorDisplay type="validation" message="Invalid input" />);
      expect(screen.getByText('Validation Error')).toBeInTheDocument();
    });

    it('should display "Server Error" title for server type', () => {
      render(<ErrorDisplay type="server" message="Server issue" />);
      expect(screen.getByText('Server Error')).toBeInTheDocument();
    });

    it('should display "Error" title for unknown type', () => {
      render(<ErrorDisplay type="unknown" message="Unknown issue" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Error Details', () => {
    it('should render string details', () => {
      render(
        <ErrorDisplay
          type="server"
          message="Error occurred"
          details="Additional error information"
        />
      );
      expect(screen.getByText('Additional error information')).toBeInTheDocument();
    });

    it('should render array details as list', () => {
      render(
        <ErrorDisplay
          type="validation"
          message="Validation failed"
          details={['Field 1 is required', 'Field 2 is invalid']}
        />
      );
      expect(screen.getByText('Field 1 is required')).toBeInTheDocument();
      expect(screen.getByText('Field 2 is invalid')).toBeInTheDocument();
    });

    it('should not render details section when details is undefined', () => {
      const { container } = render(
        <ErrorDisplay type="network" message="Error" />
      );
      const detailsSection = container.querySelector('[class*="errorDetails"]');
      expect(detailsSection).not.toBeInTheDocument();
    });

    it('should render list items for array details', () => {
      const { container } = render(
        <ErrorDisplay
          type="validation"
          message="Error"
          details={['Error 1', 'Error 2', 'Error 3']}
        />
      );
      const listItems = container.querySelectorAll('li');
      // ErrorDisplay shows error details + suggestions, so expect at least the error items
      expect(listItems.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Retry Button', () => {
    it('should show retry button for network errors', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorDisplay
          type="network"
          message="Connection failed"
          onRetry={handleRetry}
        />
      );
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should show retry button for server errors', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorDisplay
          type="server"
          message="Server error"
          onRetry={handleRetry}
        />
      );
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should not show retry button for validation errors', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorDisplay
          type="validation"
          message="Validation failed"
          onRetry={handleRetry}
        />
      );
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should not show retry button for unknown errors', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorDisplay
          type="unknown"
          message="Unknown error"
          onRetry={handleRetry}
        />
      );
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should not show retry button when onRetry is not provided', () => {
      render(
        <ErrorDisplay
          type="network"
          message="Connection failed"
        />
      );
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorDisplay
          type="network"
          message="Connection failed"
          onRetry={handleRetry}
        />
      );
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);
      
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('should apply error container class', () => {
      const { container } = render(
        <ErrorDisplay type="network" message="Error" />
      );
      const errorContainer = container.firstChild as HTMLElement;
      expect(errorContainer.className).toContain('errorContainer');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ErrorDisplay
          type="network"
          message="Error"
          className="custom-class"
        />
      );
      const errorContainer = container.firstChild as HTMLElement;
      expect(errorContainer.className).toContain('custom-class');
    });

    it('should preserve base classes when custom className is added', () => {
      const { container } = render(
        <ErrorDisplay
          type="network"
          message="Error"
          className="custom-class"
        />
      );
      const errorContainer = container.firstChild as HTMLElement;
      expect(errorContainer.className).toContain('errorContainer');
      expect(errorContainer.className).toContain('custom-class');
    });
  });

  describe('Theme Error Colors', () => {
    it('should apply theme error color', () => {
      const { container } = render(
        <ErrorDisplay type="network" message="Error" />
      );
      const errorContainer = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(errorContainer);
      
      // Should use error color from theme
      expect(styles.color).toContain('var(--status-error)');
    });
  });

  describe('Field-Specific Errors', () => {
    it('should display multiple field errors for validation type', () => {
      render(
        <ErrorDisplay
          type="validation"
          message="Form validation failed"
          details={[
            'Email is required',
            'Password must be at least 8 characters',
            'Username is already taken'
          ]}
        />
      );
      
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('Username is already taken')).toBeInTheDocument();
    });

    it('should render validation errors in a list', () => {
      const { container } = render(
        <ErrorDisplay
          type="validation"
          message="Validation failed"
          details={['Error 1', 'Error 2']}
        />
      );
      
      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list?.children.length).toBeGreaterThanOrEqual(2);
    });
  });
});
