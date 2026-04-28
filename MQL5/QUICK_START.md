# ⚡ QUICK START - 15 Minutes to First Test

## 🎯 Your Current Status: MT5 Installed ✅

Follow these 5 quick steps:

---

## Step 1: Find MT5 Data Folder (30 seconds)
```
1. Open MT5
2. File → Open Data Folder
3. Keep this window open
```

---

## Step 2: Copy Files (2 minutes)
```
Copy from your project:
  [Project]/MQL5/Experts/BCS_Ultimate_v2/
  → [MT5 Data]/MQL5/Experts/BCS_Ultimate_v2/

  [Project]/MQL5/Include/BCS/
  → [MT5 Data]/MQL5/Include/BCS/
```

---

## Step 3: Compile (1 minute)
```
1. In MT5, press F4 (opens MetaEditor)
2. Navigate: Experts → BCS_Ultimate_v2 → BCS_Ultimate_v2.mq5
3. Press F7 (compile)
4. Should see: "0 error(s)"
```

---

## Step 4: Setup Demo Account (2 minutes)
```
1. In MT5: File → Open an Account
2. Select any demo server
3. Open demo account
4. Deposit: $10,000
5. Leverage: 1:100
```

---

## Step 5: Run Test (10 minutes)
```
1. Press Ctrl+R (Strategy Tester)
2. Select: BCS_Ultimate_v2, EURUSD, M5, Last 3 months
3. Click "Expert properties" → Set parameters (see below)
4. Click "Start"
5. Wait for results
```

### Quick Parameters:
```
Use_Volatility_Filter = true
Use_Session_Filter = true
Use_News_Filter = false
Min_Trend_Score = 40
Base_Risk_Percent = 1.0
Use_Scaled_Entry = false
Use_Partial_TP = true
```

---

## ✅ Success Indicators

**After Compilation:**
- ✅ "0 error(s), 0 warning(s)"
- ✅ Green checkmark in toolbar

**After Test:**
- ✅ Win Rate: 75-90%
- ✅ Profit Factor: > 2.0
- ✅ Max Drawdown: < 10%
- ✅ 50-200 trades

**On Chart:**
- ✅ Smiley face in corner ☺
- ✅ Dashboard visible
- ✅ AutoTrading ON (F7)

---

## 🚨 Common Issues

**"Cannot open include file"**
→ Copy BCS folder to Include directory

**"0 trades in test"**
→ Reduce Min_Trend_Score to 30

**"Dashboard not showing"**
→ Press F7 to enable AutoTrading

---

## 📁 File Locations

```
Your Project:
  MQL5/Experts/BCS_Ultimate_v2/BCS_Ultimate_v2.mq5
  MQL5/Include/BCS/ (entire folder)

MT5 Data Folder:
  C:\Users\[You]\AppData\Roaming\MetaQuotes\Terminal\[ID]\
  └── MQL5/
      ├── Experts/BCS_Ultimate_v2/
      └── Include/BCS/
```

---

## 🎮 Keyboard Shortcuts

```
F4     = Open MetaEditor
F7     = Compile / AutoTrading
Ctrl+R = Strategy Tester
Ctrl+T = Terminal (Experts tab)
Ctrl+U = Market Watch
Ctrl+N = Navigator
```

---

## 📊 What to Expect

**Strategy Tester Results:**
- Test Duration: 10-15 minutes
- Expected Trades: 50-200 (3 months)
- Win Rate Target: 80-88%
- Profit Factor Target: 3.0-5.0

**Live Chart:**
- Dashboard updates every tick
- Layer scores change with market
- Trades execute automatically
- Logs saved to Files folder

---

## 🎯 Next Steps

**If Test Succeeds:**
1. Run 6-month test
2. Test other pairs
3. Optimize parameters
4. Demo test 1-2 weeks
5. Go live with small lots

**If Issues:**
1. Check STEP_BY_STEP_SETUP.md
2. Review TESTING_GUIDE.md
3. Check error messages
4. Adjust parameters

---

## 📚 Full Documentation

- **STEP_BY_STEP_SETUP.md** - Detailed walkthrough
- **TESTING_GUIDE.md** - Complete testing procedures
- **INSTALLATION_INSTRUCTIONS.md** - Installation details
- **IMPLEMENTATION_COMPLETE.md** - Project summary

---

**You're 15 minutes away from seeing your EA in action!** 🚀

Start with Step 1 above and follow in order.
