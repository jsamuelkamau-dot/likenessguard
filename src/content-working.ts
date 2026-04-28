/**
 * EasyPiky Content Script - Working Version
 */

import { BlockingModal } from './ui/blocking-modal';

console.log('🛡️ EasyPiky protection active');
console.log('🛡️ Page URL:', window.location.href);
console.log('🛡️ Page origin:', window.location.origin);
console.log('🛡️ Is iframe:', window.self !== window.top);

const modal = new BlockingModal();

// Detect if we're in an email client context
function detectEmailContext(): boolean {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  
  // Gmail
  if (hostname.includes('mail.google.com') || url.includes('mail.google.com')) {
    return true;
  }
  
  // Outlook/Hotmail
  if (hostname.includes('outlook.') || hostname.includes('live.com') || 
      hostname.includes('hotmail.com') || url.includes('outlook')) {
    return true;
  }
  
  // Yahoo Mail
  if (hostname.includes('mail.yahoo.com') || url.includes('mail.yahoo')) {
    return true;
  }
  
  // ProtonMail
  if (hostname.includes('protonmail.com') || hostname.includes('proton.me')) {
    return true;
  }
  
  // Other common email providers
  if (hostname.includes('mail.') || url.includes('/mail/') || url.includes('/email/')) {
    return true;
  }
  
  // Check for iframe in email context
  if (window.self !== window.top) {
    try {
      const parentUrl = document.referrer.toLowerCase();
      if (parentUrl.includes('mail') || parentUrl.includes('email')) {
        return true;
      }
    } catch (e) {
      // Cross-origin iframe, can't access parent
    }
  }
  
  return false;
}

// Unwrap email tracking links to get the real destination
function unwrapTrackingLink(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Google's link tracking (Gmail)
    if (urlObj.hostname === 'www.google.com' && urlObj.pathname === '/url') {
      const realUrl = urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
      if (realUrl) {
        console.log('📧 Unwrapped Google tracking link:', realUrl);
        return realUrl;
      }
    }
    
    // Microsoft's Safe Links (Outlook)
    if (urlObj.hostname.includes('safelinks.protection.outlook.com')) {
      const realUrl = urlObj.searchParams.get('url');
      if (realUrl) {
        console.log('📧 Unwrapped Outlook Safe Link:', realUrl);
        return decodeURIComponent(realUrl);
      }
    }
    
    // ProtonMail tracking
    if (urlObj.hostname.includes('protonmail.com') && urlObj.pathname.includes('/l/')) {
      const realUrl = urlObj.searchParams.get('u');
      if (realUrl) {
        console.log('📧 Unwrapped ProtonMail link:', realUrl);
        return decodeURIComponent(realUrl);
      }
    }
    
    // Generic tracking parameter unwrapping
    const trackingParams = ['url', 'u', 'link', 'redirect', 'target', 'destination', 'goto'];
    for (const param of trackingParams) {
      const value = urlObj.searchParams.get(param);
      if (value && value.startsWith('http')) {
        console.log(`📧 Unwrapped tracking link (${param}):`, value);
        return value;
      }
    }
  } catch (e) {
    console.error('Error unwrapping tracking link:', e);
  }
  
  return url;
}

// Intercept all clicks with capture phase (earlier interception)
document.addEventListener('click', async (event) => {
  const clickedElement = event.target as HTMLElement;
  console.log('👆 Click detected on:', clickedElement.tagName, clickedElement.className);
  
  const target = event.target as HTMLElement;
  
  // Find link element - check multiple ways
  let link: HTMLAnchorElement | null = null;
  let current = target;
  let extractedUrl: string | null = null;
  
  // Method 1: Traverse up to find <a> tag
  while (current && current !== document.body) {
    if (current.tagName === 'A') {
      link = current as HTMLAnchorElement;
      console.log('✅ Found <a> tag:', link.href);
      break;
    }
    current = current.parentElement as HTMLElement;
  }
  
  // Method 2: Check if target itself has href attribute (some email clients use this)
  if (!link && target.hasAttribute && target.hasAttribute('href')) {
    link = target as HTMLAnchorElement;
    console.log('✅ Found element with href attribute');
  }
  
  // Method 3: Check for data-saferedirecturl (Gmail specific)
  if (!link && target.hasAttribute && target.hasAttribute('data-saferedirecturl')) {
    const safeUrl = target.getAttribute('data-saferedirecturl');
    if (safeUrl) {
      console.log('📧 Found Gmail safe redirect URL:', safeUrl);
      extractedUrl = safeUrl;
      // Create a temporary link element
      link = document.createElement('a');
      link.href = safeUrl;
    }
  }
  
  // Method 4: Check parent elements more aggressively (up to 10 levels)
  if (!link) {
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (parent.tagName === 'A' && (parent as HTMLAnchorElement).href) {
        link = parent as HTMLAnchorElement;
        console.log('✅ Found <a> tag in parent (depth:', depth, ')');
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Method 5: Check for any element with href attribute (Gmail sometimes uses this)
  if (!link) {
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (parent.hasAttribute && parent.hasAttribute('href')) {
        const href = parent.getAttribute('href');
        if (href && href.startsWith('http')) {
          link = parent as HTMLAnchorElement;
          console.log('✅ Found element with href attribute (depth:', depth, ')');
          break;
        }
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Method 6: Check for role="link" attribute (Gmail sometimes uses this)
  if (!link) {
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (parent.getAttribute('role') === 'link') {
        // Look for data attributes that might contain the URL
        const dataUrl = parent.getAttribute('data-url') || 
                       parent.getAttribute('data-href') ||
                       parent.getAttribute('data-link');
        if (dataUrl && dataUrl.startsWith('http')) {
          console.log('✅ Found role="link" with data-url (depth:', depth, ')');
          extractedUrl = dataUrl;
          link = document.createElement('a');
          link.href = dataUrl;
          break;
        }
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Method 7: Check for onclick handlers that might contain URLs
  if (!link) {
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      const onclickAttr = parent.getAttribute('onclick');
      if (onclickAttr) {
        // Try to extract URL from onclick handler
        const urlMatch = onclickAttr.match(/https?:\/\/[^\s'"]+/);
        if (urlMatch) {
          console.log('✅ Found URL in onclick handler (depth:', depth, ')');
          extractedUrl = urlMatch[0];
          link = document.createElement('a');
          link.href = extractedUrl;
          break;
        }
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Method 8: Check for data-saferedirecturl in parent elements
  if (!link) {
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (parent.hasAttribute && parent.hasAttribute('data-saferedirecturl')) {
        const safeUrl = parent.getAttribute('data-saferedirecturl');
        if (safeUrl) {
          console.log('📧 Found Gmail safe redirect URL in parent (depth:', depth, ')');
          extractedUrl = safeUrl;
          link = document.createElement('a');
          link.href = safeUrl;
          break;
        }
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Method 9: Check for jsaction attribute (Gmail specific)
  if (!link) {
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      const jsaction = parent.getAttribute('jsaction');
      if (jsaction) {
        // Gmail uses jsaction, but we need to find the actual link
        // Look for any href in this element or its children
        const linkInside = parent.querySelector('a[href]');
        if (linkInside && (linkInside as HTMLAnchorElement).href) {
          link = linkInside as HTMLAnchorElement;
          console.log('✅ Found link inside jsaction element (depth:', depth, ')');
          break;
        }
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Method 10: Use getComputedStyle to check if element looks like a link
  if (!link) {
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      const style = window.getComputedStyle(parent);
      if (style.cursor === 'pointer' || parent.getAttribute('role') === 'button') {
        // This might be a clickable element, check for any URL-like data
        const allAttrs = Array.from(parent.attributes);
        for (const attr of allAttrs) {
          if (attr.value.match(/^https?:\/\//)) {
            console.log('✅ Found URL in attribute:', attr.name, '(depth:', depth, ')');
            extractedUrl = attr.value;
            link = document.createElement('a');
            link.href = extractedUrl;
            break;
          }
        }
        if (link) break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  if (!link || !link.href) {
    console.log('❌ No link found - clicked element is not a link (this is normal for buttons, divs, etc.)');
    console.log('❌ Clicked element details:', {
      tagName: clickedElement.tagName,
      className: clickedElement.className,
      id: clickedElement.id,
      hasHref: clickedElement.hasAttribute('href'),
      hasRole: clickedElement.getAttribute('role'),
      hasDataUrl: clickedElement.hasAttribute('data-url'),
      hasOnclick: clickedElement.hasAttribute('onclick'),
      parentTagName: clickedElement.parentElement?.tagName,
      allAttributes: Array.from(clickedElement.attributes || []).map(attr => `${attr.name}="${attr.value.substring(0, 50)}"`).join(', ')
    });
    return;
  }
  
  const url = link.href;
  console.log('🔗 Link clicked:', url);
  console.log('🔗 Link target:', link.target);
  console.log('🔗 Link text:', link.textContent?.substring(0, 50));
  console.log('🔗 Link attributes:', {
    href: link.getAttribute('href'),
    'data-saferedirecturl': link.getAttribute('data-saferedirecturl'),
    'data-url': link.getAttribute('data-url')
  });
  
  // Detect if we're in an email context
  const isEmailContext = detectEmailContext();
  console.log('📧 Email context:', isEmailContext);
  
  // Unwrap tracking links if in email context
  let finalUrl = url;
  if (isEmailContext) {
    finalUrl = unwrapTrackingLink(url);
    if (finalUrl !== url) {
      console.log('📧 Original URL:', url);
      console.log('📧 Unwrapped URL:', finalUrl);
    }
  }
  
  // Parse URL
  try {
    const urlObj = new URL(finalUrl);
    console.log('🔍 URL origin:', urlObj.origin);
    console.log('🔍 Page origin:', window.location.origin);
    console.log('🔍 URL hostname:', urlObj.hostname);
    console.log('🔍 URL pathname:', urlObj.pathname);
    
    // Skip javascript: and mailto: links
    if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'mailto:') {
      console.log('⏭️ Special protocol, allowing');
      return;
    }
    
    // Check if it's a Google redirect URL (Gmail wraps external links)
    const isGoogleRedirect = urlObj.hostname === 'www.google.com' && urlObj.pathname === '/url';
    
    // Allow same-origin ONLY if it's NOT a Google redirect
    if (urlObj.origin === window.location.origin && !isGoogleRedirect) {
      console.log('⏭️ Same origin navigation (Gmail UI), allowing');
      return;
    }
    
    // If it's a Google redirect, we'll analyze it (it gets unwrapped above)
    if (isGoogleRedirect) {
      console.log('📧 Google redirect detected, will analyze unwrapped URL');
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
    // Analyze URL (use unwrapped URL)
    const result = await chrome.runtime.sendMessage({
      type: 'ANALYZE_URL',
      url: finalUrl,
      context: isEmailContext ? 'email' : 'web'
    });
    
    console.log('📊 Analysis result:', JSON.stringify(result, null, 2));
    console.log('📊 Decision:', result.decision);
    console.log('📊 Threat level:', result.threatLevel);
    console.log('📊 Phishing likelihood:', result.phishingLikelihood);
    console.log('📊 Context:', isEmailContext ? 'EMAIL' : 'WEB');
    
    // For email context, be more cautious
    const safeThreshold = isEmailContext ? 25 : 30; // Lower threshold for emails
    
    // Check if it's a trusted domain first
    const domain = new URL(finalUrl).hostname;
    const trustedDomainsResponse = await chrome.runtime.sendMessage({ type: 'GET_TRUSTED_DOMAINS' });
    const trustedDomains = trustedDomainsResponse?.domains || [];
    
    console.log('🔍 Checking trusted domains:', trustedDomains);
    console.log('🔍 Current domain:', domain);
    console.log('🔍 Is trusted:', trustedDomains.includes(domain));
    
    // If trusted domain, show notification and navigate
    if (trustedDomains.includes(domain)) {
      console.log('✅ Trusted domain, navigating immediately');
      showTrustedNotification(domain);
      setTimeout(() => {
        window.location.href = finalUrl;
      }, 1500);
      return;
    }
    
    // If safe based on analysis, navigate
    if (result.decision === 'SAFE' || result.phishingLikelihood < safeThreshold) {
      console.log('✅ Safe based on analysis, navigating immediately');
      window.location.href = finalUrl;
      return;
    }
    
    // Show modal
    console.log('⚠️ Should show modal now!');
    const choice = await showModal(result, finalUrl, isEmailContext);
    
    if (choice === 'proceed') {
      console.log('→ User chose to proceed');
      window.location.href = finalUrl;
    } else if (choice === 'trust') {
      console.log('✅ User chose to trust domain');
      const domain = new URL(finalUrl).hostname;
      try {
        await chrome.runtime.sendMessage({
          type: 'ADD_TRUSTED_DOMAIN',
          domain: domain
        });
        console.log('✅ Domain trusted:', domain);
        showTrustedNotification(domain);
        // Navigate after trusting
        setTimeout(() => {
          window.location.href = finalUrl;
        }, 1500);
      } catch (e) {
        console.error('Failed to trust domain:', e);
        window.location.href = finalUrl;
      }
    } else if (choice === 'verify') {
      console.log('📧 User chose to verify email');
      await showEmailVerificationDialog(finalUrl);
    } else {
      console.log('← User chose to go back');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed with error:', error);
    console.error('❌ Error details:', JSON.stringify(error));
    console.log('⚠️ Allowing navigation due to error');
    window.location.href = finalUrl;
  }
}, true);

async function showModal(result: any, url: string, isEmailContext: boolean = false): Promise<'proceed' | 'cancel' | 'verify' | 'trust'> {
  const domain = new URL(url).hostname;
  const canTrust = result.phishingLikelihood < 70;
  
  // Prepare threats list
  const threats: string[] = [];
  if (result.riskFactors && result.riskFactors.length > 0) {
    threats.push(...result.riskFactors);
  }
  
  // Add email context warning if applicable
  if (isEmailContext) {
    threats.unshift('📧 Link clicked from email - extra caution advised');
  }
  
  // Determine if email verification is required
  const requiresEmailVerification = isEmailContext || result.threatLevel === 'HIGH' || result.phishingLikelihood >= 70;
  
  // Calculate confidence from phishing likelihood (0-100 to 0-1)
  const confidence = result.phishingLikelihood / 100;
  
  // Show the modal
  const choice = await modal.show({
    url: url,
    decision: result.decision === 'SAFE' ? 'SAFE' : result.threatLevel === 'HIGH' ? 'SUSPICIOUS' : 'UNKNOWN',
    reason: result.reason || `This link has a ${result.phishingLikelihood}% phishing risk score. ${isEmailContext ? 'This link was clicked from an email. ' : ''}${canTrust ? 'You can trust this domain if you recognize it.' : 'This domain has high risk and cannot be trusted from this warning.'}`,
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

// Watch for dynamically added links (Gmail often adds links after page load)
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          // Check if the added element is a link or contains links
          if (element.tagName === 'A' || element.querySelector('a')) {
            console.log('🔄 New link(s) detected via MutationObserver');
          }
        }
      });
    }
  }
});

// Start observing the document for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('✅ EasyPiky ready (with dynamic link detection)');
