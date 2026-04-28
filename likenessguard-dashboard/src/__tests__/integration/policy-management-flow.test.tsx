/**
 * Integration Test: Policy Management Flow
 * 
 * Tests the complete user flow:
 * 1. Navigate to consent policy page
 * 2. Load current policy
 * 3. Update policy settings
 * 4. Save policy
 * 5. Verify update
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 8.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContent } from '../../App';
import * as consentService from '../../services/consent-service';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Integration Test: Policy Management Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should complete policy management flow successfully', async () => {
    // Set likeness ID in localStorage
    localStorageMock.setItem('likenessId', 'test-likeness-123');

    // Mock initial policy load
    const mockGetPolicy = vi.spyOn(consentService, 'getPolicy');
    mockGetPolicy.mockResolvedValue({
      likeness_id: 'test-likeness-123',
      consent_policy: {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      },
      user_metadata: {
        user_id: 'test-user-123',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    // Mock policy update
    const mockUpdatePolicy = vi.spyOn(consentService, 'updatePolicy');
    mockUpdatePolicy.mockResolvedValue({
      likeness_id: 'test-likeness-123',
      status: 'SUCCESS',
      message: 'Policy updated successfully',
      modified_at: Date.now(),
    });

    // Render the app starting at the consent policy page
    render(
      <MemoryRouter initialEntries={['/consent-policy']}>
        <AppContent />
      </MemoryRouter>
    );

    // Step 1: Verify we're on the consent policy page
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Policy Management/i })).toBeInTheDocument();
    });

    // Step 2: Verify initial policy is loaded
    await waitFor(() => {
      expect(mockGetPolicy).toHaveBeenCalled();
    });

    // Step 3: Wait for policy to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Allow Self Edits/i)).toBeInTheDocument();
    });

    // Step 4: Toggle a policy setting (deny third party edits)
    const thirdPartyToggle = screen.getByLabelText(/Deny Third Party Edits/i);
    fireEvent.click(thirdPartyToggle);

    // Step 5: Save the policy
    const saveButton = screen.getByRole('button', { name: /Save Policy/i });
    fireEvent.click(saveButton);

    // Step 6: Verify button is in loading state
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save Policy/i });
      expect(saveButton).toBeDisabled();
    });

    // Step 7: Verify success message appears
    await waitFor(() => {
      expect(screen.getByText(/Policy updated successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 8: Verify the update service was called with correct parameters
    expect(mockUpdatePolicy).toHaveBeenCalledWith(
      'test-likeness-123',
      expect.objectContaining({
        allow_self_edits: true,
        deny_third_party_edits: false, // This was toggled
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      })
    );
  });

  it('should handle policy update errors gracefully', async () => {
    // Set likeness ID in localStorage
    localStorageMock.setItem('likenessId', 'test-likeness-456');

    // Mock initial policy load
    const mockGetPolicy = vi.spyOn(consentService, 'getPolicy');
    mockGetPolicy.mockResolvedValue({
      likeness_id: 'test-likeness-456',
      consent_policy: {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      },
      user_metadata: {
        user_id: 'test-user-456',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    // Mock policy update to fail
    const mockUpdatePolicy = vi.spyOn(consentService, 'updatePolicy');
    mockUpdatePolicy.mockRejectedValue({
      type: 'server',
      message: 'Failed to update policy',
    });

    render(
      <MemoryRouter initialEntries={['/consent-policy']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Policy Management/i })).toBeInTheDocument();
    });

    // Wait for policy to load
    await waitFor(() => {
      expect(screen.getByText(/Allow Self Edits/i)).toBeInTheDocument();
    });

    // Toggle a setting
    const thirdPartyToggle = screen.getByLabelText(/Deny Third Party Edits/i);
    fireEvent.click(thirdPartyToggle);

    // Try to save
    const saveButton = screen.getByRole('button', { name: /Save Policy/i });
    fireEvent.click(saveButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Failed to update policy/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle policy revocation flow', async () => {
    // Set likeness ID in localStorage
    localStorageMock.setItem('likenessId', 'test-likeness-789');

    // Mock initial policy load
    const mockGetPolicy = vi.spyOn(consentService, 'getPolicy');
    mockGetPolicy.mockResolvedValue({
      likeness_id: 'test-likeness-789',
      consent_policy: {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      },
      user_metadata: {
        user_id: 'test-user-789',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    // Mock policy revocation
    const mockRevokeConsent = vi.spyOn(consentService, 'revokeConsent');
    mockRevokeConsent.mockResolvedValue({
      likeness_id: 'test-likeness-789',
      status: 'SUCCESS',
      message: 'Consent revoked successfully',
      revoked_at: Date.now(),
    });

    render(
      <MemoryRouter initialEntries={['/consent-policy']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Policy Management/i })).toBeInTheDocument();
    });

    // Wait for policy to load
    await waitFor(() => {
      expect(screen.getByText(/Allow Self Edits/i)).toBeInTheDocument();
    });

    // Click revoke button
    const revokeButton = screen.getByRole('button', { name: /Revoke Consent/i });
    fireEvent.click(revokeButton);

    // Confirm revocation in dialog
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Yes, Revoke Consent/i });
    fireEvent.click(confirmButton);

    // Verify success message appears
    await waitFor(() => {
      expect(screen.getByText(/Consent revoked successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify the revoke service was called
    expect(mockRevokeConsent).toHaveBeenCalledWith('test-likeness-789');
  });

  it('should load policy on page mount', async () => {
    // Set likeness ID in localStorage
    localStorageMock.setItem('likenessId', 'test-likeness-load');

    // Mock initial policy load
    const mockGetPolicy = vi.spyOn(consentService, 'getPolicy');
    mockGetPolicy.mockResolvedValue({
      likeness_id: 'test-likeness-load',
      consent_policy: {
        allow_self_edits: false,
        deny_third_party_edits: false,
        deny_face_swaps: false,
        deny_sexualized_content: false,
        deny_impersonation: false,
        deny_political_use: false,
      },
      user_metadata: {
        user_id: 'test-user-load',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    render(
      <MemoryRouter initialEntries={['/consent-policy']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Policy Management/i })).toBeInTheDocument();
    });

    // Verify policy was fetched
    expect(mockGetPolicy).toHaveBeenCalled();

    // Verify all policy toggles are displayed
    await waitFor(() => {
      expect(screen.getByText(/Allow Self Edits/i)).toBeInTheDocument();
      expect(screen.getByText(/Deny Third Party Edits/i)).toBeInTheDocument();
      expect(screen.getByText(/Deny Face Swaps/i)).toBeInTheDocument();
      expect(screen.getByText(/Deny Sexualized Content/i)).toBeInTheDocument();
      expect(screen.getByText(/Deny Impersonation/i)).toBeInTheDocument();
      expect(screen.getByText(/Deny Political Use/i)).toBeInTheDocument();
    });
  });

  it('should handle policy load errors', async () => {
    // Set likeness ID in localStorage
    localStorageMock.setItem('likenessId', 'test-likeness-error');

    // Mock policy load to fail
    const mockGetPolicy = vi.spyOn(consentService, 'getPolicy');
    mockGetPolicy.mockRejectedValue({
      type: 'network',
      message: 'Unable to load policy',
    });

    render(
      <MemoryRouter initialEntries={['/consent-policy']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Consent Policy Management/i })).toBeInTheDocument();
    });

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Unable to load policy/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

