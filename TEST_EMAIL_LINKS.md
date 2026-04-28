# 🧪 Quick Test - Email Link Interception

## ⚡ 3-Minute Test

### Step 1: Reload Extension (30 seconds)
```
1. Go to chrome://extensions/
2. Find EasyPiky
3. Click 🔄 Reload
4. Verify version: 1.1.0
```

### Step 2: Open Gmail (30 seconds)
```
1. Go to mail.google.com
2. Open any email with links
3. Press F12 to open Console
```

### Step 3: Click a Link (1 minute)
```
1. Click any external link in the email
2. Watch the console
3. Modal should appear
```

### Step 4: Verify (1 minute)
```
✅ Console shows: "📧 Email context: true"
✅ Console shows: "📧 Unwrapped..." (if tracking link)
✅ Modal appears
✅ Modal shows: "📧 Link clicked from email"
```

---

## 🎯 What to Look For

### In Console (F12):
```
🛡️ EasyPiky protection active
📧 Email context: true
🔗 Link clicked: [URL]
📧 Unwrapped Google tracking link: [real URL]
🔍 Analyzing...
📊 Context: EMAIL
⚠️ Should show modal now!
```

### In Modal:
```
✅ "📧 Link clicked from email - extra caution advised"
✅ Risk percentage shown
✅ "Verify Sender Email" button
✅ Clear explanation
```

---

## 🔍 Test Cases

### Test 1: Gmail Link
```
Email: Any email in Gmail
Action: Click any external link
Expected: Modal appears with email warning
```

### Test 2: Outlook Link
```
Email: outlook.live.com or outlook.office.com
Action: Click any external link
Expected: Modal appears with email warning
```

### Test 3: Tracking Link
```
Email: Gmail email with Google tracking
Action: Click link
Expected: Console shows "Unwrapped Google tracking link"
```

### Test 4: Safe Domain
```
Email: Link to google.com or github.com
Action: Click link
Expected: Opens immediately (known safe)
```

### Test 5: Suspicious Domain
```
Email: Link to .tk or .xyz domain
Action: Click link
Expected: Modal with high risk score
```

---

## ✅ Pass/Fail Criteria

### PASS if:
- ✅ Email context detected
- ✅ Links intercepted
- ✅ Modal shows email warning
- ✅ Tracking links unwrapped
- ✅ Console shows correct logs

### FAIL if:
- ❌ Links open without modal
- ❌ Email context not detected
- ❌ No console logs
- ❌ Tracking links not unwrapped

---

## 🆘 If Test Fails

### Links Still Bypass:
1. Check console for "📧 Email context: false"
2. Verify extension reloaded
3. Hard refresh Gmail (Ctrl+Shift+R)
4. Check manifest has "all_frames: true"

### No Console Logs:
1. Extension not loaded
2. Reload extension
3. Refresh Gmail page
4. Check for JavaScript errors

### Modal Doesn't Show:
1. Check for errors in console
2. Verify content script loaded
3. Try different email
4. Check if link is same-origin

---

## 📧 Email Providers to Test

Priority:
1. ✅ Gmail (mail.google.com) - Most common
2. ✅ Outlook (outlook.live.com) - Second most common
3. ✅ Yahoo Mail (mail.yahoo.com)
4. ✅ ProtonMail (protonmail.com)

---

## 🎉 Success!

If all tests pass:
- ✅ Email links are now protected
- ✅ Tracking links are unwrapped
- ✅ Email context is detected
- ✅ Users get clear warnings

**You're protected from email phishing!** 🛡️
