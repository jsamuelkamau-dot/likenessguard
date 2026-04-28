# 🧪 Testing Instructions - Updated

## Why Your Test Wasn't Working

**The issue:** Content scripts don't run on `file://` URLs (local HTML files opened directly in browser).

**The fix:** I've updated the manifest to support both `http://` and `https://` URLs.

## How to Test Properly

### Option 1: Test on a Real Website (Easiest)

1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click 🔄 **Reload** on EasyPiky

2. **Go to any website with external links:**
   - Open Google.com
   - Search for something
   - Open the **Console** (`F12`)
   - Look for: `🛡️ EasyPiky protection active on: https://www.google.com`

3. **Click an external link:**
   - Click any search result
   - You should see console messages:
     ```
     🖱️ Click detected
     🔍 Analyzing link: https://...
     🔍 Analysis result: ...
     ```

### Option 2: Test on Gmail (Real Use Case)

1. **Reload the extension**
2. **Open Gmail** (https://mail.google.com)
3. **Refresh Gmail** (`Ctrl+R`)
4. **Open Console** (`F12`)
5. Look for: `🛡️ EasyPiky protection active`
6. **Click any link in an email**
7. Watch for analysis messages

### Option 3: Use a Simple HTTP Server

If you want to test the HTML file:

1. **Install a simple HTTP server:**
   ```
   npm install -g http-server
   ```

2. **Run server in your project folder:**
   ```
   http-server -p 8080
   ```

3. **Open in browser:**
   ```
   http://localhost:8080/test-easypiky.html
   ```

4. Now the content script will work!

## What You Should See

### When Page Loads:
```
🛡️ EasyPiky protection active on: https://example.com
🛡️ Extension ID: abcdef123456
✅ Connection to background script OK: { strictMode: false, ... }
```

### When You Click a Link:
```
🖱️ Click detected: { target: 'A', link: 'https://google.com' }
🔍 Analyzing link: https://google.com
🔍 Analysis result: { decision: 'SAFE', threatLevel: 'NONE', ... }
✅ Safe link, navigating immediately
```

### When You Click a Suspicious Link:
```
🖱️ Click detected: { target: 'A', link: 'https://paypal-secure.xyz' }
🔍 Analyzing link: https://paypal-secure.xyz
🔍 Analysis result: { decision: 'SUSPICIOUS', threatLevel: 'MEDIUM', phishingLikelihood: 65, ... }
⚠️ Showing modal for risk level: MEDIUM
```

## Quick Test Right Now

**Easiest way to test immediately:**

1. **Reload extension** in `chrome://extensions/`
2. **Go to:** https://example.com
3. **Open Console** (`F12`)
4. **Look for:** `🛡️ EasyPiky protection active`
5. **Type in console:**
   ```javascript
   const link = document.createElement('a');
   link.href = 'https://paypal-secure.xyz';
   link.textContent = 'Test Link';
   document.body.appendChild(link);
   ```
6. **Click the "Test Link"** that appears
7. **You should see the modal!**

## Troubleshooting

### Still No Console Messages?

1. **Check extension is loaded:**
   - Go to `chrome://extensions/`
   - EasyPiky should be enabled
   - Click "Details" → "Inspect views: service worker"
   - Look for: `🛡️ EasyPiky background service initialized`

2. **Check permissions:**
   - In extension details, scroll to "Permissions"
   - Should say: "Read and change your data on all websites"

3. **Try a different website:**
   - Some websites block content scripts
   - Try: https://example.com (simple, no blocking)

### Modal Not Appearing?

1. **Check console for:**
   - `⚠️ Showing modal for risk level: ...`
   
2. **If you see "✅ Safe link":**
   - The link is recognized as safe (Google, GitHub, etc.)
   - Try a suspicious domain like: `https://secure-paypal.tk`

3. **Check if modal is hidden:**
   - Press `F12` → Elements tab
   - Look for `<div class="easypiky-modal-overlay">`
   - It might be behind other elements

## Expected Behavior Summary

| Link Type | Risk % | Modal? | Trust Button? |
|-----------|--------|--------|---------------|
| google.com | 5% | ❌ No (immediate navigation) | N/A |
| example-shop.com | 40% | ✅ Yes ("Unknown Website") | ✅ Yes |
| paypal-secure.xyz | 65% | ✅ Yes ("Suspicious Link") | ✅ Yes |
| paypal-login.tk | 85% | ✅ Yes ("High Risk") | ❌ No |

Let me know what you see in the console when you test on a real website!
