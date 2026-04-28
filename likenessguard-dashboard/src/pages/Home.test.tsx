import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home } from './Home';
import * as consentService from '../services/consent-service';
import * as logsService from '../services/logs-service';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const renderHome = () => {
  return render(
    <BrowserRouter>
      <Home />
    </BrowserRouter>
  );
};

describe('Home Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorageMock.getItem.mockClear();
    vi.clearAllMocks();
  });

  it('should display dashboard after loading', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
    });
  });

  it('should display registered likeness count', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Registered Likenesses')).toBeInTheDocument();
    });
  });

  it('should display consent policy status', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Consent Policy')).toBeInTheDocument();
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });
  });

  it('should display recent activity count', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Consent checks in the last 24 hours')).toBeInTheDocument();
    });
  });

  it('should display quick action buttons', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /register likeness/i });
      expect(buttons.length).toBeGreaterThan(0);
      const updateButtons = screen.getAllByRole('button', { name: /update policy/i });
      expect(updateButtons.length).toBeGreaterThan(0);
      const checkButtons = screen.getAllByRole('button', { name: /run check/i });
      expect(checkButtons.length).toBeGreaterThan(0);
    });
  });

  it('should not display violation alert when no violations exist', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      expect(screen.queryByText(/violation detected/i)).not.toBeInTheDocument();
    });
  });

  it('should display empty state for recent checks', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('No recent consent checks')).toBeInTheDocument();
      expect(screen.getByText(/consent check activity will appear here/i)).toBeInTheDocument();
    });
  });

  it('should display getting started section when no likenesses registered', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Register Your Likeness')).toBeInTheDocument();
      expect(screen.getByText('Configure Consent Policy')).toBeInTheDocument();
      expect(screen.getByText('Test Consent Checks')).toBeInTheDocument();
    });
  });

  it('should fetch data when likeness ID exists', async () => {
    const mockLikenessId = 'test-likeness-123';
    localStorageMock.getItem.mockReturnValue(mockLikenessId);

    const getPolicySpy = vi.spyOn(consentService, 'getPolicy').mockResolvedValue({
      likeness_id: mockLikenessId,
      consent_policy: {
        allow_self_edits: true,
        deny_third_party_edits: true,
        deny_face_swaps: true,
        deny_sexualized_content: true,
        deny_impersonation: true,
        deny_political_use: true,
      },
      user_metadata: {
        user_id: 'user-123',
        registration_source: 'dashboard',
      },
      created_at: Date.now() / 1000,
      modified_at: Date.now() / 1000,
    });

    const getActivityLogsSpy = vi.spyOn(logsService, 'getActivityLogs').mockResolvedValue({
      likeness_id: mockLikenessId,
      evidence_records: [],
      count: 0,
    });

    const getViolationsSpy = vi.spyOn(logsService, 'getViolations').mockResolvedValue({
      likeness_id: mockLikenessId,
      violations: [],
      count: 0,
    });

    renderHome();

    await waitFor(() => {
      expect(getPolicySpy).toHaveBeenCalledWith(mockLikenessId);
      expect(getActivityLogsSpy).toHaveBeenCalledWith(mockLikenessId, 10);
      expect(getViolationsSpy).toHaveBeenCalledWith(mockLikenessId, 50);
    });

    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });
  });
});