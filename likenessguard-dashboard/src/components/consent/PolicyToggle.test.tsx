import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PolicyToggle } from './PolicyToggle';

describe('PolicyToggle', () => {
  it('renders with label', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    expect(screen.getByText('Test Toggle')).toBeInTheDocument();
  });

  it('renders with description when provided', () => {
    const onChange = vi.fn();
    render(
      <PolicyToggle
        label="Test Toggle"
        value={false}
        onChange={onChange}
        description="This is a test description"
      />
    );
    
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PolicyToggle label="Test Toggle" value={false} onChange={onChange} />
    );
    
    const description = container.querySelector('p');
    expect(description).toBeNull();
  });

  it('displays active state when value is true', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={true} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('displays inactive state when value is false', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with opposite value when clicked', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with opposite value when toggled from true to false', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={true} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} disabled={true} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies disabled attribute when disabled prop is true', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} disabled={true} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
  });

  it('handles keyboard interaction with Enter key', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: 'Enter' });
    
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('handles keyboard interaction with Space key', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: ' ' });
    
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not toggle on other keyboard keys', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: 'a' });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses custom id when provided', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} id="custom-id" />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('id', 'custom-id');
  });

  it('generates id from label when id not provided', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Allow Commercial Use" value={false} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('id', 'toggle-allow-commercial-use');
  });

  it('has proper aria-label', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-label', 'Test Toggle');
  });

  it('associates label with toggle using htmlFor', () => {
    const onChange = vi.fn();
    render(<PolicyToggle label="Test Toggle" value={false} onChange={onChange} />);
    
    const label = screen.getByText('Test Toggle');
    const toggle = screen.getByRole('switch');
    
    expect(label).toHaveAttribute('for', toggle.id);
  });
});
