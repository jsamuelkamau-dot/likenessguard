/**
 * EasyPiky Options Page
 */

class EasyPikyOptions {
  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadSettings();
    await this.loadTrustedDomains();
    this.attachListeners();
    this.setupTabs();
  }

  private setupTabs(): void {
    const tabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const content = document.getElementById(`${tabName}-tab`);
        if (content) {
          content.classList.add('active');
        }
      });
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      (document.getElementById('strict-mode') as HTMLInputElement).checked = settings.strictMode || false;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private async loadTrustedDomains(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TRUSTED_DOMAINS' });
      const domains = response?.domains || [];
      
      const domainsList = document.getElementById('domains-list');
      const trustedDomainsStat = document.getElementById('trusted-domains-stat');
      
      if (trustedDomainsStat) {
        trustedDomainsStat.textContent = domains.length.toString();
      }
      
      if (domainsList) {
        if (domains.length === 0) {
          domainsList.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🌐</div>
              <p>No trusted domains yet</p>
              <p style="font-size: 12px;">Add domains you trust to skip security checks</p>
            </div>
          `;
        } else {
          domainsList.innerHTML = domains.map((domain: string) => `
            <div class="list-group-item">
              <div class="domain-item">
                <div class="domain-icon">✓</div>
                <span style="font-family: monospace; color: #00ff88;">${domain}</span>
              </div>
              <button class="btn btn-danger btn-remove" data-domain="${domain}" style="padding: 8px 16px; font-size: 12px;">
                Remove
              </button>
            </div>
          `).join('');
          
          // Attach remove listeners
          domainsList.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const domain = (e.target as HTMLElement).getAttribute('data-domain');
              if (domain && confirm(`Remove ${domain} from trusted list?`)) {
                await this.removeTrustedDomain(domain);
              }
            });
          });
        }
      }
    } catch (error) {
      console.error('Failed to load trusted domains:', error);
      const domainsList = document.getElementById('domains-list');
      if (domainsList) {
        domainsList.innerHTML = `
          <div class="alert alert-danger">
            Failed to load trusted domains. Please refresh the page.
          </div>
        `;
      }
    }
  }

  private async addTrustedDomain(domain: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_TRUSTED_DOMAIN',
        domain
      });
      
      // Show success message
      const alert = document.createElement('div');
      alert.className = 'alert alert-success';
      alert.textContent = `✅ ${domain} added to trusted list`;
      alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; animation: slideIn 0.3s ease;';
      document.body.appendChild(alert);
      
      setTimeout(() => alert.remove(), 3000);
      
      // Reload domains list
      await this.loadTrustedDomains();
      
      // Clear input
      const input = document.getElementById('new-domain') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error) {
      console.error('Failed to add domain:', error);
      alert('Failed to add domain. Please try again.');
    }
  }

  private async removeTrustedDomain(domain: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'REMOVE_TRUSTED_DOMAIN',
        domain
      });
      
      // Show success message
      const alert = document.createElement('div');
      alert.className = 'alert alert-success';
      alert.textContent = `✅ ${domain} removed from trusted list`;
      alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; animation: slideIn 0.3s ease;';
      document.body.appendChild(alert);
      
      setTimeout(() => alert.remove(), 3000);
      
      // Reload domains list
      await this.loadTrustedDomains();
    } catch (error) {
      console.error('Failed to remove domain:', error);
      alert('Failed to remove domain. Please try again.');
    }
  }

  private attachListeners(): void {
    // Strict mode toggle
    document.getElementById('strict-mode')?.addEventListener('change', async (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      try {
        await chrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          settings: { strictMode: checked }
        });
        
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = `✅ Strict mode ${checked ? 'enabled' : 'disabled'}`;
        alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 2000);
      } catch (error) {
        console.error('Failed to update settings:', error);
      }
    });

    // Add domain button
    document.getElementById('add-domain-btn')?.addEventListener('click', () => {
      const input = document.getElementById('new-domain') as HTMLInputElement;
      const domain = input.value.trim().toLowerCase();
      
      if (!domain) {
        alert('Please enter a domain name');
        return;
      }
      
      // Basic validation
      if (!domain.includes('.')) {
        alert('Please enter a valid domain (e.g., example.com)');
        return;
      }
      
      this.addTrustedDomain(domain);
    });

    // Allow Enter key in domain input
    document.getElementById('new-domain')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('add-domain-btn')?.click();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EasyPikyOptions();
});
