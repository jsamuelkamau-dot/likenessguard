import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import styles from './Sidebar.module.css';

describe('Sidebar', () => {
  const renderWithRouter = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar />
      </MemoryRouter>
    );
  };

  it('renders all navigation items', () => {
    renderWithRouter();

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Registration')).toBeInTheDocument();
    expect(screen.getByText('Consent Policy')).toBeInTheDocument();
    expect(screen.getByText('Consent Check')).toBeInTheDocument();
    expect(screen.getByText('Activity Logs')).toBeInTheDocument();
    expect(screen.getByText('Violations')).toBeInTheDocument();
  });

  it('highlights the active navigation item', () => {
    renderWithRouter('/registration');

    const registrationLink = screen.getByText('Registration').closest('a');
    expect(registrationLink).toHaveClass(styles.active);
  });

  it('renders navigation links with correct paths', () => {
    renderWithRouter();

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');

    const registrationLink = screen.getByText('Registration').closest('a');
    expect(registrationLink).toHaveAttribute('href', '/registration');

    const consentPolicyLink = screen.getByText('Consent Policy').closest('a');
    expect(consentPolicyLink).toHaveAttribute('href', '/consent-policy');

    const consentCheckLink = screen.getByText('Consent Check').closest('a');
    expect(consentCheckLink).toHaveAttribute('href', '/consent-check');

    const activityLogsLink = screen.getByText('Activity Logs').closest('a');
    expect(activityLogsLink).toHaveAttribute('href', '/activity-logs');

    const violationsLink = screen.getByText('Violations').closest('a');
    expect(violationsLink).toHaveAttribute('href', '/violations');
  });

  it('renders hamburger menu button', () => {
    renderWithRouter();

    const hamburger = screen.getByLabelText('Toggle navigation menu');
    expect(hamburger).toBeInTheDocument();
  });

  it('toggles mobile menu when hamburger is clicked', () => {
    renderWithRouter();

    const hamburger = screen.getByLabelText('Toggle navigation menu');
    const sidebar = screen.getByRole('navigation');

    // Initially closed
    expect(sidebar).not.toHaveClass(styles.open);

    // Click to open
    fireEvent.click(hamburger);
    expect(sidebar).toHaveClass(styles.open);

    // Click to close
    fireEvent.click(hamburger);
    expect(sidebar).not.toHaveClass(styles.open);
  });

  it('closes mobile menu when overlay is clicked', () => {
    renderWithRouter();

    const hamburger = screen.getByLabelText('Toggle navigation menu');
    
    // Open menu
    fireEvent.click(hamburger);
    
    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass(styles.open);

    // Click overlay
    const overlay = document.querySelector('[aria-hidden="true"]');
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(sidebar).not.toHaveClass(styles.open);
  });

  it('closes mobile menu after navigation link is clicked', () => {
    renderWithRouter();

    const hamburger = screen.getByLabelText('Toggle navigation menu');
    
    // Open menu
    fireEvent.click(hamburger);
    
    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass(styles.open);

    // Click a navigation link
    const registrationLink = screen.getByText('Registration');
    fireEvent.click(registrationLink);

    // Menu should close
    expect(sidebar).not.toHaveClass(styles.open);
  });

  it('sets aria-current on active page', () => {
    renderWithRouter('/consent-check');

    const consentCheckLink = screen.getByText('Consent Check').closest('a');
    expect(consentCheckLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current on inactive pages', () => {
    renderWithRouter('/consent-check');

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).not.toHaveAttribute('aria-current');
  });

  it('renders LikenessGuard logo', () => {
    renderWithRouter();

    expect(screen.getByText('LikenessGuard')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(
      <BrowserRouter>
        <Sidebar className="custom-class" />
      </BrowserRouter>
    );

    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass('custom-class');
  });

  it('has proper ARIA labels for accessibility', () => {
    renderWithRouter();

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');

    const hamburger = screen.getByLabelText('Toggle navigation menu');
    expect(hamburger).toHaveAttribute('aria-expanded');
  });
});
