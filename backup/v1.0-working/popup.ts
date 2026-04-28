/**
 * EasyPiky Popup - Extension popup interface
 */

class EasyPikyPopup {
  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadStatus();
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to load extension status');
    }
  }

  private async loadStatus(): Promise<void> {
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('main-content');
    const errorDiv = document.getElementById('error');

    try {
      // Get trusted domains
      const domainsResponse = await chrome.runtime.sendMessage({ type: 'GET_TRUSTED_DOMAINS' });
      const trustedDomains = domainsResponse?.domains || [];

      // Get trial status
      const trialResponse = await chrome.runtime.sendMessage({ type: 'GET_TRIAL_STATUS' });
      const remainingDays = trialResponse?.remainingDays || 30;
      const isValid = trialResponse?.isValid !== false;

      // Update UI
      if (loading) loading.style.display = 'none';
      if (mainContent) mainContent.style.display = 'block';

      // Update status
      const statusIcon = document.getElementById('status-icon');
      const statusText = document.getElementById('status-text');
      const statusSubtitle = document.getElementById('status-subtitle');
      
      if (statusIcon && statusText && statusSubtitle) {
        if (isValid) {
          statusIcon.className = 'status-icon active';
          statusText.textContent = 'Protection Active';
          statusSubtitle.textContent = 'All links are being monitored';
        } else {
          statusIcon.className = 'status-icon warning';
          statusText.textContent = 'Trial Expired';
          statusSubtitle.textContent = 'Please subscribe to continue protection';
        }
      }

      // Update trial info
      const trialDays = document.getElementById('trial-days');
      const trialProgressBar = document.getElementById('trial-progress-bar');
      
      if (trialDays) {
        trialDays.textContent = `${remainingDays} days remaining`;
      }
      
      if (trialProgressBar) {
        const percentage = (remainingDays / 30) * 100;
        trialProgressBar.style.width = `${percentage}%`;
      }

      // Update stats
      const trustedDomainsCount = document.getElementById('trusted-domains-count');
      if (trustedDomainsCount) {
        trustedDomainsCount.textContent = trustedDomains.length.toString();
      }

      // Attach button listeners
      this.attachListeners();

    } catch (error) {
      console.error('Error loading status:', error);
      if (loading) loading.style.display = 'none';
      if (errorDiv) {
        errorDiv.style.display = 'block';
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
          errorMessage.textContent = 'Failed to communicate with extension. Try reloading.';
        }
      }
    }
  }

  private attachListeners(): void {
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Add domain button
    const addDomainBtn = document.getElementById('add-domain-btn');
    addDomainBtn?.addEventListener('click', () => {
      const domain = prompt('Enter domain to trust (e.g., example.com):');
      if (domain) {
        this.addTrustedDomain(domain.trim().toLowerCase());
      }
    });

    // Verify email button
    const verifyEmailBtn = document.getElementById('verify-email-btn');
    verifyEmailBtn?.addEventListener('click', () => {
      alert('Email verification feature coming soon!');
    });
  }

  private async addTrustedDomain(domain: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_TRUSTED_DOMAIN',
        domain
      });
      
      // Reload status
      await this.loadStatus();
    } catch (error) {
      console.error('Failed to add domain:', error);
      alert('Failed to add domain. Please try again.');
    }
  }

  private showError(message: string): void {
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');

    if (loading) loading.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new EasyPikyPopup();
});
