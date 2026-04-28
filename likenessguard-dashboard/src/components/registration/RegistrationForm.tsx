import React, { useState } from "react";
import { ImageUpload } from "./ImageUpload";
import { Button } from "../common/Button";
import { ErrorDisplay } from "../common/ErrorDisplay";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { registerLikeness, createDefaultConsentPolicy, validateImageFiles } from "../../services/registration-service";
import type { ConsentPolicy } from "../../types/api-types";
import styles from "./RegistrationForm.module.css";

interface RegistrationFormProps {
  onSuccess?: (likenessId: string, consentPolicy?: ConsentPolicy) => void;
  onError?: (error: string) => void;
}

interface FormState {
  userId: string;
  email: string;
  photos: File[];
  consentPolicy: ConsentPolicy;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSuccess,
  onError,
}) => {
  const [formState, setFormState] = useState<FormState>({
    userId: "",
    email: "",
    photos: [],
    consentPolicy: createDefaultConsentPolicy(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    likenessId: string;
    message: string;
  } | null>(null);

  const handlePhotosUpload = (files: File[]) => {
    setFormState((prev) => ({ ...prev, photos: files }));
    setError(null);
  };

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, userId: e.target.value }));
    setError(null);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, email: e.target.value }));
  };

  const validateForm = (): string | null => {
    if (!formState.userId.trim()) {
      return "User ID is required";
    }

    if (formState.userId.length < 3) {
      return "User ID must be at least 3 characters";
    }

    if (formState.photos.length === 0) {
      return "Please upload at least 5 photos";
    }

    const validation = validateImageFiles(formState.photos);
    if (!validation.valid) {
      return validation.errors.join("; ");
    }

    if (formState.email && !isValidEmail(formState.email)) {
      return "Please enter a valid email address";
    }

    return null;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      if (onError) {
        onError(validationError);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await registerLikeness(
        formState.userId,
        formState.photos,
        formState.consentPolicy,
        formState.email || undefined
      );

      const successMessage = `Successfully registered likeness! Likeness ID: ${response.likeness_id}`;
      setSuccess({
        likenessId: response.likeness_id,
        message: successMessage,
      });

      if (onSuccess) {
        onSuccess(response.likeness_id, formState.consentPolicy);
      }

      setFormState({
        userId: "",
        email: "",
        photos: [],
        consentPolicy: createDefaultConsentPolicy(),
      });
    } catch (err: any) {
      const errorMessage = err.message || "Registration failed. Please try again.";
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSubmit(new Event("submit") as any);
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>User Information</h2>

          <div className={styles.formGroup}>
            <label htmlFor="userId" className={styles.label}>
              User ID <span className={styles.required}>*</span>
            </label>
            <input
              id="userId"
              type="text"
              value={formState.userId}
              onChange={handleUserIdChange}
              className={styles.input}
              placeholder="Enter your unique user ID"
              disabled={loading}
              required
              aria-required="true"
              aria-describedby="userId-hint"
            />
            <p id="userId-hint" className={styles.hint}>
              Choose a unique identifier (minimum 3 characters)
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email (optional)
            </label>
            <input
              id="email"
              type="email"
              value={formState.email}
              onChange={handleEmailChange}
              className={styles.input}
              placeholder="your.email@example.com"
              disabled={loading}
              aria-describedby="email-hint"
            />
            <p id="email-hint" className={styles.hint}>
              Receive notifications about your likeness protection
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Upload Photos</h2>
          <p className={styles.sectionDescription}>
            Upload 5-10 clear photos of your face from different angles and lighting conditions.
            This helps create a more accurate likeness fingerprint.
          </p>

          <ImageUpload
            onUpload={handlePhotosUpload}
            maxFiles={10}
            disabled={loading}
          />
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Consent Policy</h2>
          <p className={styles.sectionDescription}>
            Your default consent policy has been applied. You can modify it after registration.
          </p>

          <div className={styles.policyPreview}>
            <div className={styles.policyItem}>
              <span className={styles.policyIcon}></span>
              <span className={styles.policyText}>Allow self-edits</span>
            </div>
            <div className={styles.policyItem}>
              <span className={styles.policyIcon}></span>
              <span className={styles.policyText}>Deny third-party edits</span>
            </div>
            <div className={styles.policyItem}>
              <span className={styles.policyIcon}></span>
              <span className={styles.policyText}>Deny face swaps</span>
            </div>
            <div className={styles.policyItem}>
              <span className={styles.policyIcon}></span>
              <span className={styles.policyText}>Deny sexualized content</span>
            </div>
            <div className={styles.policyItem}>
              <span className={styles.policyIcon}></span>
              <span className={styles.policyText}>Deny impersonation</span>
            </div>
            <div className={styles.policyItem}>
              <span className={styles.policyIcon}></span>
              <span className={styles.policyText}>Deny political use</span>
            </div>
          </div>
        </div>

        {error && (
          <ErrorDisplay
            type="validation"
            message={error}
            onRetry={handleRetry}
          />
        )}

        {success && (
          <div className={styles.successMessage} role="alert">
            <div className={styles.successIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className={styles.successContent}>
              <h3 className={styles.successTitle}>Registration Successful!</h3>
              <p className={styles.successText}>{success.message}</p>
              <div className={styles.likenessId}>
                <span className={styles.likenessIdLabel}>Likeness ID:</span>
                <code className={styles.likenessIdValue}>{success.likenessId}</code>
              </div>
              <div className={styles.nextSteps}>
                <h4 className={styles.nextStepsTitle}>Next Steps:</h4>
                <p className={styles.nextStepsText}>
                  Your likeness is now registered! Continue the demo flow by:
                </p>
                <ol className={styles.nextStepsList}>
                  <li>Configuring your consent policy to control how your likeness can be used</li>
                  <li>Running a consent check to test the system with a reference image</li>
                  <li>Viewing activity logs to monitor consent check history</li>
                </ol>
                <p className={styles.nextStepsHint}>
                  You will be redirected to the dashboard in a few seconds...
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !!success}
            loading={loading}
          >
            {loading ? "Registering..." : "Register Likeness"}
          </Button>

          {success && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSuccess(null);
                setFormState({
                  userId: "",
                  email: "",
                  photos: [],
                  consentPolicy: createDefaultConsentPolicy(),
                });
              }}
            >
              Register Another
            </Button>
          )}
        </div>

        {loading && (
          <div className={styles.loadingOverlay}>
            <LoadingSpinner />
            <p className={styles.loadingText}>
              Processing your photos and creating likeness fingerprint...
            </p>
          </div>
        )}
      </form>
    </div>
  );
};