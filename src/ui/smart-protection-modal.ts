/**
 * Smart Protection Modal - Minimal Interruption, Maximum Clarity
 * 
 * Design Goals:
 * - Show clear percentage-based risk assessment
 * - Provide one-click "Add to Trusted" option
 * - Minimize user friction with smart defaults
 * - Clear visual hierarchy for quick decisions
 * - Step-by-step guidance without overwhelming
 */

import { AnalysisResult } from '../types/analysis';
import { SettingsManager } from '../storage/settings-manager';

export class SmartProtectionModal {
  private modalElement: HTMLElement | null = null;
  private settingsManager: SettingsManager;

  constructor() {
    this.settingsManager = SettingsManager.getInstance();
  }

  /**
   * Show protection modal with smart UX
   */
  show(result: AnalysisResult, targetUrl: string, originalElement?: HTMLElement): void {
    // Remove any existing modal
    this.hide();

    // Create modal based on threat level
    if (result.threatLevel === 'HIGH') {
      this.showHighRiskModal(result, targetUrl, originalElement);
    } else if (result.threatLevel === 'MEDIUM') {
      this.showMediumRiskModal(result, targetUrl, originalElement);
    } else {
      this.showLowRiskModal(result, targetUrl, originalElement);
    }
  }

  /**
   * High Risk Modal - Strong blocking with clear explanation
   */
  private showHighRiskModal(result: AnalysisResult, targetUrl: string, originalElement?: HTMLElement): void {
    this.modalElement = this.createModalContainer('high-risk');
    
    const content = `
      <div class="easypiky-modal-content high-risk">
        <!-- Risk Indicator -->
        <div class="risk-header">
          <div class="risk-icon">🛑</div>
          <div class="risk-info">
            <h2>Dangerous Link Blocked</h2>
            <div class="risk-percentage high">${result.phishingLikelihood}% Phishing Risk</div>
          </div>
        </div>

        <!-- URL Display -->
        <div class="url-display">
          <div class="url-label">Blocked URL:</div>
          <div class="url-text">${this.truncateUrl(targetUrl)}</div>
        </div>

        <!-- Risk Explanation -->
        <div class="risk-explanation">
          <h3>⚠️ Why This Link is Dangerous:</h3>
          <ul class="risk-factors">
            ${result.riskFactors.map(factor => `<li>${factor}</li>`).join('')}
          </ul>
        </div>

        <!-- Recommendations -->
        <div class="recommendations">
          <h3>🛡️ What You Should Do:</h3>
          <ul class="recommendation-list">
            ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button class="btn btn-safe" id="easypiky-go-back">
            ← Go Back (Recommended)
          </button>
          <button class="btn btn-danger" id="easypiky-proceed-anyway">
            ⚠️ I Understand the Risk - Proceed
          </button>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <small>🛡️ EasyPiky Protection • <a href="#" id="easypiky-learn-more">Learn More</a></small>
        </div>
      </div>
    `;

    this.modalElement.innerHTML = content;
    document.body.appendChild(this.modalElement);

    // Add event listeners
    this.attachHighRiskListeners(targetUrl, originalElement);
    
    // Focus on safe option
    const goBackBtn = this.modalElement.querySelector('#easypiky-go-back') as HTMLElement;
    goBackBtn?.focus();
  }

  /**
   * Medium Risk Modal - Warning with options
   */
  private showMediumRiskModal(result: AnalysisResult, targetUrl: string, originalElement?: HTMLElement): void {
    this.modalElement = this.createModalContainer('medium-risk');
    
    const content = `
      <div class="easypiky-modal-content medium-risk">
        <!-- Risk Indicator -->
        <div class="risk-header">
          <div class="risk-icon">⚠️</div>
          <div class="risk-info">
            <h2>Suspicious Link Detected</h2>
            <div class="risk-percentage medium">${result.phishingLikelihood}% Phishing Risk</div>
          </div>
        </div>

        <!-- URL Display -->
        <div class="url-display">
          <div class="url-label">Destination:</div>
          <div class="url-text">${this.truncateUrl(targetUrl)}</div>
        </div>

        <!-- Quick Analysis -->
        <div class="quick-analysis">
          <div class="analysis-grid">
            <div class="analysis-item risk">
              <div class="analysis-label">⚠️ Risk Factors</div>
              <div class="analysis-count">${result.riskFactors.length}</div>
            </div>
            <div class="analysis-item safety">
              <div class="analysis-label">✅ Safety Factors</div>
              <div class="analysis-count">${result.safetyFactors.length}</div>
            </div>
          </div>
        </div>

        <!-- Smart Actions -->
        <div class="modal-actions">
          <button class="btn btn-safe" id="easypiky-go-back">
            ← Go Back
          </button>
          ${result.canAddToTrusted ? `
            <button class="btn btn-trust" id="easypiky-add-trusted">
              ✅ Trust & Continue
            </button>
          ` : ''}
          <button class="btn btn-caution" id="easypiky-proceed-caution">
            ⚠️ Continue with Caution
          </button>
        </div>

        <!-- Expandable Details -->
        <div class="details-toggle">
          <button class="btn-link" id="easypiky-show-details">
            🔍 Show Analysis Details
          </button>
        </div>

        <div class="analysis-details" id="easypiky-details" style="display: none;">
          ${this.renderAnalysisDetails(result)}
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <small>🛡️ EasyPiky Protection</small>
        </div>
      </div>
    `;

    this.modalElement.innerHTML = content;
    document.body.appendChild(this.modalElement);

    // Add event listeners
    this.attachMediumRiskListeners(result, targetUrl, originalElement);
  }

  /**
   * Low Risk Modal - Quick confirmation with trust option
   */
  private showLowRiskModal(result: AnalysisResult, targetUrl: string, originalElement?: HTMLElement): void {
    this.modalElement = this.createModalContainer('low-risk');
    
    const domain = this.extractDomain(targetUrl);
    
    const content = `
      <div class="easypiky-modal-content low-risk">
        <!-- Risk Indicator -->
        <div class="risk-header compact">
          <div class="risk-icon">❓</div>
          <div class="risk-info">
            <h2>Unknown Website</h2>
            <div class="risk-percentage low">${result.phishingLikelihood}% Phishing Risk</div>
          </div>
        </div>

        <!-- URL Display -->
        <div class="url-display compact">
          <div class="url-text">${this.truncateUrl(targetUrl)}</div>
        </div>

        <!-- Quick Question -->
        <div class="quick-question">
          <p>Do you recognize <strong>${domain}</strong>?</p>
        </div>

        <!-- Smart Actions -->
        <div class="modal-actions">
          <button class="btn btn-primary" id="easypiky-trust-and-go">
            ✅ Yes, Trust & Continue
          </button>
          <button class="btn btn-secondary" id="easypiky-just-continue">
            → Just Continue This Time
          </button>
          <button class="btn btn-safe" id="easypiky-go-back">
            ← Go Back
          </button>
        </div>

        <!-- Help Text -->
        <div class="help-text">
          <small>💡 Trusting this domain will allow future visits without interruption</small>
        </div>
      </div>
    `;

    this.modalElement.innerHTML = content;
    document.body.appendChild(this.modalElement);

    // Add event listeners
    this.attachLowRiskListeners(result, targetUrl, originalElement);
    
    // Focus on primary action
    const trustBtn = this.modalElement.querySelector('#easypiky-trust-and-go') as HTMLElement;
    trustBtn?.focus();
  }

  /**
   * Create modal container with styles
   */
  private createModalContainer(riskLevel: string): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'easypiky-protection-modal';
    overlay.className = `easypiky-modal-overlay ${riskLevel}`;
    
    // Add comprehensive styles
    const styles = `
      <style>
        .easypiky-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: easypiky-fade-in 0.2s ease-out;
        }

        @keyframes easypiky-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes easypiky-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .easypiky-modal-content {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: easypiky-slide-up 0.3s ease-out;
        }

        .risk-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f0f0f0;
        }

        .risk-header.compact {
          margin-bottom: 16px;
          padding-bottom: 12px;
        }

        .risk-icon {
          font-size: 48px;
          line-height: 1;
        }

        .risk-info h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .risk-percentage {
          font-size: 18px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 20px;
          display: inline-block;
        }

        .risk-percentage.high {
          background: #fee;
          color: #c53030;
        }

        .risk-percentage.medium {
          background: #fffbeb;
          color: #d69e2e;
        }

        .risk-percentage.low {
          background: #f0fff4;
          color: #38a169;
        }

        .url-display {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          word-break: break-all;
        }

        .url-display.compact {
          padding: 12px;
          margin-bottom: 16px;
        }

        .url-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .url-text {
          font-family: monospace;
          font-size: 14px;
          color: #333;
        }

        .risk-explanation, .recommendations {
          margin-bottom: 20px;
        }

        .risk-explanation h3, .recommendations h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .risk-factors, .recommendation-list {
          margin: 0;
          padding-left: 20px;
        }

        .risk-factors li, .recommendation-list li {
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .quick-analysis {
          margin-bottom: 20px;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .analysis-item {
          text-align: center;
          padding: 12px;
          border-radius: 8px;
        }

        .analysis-item.risk {
          background: #fee;
        }

        .analysis-item.safety {
          background: #f0fff4;
        }

        .analysis-label {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .analysis-count {
          font-size: 24px;
          font-weight: 700;
        }

        .quick-question {
          text-align: center;
          margin-bottom: 20px;
        }

        .quick-question p {
          font-size: 16px;
          margin: 0;
        }

        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .btn {
          padding: 14px 20px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn:focus {
          outline: 3px solid rgba(66, 153, 225, 0.5);
          outline-offset: 2px;
        }

        .btn-primary {
          background: #4299e1;
          color: white;
        }

        .btn-primary:hover {
          background: #3182ce;
        }

        .btn-secondary {
          background: #718096;
          color: white;
        }

        .btn-secondary:hover {
          background: #4a5568;
        }

        .btn-safe {
          background: #48bb78;
          color: white;
        }

        .btn-safe:hover {
          background: #38a169;
        }

        .btn-trust {
          background: #38a169;
          color: white;
        }

        .btn-trust:hover {
          background: #2f855a;
        }

        .btn-caution {
          background: #ed8936;
          color: white;
        }

        .btn-caution:hover {
          background: #dd6b20;
        }

        .btn-danger {
          background: #e53e3e;
          color: white;
        }

        .btn-danger:hover {
          background: #c53030;
        }

        .btn-link {
          background: none;
          border: none;
          color: #4299e1;
          text-decoration: underline;
          cursor: pointer;
          font-size: 14px;
        }

        .details-toggle {
          text-align: center;
          margin-bottom: 16px;
        }

        .analysis-details {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .help-text {
          text-align: center;
          color: #666;
        }

        .modal-footer {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          color: #666;
        }

        .modal-footer a {
          color: #4299e1;
          text-decoration: none;
        }

        .modal-footer a:hover {
          text-decoration: underline;
        }
      </style>
    `;

    overlay.innerHTML = styles;
    return overlay;
  }

  /**
   * Attach event listeners for high risk modal
   */
  private attachHighRiskListeners(targetUrl: string, originalElement?: HTMLElement): void {
    const goBackBtn = this.modalElement?.querySelector('#easypiky-go-back');
    const proceedBtn = this.modalElement?.querySelector('#easypiky-proceed-anyway');

    goBackBtn?.addEventListener('click', () => {
      this.hide();
    });

    proceedBtn?.addEventListener('click', () => {
      this.hide();
      this.navigateToUrl(targetUrl, originalElement);
    });

    // Close on escape
    this.addEscapeListener();
  }

  /**
   * Attach event listeners for medium risk modal
   */
  private attachMediumRiskListeners(result: AnalysisResult, targetUrl: string, originalElement?: HTMLElement): void {
    const goBackBtn = this.modalElement?.querySelector('#easypiky-go-back');
    const addTrustedBtn = this.modalElement?.querySelector('#easypiky-add-trusted');
    const proceedBtn = this.modalElement?.querySelector('#easypiky-proceed-caution');
    const showDetailsBtn = this.modalElement?.querySelector('#easypiky-show-details');

    goBackBtn?.addEventListener('click', () => {
      this.hide();
    });

    addTrustedBtn?.addEventListener('click', async () => {
      await this.addToTrusted(targetUrl);
      this.hide();
      this.navigateToUrl(targetUrl, originalElement);
    });

    proceedBtn?.addEventListener('click', () => {
      this.hide();
      this.navigateToUrl(targetUrl, originalElement);
    });

    showDetailsBtn?.addEventListener('click', () => {
      const details = this.modalElement?.querySelector('#easypiky-details') as HTMLElement;
      if (details) {
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
        (showDetailsBtn as HTMLElement).textContent = 
          details.style.display === 'none' ? '🔍 Show Analysis Details' : '🔼 Hide Analysis Details';
      }
    });

    this.addEscapeListener();
  }

  /**
   * Attach event listeners for low risk modal
   */
  private attachLowRiskListeners(result: AnalysisResult, targetUrl: string, originalElement?: HTMLElement): void {
    const trustBtn = this.modalElement?.querySelector('#easypiky-trust-and-go');
    const continueBtn = this.modalElement?.querySelector('#easypiky-just-continue');
    const goBackBtn = this.modalElement?.querySelector('#easypiky-go-back');

    trustBtn?.addEventListener('click', async () => {
      await this.addToTrusted(targetUrl);
      this.hide();
      this.navigateToUrl(targetUrl, originalElement);
    });

    continueBtn?.addEventListener('click', () => {
      this.hide();
      this.navigateToUrl(targetUrl, originalElement);
    });

    goBackBtn?.addEventListener('click', () => {
      this.hide();
    });

    this.addEscapeListener();
  }

  /**
   * Add escape key listener
   */
  private addEscapeListener(): void {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Add domain to trusted list
   */
  private async addToTrusted(url: string): Promise<void> {
    try {
      const domain = this.extractDomain(url);
      await this.settingsManager.addTrustedDomain(domain);
      
      // Show brief success message
      this.showSuccessToast(`✅ ${domain} added to trusted domains`);
    } catch (error) {
      console.error('Failed to add domain to trusted list:', error);
    }
  }

  /**
   * Show success toast
   */
  private showSuccessToast(message: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #48bb78;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000000;
      animation: easypiky-slide-in 0.3s ease-out;
    `;
    
    toast.innerHTML = `
      <style>
        @keyframes easypiky-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      ${message}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Navigate to URL
   */
  private navigateToUrl(url: string, originalElement?: HTMLElement): void {
    if (originalElement && originalElement.tagName === 'A') {
      const link = originalElement as HTMLAnchorElement;
      if (link.target === '_blank') {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    } else {
      window.location.href = url;
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.hostname.split('.');
      return parts.length >= 2 ? parts.slice(-2).join('.') : urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Truncate URL for display
   */
  private truncateUrl(url: string, maxLength: number = 60): string {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }

  /**
   * Render analysis details
   */
  private renderAnalysisDetails(result: AnalysisResult): string {
    return `
      <div class="analysis-section">
        <h4>🔍 Analysis Details</h4>
        <div class="confidence-bar">
          <div class="confidence-label">Confidence: ${Math.round(result.confidence * 100)}%</div>
          <div class="confidence-track">
            <div class="confidence-fill" style="width: ${result.confidence * 100}%"></div>
          </div>
        </div>
      </div>
      
      ${result.riskFactors.length > 0 ? `
        <div class="analysis-section">
          <h4>⚠️ Risk Factors Found</h4>
          <ul>
            ${result.riskFactors.map(factor => `<li>${factor}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${result.safetyFactors.length > 0 ? `
        <div class="analysis-section">
          <h4>✅ Safety Factors Found</h4>
          <ul>
            ${result.safetyFactors.map(factor => `<li>${factor}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }

  /**
   * Hide modal
   */
  hide(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
  }
}