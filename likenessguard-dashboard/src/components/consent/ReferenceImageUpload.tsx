import React, { useState, useRef } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import styles from './ReferenceImageUpload.module.css';

interface ReferenceImageUploadProps {
  onCheck: (image: File) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ReferenceImageUpload: React.FC<ReferenceImageUploadProps> = ({
  onCheck,
  disabled = false,
  loading = false,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return `Invalid file format. Accepted formats: JPEG, PNG, WebP`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 10MB`;
    }
    return null;
  };

  const processFile = async (file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setSelectedFile(file);

    try {
      await onCheck(file);
    } catch (err) {
      // Error handling is done by parent component
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !loading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || loading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && !loading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClear = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const dropzoneClasses = [
    styles.dropzone,
    isDragging ? styles.dragging : '',
    disabled || loading ? styles.disabled : '',
    preview ? styles.hasPreview : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      <div
        className={dropzoneClasses}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled || loading ? -1 : 0}
        aria-label="Upload reference image for consent check"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS.join(',')}
          onChange={handleFileInputChange}
          className={styles.fileInput}
          disabled={disabled || loading}
          aria-label="File input"
        />

        {!preview && !loading && (
          <div className={styles.dropzoneContent}>
            <svg
              className={styles.uploadIcon}
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>

            <p className={styles.dropzoneText}>
              <span className={styles.dropzoneTextPrimary}>
                Upload reference image
              </span>
              <span className={styles.dropzoneTextSecondary}>
                Drag and drop or click to browse
              </span>
            </p>

            <p className={styles.dropzoneHint}>
              Accepted formats: JPEG, PNG, WebP (max 10MB)
            </p>
          </div>
        )}

        {loading && (
          <div className={styles.loadingContainer}>
            <LoadingSpinner size="large" />
            <p className={styles.loadingText}>Checking consent...</p>
          </div>
        )}

        {preview && !loading && (
          <div className={styles.previewContainer}>
            <img
              src={preview}
              alt="Reference image preview"
              className={styles.previewImage}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className={styles.clearButton}
              disabled={disabled}
              aria-label="Clear image and upload new one"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Clear & Upload New</span>
            </button>
            {selectedFile && (
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{selectedFile.name}</span>
                <span className={styles.fileSize}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
