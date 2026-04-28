import React, { useState } from 'react';
import { PolicyToggle } from './PolicyToggle';
import { Button } from '../common/Button';
import { ErrorDisplay, type ErrorType } from '../common/ErrorDisplay';
import type { ConsentPolicy } from '../../types/api-types';
import styles from './PolicyForm.module.css';

export interface PolicyFormProps {
  currentPolicy: ConsentPolicy;
  onSave: (policy: ConsentPolicy) => Promise<void>;
  onRevoke: () => Promise<void>;
  loading?: boolean;
}

export const PolicyForm: React.FC<PolicyFormProps> = ({
  currentPolicy,
  onSave,
  onRevoke,
  loading = false,
}) => {
  const [policy, setPolicy] = useState<ConsentPolicy>(currentPolicy);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<{ type: ErrorType; message: string; details?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleToggleChange = (field: keyof ConsentPolicy) => (value: boolean) => {
    setPolicy((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await onSave(policy);
      setSuccessMessage('Consent policy updated successfully');
    } catch (err: any) {
      setError({
        type: err.type || 'unknown',
        message: err.message || 'Failed to update consent policy',
        details: err.details,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeClick = () => {
    setShowRevokeConfirm(true);
  };

  const handleRevokeConfirm = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsRevoking(true);

    try {
      await onRevoke();
      setSuccessMessage('Consent revoked successfully');
      setShowRevokeConfirm(false);
    } catch (err: any) {
      setError({
        type: err.type || 'unknown',
        message: err.message || 'Failed to revoke consent',
        details: err.details,
      });
      setShowRevokeConfirm(false);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeCancel = () => {
    setShowRevokeConfirm(false);
  };

  const isLoading = loading || isSaving || isRevoking;

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Consent Policy Settings</h2>
        <p className={styles.sectionDescription}>
          Control how your likeness can be used in AI-generated content
        </p>

        <div className={styles.toggleGroup}>
          <PolicyToggle
            label="Allow Self Edits"
            value={policy.allow_self_edits}
            onChange={handleToggleChange('allow_self_edits')}
            description="Allow you to use your own likeness for AI generation"
            disabled={isLoading}
            id="policy-allow-self-edits"
          />

          <PolicyToggle
            label="Deny Third Party Edits"
            value={policy.deny_third_party_edits}
            onChange={handleToggleChange('deny_third_party_edits')}
            description="Prevent others from using your likeness for general AI generation"
            disabled={isLoading}
            id="policy-deny-third-party-edits"
          />

          <PolicyToggle
            label="Deny Face Swaps"
            value={policy.deny_face_swaps}
            onChange={handleToggleChange('deny_face_swaps')}
            description="Block face swap and deepfake applications"
            disabled={isLoading}
            id="policy-deny-face-swaps"
          />

          <PolicyToggle
            label="Deny Sexualized Content"
            value={policy.deny_sexualized_content}
            onChange={handleToggleChange('deny_sexualized_content')}
            description="Prohibit use in adult or sexualized content"
            disabled={isLoading}
            id="policy-deny-sexualized-content"
          />

          <PolicyToggle
            label="Deny Impersonation"
            value={policy.deny_impersonation}
            onChange={handleToggleChange('deny_impersonation')}
            description="Prevent impersonation or identity fraud"
            disabled={isLoading}
            id="policy-deny-impersonation"
          />

          <PolicyToggle
            label="Deny Political Use"
            value={policy.deny_political_use}
            onChange={handleToggleChange('deny_political_use')}
            description="Block use in political campaigns or propaganda"
            disabled={isLoading}
            id="policy-deny-political-use"
          />
        </div>
      </div>

      {successMessage && (
        <div className={styles.successMessage} role="status" aria-live="polite">
          <div className={styles.successContent}>
            <p className={styles.successText}>{successMessage}</p>
            <div className={styles.nextSteps}>
              <h4 className={styles.nextStepsTitle}>Next Steps:</h4>
              <p className={styles.nextStepsText}>
                Your consent policy is now active! Continue exploring:
              </p>
              <ul className={styles.nextStepsList}>
                <li>Run a consent check to test how your policy works with reference images</li>
                <li>View activity logs to monitor consent check history</li>
                <li>Check for violations to see if any unauthorized uses were detected</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {error && (
        <ErrorDisplay
          type={error.type}
          message={error.message}
          details={error.details}
          onRetry={error.type === 'network' || error.type === 'server' ? handleSave : undefined}
        />
      )}

      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          disabled={isLoading}
        >
          Save Policy
        </Button>

        <Button
          variant="danger"
          onClick={handleRevokeClick}
          loading={isRevoking}
          disabled={isLoading}
        >
          Revoke Consent
        </Button>
      </div>

      {showRevokeConfirm && (
        <div className={styles.confirmDialog} role="dialog" aria-labelledby="revoke-dialog-title">
          <div className={styles.confirmContent}>
            <h3 id="revoke-dialog-title" className={styles.confirmTitle}>
              Confirm Consent Revocation
            </h3>
            <p className={styles.confirmMessage}>
              Are you sure you want to revoke consent? This will remove your likeness from the
              system and cannot be undone. You will need to re-register if you want to use
              LikenessGuard again.
            </p>
            <div className={styles.confirmActions}>
              <Button
                variant="danger"
                onClick={handleRevokeConfirm}
                loading={isRevoking}
                disabled={isRevoking}
              >
                Yes, Revoke Consent
              </Button>
              <Button
                variant="secondary"
                onClick={handleRevokeCancel}
                disabled={isRevoking}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


