/**
 * Property-Based Test: Active Navigation Highlighting
 * 
 * **Validates: Requirements 7.4**
 * 
 * Property 13: Active Navigation Highlighting
 * For any current page, the corresponding navigation item should have active state styling applied.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import styles from '../Sidebar.module.css';

describe('Feature: likenessguard-web-dashboard, Property 13: Active Navigation Highlighting', () => {
  afterEach(() => {
    cleanup();
  });

  const NAVIGATION_ROUTES = [
    { label: 'Home', path: '/' },
    { label: 'Registration', path: '/registration' },
    { label: 'Consent Policy', path: '/consent-policy' },
    { label: 'Consent Check', path: '/consent-check' },
    { label: 'Activity Logs', path: '/activity-logs' },
    { label: 'Violations', path: '/violations' },
  ];

  it('should apply active class to the navigation item matching the current route', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NAVIGATION_ROUTES.map(r => r.path)),
        (currentPath) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[currentPath]}>
              <Sidebar />
            </MemoryRouter>
          );

          const currentRoute = NAVIGATION_ROUTES.find(r => r.path === currentPath);
          
          if (currentRoute) {
            const activeLink = screen.getByText(currentRoute.label).closest('a');
            expect(activeLink).toHaveClass(styles.active);
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have exactly one active navigation item for any valid route', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NAVIGATION_ROUTES.map(r => r.path)),
        (currentPath) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[currentPath]}>
              <Sidebar />
            </MemoryRouter>
          );

          const allLinks = screen.getAllByRole('link');
          const activeLinks = allLinks.filter(link => 
            link.classList.contains(styles.active)
          );

          expect(activeLinks).toHaveLength(1);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not apply active class to navigation items that do not match the current route', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NAVIGATION_ROUTES.map(r => r.path)),
        (currentPath) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[currentPath]}>
              <Sidebar />
            </MemoryRouter>
          );

          NAVIGATION_ROUTES.forEach(route => {
            if (route.path !== currentPath) {
              const link = screen.getByText(route.label).closest('a');
              expect(link).not.toHaveClass(styles.active);
            }
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set aria-current="page" on the active navigation item', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NAVIGATION_ROUTES.map(r => r.path)),
        (currentPath) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[currentPath]}>
              <Sidebar />
            </MemoryRouter>
          );

          const currentRoute = NAVIGATION_ROUTES.find(r => r.path === currentPath);
          
          if (currentRoute) {
            const activeLink = screen.getByText(currentRoute.label).closest('a');
            expect(activeLink).toHaveAttribute('aria-current', 'page');
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not set aria-current on inactive navigation items', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NAVIGATION_ROUTES.map(r => r.path)),
        (currentPath) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[currentPath]}>
              <Sidebar />
            </MemoryRouter>
          );

          NAVIGATION_ROUTES.forEach(route => {
            if (route.path !== currentPath) {
              const link = screen.getByText(route.label).closest('a');
              expect(link).not.toHaveAttribute('aria-current');
            }
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent active state between CSS class and ARIA attribute', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NAVIGATION_ROUTES.map(r => r.path)),
        (currentPath) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[currentPath]}>
              <Sidebar />
            </MemoryRouter>
          );

          const allLinks = screen.getAllByRole('link');
          
          allLinks.forEach(link => {
            const hasActiveClass = link.classList.contains(styles.active);
            const hasAriaCurrent = link.getAttribute('aria-current') === 'page';
            expect(hasActiveClass).toBe(hasAriaCurrent);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
