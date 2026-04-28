import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReferenceImageUpload } from './ReferenceImageUpload';

describe('ReferenceImageUpload', () => {
  const mockOnCheck = vi.fn();

  beforeEach(() => {
    mockOnCheck.mockClear();
    mockOnCheck.mockResolvedValue(undefined);
  });

  it('renders upload dropzone', () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    expect(screen.getByText('Upload reference image')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop or click to browse')).toBeInTheDocument();
    expect(screen.getByText(/Accepted formats: JPEG, PNG, WebP/)).toBeInTheDocument();
  });

  it('accepts valid image file', async () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnCheck).toHaveBeenCalledWith(file);
    });
  });

  it('rejects invalid file format', async () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid file format/)).toBeInTheDocument();
    });
    
    expect(mockOnCheck).not.toHaveBeenCalled();
  });

  it('rejects file that is too large', async () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
    
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File too large/)).toBeInTheDocument();
    });
    
    expect(mockOnCheck).not.toHaveBeenCalled();
  });

  it('shows loading state when loading prop is true', () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} loading={true} />);
    
    expect(screen.getByText('Checking consent...')).toBeInTheDocument();
  });

  it('disables upload when disabled prop is true', () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} disabled={true} />);
    
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('shows preview after file upload', async () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByAltText('Reference image preview')).toBeInTheDocument();
    });
    
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
  });

  it('clears preview when clear button is clicked', async () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByAltText('Reference image preview')).toBeInTheDocument();
    });
    
    const clearButton = screen.getByLabelText('Clear image and upload new one');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.queryByAltText('Reference image preview')).not.toBeInTheDocument();
    });
  });

  it('handles drag and drop', async () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    const dropzone = screen.getByRole('button', { name: /Upload reference image/ });
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.dragEnter(dropzone, {
      dataTransfer: { files: [file] }
    });
    
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] }
    });
    
    await waitFor(() => {
      expect(mockOnCheck).toHaveBeenCalledWith(file);
    });
  });

  it('calls onCheck immediately after file selection', async () => {
    render(<ReferenceImageUpload onCheck={mockOnCheck} />);
    
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnCheck).toHaveBeenCalledTimes(1);
      expect(mockOnCheck).toHaveBeenCalledWith(file);
    });
  });

  it('keeps preview even if onCheck throws error', async () => {
    const errorOnCheck = vi.fn().mockRejectedValue(new Error('API error'));
    render(<ReferenceImageUpload onCheck={errorOnCheck} />);
    
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('File input') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(errorOnCheck).toHaveBeenCalled();
    });
    
    // Preview should still be visible
    expect(screen.getByAltText('Reference image preview')).toBeInTheDocument();
  });
});
