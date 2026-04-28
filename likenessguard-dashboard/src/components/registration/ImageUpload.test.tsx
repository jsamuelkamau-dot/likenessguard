import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUpload } from './ImageUpload';

describe('ImageUpload Component', () => {
  const mockOnUpload = vi.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  it('renders the upload dropzone', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByText(/Drag and drop images here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/Accepted formats: JPEG, PNG, WebP/i)).toBeInTheDocument();
  });

  it('displays upload icon', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const uploadIcon = screen.getByRole('button', { name: /Upload images/i });
    expect(uploadIcon).toBeInTheDocument();
  });

  it('opens file dialog when clicked', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    const dropzone = screen.getByRole('button', { name: /Upload images/i });
    fireEvent.click(dropzone);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('validates file format - accepts valid formats', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    
    const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    
    expect(mockOnUpload).toHaveBeenCalledWith([validFile]);
  });

  it('validates file format - rejects invalid formats', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    
    const invalidFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid file format/i);
    });
    
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('validates file size - rejects files over 10MB', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    
    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/File too large/i);
    });
    
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('displays image previews after upload', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    
    const file1 = new File(['image1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['image2'], 'test2.png', { type: 'image/png' });
    
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Selected Images \(2\/5\)/i)).toBeInTheDocument();
    });
    
    expect(screen.getByAltText('Preview 1')).toBeInTheDocument();
    expect(screen.getByAltText('Preview 2')).toBeInTheDocument();
  });

  it('shows upload progress indicator', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      const progressText = screen.queryByText(/%/);
      expect(progressText).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('allows removing individual previews', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Selected Images \(1\/5\)/i)).toBeInTheDocument();
    });
    
    const removeButton = screen.getByLabelText(/Remove test.jpg/i);
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Selected Images/i)).not.toBeInTheDocument();
    });
  });

  it('allows clearing all previews', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    const file1 = new File(['image1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['image2'], 'test2.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Selected Images \(2\/5\)/i)).toBeInTheDocument();
    });
    
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Selected Images/i)).not.toBeInTheDocument();
    });
  });

  it('enforces maximum file limit', async () => {
    render(<ImageUpload onUpload={mockOnUpload} maxFiles={2} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    const files = [
      new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['image3'], 'test3.jpg', { type: 'image/jpeg' }),
    ];
    
    fireEvent.change(fileInput, { target: { files } });
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Maximum 2 files allowed/i);
    });
  });

  it('handles drag and drop', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const dropzone = screen.getByRole('button', { name: /Upload images/i });
    
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    const dataTransfer = {
      files: [file],
    };
    
    fireEvent.dragEnter(dropzone, { dataTransfer });
    fireEvent.dragOver(dropzone, { dataTransfer });
    fireEvent.drop(dropzone, { dataTransfer });
    
    expect(mockOnUpload).toHaveBeenCalledWith([file]);
  });

  it('disables interaction when disabled prop is true', () => {
    render(<ImageUpload onUpload={mockOnUpload} disabled={true} />);
    
    const dropzone = screen.getByRole('button', { name: /Upload images/i });
    expect(dropzone).toHaveAttribute('tabIndex', '-1');
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    expect(fileInput).toBeDisabled();
  });

  it('displays file names and sizes in previews', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByLabelText('File input') as HTMLInputElement;
    const file = new File(['x'.repeat(2048)], 'my-image.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('my-image.jpg')).toBeInTheDocument();
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });
  });
});
