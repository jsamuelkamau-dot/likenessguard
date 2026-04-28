/**
 * EasyPiky Blocking Modal
 * Displays when a suspicious link is detected
 */

export interface ModalOptions {
  url: string;
  decision: 'SAFE' | 'SUSPICIOUS' | 'UNKNOWN';
  reason: string;
  confidence: number;
  threats?: string[];
  allowOverride?: boolean;
  requiresEmailVerification?: boolean;
}

export class BlockingModal {
  private modalElement: HTMLElement | null = null;
  private onProceed?: () => void;
  private onCancel?: () => void;
  private onVerifyEmail?: () => void;
  private onTrust?: () => void;

  show(options: ModalOptions): Promise<'proceed' | 'cancel' | 'verify' | 'trust'> {
    return new Promise((resolve) => {
      this.onProceed = () => resolve('proceed');
      this.onCancel = () => resolve('cancel');
      this.onVerifyEmail = () => resolve('verify');
      this.onTrust = () => resolve('trust');

      this.createModal(options);
    });
  }

  private createModal(options: ModalOptions): void {
    // Remove existing modal if any
    this.remove();

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'easypiky-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 22, 18, 0.95);
      backdrop-filter: blur(8px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: easypiky-fadeIn 0.3s ease;
      overflow-y: auto;
      padding: 20px 0;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #0f2419 0%, #1a3d2e 100%);
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 255, 136, 0.3);
      border: 2px solid rgba(0, 255, 136, 0.3);
      animation: easypiky-slideUp 0.3s ease;
      margin: auto;
    `;

    // Header
    const header = this.createHeader(options);
    modal.appendChild(header);

    // URL Display
    const urlDisplay = this.createURLDisplay(options.url);
    modal.appendChild(urlDisplay);

    // Reason
    const reason = this.createReason(options);
    modal.appendChild(reason);

    // Threats list
    if (options.threats && options.threats.length > 0) {
      const threatsList = this.createThreatsList(options.threats);
      modal.appendChild(threatsList);
    }

    // Actions
    const actions = this.createActions(options);
    modal.appendChild(actions);

    // Footer
    const footer = this.createFooter();
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.modalElement = overlay;

    // Add animations
    this.addAnimations();
  }

  private createHeader(options: ModalOptions): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      text-align: center;
      margin-bottom: 24px;
    `;

    // Determine colors based on risk level
    const isHighRisk = options.confidence >= 0.7;
    const isMediumRisk = options.confidence >= 0.5 && options.confidence < 0.7;
    
    const iconBg = isHighRisk 
      ? 'rgba(255, 68, 68, 0.2)' 
      : isMediumRisk 
        ? 'rgba(255, 170, 0, 0.2)' 
        : 'rgba(255, 170, 0, 0.15)';
    
    const iconBorder = isHighRisk 
      ? '#ff4444' 
      : isMediumRisk 
        ? '#ffaa00' 
        : '#ffaa00';
    
    const iconGlow = isHighRisk 
      ? 'rgba(255, 68, 68, 0.5)' 
      : isMediumRisk 
        ? 'rgba(255, 170, 0, 0.5)' 
        : 'rgba(255, 170, 0, 0.3)';

    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      background: ${iconBg};
      border: 2px solid ${iconBorder};
      box-shadow: 0 0 20px ${iconGlow};
    `;
    icon.textContent = options.decision === 'SUSPICIOUS' ? '⚠️' : '❓';
    header.appendChild(icon);

    const title = document.createElement('h2');
    const titleColor = isHighRisk ? '#ff8888' : isMediumRisk ? '#ffaa00' : '#ffaa00';
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: ${titleColor};
      text-shadow: 0 0 10px currentColor;
    `;
    title.textContent = options.decision === 'SUSPICIOUS' 
      ? '🛡️ Suspicious Link Blocked' 
      : '⚠️ Unknown Link Detected';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      margin: 0;
      font-size: 14px;
      color: #7dd3ae;
    `;
    subtitle.textContent = 'EasyPiky has detected potential security risks';
    header.appendChild(subtitle);

    return header;
  }

  private createURLDisplay(url: string): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(0, 255, 136, 0.05);
      border: 1px solid rgba(0, 255, 136, 0.2);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      word-break: break-all;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 12px;
      color: #7dd3ae;
      margin-bottom: 4px;
      font-weight: 500;
    `;
    label.textContent = 'Destination URL:';
    container.appendChild(label);

    const urlText = document.createElement('div');
    urlText.style.cssText = `
      font-size: 14px;
      color: #b8e6d5;
      font-family: monospace;
    `;
    urlText.textContent = url;
    container.appendChild(urlText);

    return container;
  }

  private createReason(options: ModalOptions): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 20px;
    `;

    // Risk percentage badge with color intensity
    const riskPercentage = Math.round(options.confidence * 100);
    const riskColor = this.getRiskColor(riskPercentage);
    const riskBg = this.getRiskBackground(riskPercentage);
    
    const riskBadge = document.createElement('div');
    riskBadge.style.cssText = `
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      background: ${riskBg};
      color: ${riskColor};
      border: 2px solid ${riskColor};
      box-shadow: 0 0 15px ${riskColor}40;
    `;
    riskBadge.textContent = `${riskPercentage}% Phishing Risk`;
    container.appendChild(riskBadge);

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #00ff88;
    `;
    title.textContent = 'Why was this blocked?';
    container.appendChild(title);

    const reason = document.createElement('p');
    reason.style.cssText = `
      margin: 0;
      font-size: 14px;
      color: #b8e6d5;
      line-height: 1.6;
    `;
    reason.textContent = options.reason;
    container.appendChild(reason);

    return container;
  }

  private getRiskColor(percentage: number): string {
    if (percentage >= 70) return '#ff4444'; // High risk - bright red
    if (percentage >= 50) return '#ff6666'; // Medium-high risk - lighter red
    if (percentage >= 35) return '#ffaa00'; // Medium risk - orange
    return '#ffcc00'; // Low risk - yellow
  }

  private getRiskBackground(percentage: number): string {
    if (percentage >= 70) return 'rgba(255, 68, 68, 0.2)';
    if (percentage >= 50) return 'rgba(255, 102, 102, 0.2)';
    if (percentage >= 35) return 'rgba(255, 170, 0, 0.2)';
    return 'rgba(255, 204, 0, 0.2)';
  }

  private createThreatsList(threats: string[]): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 20px;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #00ff88;
    `;
    title.textContent = 'Detected Threats:';
    container.appendChild(title);

    const list = document.createElement('ul');
    list.style.cssText = `
      margin: 0;
      padding-left: 20px;
      color: #b8e6d5;
    `;

    threats.forEach(threat => {
      const item = document.createElement('li');
      item.style.cssText = `
        margin-bottom: 8px;
        font-size: 14px;
        line-height: 1.5;
      `;
      item.textContent = threat;
      list.appendChild(item);
    });

    container.appendChild(list);
    return container;
  }

  private createActions(options: ModalOptions): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    `;

    const riskPercentage = Math.round(options.confidence * 100);
    const isHighRisk = riskPercentage >= 70;

    // Cancel button (ALWAYS shown first)
    const cancelBtn = this.createButton('🔙 Go Back (Recommended)', 'primary', () => {
      this.remove();
      this.onCancel?.();
    });
    container.appendChild(cancelBtn);

    // Email verification button (if required)
    if (options.requiresEmailVerification) {
      const verifyBtn = this.createButton('📧 Verify Sender Email', 'secondary', () => {
        this.remove();
        this.onVerifyEmail?.();
      });
      container.appendChild(verifyBtn);
    }

    // Trust Domain button (only if risk < 70%)
    if (!isHighRisk) {
      const trustBtn = this.createButton('✅ Trust Domain & Continue', 'trust', () => {
        this.remove();
        this.onTrust?.();
      });
      container.appendChild(trustBtn);
    }

    // Proceed button (only if risk < 70% and override allowed)
    if (!isHighRisk && options.allowOverride) {
      const proceedBtn = this.createButton('⚠️ Proceed Anyway (Not Recommended)', 'danger', () => {
        this.remove();
        this.onProceed?.();
      });
      container.appendChild(proceedBtn);
    }

    // High risk warning (if risk >= 70%)
    if (isHighRisk) {
      const warning = document.createElement('div');
      warning.style.cssText = `
        background: rgba(255, 68, 68, 0.15);
        border: 2px solid #ff4444;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        color: #ff8888;
        font-weight: 600;
      `;
      warning.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">🚫</div>
        <div>High Risk - Access Blocked</div>
        <div style="font-size: 12px; margin-top: 8px; font-weight: normal;">
          This domain can only be trusted from the dashboard settings
        </div>
      `;
      container.appendChild(warning);
    }

    return container;
  }

  private createButton(text: string, type: 'primary' | 'secondary' | 'danger' | 'trust', onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    
    let styles = `
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      width: 100%;
    `;

    if (type === 'primary') {
      styles += `
        background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
        color: #0a1612;
        box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
      `;
    } else if (type === 'secondary') {
      styles += `
        background: rgba(0, 255, 136, 0.1);
        color: #00ff88;
        border: 1px solid rgba(0, 255, 136, 0.3);
      `;
    } else if (type === 'trust') {
      styles += `
        background: rgba(0, 170, 255, 0.2);
        color: #00aaff;
        border: 1px solid rgba(0, 170, 255, 0.4);
      `;
    } else if (type === 'danger') {
      styles += `
        background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(255, 68, 68, 0.4);
      `;
    }

    button.style.cssText = styles;
    button.textContent = text;
    button.addEventListener('click', onClick);

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      if (type === 'primary') {
        button.style.boxShadow = '0 6px 25px rgba(0, 255, 136, 0.5)';
      } else if (type === 'danger') {
        button.style.boxShadow = '0 6px 25px rgba(255, 68, 68, 0.6)';
      } else if (type === 'trust') {
        button.style.boxShadow = '0 6px 25px rgba(0, 170, 255, 0.4)';
      }
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      if (type === 'primary') {
        button.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.3)';
      } else if (type === 'danger') {
        button.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.4)';
      } else if (type === 'trust') {
        button.style.boxShadow = 'none';
      }
    });

    return button;
  }

  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.style.cssText = `
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid rgba(0, 255, 136, 0.2);
    `;

    const text = document.createElement('p');
    text.style.cssText = `
      margin: 0;
      font-size: 12px;
      color: #7dd3ae;
    `;
    text.innerHTML = '🛡️ Protected by <strong style="color: #00ff88;">EasyPiky</strong>';
    footer.appendChild(text);

    return footer;
  }

  private addAnimations(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes easypiky-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes easypiky-slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  remove(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
  }
}
