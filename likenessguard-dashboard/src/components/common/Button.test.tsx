import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render with default primary variant', () => {
      const { container } = render(<Button>Primary</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('primary');
    });

    it('should render with secondary variant', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('secondary');
    });

    it('should render with danger variant', () => {
      const { container } = render(<Button variant="danger">Danger</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('danger');
    });
  });

  describe('Interaction', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} loading>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading is true', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    it('should not display loading spinner when loading is false', () => {
      render(<Button loading={false}>Not Loading</Button>);
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply loading text style when loading', () => {
      const { container } = render(<Button loading>Loading</Button>);
      const button = container.querySelector('button');
      const textSpan = button?.querySelector('span:last-child');
      expect(textSpan).toBeInTheDocument();
      expect(textSpan?.className).toContain('loadingText');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply disabled class when disabled', () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('disabled');
    });

    it('should not be disabled when disabled prop is false', () => {
      render(<Button disabled={false}>Enabled</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Button Type', () => {
    it('should default to type="button"', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should accept type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should accept type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(<Button className="custom-class">Custom</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('custom-class');
    });

    it('should preserve base classes when custom className is added', () => {
      const { container } = render(<Button className="custom-class">Custom</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('button');
      expect(button?.className).toContain('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have minimum touch target size (44x44px)', () => {
      const { container } = render(<Button>Touch Target</Button>);
      const button = container.querySelector('button');
      const styles = window.getComputedStyle(button!);
      
      // Check that min-height and min-width are set to 44px
      expect(styles.minHeight).toBe('44px');
      expect(styles.minWidth).toBe('44px');
    });

    it('should be keyboard accessible', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Variants Color Mapping', () => {
    it('should apply primary variant class', () => {
      const { container } = render(<Button variant="primary">Primary</Button>);
      const button = container.querySelector('button');
      
      // Primary variant should have the primary class
      expect(button?.className).toContain('primary');
    });

    it('should apply secondary variant class', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);
      const button = container.querySelector('button');
      
      // Secondary variant should have the secondary class
      expect(button?.className).toContain('secondary');
    });

    it('should apply danger variant class', () => {
      const { container } = render(<Button variant="danger">Danger</Button>);
      const button = container.querySelector('button');
      
      // Danger variant should have the danger class
      expect(button?.className).toContain('danger');
    });
  });
});
