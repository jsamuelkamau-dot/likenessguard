/**
 * Integration Test: Registration Flow
 * 
 * Tests the complete user flow:
 * 1. Navigate to registration page
 * 2. Upload images
 * 3. Submit registration
 * 4. See success message
 * 
 * Requirements: 2.1, 2.3, 2.4, 8.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContent } from '../../App';
import * as registrationService from '../../services/registration-service';

describe('Integration Test: Registration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full registration flow successfully', async () => {
    // Mock the registration service
    const mockRegisterLikeness = vi.spyOn(registrationService, 'registerLikeness');
    mockRegisterLikeness.mockResolvedValue({
      success: true,
      message: 'Registration successful',
      likeness_id: 'test-likeness-123',
      fingerprint: 'abc123def456',
    });

    // Mock validateImageFiles to return valid
    const mockValidateImageFiles = vi.spyOn(registrationService, 'validateImageFiles');
    mockValidateImageFiles.mockReturnValue({
      valid: true,
      errors: [],
    });

    // Render the app starting at the registration page
    render(
      <MemoryRouter initialEntries={['/registration']}>
        <AppContent />
      </MemoryRouter>
    );

    // Step 1: Verify we're on the registration page
    await waitFor(() => {
      expect(screen.getByText(/Register Your Likeness/i)).toBeInTheDocument();
    });

    // Step 2: Fill in the user ID
    const userIdInput = screen.getByLabelText(/User ID/i);
    fireEvent.change(userIdInput, { target: { value: 'test-user-123' } });

    // Step 3: Upload images (simulate file upload)
    const fileInput = screen.getByLabelText(/File input/i);
    
    // Create mock files
    const mockFiles = Array.from({ length: 5 }, (_, i) => 
      new File(['photo content'], `photo${i+1}.jpg`, { type: 'image/jpeg' })
    );

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: mockFiles,
      writable: false,
    });
    fireEvent.change(fileInput);

    // Wait for files to be processed - look for "Selected Images (5/10)"
    await waitFor(() => {
      expect(screen.getByText(/Selected Images \(5\/10\)/i)).toBeInTheDocument();
    });

    // Step 4: Submit the form
    const submitButton = screen.getByRole('button', { name: /Register Likeness/i });
    fireEvent.click(submitButton);

    // Step 5: Verify loading state appears
    await waitFor(() => {
      expect(screen.getByText(/Registering/i)).toBeInTheDocument();
    });

    // Step 6: Verify success message appears
    await waitFor(() => {
      expect(screen.getByText(/Registration Successful!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 7: Verify likeness ID is displayed - use getAllByText for duplicate text
    const likenessIdElements = screen.getAllByText(/Likeness ID:/i);
    expect(likenessIdElements[0]).toBeInTheDocument();

    // Step 8: Verify the registration service was called
    expect(mockRegisterLikeness).toHaveBeenCalled();
  });

  it('should handle registration errors gracefully', async () => {
    // Mock the registration service to fail
    const mockRegisterLikeness = vi.spyOn(registrationService, 'registerLikeness');
    mockRegisterLikeness.mockRejectedValue({
      type: 'validation',
      message: 'Invalid photo format',
      details: 'Photo 3 is not a valid image format',
    });

    // Mock validateImageFiles to return valid (so we can test API error)
    const mockValidateImageFiles = vi.spyOn(registrationService, 'validateImageFiles');
    mockValidateImageFiles.mockReturnValue({
      valid: true,
      errors: [],
    });

    render(
      <MemoryRouter initialEntries={['/registration']}>
        <AppContent />
      </MemoryRouter>
    );

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/Register Your Likeness/i)).toBeInTheDocument();
    });

    // Fill in user ID
    const userIdInput = screen.getByLabelText(/User ID/i);
    fireEvent.change(userIdInput, { target: { value: 'test-user-456' } });

    // Upload files
    const fileInput = screen.getByLabelText(/File input/i);
    const mockFiles = Array.from({ length: 5 }, (_, i) => 
      new File(['photo content'], `photo${i+1}.jpg`, { type: 'image/jpeg' })
    );
    Object.defineProperty(fileInput, 'files', {
      value: mockFiles,
      writable: false,
    });
    fireEvent.change(fileInput);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Register Likeness/i });
    fireEvent.click(submitButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Invalid photo format/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should validate file count before submission', async () => {
    // Mock validateImageFiles to return invalid
    const mockValidateImageFiles = vi.spyOn(registrationService, 'validateImageFiles');
    mockValidateImageFiles.mockReturnValue({
      valid: false,
      errors: ['At least 5 photos required (provided 2)'],
    });

    render(
      <MemoryRouter initialEntries={['/registration']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Register Your Likeness/i)).toBeInTheDocument();
    });

    // Fill in user ID
    const userIdInput = screen.getByLabelText(/User ID/i);
    fireEvent.change(userIdInput, { target: { value: 'test-user-789' } });

    // Upload only 2 files (insufficient)
    const fileInput = screen.getByLabelText(/File input/i);
    const mockFiles = Array.from({ length: 2 }, (_, i) => 
      new File(['photo content'], `photo${i+1}.jpg`, { type: 'image/jpeg' })
    );
    Object.defineProperty(fileInput, 'files', {
      value: mockFiles,
      writable: false,
    });
    fireEvent.change(fileInput);

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /Register Likeness/i });
    fireEvent.click(submitButton);

    // Verify validation error appears
    await waitFor(() => {
      expect(screen.getByText(/At least 5 photos required/i)).toBeInTheDocument();
    });
  });
});
