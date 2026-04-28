import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsentCheck } from './ConsentCheck';
import * as consentService from '../services/consent-service';
import { Decision, UsageType } from '../types/api-types';

// Mock the consent service
vi.mock('../services/consent-service');

const mockCheckConsent = consentService.checkConsent as ReturnType<typeof vi.fn>;

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ConsentCheck Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page with title and description', () => {
    renderWithRouter(<ConsentCheck />);

    expect(screen.getByText('Consent Check Demo')).toBeInTheDocument();
    expect(
      screen.getByText(/Upload a reference image to check if it matches a registered likeness/)
    ).toBeInTheDocument();
  });

  it('renders configuration fields for usage type and requester ID', () => {
    renderWithRouter(<ConsentCheck />);

    expect(screen.getByLabelText('Usage Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Requester ID')).toBeInTheDocument();
  });

  it('renders ReferenceImageUpload component', () => {
    renderWithRouter(<ConsentCheck />);

    expect(screen.getByText('Upload Reference Image')).toBeInTheDocument();
    expect(screen.getByLabelText(/Upload reference image for consent check/)).toBeInTheDocument();
  });

  it('renders placeholder when no result is available', () => {
    renderWithRouter(<ConsentCheck />);

    expect(screen.getByText('Upload an image to see the consent decision')).toBeInTheDocument();
    expect(
      screen.getByText(/The system will check if the image matches a registered likeness/)
    ).toBeInTheDocument();
  });

  it('displays decision when consent check succeeds', async () => {
    const mockResult = {
      decision: 'ALLOW' as Decision,
      reason_code: 'ALLOW_POLICY_PERMITS' as any,
      timestamp: Date.now() / 1000,
      likeness_id: 'test-likeness-123',
      similarity_score: 0.95,
    };

    vi.mocked(mockCheckConsent).mockResolvedValueOnce(mockResult);

    renderWithRouter(<ConsentCheck />);

    // Simulate file upload
    const fileInput = screen.getByLabelText('File input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for the consent check to complete
    await waitFor(() => {
      expect(screen.getByText('Consent Decision')).toBeInTheDocument();
    });

    // Verify DecisionDisplay is rendered with result
    expect(screen.getByText('Decision')).toBeInTheDocument();
  });

  it('displays error when consent check fails', async () => {
    const errorMessage = 'Failed to check consent';
    vi.mocked(mockCheckConsent).mockRejectedValueOnce(new Error(errorMessage));

    renderWithRouter(<ConsentCheck />);

    // Simulate file upload
    const fileInput = screen.getByLabelText('File input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Verify retry button is present
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('allows changing usage type', () => {
    renderWithRouter(<ConsentCheck />);

    const usageTypeSelect = screen.getByLabelText('Usage Type') as HTMLSelectElement;

    expect(usageTypeSelect.value).toBe(UsageType.GENERAL_GENERATION);

    fireEvent.change(usageTypeSelect, { target: { value: UsageType.FACE_SWAP } });

    expect(usageTypeSelect.value).toBe(UsageType.FACE_SWAP);
  });

  it('allows changing requester ID', () => {
    renderWithRouter(<ConsentCheck />);

    const requesterIdInput = screen.getByLabelText('Requester ID') as HTMLInputElement;

    expect(requesterIdInput.value).toBe('demo-requester');

    fireEvent.change(requesterIdInput, { target: { value: 'new-requester' } });

    expect(requesterIdInput.value).toBe('new-requester');
  });

  it('passes correct parameters to checkConsent', async () => {
    const mockResult = {
      decision: 'DENY' as Decision,
      reason_code: 'DENY_POLICY_VIOLATION' as any,
      timestamp: Date.now() / 1000,
    };

    vi.mocked(mockCheckConsent).mockResolvedValueOnce(mockResult);

    renderWithRouter(<ConsentCheck />);

    // Change usage type and requester ID
    const usageTypeSelect = screen.getByLabelText('Usage Type');
    const requesterIdInput = screen.getByLabelText('Requester ID');

    fireEvent.change(usageTypeSelect, { target: { value: UsageType.FACE_SWAP } });
    fireEvent.change(requesterIdInput, { target: { value: 'test-requester' } });

    // Simulate file upload
    const fileInput = screen.getByLabelText('File input');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify checkConsent was called with correct parameters
    await waitFor(() => {
      expect(mockCheckConsent).toHaveBeenCalledWith(
        file,
        UsageType.FACE_SWAP,
        'test-requester'
      );
    });
  });
});

