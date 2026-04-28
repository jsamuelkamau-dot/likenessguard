/**
 * Trial Manager - Handles trial period (30 days free)
 */

import { TrialInfo } from '../types';
import { SettingsManager } from '../storage/settings-manager';

export class TrialManager {
  private settingsManager: SettingsManager;
  private readonly TRIAL_DURATION_DAYS = 30;

  constructor() {
    this.settingsManager = new SettingsManager();
  }

  /**
   * Initialize trial if needed
   */
  async initializeTrial(): Promise<TrialInfo> {
    const existing = await this.settingsManager.getTrialInfo();
    
    if (existing) {
      return existing;
    }

    // Create new trial
    const trial: TrialInfo = {
      token: this.generateToken(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)
    };

    await this.settingsManager.setTrialInfo(trial);
    return trial;
  }

  /**
   * Check if trial is valid
   */
  async isTrialValid(): Promise<boolean> {
    const trial = await this.settingsManager.getTrialInfo();
    
    if (!trial) {
      return true; // No trial yet, allow usage
    }

    return Date.now() < trial.expiresAt;
  }

  /**
   * Get remaining trial days
   */
  async getRemainingDays(): Promise<number> {
    const trial = await this.settingsManager.getTrialInfo();
    
    if (!trial) {
      return this.TRIAL_DURATION_DAYS;
    }

    const remaining = trial.expiresAt - Date.now();
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  }

  /**
   * Generate anonymous trial token
   */
  private generateToken(): string {
    return 'trial_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
