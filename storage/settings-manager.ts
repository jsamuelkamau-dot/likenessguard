/**
 * Settings Manager - Handles local storage operations
 */

import { UserSettings, TrialInfo } from '../types';

export class SettingsManager {
  private static readonly SETTINGS_KEY = 'easypiky_settings';
  private static readonly TRUSTED_DOMAINS_KEY = 'easypiky_trusted_domains';
  private static readonly TRIAL_KEY = 'easypiky_trial';

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    const result = await chrome.storage.local.get(SettingsManager.SETTINGS_KEY);
    return result[SettingsManager.SETTINGS_KEY] || {
      strictMode: false,
      trustedDomains: [],
      version: '1.0.0'
    };
  }

  /**
   * Update settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({
      [SettingsManager.SETTINGS_KEY]: updated
    });
  }

  /**
   * Get trusted domains
   */
  async getTrustedDomains(): Promise<string[]> {
    const result = await chrome.storage.local.get(SettingsManager.TRUSTED_DOMAINS_KEY);
    return result[SettingsManager.TRUSTED_DOMAINS_KEY] || [];
  }

  /**
   * Add trusted domain
   */
  async addTrustedDomain(domain: string): Promise<void> {
    const domains = await this.getTrustedDomains();
    if (!domains.includes(domain)) {
      domains.push(domain);
      await chrome.storage.local.set({
        [SettingsManager.TRUSTED_DOMAINS_KEY]: domains
      });
    }
  }

  /**
   * Remove trusted domain
   */
  async removeTrustedDomain(domain: string): Promise<void> {
    const domains = await this.getTrustedDomains();
    const filtered = domains.filter(d => d !== domain);
    await chrome.storage.local.set({
      [SettingsManager.TRUSTED_DOMAINS_KEY]: filtered
    });
  }

  /**
   * Get trial info
   */
  async getTrialInfo(): Promise<TrialInfo | null> {
    const result = await chrome.storage.local.get(SettingsManager.TRIAL_KEY);
    return result[SettingsManager.TRIAL_KEY] || null;
  }

  /**
   * Set trial info
   */
  async setTrialInfo(trial: TrialInfo): Promise<void> {
    await chrome.storage.local.set({
      [SettingsManager.TRIAL_KEY]: trial
    });
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
  }
}
