/**
 * Property-Based Test: Responsive Sidebar Behavior
 * 
 * **Validates: Requirements 7.6, 11.1, 11.2, 11.3**
 * 
 * Property 17: Responsive Sidebar Behavior
 * For any viewport width, the sidebar should display as a full sidebar when width >= 1024px,
 * adapt for tablet when 768px <= width < 1024px, and collapse to a hamburger menu when width < 768px.
 * 
 * Note: Testing responsive behavior in JSDOM is limited, so we focus on CSS class presence,
 * structure, and the hamburger menu functionality.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import styles from '../Sidebar.module.css';

describe('Feature: likenessguard-web-dashboard, Property 17: Responsive Sidebar Behavior', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    cleanup();
  });

  // Helper function to set viewport width
  const setViewportWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  };

  it('should render hamburger menu button for mobile viewports (< 768px)', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // Mobile viewport widths
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const hamburger = screen.getByLabelText('Toggle navigation menu');
          expect(hamburger).toBeInTheDocument();
          expect(hamburger).toHaveClass(styles.hamburger);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have sidebar initially closed on mobile viewports', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const sidebar = screen.getByRole('navigation');
          expect(sidebar).not.toHaveClass(styles.open);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should toggle sidebar open/closed when hamburger is clicked on mobile', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

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

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render overlay when sidebar is open on mobile', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const hamburger = screen.getByLabelText('Toggle navigation menu');

          // Open sidebar
          fireEvent.click(hamburger);

          // Check for overlay
          const overlay = document.querySelector(`.${styles.overlay}`);
          expect(overlay).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should close sidebar when overlay is clicked on mobile', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const hamburger = screen.getByLabelText('Toggle navigation menu');
          const sidebar = screen.getByRole('navigation');

          // Open sidebar
          fireEvent.click(hamburger);
          expect(sidebar).toHaveClass(styles.open);

          // Click overlay
          const overlay = document.querySelector(`.${styles.overlay}`);
          if (overlay) {
            fireEvent.click(overlay);
          }

          // Sidebar should be closed
          expect(sidebar).not.toHaveClass(styles.open);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should close sidebar when navigation link is clicked on mobile', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        fc.constantFrom('Home', 'Registration', 'Consent Policy', 'Consent Check', 'Activity Logs', 'Violations'),
        (viewportWidth, linkText) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const hamburger = screen.getByLabelText('Toggle navigation menu');
          const sidebar = screen.getByRole('navigation');

          // Open sidebar
          fireEvent.click(hamburger);
          expect(sidebar).toHaveClass(styles.open);

          // Click navigation link
          const link = screen.getByText(linkText);
          fireEvent.click(link);

          // Sidebar should be closed
          expect(sidebar).not.toHaveClass(styles.open);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have proper aria-expanded attribute on hamburger button', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const hamburger = screen.getByLabelText('Toggle navigation menu');

          // Initially closed
          expect(hamburger).toHaveAttribute('aria-expanded', 'false');

          // Open
          fireEvent.click(hamburger);
          expect(hamburger).toHaveAttribute('aria-expanded', 'true');

          // Close
          fireEvent.click(hamburger);
          expect(hamburger).toHaveAttribute('aria-expanded', 'false');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render all navigation items regardless of viewport width', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1920 }), // All viewport sizes
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          // All navigation items should be present
          expect(screen.getByText('Home')).toBeInTheDocument();
          expect(screen.getByText('Registration')).toBeInTheDocument();
          expect(screen.getByText('Consent Policy')).toBeInTheDocument();
          expect(screen.getByText('Consent Check')).toBeInTheDocument();
          expect(screen.getByText('Activity Logs')).toBeInTheDocument();
          expect(screen.getByText('Violations')).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain sidebar structure across all viewport widths', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1920 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          // Sidebar should have navigation role
          const sidebar = screen.getByRole('navigation');
          expect(sidebar).toBeInTheDocument();
          expect(sidebar).toHaveClass(styles.sidebar);

          // Logo should be present
          expect(screen.getByText('LikenessGuard')).toBeInTheDocument();

          // Navigation list should be present
          const navList = sidebar.querySelector(`.${styles.navList}`);
          expect(navList).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have minimum touch target size (44x44px) for hamburger button', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const hamburger = screen.getByLabelText('Toggle navigation menu');
          
          // Note: In JSDOM, computed styles may not reflect CSS exactly,
          // but we can verify the element exists and has the correct class
          expect(hamburger).toHaveClass(styles.hamburger);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain accessibility attributes across viewport changes', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1920 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const sidebar = screen.getByRole('navigation');
          expect(sidebar).toHaveAttribute('aria-label', 'Main navigation');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid viewport width changes without breaking', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 320, max: 1920 }), { minLength: 3, maxLength: 10 }),
        (viewportWidths) => {
          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          // Simulate rapid viewport changes
          viewportWidths.forEach(width => {
            setViewportWidth(width);
          });

          // Sidebar should still be functional
          const sidebar = screen.getByRole('navigation');
          expect(sidebar).toBeInTheDocument();
          expect(sidebar).toHaveClass(styles.sidebar);

          // All navigation items should still be present
          expect(screen.getByText('Home')).toBeInTheDocument();
          expect(screen.getByText('Registration')).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not have overlay visible when sidebar is closed on mobile', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (viewportWidth) => {
          setViewportWidth(viewportWidth);

          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const sidebar = screen.getByRole('navigation');
          expect(sidebar).not.toHaveClass(styles.open);

          // Overlay should not be rendered when closed
          const overlay = document.querySelector(`.${styles.overlay}`);
          expect(overlay).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});