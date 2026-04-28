# 🔧 Debug and Test Guide

## Issues Fixed

1. **Popup stuck on "Loading status..."** - Fixed popup.js to work with the existing HTML
2. **Links not being detected** - Added extensive logging to debug

## How to Test Now

### Step 1: Reload Extension
1. Go to `chrome://extensions/`
2. Find **EasyPiky**
3. Click **🔄 Reload** button

### Step 2: Open Test Page
1. Open `test-easypiky.html` in a **new tab**
2. Open **Developer Console** (`F12` or `Ctrl+Shift+I`)
3. Look for these messages:
   ```
   🛡️ EasyPiky protection active on: file:///.../test-easypiky.html
   🛡️ Extension ID: [some ID]
   ✅ Connection to background script OK
   ```

### Step 3: Click a Link
1. Click any test link on the page
2. Watch the console for messages:
   ```
   🖱️ Click detected: { target: 'A', link: 'https://...' }
   🔍 Analyzing link: https://...
   🔍 Analysis result: { decision: 'SUSPICIOUS', ... }
   ⚠️ Showing modal for risk level: MEDIUM
   ```

### Step 4: Check Popup
1. Click the **EasyPiky extension icon** in Chrome toolbar
2. The popup should now show:
   - "Protection Active" status
   - Trial days remaining
   - Number of trusted domains
   - Working buttons

## Debugging Checklist

### If Links Are Not Being Detected:

**Check Console Messages:**
1. Open console (`F12`)
2. Look for: `🛡️ EasyPiky protection active`
3. If you don't see this, the content script isn't loading

**Check Extension:**
1. Go to `chrome://extensions/`
2. Click "Details" on EasyPiky
3. Scroll to "Inspect views"
4. Click "service worker" to see background script logs
5. Look for: `🛡️ EasyPiky background service initialized`

**Check Permissions:**
1. In `chrome://extensions/`, click "Details" on EasyPiky
2. Scroll to "Permissions"
3. Should see: "Read and change your data on all websites"

### If Popup Shows "Loading status...":

**Check Console in Popup:**
1. Right-click the extension icon
2. Select "Inspect popup"
3. Look for errors in the console
4. Should see successful message loading

### If Modal Doesn't Appear:

**Check Console When Clicking:**
1. Click a link
2. Look for: `🖱️ Click detected`
3. Then: `🔍 Analyzing link`
4. Then: `🔍 Analysis result`
5. Then: `⚠️ Showing modal`

**If you see "⏭️ Skipping analysis":**
- The link is same-origin or special protocol
- Try clicking an external link (different domain)

## Expected Behavior

### Safe Links (Google, GitHub, etc.):
```
🖱️ Click detected
🔍 Analyzing link: https://google.com
🔍 Analysis result: { decision: 'SAFE', threatLevel: 'NONE' }
✅ Safe link, navigating immediately
```
→ Should navigate immediately, no modal

### Unknown Links:
```
🖱️ Click detected
🔍 Analyzing link: https://example-shop.com
🔍 Analysis result: { decision: 'UNKNOWN', threatLevel: 'LOW', phishingLikelihood: 40 }
⚠️ Showing modal for risk level: LOW
```
→ Should show "Unknown Website" modal with trust button

### Suspicious Links:
```
🖱️ Click detected
🔍 Analyzing link: https://secure-paypal.xyz
🔍 Analysis result: { decision: 'SUSPICIOUS', threatLevel: 'MEDIUM', phishingLikelihood: 65 }
⚠️ Showing modal for risk level: MEDIUM
```
→ Should show "Suspicious Link" modal with trust button

### High Risk Links:
```
🖱️ Click detected
🔍 Analyzing link: https://paypal-login.tk
🔍 Analysis result: { decision: 'SUSPICIOUS', threatLevel: 'HIGH', phishingLikelihood: 85 }
⚠️ Showing modal for risk level: HIGH
```
→ Should show "High Risk" modal WITHOUT trust button

## Common Issues

### "Extension context invalidated"
- **Cause:** Extension was reloaded while page was open
- **Fix:** Refresh the page (`Ctrl+R`)

### No console messages at all
- **Cause:** Content script not injected
- **Fix:** 
  1. Check manifest.json has content_scripts
  2. Reload extension
  3. Refresh page

### Popup shows error
- **Cause:** Background script not responding
- **Fix:**
  1. Check background script is running (chrome://extensions/ → Details → service worker)
  2. Reload extension

## Next Steps

After testing:
1. Share console output if links aren't detected
2. Share any error messages
3. Let me know which specific behavior isn't working

The extension now has extensive logging to help us debug any issues!
