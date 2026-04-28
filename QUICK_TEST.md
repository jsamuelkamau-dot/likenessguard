# ⚡ Quick Test - Do This Right Now

## 1. Reload Extension
- Go to `chrome://extensions/`
- Find **EasyPiky**
- Click **🔄 Reload**

## 2. Open Example.com
- Go to: **https://example.com**
- Open Console (`F12` or `Ctrl+Shift+I`)

## 3. Check Console
Look for this message:
```
🛡️ EasyPiky protection active on: https://example.com
```

**If you see this:** ✅ Extension is working!
**If you don't see this:** ❌ Extension not loading - let me know

## 4. Create a Test Link
In the console, paste this code and press Enter:
```javascript
const link = document.createElement('a');
link.href = 'https://paypal-secure.xyz';
link.textContent = 'Click Me - Test Link';
link.style.cssText = 'display:block; padding:20px; background:#fc8181; color:white; font-size:20px; margin:20px; text-decoration:none; border-radius:8px; text-align:center;';
document.body.appendChild(link);
```

## 5. Click the Red Button
A red button saying "Click Me - Test Link" should appear on the page.

**Click it!**

## 6. What Should Happen
You should see:
1. **Console messages:**
   ```
   🖱️ Click detected
   🔍 Analyzing link: https://paypal-secure.xyz
   🔍 Analysis result: { decision: 'SUSPICIOUS', ... }
   ⚠️ Showing modal for risk level: MEDIUM
   ```

2. **A modal appears** with:
   - ⚠️ Icon
   - "Suspicious Link Detected"
   - "65% Phishing Risk"
   - Risk factors listed
   - Three buttons: Go Back, Trust & Continue, Just Continue

## 7. Report Back
Tell me:
- ✅ Did you see the console message "🛡️ EasyPiky protection active"?
- ✅ Did you see the click detection messages?
- ✅ Did the modal appear?

If any step fails, let me know which one and what you see instead!
