# 🚀 EasyPiky Installation Guide

## Prerequisites

### Required
- ✅ Chrome, Edge, or Chromium-based browser
- ✅ Node.js and npm (for development)
- ✅ This project folder

### Optional
- Git (for version control)
- VS Code (recommended editor)

## Quick Installation (2 Minutes)

### Step 1: Build the Extension
```bash
# Navigate to project folder
cd easypiky-browser-extension

# Install dependencies (if not already done)
npm install

# Build the extension
npm run build
```

**Expected Output:**
```
✅ webpack 5.105.0 compiled successfully
✅ Assets bundled to dist/
✅ Extension ready to load
```

### Step 2: Load in Browser

#### Chrome / Edge
1. Open browser
2. Navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Toggle **"Developer mode"** ON (top right corner)
4. Click **"Load unpacked"** button
5. Select the **project root folder** (not dist folder)
6. ✅ Extension installed!

#### Verify Installation
- Look for EasyPiky icon in toolbar
- Icon should be visible and clickable
- Click icon to see dark green popup

## Testing the Installation

### Test 1: Popup Interface
```
1. Click the EasyPiky extension icon
2. You should see:
   ✅ Dark green background
   ✅ Electric green header
   ✅ "Protection Active" status
   ✅ Trial progress bar
   ✅ Stats cards
   ✅ Action buttons
```

### Test 2: Options Page
```
1. Right-click extension icon
2. Select "Options"
3. You should see:
   ✅ Dark green settings page
   ✅ Tabbed navigation
   ✅ Form controls
   ✅ Trial status
   ✅ Stats dashboard
```

### Test 3: Link Protection
```
1. Open test-easypiky.html in browser
2. Click a "Suspicious" link
3. You should see:
   ✅ Dark overlay appears
   ✅ Green gradient modal
   ✅ Threat information
   ✅ Action buttons
   ✅ Smooth animations
```

## Troubleshooting

### Extension Not Loading?

**Problem**: "Load unpacked" fails
**Solution**:
```bash
1. Verify you selected the project root folder
2. Check that manifest.json exists
3. Rebuild: npm run build
4. Try again
```

**Problem**: Extension loads but doesn't work
**Solution**:
```bash
1. Check browser console for errors
2. Reload extension (click reload icon)
3. Refresh test page
4. Check permissions in manifest.json
```

### Theme Not Showing?

**Problem**: Popup/Options show old theme
**Solution**:
```bash
1. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. Clear browser cache
3. Reload extension
4. Close and reopen popup/options
```

**Problem**: Modal doesn't appear
**Solution**:
```bash
1. Check browser console for errors
2. Verify content script loaded
3. Test on different website
4. Reload extension and page
```

### Build Errors?

**Problem**: npm run build fails
**Solution**:
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

**Problem**: TypeScript errors
**Solution**:
```bash
# Check TypeScript version
npm list typescript

# Reinstall dependencies
npm install

# Try building again
npm run build
```

## Development Setup

### For Active Development

#### Watch Mode (Auto-rebuild)
```bash
npm run watch
```
This will automatically rebuild when you change files.

#### Hot Reload Extension
1. Make code changes
2. Save files (auto-rebuild if using watch)
3. Click reload icon in chrome://extensions/
4. Refresh test page

### Recommended Workflow
```bash
# Terminal 1: Watch mode
npm run watch

# Terminal 2: Run tests
npm test

# Browser: Load extension and test
```

## File Structure

### After Build
```
project-root/
├── dist/                    ← Extension files (built)
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   ├── options.html
│   ├── options.js
│   ├── manifest.json
│   └── icons/
├── src/                     ← Source files
├── node_modules/            ← Dependencies
├── package.json
└── webpack.config.js
```

### Important Files
- `manifest.json` - Extension configuration
- `dist/` - Built extension (load this in browser)
- `src/` - Source code
- `test-easypiky.html` - Test page

## Permissions Explained

### Required Permissions
```json
{
  "storage": "Store settings and trusted domains",
  "webNavigation": "Intercept link clicks",
  "activeTab": "Access current tab for analysis"
}
```

### Host Permissions
```json
{
  "https://*/*": "Analyze all HTTPS links"
}
```

All permissions are necessary for core functionality.

## Browser Compatibility

### Supported Browsers ✅
- Chrome (v88+)
- Edge (v88+)
- Brave
- Opera
- Vivaldi
- Any Chromium-based browser

### Not Supported ❌
- Firefox (different extension API)
- Safari (different extension system)
- Internet Explorer (deprecated)

## Updating the Extension

### After Code Changes
```bash
# 1. Rebuild
npm run build

# 2. Reload extension
# Go to chrome://extensions/
# Click reload icon on EasyPiky card

# 3. Refresh test page
# Press F5 or Ctrl+R
```

### After Pulling Updates
```bash
# 1. Update dependencies
npm install

# 2. Rebuild
npm run build

# 3. Reload extension
```

## Uninstalling

### Remove Extension
1. Go to `chrome://extensions/`
2. Find EasyPiky
3. Click "Remove"
4. Confirm removal

### Clean Project
```bash
# Remove build files
rm -rf dist/

# Remove dependencies
rm -rf node_modules/

# Remove lock file
rm package-lock.json
```

## Production Build

### For Distribution
```bash
# Create optimized build
npm run build

# Package extension
# Zip the dist/ folder
# Submit to Chrome Web Store
```

### Before Publishing
- [ ] Test all features
- [ ] Verify theme consistency
- [ ] Check performance
- [ ] Review permissions
- [ ] Update version number
- [ ] Create screenshots
- [ ] Write store description

## Support

### Getting Help

**Documentation**:
- `QUICK_START_GUIDE.md` - Quick testing guide
- `DARK_GREEN_THEME_COMPLETE.md` - Theme details
- `BUILD_COMPLETE_SUMMARY.md` - Build overview
- `THEME_SHOWCASE.md` - Visual design guide

**Common Issues**:
- Extension not loading → Check manifest.json
- Theme not showing → Clear cache and reload
- Modal not appearing → Check console for errors
- Build failing → Reinstall dependencies

**Debug Mode**:
```bash
# Enable verbose logging
npm run build -- --mode=development

# Check console
# Open DevTools in popup/options
# Right-click extension icon → Inspect popup
```

## Next Steps

After successful installation:

1. ✅ Test popup interface
2. ✅ Test options page
3. ✅ Test link protection
4. ✅ Add trusted domains
5. ✅ Explore settings
6. ✅ Review documentation

## Success Checklist

Installation is complete when:
- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Popup shows dark green theme
- [ ] Options page opens correctly
- [ ] Links are intercepted
- [ ] Modal appears for suspicious links
- [ ] Settings persist
- [ ] No console errors

---

**Status**: Ready to Install
**Time**: ~2 minutes
**Difficulty**: Easy

**Need help?** Check the troubleshooting section or review the documentation files.
