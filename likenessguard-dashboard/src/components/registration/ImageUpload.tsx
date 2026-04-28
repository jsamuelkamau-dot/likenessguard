import React, { useState, useRef } from 'react';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  acceptedFormats?: string[];
  disabled?: boolean;
}

interface ImagePreview {
  file: File;
  url: string;
}

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  maxFiles = 5,
  acceptedFormats = ACCEPTED_FORMATS,
  disabled = false,
}) => {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return 'Invalid file format: ' + file.name + '. Accepted formats: JPEG, PNG, WebP';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large: ' + file.name + '. Maximum size: 10MB';
    }
    return null;
  };

  const processFiles = (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    if (previews.length + fileArray.length > maxFiles) {
      setError('Maximum ' + maxFiles + ' files allowed');
      return;
    }

    fileArray.forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('; '));
      return;
    }

    const newPreviews: ImagePreview[] = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews((prev) => [...prev, ...newPreviews]);

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    onUpload([...previews.map((p) => p.file), ...validFiles]);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
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

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemovePreview = (index: number) => {
    setPreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    setError(null);
  };

  const handleClearAll = () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setPreviews([]);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const dropzoneClasses = [
    styles.dropzone,
    isDragging ? styles.dragging : '',
    disabled ? styles.disabled : ''
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
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload images"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className={styles.fileInput}
          disabled={disabled}
          aria-label="File input"
        />

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
              Drag and drop images here
            </span>
            <span className={styles.dropzoneTextSecondary}>or click to browse</span>
          </p>

          <p className={styles.dropzoneHint}>
            Accepted formats: JPEG, PNG, WebP (max {maxFiles} files, 10MB each)
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: uploadProgress + '%' }}
            />
          </div>
          <span className={styles.progressText}>{uploadProgress}%</span>
        </div>
      )}

      {previews.length > 0 && (
        <div className={styles.previewsContainer}>
          <div className={styles.previewsHeader}>
            <h3 className={styles.previewsTitle}>
              Selected Images ({previews.length}/{maxFiles})
            </h3>
            <button
              type="button"
              onClick={handleClearAll}
              className={styles.clearButton}
              disabled={disabled}
            >
              Clear All
            </button>
          </div>

          <div className={styles.previewsGrid}>
            {previews.map((preview, index) => (
              <div key={index} className={styles.previewItem}>
                <img
                  src={preview.url}
                  alt={'Preview ' + (index + 1)}
                  className={styles.previewImage}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePreview(index);
                  }}
                  className={styles.removeButton}
                  disabled={disabled}
                  aria-label={'Remove ' + preview.file.name}
                >
                  <svg
                    width="16"
                    height="16"
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
                </button>
                <div className={styles.previewInfo}>
                  <span className={styles.fileName}>{preview.file.name}</span>
                  <span className={styles.fileSize}>
                    {(preview.file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};