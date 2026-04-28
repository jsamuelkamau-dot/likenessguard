import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationForm } from './RegistrationForm';
import * as registrationService from '../../services/registration-service';

vi.mock('../../services/registration-service');

const createMockFiles = (count: number): File[] => {
  return Array.from({ length: count }, (_, i) => 
    new File(['mock-image-content'], `photo${i + 1}.jpg`, { type: 'image/jpeg' })
  );
};

const simulatePhotoUpload = (files: File[]) => {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput) {
    fireEvent.change(fileInput, { target: { files } });
  }
};

describe('RegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(registrationService.validateImageFiles).mockReturnValue({ valid: true, errors: [] });
  });

  it('renders the form with all required fields', () => {
    render(<RegistrationForm />);
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/upload photos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/consent policy/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register likeness/i })).toBeInTheDocument();
  });

  it('displays validation error when user ID is empty', async () => {
    render(<RegistrationForm />);
    const form = screen.getByRole('button', { name: /register likeness/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    await waitFor(() => {
      expect(screen.getByText(/user id is required/i)).toBeInTheDocument();
    });
  });

  it('displays validation error when user ID is too short', async () => {
    render(<RegistrationForm />);
    const userIdInput = screen.getByLabelText(/user id/i);
    fireEvent.change(userIdInput, { target: { value: 'ab' } });
    const form = screen.getByRole('button', { name: /register likeness/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    await waitFor(() => {
      expect(screen.getAllByText(/user id must be at least 3 characters/i)[0]).toBeInTheDocument();
    });
  });

  it('displays validation error when no photos are uploaded', async () => {
    render(<RegistrationForm />);
    const userIdInput = screen.getByLabelText(/user id/i);
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const form = screen.getByRole('button', { name: /register likeness/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    await waitFor(() => {
      expect(screen.getByText(/please upload at least 5 photos/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email', async () => {
    render(<RegistrationForm />);
    const userIdInput = screen.getByLabelText(/user id/i);
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const mockFiles = createMockFiles(5);
    simulatePhotoUpload(mockFiles);
    await waitFor(() => {
      expect(screen.getByText(/selected images/i)).toBeInTheDocument();
    });
    
    const form = screen.getByRole('button', { name: /register likeness/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback when registration succeeds', async () => {
    const mockResponse = {
      likeness_id: 'test-likeness-123',
      status: 'SUCCESS' as const,
      processed_photos: 5,
    };
    vi.mocked(registrationService.registerLikeness).mockResolvedValue(mockResponse);
    const onSuccess = vi.fn();
    render(<RegistrationForm onSuccess={onSuccess} />);
    const userIdInput = screen.getByLabelText(/user id/i);
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const mockFiles = createMockFiles(5);
    simulatePhotoUpload(mockFiles);
    const submitButton = screen.getByRole('button', { name: /register likeness/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('test-likeness-123');
    });
  });

  it('displays success message with likeness ID after successful registration', async () => {
    const mockResponse = {
      likeness_id: 'test-likeness-123',
      status: 'SUCCESS' as const,
      processed_photos: 5,
    };
    vi.mocked(registrationService.registerLikeness).mockResolvedValue(mockResponse);
    render(<RegistrationForm />);
    const userIdInput = screen.getByLabelText(/user id/i);
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const mockFiles = createMockFiles(5);
    simulatePhotoUpload(mockFiles);
    const submitButton = screen.getByRole('button', { name: /register likeness/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      expect(screen.getAllByText(/test-likeness-123/i)[0]).toBeInTheDocument();
    });
  });

  it('displays error message when registration fails', async () => {
    const mockError = new Error('Registration failed');
    vi.mocked(registrationService.registerLikeness).mockRejectedValue(mockError);
    const onError = vi.fn();
    render(<RegistrationForm onError={onError} />);
    const userIdInput = screen.getByLabelText(/user id/i);
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const mockFiles = createMockFiles(5);
    simulatePhotoUpload(mockFiles);
    const submitButton = screen.getByRole('button', { name: /register likeness/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Registration failed');
    });
  });

  it('disables form inputs during submission', async () => {
    vi.mocked(registrationService.registerLikeness).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<RegistrationForm />);
    const userIdInput = screen.getByLabelText(/user id/i) as HTMLInputElement;
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const mockFiles = createMockFiles(5);
    simulatePhotoUpload(mockFiles);
    const submitButton = screen.getByRole('button', { name: /register likeness/i }) as HTMLButtonElement;
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(userIdInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
    });
  });

  it('shows loading state during submission', async () => {
    vi.mocked(registrationService.registerLikeness).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<RegistrationForm />);
    const userIdInput = screen.getByLabelText(/user id/i);
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const mockFiles = createMockFiles(5);
    simulatePhotoUpload(mockFiles);
    const submitButton = screen.getByRole('button', { name: /register likeness/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/processing your photos/i)).toBeInTheDocument();
    });
  });

  it('resets form after successful registration', async () => {
    const mockResponse = {
      likeness_id: 'test-likeness-123',
      status: 'SUCCESS' as const,
      processed_photos: 5,
    };
    vi.mocked(registrationService.registerLikeness).mockResolvedValue(mockResponse);
    render(<RegistrationForm />);
    const userIdInput = screen.getByLabelText(/user id/i) as HTMLInputElement;
    fireEvent.change(userIdInput, { target: { value: 'testuser123' } });
    const mockFiles = createMockFiles(5);
    simulatePhotoUpload(mockFiles);
    const submitButton = screen.getByRole('button', { name: /register likeness/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });
    expect(userIdInput.value).toBe('');
  });
});

