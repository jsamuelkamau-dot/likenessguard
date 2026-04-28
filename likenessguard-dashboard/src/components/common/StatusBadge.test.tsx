import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge Component', () => {
  describe('Rendering', () => {
    it('should render with text', () => {
      render(<StatusBadge status="ALLOW" text="Allowed" />);
      expect(screen.getByText('Allowed')).toBeInTheDocument();
    });

    it('should render ALLOW status', () => {
      render(<StatusBadge status="ALLOW" text="Allow" />);
      expect(screen.getByText('Allow')).toBeInTheDocument();
    });

    it('should render DENY status', () => {
      render(<StatusBadge status="DENY" text="Deny" />);
      expect(screen.getByText('Deny')).toBeInTheDocument();
    });

    it('should render UNKNOWN status', () => {
      render(<StatusBadge status="UNKNOWN" text="Unknown" />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should render SUCCESS status', () => {
      render(<StatusBadge status="SUCCESS" text="Success" />);
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should render ERROR status', () => {
      render(<StatusBadge status="ERROR" text="Error" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Color Mapping', () => {
    it('should apply ALLOW status class', () => {
      const { container } = render(<StatusBadge status="ALLOW" text="Allow" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('allow');
    });

    it('should apply DENY status class', () => {
      const { container } = render(<StatusBadge status="DENY" text="Deny" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('deny');
    });

    it('should apply UNKNOWN status class', () => {
      const { container } = render(<StatusBadge status="UNKNOWN" text="Unknown" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('unknown');
    });

    it('should apply SUCCESS status class (same as ALLOW)', () => {
      const { container } = render(<StatusBadge status="SUCCESS" text="Success" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('success');
    });

    it('should apply ERROR status class (same as DENY)', () => {
      const { container } = render(<StatusBadge status="ERROR" text="Error" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('error');
    });
  });

  describe('Theme Status Colors', () => {
    it('should use correct color for ALLOW status (#4FA3FF)', () => {
      const { container } = render(<StatusBadge status="ALLOW" text="Allow" />);
      const badge = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(badge);
      
      // ALLOW should use success blue color variable
      expect(styles.color).toBe('var(--status-success)');
    });

    it('should use correct color for DENY status (#FF7A45)', () => {
      const { container } = render(<StatusBadge status="DENY" text="Deny" />);
      const badge = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(badge);
      
      // DENY should use error orange color variable
      expect(styles.color).toBe('var(--status-error)');
    });

    it('should use correct color for UNKNOWN status (#4B556A)', () => {
      const { container } = render(<StatusBadge status="UNKNOWN" text="Unknown" />);
      const badge = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(badge);
      
      // UNKNOWN should use neutral gray color variable
      expect(styles.color).toBe('var(--status-neutral)');
    });
  });

  describe('Styling', () => {
    it('should apply badge base class', () => {
      const { container } = render(<StatusBadge status="ALLOW" text="Allow" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('badge');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <StatusBadge status="ALLOW" text="Allow" className="custom-class" />
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('custom-class');
    });

    it('should preserve base classes when custom className is added', () => {
      const { container } = render(
        <StatusBadge status="ALLOW" text="Allow" className="custom-class" />
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('badge');
      expect(badge.className).toContain('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should render as span element', () => {
      const { container } = render(<StatusBadge status="ALLOW" text="Allow" />);
      const badge = container.firstChild;
      expect(badge?.nodeName).toBe('SPAN');
    });

    it('should have readable text content', () => {
      render(<StatusBadge status="ALLOW" text="Access Granted" />);
      expect(screen.getByText('Access Granted')).toBeInTheDocument();
    });
  });
});
