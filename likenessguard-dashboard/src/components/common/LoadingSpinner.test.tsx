import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('should render spinner', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('should render without text by default', () => {
      const { container } = render(<LoadingSpinner />);
      const text = container.querySelector('p');
      expect(text).not.toBeInTheDocument();
    });

    it('should render with text when provided', () => {
      render(<LoadingSpinner text="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with default medium size', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[class*="spinner"]') as HTMLElement;
      expect(spinner.className).toContain('medium');
    });

    it('should render with small size', () => {
      const { container } = render(<LoadingSpinner size="small" />);
      const spinner = container.querySelector('[class*="spinner"]') as HTMLElement;
      expect(spinner.className).toContain('small');
    });

    it('should render with medium size', () => {
      const { container } = render(<LoadingSpinner size="medium" />);
      const spinner = container.querySelector('[class*="spinner"]') as HTMLElement;
      expect(spinner.className).toContain('medium');
    });

    it('should render with large size', () => {
      const { container } = render(<LoadingSpinner size="large" />);
      const spinner = container.querySelector('[class*="spinner"]') as HTMLElement;
      expect(spinner.className).toContain('large');
    });
  });

  describe('Styling', () => {
    it('should apply container class', () => {
      const { container } = render(<LoadingSpinner />);
      const spinnerContainer = container.firstChild as HTMLElement;
      expect(spinnerContainer.className).toContain('container');
    });

    it('should apply custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const spinnerContainer = container.firstChild as HTMLElement;
      expect(spinnerContainer.className).toContain('custom-class');
    });

    it('should preserve base classes when custom className is added', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const spinnerContainer = container.firstChild as HTMLElement;
      expect(spinnerContainer.className).toContain('container');
      expect(spinnerContainer.className).toContain('custom-class');
    });
  });

  describe('Animation', () => {
    it('should have animated spinner circle', () => {
      const { container } = render(<LoadingSpinner />);
      const circle = container.querySelector('circle') as SVGCircleElement;
      expect(circle).toBeInTheDocument();
      expect(circle.className.baseVal).toContain('spinnerCircle');
    });

    it('should have SVG element', () => {
      const { container } = render(<LoadingSpinner />);
      const svg = container.querySelector('svg') as SVGSVGElement;
      expect(svg).toBeInTheDocument();
      expect(svg.className.baseVal).toContain('spinnerSvg');
    });
  });

  describe('Theme Glow Effects', () => {
    it('should apply theme glow effects to spinner', () => {
      const { container } = render(<LoadingSpinner />);
      const circle = container.querySelector('circle') as SVGCircleElement;
      const styles = window.getComputedStyle(circle);
      
      // Should have filter for glow effect
      expect(styles.filter).toContain('drop-shadow');
    });

    it('should use accent primary color', () => {
      const { container } = render(<LoadingSpinner />);
      const circle = container.querySelector('circle') as SVGCircleElement;
      const styles = window.getComputedStyle(circle);
      
      // Should use accent primary color from theme
      expect(styles.stroke).toContain('var(--accent-primary)');
    });
  });

  describe('Text Display', () => {
    it('should display loading text below spinner', () => {
      const { container } = render(<LoadingSpinner text="Please wait..." />);
      const text = container.querySelector('p');
      expect(text).toBeInTheDocument();
      expect(text).toHaveTextContent('Please wait...');
    });

    it('should apply text styling', () => {
      const { container } = render(<LoadingSpinner text="Loading" />);
      const text = container.querySelector('p') as HTMLElement;
      expect(text.className).toContain('text');
    });
  });

  describe('Accessibility', () => {
    it('should have proper structure for screen readers', () => {
      const { container } = render(<LoadingSpinner text="Loading data..." />);
      
      // Should have text that screen readers can announce
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should be visible and not hidden', () => {
      const { container } = render(<LoadingSpinner />);
      const spinnerContainer = container.firstChild as HTMLElement;
      
      expect(spinnerContainer).toBeVisible();
    });
  });
});
