/**
 * Property-Based Test: Navigation Completeness
 * 
 * **Validates: Requirements 7.2**
 * 
 * Property 12: Navigation Completeness
 * For any dashboard instance, the navigation menu should include links to all major sections:
 * Home, Registration, Consent Policy, Consent Check, Activity Logs, and Violations.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

describe('Feature: likenessguard-web-dashboard, Property 12: Navigation Completeness', () => {
  // Clean up after each test to prevent DOM pollution
  afterEach(() => {
    cleanup();
  });

  // Define the required navigation sections as per requirements
  const REQUIRED_SECTIONS = [
    { label: 'Home', path: '/' },
    { label: 'Registration', path: '/registration' },
    { label: 'Consent Policy', path: '/consent-policy' },
    { label: 'Consent Check', path: '/consent-check' },
    { label: 'Activity Logs', path: '/activity-logs' },
    { label: 'Violations', path: '/violations' },
  ];

  /**
   * Property: Navigation menu must include all required sections
   * For any dashboard instance, all major sections must be present in the navigation
   */
  it('should include links to all major sections regardless of initial route', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        // Generate arbitrary initial routes (including valid and invalid ones)
        fc.oneof(
          fc.constant('/'),
          fc.constant('/registration'),
          fc.constant('/consent-policy'),
          fc.constant('/consent-check'),
          fc.constant('/activity-logs'),
          fc.constant('/violations'),
          fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s}`),
          fc.constant(''),
        ),
        (initialRoute) => {
          // Render Sidebar with arbitrary initial route
          const { unmount } = render(
            <MemoryRouter initialEntries={[initialRoute]}>
              <Sidebar />
            </MemoryRouter>
          );

          // Verify all required sections are present
          REQUIRED_SECTIONS.forEach(section => {
            const linkElement = screen.getByText(section.label);
            expect(linkElement).toBeInTheDocument();
            
            // Verify the link has the correct href
            const anchorElement = linkElement.closest('a');
            expect(anchorElement).toHaveAttribute('href', section.path);
          });

          // Clean up after each iteration
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Navigation completeness is independent of component props
   * The navigation should include all sections regardless of className prop
   */
  it('should include all major sections regardless of className prop', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
        (className) => {
          const { unmount } = render(
            <MemoryRouter>
              <Sidebar className={className} />
            </MemoryRouter>
          );

          // Verify all required sections are present
          REQUIRED_SECTIONS.forEach(section => {
            const linkElement = screen.getByText(section.label);
            expect(linkElement).toBeInTheDocument();
            
            const anchorElement = linkElement.closest('a');
            expect(anchorElement).toHaveAttribute('href', section.path);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Navigation sections count is exactly 6
   * The navigation should have exactly the required number of sections, no more, no less
   */
  it('should have exactly 6 navigation sections', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/', '/registration', '/consent-policy', '/consent-check', '/activity-logs', '/violations'),
        (initialRoute) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[initialRoute]}>
              <Sidebar />
            </MemoryRouter>
          );

          // Get all navigation links
          const navLinks = screen.getAllByRole('link');
          
          // Should have exactly 6 navigation links (one for each section)
          expect(navLinks).toHaveLength(REQUIRED_SECTIONS.length);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Each navigation section has a unique path
   * All navigation paths should be distinct to avoid routing conflicts
   */
  it('should have unique paths for all navigation sections', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed, testing static structure
        () => {
          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const navLinks = screen.getAllByRole('link');
          const paths = navLinks.map(link => link.getAttribute('href'));
          
          // All paths should be unique
          const uniquePaths = new Set(paths);
          expect(uniquePaths.size).toBe(paths.length);
          
          // All required paths should be present
          REQUIRED_SECTIONS.forEach(section => {
            expect(paths).toContain(section.path);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Navigation labels are non-empty and descriptive
   * All navigation items should have meaningful, non-empty labels
   */
  it('should have non-empty labels for all navigation sections', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const { unmount } = render(
            <MemoryRouter>
              <Sidebar />
            </MemoryRouter>
          );

          const navLinks = screen.getAllByRole('link');
          
          navLinks.forEach(link => {
            const text = link.textContent || '';
            // Each link should have non-empty text content
            expect(text.trim().length).toBeGreaterThan(0);
          });
          
          // Verify all required labels are present
          REQUIRED_SECTIONS.forEach(section => {
            expect(screen.getByText(section.label)).toBeInTheDocument();
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Navigation is accessible via navigation role
   * The navigation should be properly marked with ARIA role for accessibility
   */
  it('should be accessible as a navigation landmark', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/', '/registration', '/consent-policy', '/consent-check', '/activity-logs', '/violations'),
        (initialRoute) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[initialRoute]}>
              <Sidebar />
            </MemoryRouter>
          );

          // Should have navigation role - use getAllByRole since there might be multiple
          const navs = screen.getAllByRole('navigation');
          expect(navs.length).toBeGreaterThan(0);
          
          // At least one navigation should contain all required sections
          REQUIRED_SECTIONS.forEach(section => {
            const link = screen.getByText(section.label).closest('a');
            expect(link).toBeInTheDocument();
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
