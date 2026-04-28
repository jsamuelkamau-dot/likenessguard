/**
 * EasyPiky Background Service Worker
 */

import { SmartAnalysisEngine } from './analysis/smart-analysis-engine';
import { SettingsManager } from './storage/settings-manager';
import { TrialManager } from './trial/trial-manager';

class EasyPikyBackground {
  private analysisEngine: SmartAnalysisEngine;
  private settingsManager: SettingsManager;
  private trialManager: TrialManager;

  constructor() {
    this.analysisEngine = new SmartAnalysisEngine();
    this.settingsManager = new SettingsManager();
    this.trialManager = new TrialManager();
    this.initialize();
  }

  private initialize(): void {
    console.log('🛡️ EasyPiky background service initialized');

    chrome.runtime.onInstalled.addListener(() => {
      this.trialManager.initializeTrial();
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): Promise<void> {
    try {
      switch (message.type) {
        case 'ANALYZE_URL':
          const trustedDomains = await this.settingsManager.getTrustedDomains();
          const result = await this.analysisEngine.analyzeURL(message.url, trustedDomains);
          sendResponse(result);
          break;

        case 'ADD_TRUSTED_DOMAIN':
          await this.settingsManager.addTrustedDomain(message.domain);
          sendResponse({ success: true });
          break;

        case 'GET_TRUSTED_DOMAINS':
          const domains = await this.settingsManager.getTrustedDomains();
          sendResponse({ domains });
          break;

        case 'REMOVE_TRUSTED_DOMAIN':
          await this.settingsManager.removeTrustedDomain(message.domain);
          sendResponse({ success: true });
          break;

        case 'GET_SETTINGS':
          const settings = await this.settingsManager.getSettings();
          sendResponse(settings);
          break;

        case 'UPDATE_SETTINGS':
          await this.settingsManager.updateSettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'GET_TRIAL_STATUS':
          const isValid = await this.trialManager.isTrialValid();
          const remainingDays = await this.trialManager.getRemainingDays();
          sendResponse({ isValid, remainingDays });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background error:', error);
      sendResponse({ error: (error as Error).message });
    }
  }
}

new EasyPikyBackground();
