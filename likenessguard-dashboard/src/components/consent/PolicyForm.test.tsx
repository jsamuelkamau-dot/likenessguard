import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PolicyForm } from './PolicyForm';
import type { ConsentPolicy } from '../../types/api-types';

describe('PolicyForm', () => {
  const mockPolicy: ConsentPolicy = {
    allow_self_edits: true,
    deny_third_party_edits: true,
    deny_face_swaps: true,
    deny_sexualized_content: true,
    deny_impersonation: true,
    deny_political_use: false,
  };

  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnRevoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSave = vi.fn().mockResolvedValue(undefined);
    mockOnRevoke = vi.fn().mockResolvedValue(undefined);
  });

  it('renders with all policy toggles', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    expect(screen.getByText('Consent Policy Settings')).toBeInTheDocument();
    expect(screen.getByText('Allow Self Edits')).toBeInTheDocument();
    expect(screen.getByText('Deny Third Party Edits')).toBeInTheDocument();
    expect(screen.getByText('Deny Face Swaps')).toBeInTheDocument();
    expect(screen.getByText('Deny Sexualized Content')).toBeInTheDocument();
    expect(screen.getByText('Deny Impersonation')).toBeInTheDocument();
    expect(screen.getByText('Deny Political Use')).toBeInTheDocument();
  });

  it('displays current policy values correctly', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const allowSelfEdits = screen.getByLabelText('Allow Self Edits');
    const denyPoliticalUse = screen.getByLabelText('Deny Political Use');
    
    expect(allowSelfEdits).toHaveAttribute('aria-checked', 'true');
    expect(denyPoliticalUse).toHaveAttribute('aria-checked', 'false');
  });

  it('renders Save Policy button', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    expect(screen.getByRole('button', { name: /save policy/i })).toBeInTheDocument();
  });

  it('renders Revoke Consent button', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    expect(screen.getByRole('button', { name: /revoke consent/i })).toBeInTheDocument();
  });

  it('updates policy state when toggle is changed', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const denyPoliticalUse = screen.getByLabelText('Deny Political Use');
    fireEvent.click(denyPoliticalUse);
    
    expect(denyPoliticalUse).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onSave with updated policy when Save button is clicked', async () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const denyPoliticalUse = screen.getByLabelText('Deny Political Use');
    fireEvent.click(denyPoliticalUse);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        ...mockPolicy,
        deny_political_use: true,
      });
    });
  });

  it('displays success message after successful save', async () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Consent policy updated successfully')).toBeInTheDocument();
    });
  });

  it('displays error message when save fails', async () => {
    const mockError = {
      type: 'server',
      message: 'Failed to update policy',
      details: 'Server error occurred',
    };
    mockOnSave.mockRejectedValue(mockError);
    
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to update policy')).toBeInTheDocument();
    });
  });

  it('shows loading state during save', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    fireEvent.click(saveButton);
    
    expect(saveButton).toBeDisabled();
    
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('shows confirmation dialog when Revoke button is clicked', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    fireEvent.click(revokeButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Consent Revocation')).toBeInTheDocument();
  });

  it('calls onRevoke when revocation is confirmed', async () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    fireEvent.click(revokeButton);
    
    const confirmButton = screen.getByRole('button', { name: /yes, revoke consent/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnRevoke).toHaveBeenCalled();
    });
  });

  it('closes confirmation dialog when Cancel is clicked', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    fireEvent.click(revokeButton);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays success message after successful revocation', async () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    fireEvent.click(revokeButton);
    
    const confirmButton = screen.getByRole('button', { name: /yes, revoke consent/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('Consent revoked successfully')).toBeInTheDocument();
    });
  });

  it('displays error message when revocation fails', async () => {
    const mockError = {
      type: 'server',
      message: 'Failed to revoke consent',
    };
    mockOnRevoke.mockRejectedValue(mockError);
    
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    fireEvent.click(revokeButton);
    
    const confirmButton = screen.getByRole('button', { name: /yes, revoke consent/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to revoke consent')).toBeInTheDocument();
    });
  });

  it('disables all toggles during save operation', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    fireEvent.click(saveButton);
    
    const allowSelfEdits = screen.getByLabelText('Allow Self Edits');
    expect(allowSelfEdits).toBeDisabled();
    
    await waitFor(() => {
      expect(allowSelfEdits).not.toBeDisabled();
    });
  });

  it('disables all toggles during revoke operation', async () => {
    mockOnRevoke.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    fireEvent.click(revokeButton);
    
    const confirmButton = screen.getByRole('button', { name: /yes, revoke consent/i });
    fireEvent.click(confirmButton);
    
    const allowSelfEdits = screen.getByLabelText('Allow Self Edits');
    expect(allowSelfEdits).toBeDisabled();
    
    await waitFor(() => {
      expect(allowSelfEdits).not.toBeDisabled();
    });
  });

  it('clears success message when user makes changes', async () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Consent policy updated successfully')).toBeInTheDocument();
    });
    
    const denyPoliticalUse = screen.getByLabelText('Deny Political Use');
    fireEvent.click(denyPoliticalUse);
    
    expect(screen.queryByText('Consent policy updated successfully')).not.toBeInTheDocument();
  });

  it('respects loading prop and disables all controls', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} loading={true} />);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    const allowSelfEdits = screen.getByLabelText('Allow Self Edits');
    
    expect(saveButton).toBeDisabled();
    expect(revokeButton).toBeDisabled();
    expect(allowSelfEdits).toBeDisabled();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const revokeButton = screen.getByRole('button', { name: /revoke consent/i });
    fireEvent.click(revokeButton);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'revoke-dialog-title');
  });

  it('displays success message with proper ARIA live region', async () => {
    render(<PolicyForm currentPolicy={mockPolicy} onSave={mockOnSave} onRevoke={mockOnRevoke} />);
    
    const saveButton = screen.getByRole('button', { name: /save policy/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      const successMessage = screen.getByRole('status');
      expect(successMessage).toHaveAttribute('aria-live', 'polite');
    });
  });
});
