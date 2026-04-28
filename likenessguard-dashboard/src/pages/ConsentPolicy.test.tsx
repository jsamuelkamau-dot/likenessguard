import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConsentPolicyPage } from './ConsentPolicy';
import * as consentService from '../services/consent-service';
import type { ConsentPolicy as ConsentPolicyType } from '../types/api-types';

// Mock the consent service
vi.mock('../services/consent-service');

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

const mockPolicy: ConsentPolicyType = {
  allow_self_edits: true,
  deny_third_party_edits: true,
  deny_face_swaps: true,
  deny_sexualized_content: true,
  deny_impersonation: true,
  deny_political_use: false,
};

describe('ConsentPolicy Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderConsentPolicy = () => {
    return render(
      <BrowserRouter>
        <ConsentPolicyPage />
      </BrowserRouter>
    );
  };

  it('should render loading state initially', () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderConsentPolicy();

    expect(screen.getByText(/loading consent policy/i)).toBeInTheDocument();
  });

  it('should display error when no likeness ID is found', async () => {
    // No likeness ID in localStorage
    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getByText(/no registered likeness found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/please register your likeness before managing consent policies/i)).toBeInTheDocument();
  });

  it('should fetch and display current policy on page load', async () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockResolvedValue({
      consent_policy: mockPolicy,
      likeness_id: 'test-likeness-123',
      user_metadata: {
        user_id: 'test-user-123',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getByText(/allow self edits/i)).toBeInTheDocument();
    });

    expect(consentService.getPolicy).toHaveBeenCalledWith('test-likeness-123');
  });

  it('should use default policy when policy fetch fails with not found error', async () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockRejectedValue({
      type: 'validation',
      message: 'Policy not found',
    });

    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getByText(/allow self edits/i)).toBeInTheDocument();
    });
  });

  it('should display error when policy fetch fails with server error', async () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockRejectedValue({
      type: 'server',
      message: 'Server error occurred',
      details: 'Internal server error',
    });

    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
  });

  it('should display intro text explaining consent policy', async () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockResolvedValue({
      consent_policy: mockPolicy,
      likeness_id: 'test-likeness-123',
      user_metadata: {
        user_id: 'test-user-123',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getAllByText(/control how your likeness can be used in ai-generated content/i)[0]).toBeInTheDocument();
    });
  });

  it('should integrate PolicyForm component', async () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockResolvedValue({
      consent_policy: mockPolicy,
      likeness_id: 'test-likeness-123',
      user_metadata: {
        user_id: 'test-user-123',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getByText(/allow self edits/i)).toBeInTheDocument();
    });

    // Check that PolicyForm elements are present
    expect(screen.getByText(/deny third party edits/i)).toBeInTheDocument();
    expect(screen.getByText(/deny face swaps/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save policy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke consent/i })).toBeInTheDocument();
  });

  it('should apply page layout and styling', async () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockResolvedValue({
      consent_policy: mockPolicy,
      likeness_id: 'test-likeness-123',
      user_metadata: {
        user_id: 'test-user-123',
        registration_source: 'dashboard',
      },
      created_at: Date.now(),
      modified_at: Date.now(),
    });

    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getByText('Consent Policy Management')).toBeInTheDocument();
    });

    // Check that intro text is present (verifies page structure)
    expect(screen.getAllByText(/control how your likeness can be used in ai-generated content/i)[0]).toBeInTheDocument();
  });

  it('should handle retry on error', async () => {
    localStorageMock.setItem('likenessId', 'test-likeness-123');
    vi.mocked(consentService.getPolicy).mockRejectedValue({
      type: 'network',
      message: 'Network error',
    });

    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    renderConsentPolicy();

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    // The button text is "Try Again" not "Retry"
    const retryButton = screen.getByRole('button', { name: /try again/i });
    retryButton.click();

    expect(reloadMock).toHaveBeenCalled();
  });
});

