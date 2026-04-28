/**
 * Integration Test: Consent Check Flow
 * 
 * Tests the complete user flow:
 * 1. Navigate to consent check page
 * 2. Upload reference image
 * 3. See decision result
 * 
 * Requirements: 4.1, 4.2, 4.3, 8.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContent } from '../../App';
import * as consentService from '../../services/consent-service';

describe('Integration Test: Consent Check Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete consent check flow with ALLOW decision', async () => {
    // Mock the consent check service
    const mockCheckConsent = vi.spyOn(consentService, 'checkConsent');
    mockCheckConsent.mockResolvedValue({
      decision: 'ALLOW',
      reason_code: 'ALLOW_POLICY_PERMITS',
      similarity_score: 0.95,
      likeness_id: 'test-likeness-123',
      timestamp: Date.now(),
    });

    // Render the app starting at the consent check page
    render(
      <MemoryRouter initialEntries={['/consent-check']}>
        <AppContent />
      </MemoryRouter>
    );

    // Step 1: Verify we're on the consent check page
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Check Demo/i })).toBeInTheDocument();
    });

    // Step 2: Upload reference image
    const fileInput = screen.getByLabelText(/File input/i);
    
    // Create mock file
    const mockFile = new File(['image content'], 'reference.jpg', { type: 'image/jpeg' });

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Step 3: Verify loading state appears
    await waitFor(() => {
      expect(screen.getByText(/Checking/i)).toBeInTheDocument();
    });

    // Step 4: Verify decision section appears
    await waitFor(() => {
      expect(screen.getByText(/Consent Decision/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 5: Verify ALLOW badge is displayed
    const badge = screen.getByText('ALLOW');
    expect(badge).toBeInTheDocument();

    // Step 6: Verify decision reason is displayed (formatted)
    expect(screen.getByText(/Allow Policy Permits/i)).toBeInTheDocument();

    // Step 7: Verify similarity score is displayed
    expect(screen.getByText(/95.0%/i)).toBeInTheDocument();

    // Step 8: Verify the consent service was called
    expect(mockCheckConsent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'reference.jpg' }),
      expect.any(String),
      expect.any(String)
    );
  });

  it('should complete consent check flow with DENY decision', async () => {
    // Mock the consent check service with DENY decision
    const mockCheckConsent = vi.spyOn(consentService, 'checkConsent');
    mockCheckConsent.mockResolvedValue({
      decision: 'DENY',
      reason_code: 'DENY_POLICY_VIOLATION',
      similarity_score: 0.92,
      likeness_id: 'test-likeness-456',
      timestamp: Date.now(),
    });

    render(
      <MemoryRouter initialEntries={['/consent-check']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Check Demo/i })).toBeInTheDocument();
    });

    // Upload reference image
    const fileInput = screen.getByLabelText(/File input/i);
    const mockFile = new File(['image content'], 'reference.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Verify decision section appears
    await waitFor(() => {
      expect(screen.getByText(/Consent Decision/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify DENY badge is displayed
    const badge = screen.getByText('DENY');
    expect(badge).toBeInTheDocument();

    // Verify decision reason is displayed
    expect(screen.getByText(/Deny Policy Violation/i)).toBeInTheDocument();

    // Verify similarity score is displayed
    expect(screen.getByText(/92.0%/i)).toBeInTheDocument();
  });

  it('should complete consent check flow with UNKNOWN decision', async () => {
    // Mock the consent check service with UNKNOWN decision
    const mockCheckConsent = vi.spyOn(consentService, 'checkConsent');
    mockCheckConsent.mockResolvedValue({
      decision: 'UNKNOWN',
      reason_code: 'UNKNOWN_NO_MATCH',
      timestamp: Date.now(),
    });

    render(
      <MemoryRouter initialEntries={['/consent-check']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Check Demo/i })).toBeInTheDocument();
    });

    // Upload reference image
    const fileInput = screen.getByLabelText(/File input/i);
    const mockFile = new File(['image content'], 'unknown-person.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Verify decision section appears
    await waitFor(() => {
      expect(screen.getByText(/Consent Decision/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify UNKNOWN badge is displayed
    const badge = screen.getByText('UNKNOWN');
    expect(badge).toBeInTheDocument();

    // Verify decision reason is displayed
    expect(screen.getByText(/Unknown No Match/i)).toBeInTheDocument();
  });

  it('should handle consent check errors gracefully', async () => {
    // Mock the consent check service to fail
    const mockCheckConsent = vi.spyOn(consentService, 'checkConsent');
    mockCheckConsent.mockRejectedValue({
      type: 'network',
      message: 'Unable to connect to consent check service',
    });

    render(
      <MemoryRouter initialEntries={['/consent-check']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Check Demo/i })).toBeInTheDocument();
    });

    // Upload reference image
    const fileInput = screen.getByLabelText(/File input/i);
    const mockFile = new File(['image content'], 'reference.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Unable to connect to consent check service/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should validate image format before submission', async () => {
    render(
      <MemoryRouter initialEntries={['/consent-check']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Check Demo/i })).toBeInTheDocument();
    });

    // Try to upload invalid file format
    const fileInput = screen.getByLabelText(/File input/i);
    const mockFile = new File(['document content'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Verify validation error appears
    await waitFor(() => {
      expect(screen.getByText(/Invalid file format/i)).toBeInTheDocument();
    });
  });
});
