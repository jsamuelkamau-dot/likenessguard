# EasyPiky Quick Start Guide 🚀

## Installation (5 minutes)

### Step 1: Load the Extension
1. Open Chrome or Edge browser
2. Navigate to `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top right)
4. Click **"Load unpacked"**
5. Select this project folder
6. ✅ Extension installed!

### Step 2: Verify Installation
- Look for the EasyPiky icon in your browser toolbar
- Click it to see the dark green popup
- You should see "Protection Active" status

## Testing the Dark Green Theme 🎨

### Test the Popup
```
1. Click the EasyPiky extension icon
2. Observe the dark green theme:
   - Dark background (#0a1612)
   - Electric green header
   - Glowing status indicator
   - Green progress bar
   - Shiny green buttons
```

### Test the Options Page
```
1. Right-click extension icon
2. Select "Options"
3. Explore the settings page:
   - Dark green gradient header
   - Tabbed navigation with green accents
   - Form controls with green borders
   - Trial status cards
   - Stats dashboard
```

### Test the Blocking Modal
```
1. Open test-easypiky.html in your browser
2. Click any "Suspicious" or "Unknown" link
3. See the blocking modal appear:
   - Dark overlay with blur
   - Green gradient modal
   - Glowing threat indicators
   - Smooth animations
   - Action buttons
```

## Quick Test Links

### Safe Links (Should Pass Through)
- https://www.google.com
- https://github.com
- https://stackoverflow.com

### Suspicious Links (Should Show Modal)
- https://g00gle.com (look-alike)
- https://аррӏе.com (punycode)
- https://secure-login-verify.suspicious-site.com (misleading subdomain)

### Unknown Links (Should Show Warning)
- https://example-unknown-site.com
- https://brand-new-site-2024.com
- https://example.xyz

## Features to Test

### ✅ Link Interception
- Click any external link
- Extension should analyze before navigation
- Safe links open immediately
- Suspicious links show modal

### ✅ Trusted Domains
- Add a domain to trusted list
- Future visits should be instant
- Check in popup stats

### ✅ Trial Status
- View remaining trial days
- See progress bar
- Check trial badge

### ✅ Settings
- Toggle strict mode
- Add/remove trusted domains
- Export settings

## Troubleshooting

### Extension Not Working?
```
1. Check if extension is enabled
2. Reload the extension
3. Refresh the test page
4. Check browser console for errors
```

### Modal Not Showing?
```
1. Verify content script is loaded
2. Check for JavaScript errors
3. Try a different test link
4. Reload extension and page
```

### Theme Not Applied?
```
1. Clear browser cache
2. Reload extension
3. Hard refresh pages (Ctrl+Shift+R)
4. Check if files are in dist folder
```

## Development Commands

### Build Extension
```bash
npm run build
```

### Watch Mode (Auto-rebuild)
```bash
npm run watch
```

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

## File Structure
```
easypiky-browser-extension/
├── dist/                    # Built extension files
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── options.html
│   └── manifest.json
├── src/                     # Source files
│   ├── background.ts
│   ├── content-working.ts
│   ├── popup.ts
│   ├── options.ts
│   ├── ui/
│   │   └── blocking-modal.ts
│   ├── analysis/
│   ├── storage/
│   └── trial/
├── popup.html              # Popup UI
├── options.html            # Options UI
├── test-easypiky.html      # Test page
└── manifest.json           # Extension manifest
```

## What's Working ✅

### Core Features
- ✅ Link click interception
- ✅ URL analysis engine
- ✅ Trusted domain management
- ✅ Trial token system
- ✅ Settings persistence

### UI Components
- ✅ Dark green theme throughout
- ✅ Blocking modal with animations
- ✅ Popup interface
- ✅ Options page
- ✅ Test page

### Visual Effects
- ✅ Glowing elements
- ✅ Smooth transitions
- ✅ Gradient buttons
- ✅ Border accents
- ✅ Responsive design

## Next Development Steps

### Phase 1: Core Features
1. Email verification dialog
2. Context detection (Gmail, Outlook)
3. Enhanced URL analysis
4. Look-alike detection improvements

### Phase 2: Advanced Features
1. AWS backend integration
2. Trial validation
3. Subscription management
4. Analytics dashboard

### Phase 3: Polish
1. Onboarding flow
2. Help documentation
3. Error handling improvements
4. Performance optimization

## Support

### Documentation
- See `DARK_GREEN_THEME_COMPLETE.md` for theme details
- Check `.kiro/specs/` for full specifications
- Review `tasks.md` for implementation roadmap

### Issues
- Check browser console for errors
- Review webpack build output
- Test in incognito mode
- Try different browsers

## Success Checklist

Before considering the extension complete:
- [ ] Extension loads without errors
- [ ] Popup displays with dark green theme
- [ ] Options page opens and functions
- [ ] Links are intercepted correctly
- [ ] Modal appears for suspicious links
- [ ] Safe links pass through
- [ ] Trusted domains can be added
- [ ] Settings persist across sessions
- [ ] Trial status displays correctly
- [ ] All buttons work as expected

---

**Ready to test?** Open `test-easypiky.html` and start clicking links! 🛡️
