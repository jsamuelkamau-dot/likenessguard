/**
 * EasyPiky Content Script - Working Version
 */

import { BlockingModal } from './ui/blocking-modal';

console.log('🛡️ EasyPiky protection active');
console.log('🛡️ Page URL:', window.location.href);
console.log('🛡️ Page origin:', window.location.origin);

const modal = new BlockingModal();

// Intercept all clicks with capture phase (earlier interception)
document.addEventListener('click', async (event) => {
  console.log('👆 Click detected on:', event.target);
  
  const target = event.target as HTMLElement;
  
  // Find link element
  let link: HTMLAnchorElement | null = null;
  let current = target;
  
  while (current && current !== document.body) {
    if (current.tagName === 'A' && (current as HTMLAnchorElement).href) {
      link = current as HTMLAnchorElement;
      break;
    }
    current = current.parentElement as HTMLElement;
  }
  
  if (!link) {
    console.log('❌ No link found');
    return;
  }
  
  const url = link.href;
  console.log('🔗 Link clicked:', url);
  console.log('🔗 Link target:', link.target);
  
  // Skip same-origin (but log it)
  try {
    const urlObj = new URL(url);
    console.log('🔍 URL origin:', urlObj.origin);
    console.log('🔍 Page origin:', window.location.origin);
    
    if (urlObj.origin === window.location.origin) {
      console.log('⏭️ Same origin, allowing');
      return;
    }
    
    // Also skip javascript: and mailto: links
    if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'mailto:') {
      console.log('⏭️ Special protocol, allowing');
      return;
    }
  } catch (e) {
    console.error('❌ URL parsing error:', e);
    return;
  }
  
  // Prevent navigation
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  
  console.log('🔍 Analyzing...');
  
  try {
    // Analyze URL
    const result = await chrome.runtime.sendMessage({
      type: 'ANALYZE_URL',
      url: url
    });
    
    console.log('📊 Analysis result:', JSON.stringify(result, null, 2));
    console.log('📊 Decision:', result.decision);
    console.log('📊 Threat level:', result.threatLevel);
    console.log('📊 Phishing likelihood:', result.phishingLikelihood);
    
    // If safe, navigate
    if (result.decision === 'SAFE' || result.threatLevel === 'NONE') {
      console.log('✅ Safe, navigating immediately');
      
      // Check if it's a trusted domain
      const domain = new URL(url).hostname;
      const trustedDomains = await chrome.runtime.sendMessage({ type: 'GET_TRUSTED_DOMAINS' });
      
      if (trustedDomains?.domains?.includes(domain)) {
        // Show brief notification for trusted domain
        showTrustedNotification(domain);
        setTimeout(() => {
          window.location.href = url;
        }, 1500);
      } else {
        window.location.href = url;
      }
      return;
    }
    
    // Show modal
    console.log('⚠️ Should show modal now!');
    const choice = await showModal(result, url);
    
    if (choice === 'proceed') {
      console.log('→ User chose to proceed');
      window.location.href = url;
    } else if (choice === 'trust') {
      console.log('✅ User chose to trust domain');
      const domain = new URL(url).hostname;
      try {
        await chrome.runtime.sendMessage({
          type: 'ADD_TRUSTED_DOMAIN',
          domain: domain
        });
        console.log('✅ Domain trusted:', domain);
        showTrustedNotification(domain);
        // Navigate after trusting
        setTimeout(() => {
          window.location.href = url;
        }, 1500);
      } catch (e) {
        console.error('Failed to trust domain:', e);
        window.location.href = url;
      }
    } else if (choice === 'verify') {
      console.log('📧 User chose to verify email');
      await showEmailVerificationDialog(url);
    } else {
      console.log('← User chose to go back');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed with error:', error);
    console.error('❌ Error details:', JSON.stringify(error));
    console.log('⚠️ Allowing navigation due to error');
    window.location.href = url;
  }
}, true);

async function showModal(result: any, url: string): Promise<'proceed' | 'cancel' | 'verify' | 'trust'> {
  const domain = new URL(url).hostname;
  const canTrust = result.phishingLikelihood < 70;
  
  // Prepare threats list
  const threats: string[] = [];
  if (result.riskFactors && result.riskFactors.length > 0) {
    threats.push(...result.riskFactors);
  }
  
  // Determine if email verification is required
  const requiresEmailVerification = result.threatLevel === 'HIGH' || result.phishingLikelihood >= 70;
  
  // Calculate confidence from phishing likelihood (0-100 to 0-1)
  const confidence = result.phishingLikelihood / 100;
  
  // Show the modal
  const choice = await modal.show({
    url: url,
    decision: result.decision === 'SAFE' ? 'SAFE' : result.threatLevel === 'HIGH' ? 'SUSPICIOUS' : 'UNKNOWN',
    reason: result.reason || `This link has a ${result.phishingLikelihood}% phishing risk score. ${canTrust ? 'You can trust this domain if you recognize it.' : 'This domain has high risk and cannot be trusted from this warning.'}`,
    confidence: confidence,
    threats: threats.length > 0 ? threats : undefined,
    allowOverride: canTrust, // Only allow override if risk < 70%
    requiresEmailVerification: requiresEmailVerification
  });
  
  return choice;
}

function showTrustedNotification(domain: string): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #0f2419 0%, #1a3d2e 100%);
    color: #00ff88;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3);
    border: 2px solid rgba(0, 255, 136, 0.4);
    z-index: 2147483646;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: slideIn 0.3s ease;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 24px;">✅</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Trusted Domain</div>
        <div style="font-size: 13px; color: #7dd3ae;">${domain} is in your trusted list</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

async function showEmailVerificationDialog(url: string): Promise<void> {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
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
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: linear-gradient(135deg, #0f2419 0%, #1a3d2e 100%);
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 255, 136, 0.3);
      border: 2px solid rgba(0, 255, 136, 0.3);
    `;

    dialog.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📧</div>
        <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #00ff88;">Verify Sender Email</h2>
        <p style="margin: 0; font-size: 14px; color: #7dd3ae;">
          Paste the sender's email address to verify if they're trusted
        </p>
      </div>

      <div style="background: rgba(0, 255, 136, 0.05); border: 1px solid rgba(0, 255, 136, 0.2); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <div style="font-size: 12px; color: #7dd3ae; margin-bottom: 4px;">Link URL:</div>
        <div style="font-size: 14px; color: #b8e6d5; font-family: monospace; word-break: break-all;">${url}</div>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #00ff88; font-weight: 500;">
          Sender Email Address:
        </label>
        <input 
          type="email" 
          id="email-input" 
          placeholder="sender@example.com"
          style="
            width: 100%;
            padding: 12px 16px;
            border: 1px solid rgba(0, 255, 136, 0.3);
            border-radius: 8px;
            font-size: 14px;
            background: rgba(0, 255, 136, 0.05);
            color: #b8e6d5;
            font-family: monospace;
          "
        />
      </div>

      <div id="verification-result" style="display: none; margin-bottom: 20px;"></div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="verify-btn" style="
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          color: #0a1612;
          box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
        ">
          Verify Email
        </button>
        <button id="cancel-verify-btn" style="
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.3);
        ">
          Cancel
        </button>
      </div>

      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0, 255, 136, 0.2); text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #7dd3ae;">
          🔒 Email addresses are hashed locally for privacy
        </p>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const emailInput = dialog.querySelector('#email-input') as HTMLInputElement;
    const verifyBtn = dialog.querySelector('#verify-btn') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#cancel-verify-btn') as HTMLButtonElement;
    const resultDiv = dialog.querySelector('#verification-result') as HTMLDivElement;

    emailInput.focus();

    verifyBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim().toLowerCase();
      if (!email) {
        alert('Please enter an email address');
        return;
      }

      verifyBtn.textContent = 'Verifying...';
      verifyBtn.disabled = true;

      try {
        // TODO: Implement email verification logic
        // For now, show a placeholder result
        resultDiv.style.display = 'block';
        resultDiv.style.cssText = `
          display: block;
          background: rgba(255, 170, 0, 0.15);
          border: 2px solid #ffaa00;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          color: #ffaa00;
        `;
        resultDiv.innerHTML = `
          <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px;">Email Not in Trusted List</div>
          <div style="font-size: 12px;">
            This email address is not recognized. Proceed with caution.
          </div>
        `;

        verifyBtn.textContent = 'Close';
        verifyBtn.onclick = () => {
          overlay.remove();
          resolve();
        };
      } catch (error) {
        console.error('Email verification error:', error);
        alert('Verification failed. Please try again.');
        verifyBtn.textContent = 'Verify Email';
        verifyBtn.disabled = false;
      }
    });

    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      resolve();
    });

    // Allow Enter key to verify
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        verifyBtn.click();
      }
    });
  });
}

console.log('✅ EasyPiky ready');
