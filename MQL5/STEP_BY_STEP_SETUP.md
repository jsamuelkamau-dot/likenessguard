# 🚀 Step-by-Step MT5 Configuration Guide

You've installed MT5 - Great! Now follow these exact steps:

---

## Step 1: Find Your MT5 Data Folder (2 minutes)

### Action:
1. **Open MetaTrader 5** (the application you just installed)
2. Click **File** in the top menu
3. Click **Open Data Folder**
4. A Windows Explorer window will open

### What You'll See:
A folder path like:
```
C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075\
```

### Important:
**Keep this window open!** You'll need it for the next step.

---

## Step 2: Copy EA Files to MT5 (5 minutes)

### Part A: Copy the Expert Advisor

1. **Open another Windows Explorer window**
2. **Navigate to your project folder** where you have the MQL5 files
3. **Go to**: `[Your Project]\MQL5\Experts\`
4. **Copy the entire `BCS_Ultimate_v2` folder**
5. **Go back to the MT5 Data Folder window** (from Step 1)
6. **Navigate to**: `MQL5\Experts\`
7. **Paste the `BCS_Ultimate_v2` folder here**

**Result**: You should now have:
```
[MT5 Data Folder]\MQL5\Experts\BCS_Ultimate_v2\BCS_Ultimate_v2.mq5
```

### Part B: Copy the Include Files

1. **In your project folder**, go to: `[Your Project]\MQL5\Include\`
2. **Copy the entire `BCS` folder** (with all its subfolders)
3. **In MT5 Data Folder**, go to: `MQL5\Include\`
4. **Paste the `BCS` folder here**

**Result**: You should now have:
```
[MT5 Data Folder]\MQL5\Include\BCS\
├── Common\
├── Layer1\
├── Layer2\
├── Layer3\
├── Layer4\
├── Layer5\
├── Layer6\
└── Support\
```

### Verify:
- [ ] BCS_Ultimate_v2.mq5 is in Experts folder
- [ ] BCS folder with all subfolders is in Include folder
- [ ] All .mqh files are present

---

## Step 3: Open MetaEditor (1 minute)

### Action:
1. **In MT5**, press **F4** key (or click Tools → MetaQuotes Language Editor)
2. **MetaEditor window opens** (separate application)

### What You'll See:
- Left panel: Navigator with folder tree
- Main area: Code editor (empty for now)
- Bottom: Toolbox with Errors tab

---

## Step 4: Open the EA File (1 minute)

### Action:
1. **In MetaEditor's Navigator** (left panel):
   - Click the **▶** arrow next to **Experts**
   - Click the **▶** arrow next to **BCS_Ultimate_v2**
   - **Double-click** on **BCS_Ultimate_v2.mq5**

### What You'll See:
- The EA code opens in the main editor
- Lots of code with comments
- Should see "BCS Ultimate v2.0" at the top

---

## Step 5: Compile the EA (2 minutes)

### Action:
1. **Click the "Compile" button** in the toolbar (or press **F7**)
2. **Wait** for compilation (30-60 seconds first time)
3. **Check the "Errors" tab** at the bottom

### Expected Result:
```
✅ SUCCESS:
0 error(s), 0 warning(s)
Result: BCS_Ultimate_v2.ex5 generated
```

### If You See Errors:
**Don't panic!** Common issues:

**Error: "cannot open include file"**
- **Fix**: Go back to Step 2, verify BCS folder is in Include directory
- **Then**: Press F7 to compile again

**Error: "undeclared identifier"**
- **Fix**: Make sure ALL files were copied (check DataStructures.mqh exists)
- **Then**: Press F7 to compile again

**Still errors?**
- Take a screenshot of the error
- Note the line number
- We'll fix it together

### Success Indicator:
- Green checkmark appears in toolbar
- "0 error(s)" message
- File `BCS_Ultimate_v2.ex5` is created

---

## Step 6: Create Demo Account (3 minutes)

### Action:
1. **Go back to MT5** (main application)
2. Click **File** → **Open an Account**
3. **Select a server** from the list (any demo server works)
   - Look for servers with "Demo" in the name
   - Or use "MetaQuotes-Demo"
4. Click **Next**
5. **Select**: "Open a demo account"
6. **Fill in**:
   - Name: Your name
   - Email: Your email
   - Phone: Any number
   - Account Type: Standard
   - Deposit: **10000** (USD)
   - Leverage: **1:100**
   - Currency: USD
7. Click **Next**
8. **Save your login details!** (write them down)
9. Click **Finish**

### Verify:
- Top-right corner shows "Connected" with green bars
- Account number appears in top-left
- Balance shows $10,000

---

## Step 7: Open Strategy Tester (1 minute)

### Action:
1. **In MT5**, press **Ctrl+R** (or View → Strategy Tester)
2. **Strategy Tester panel** opens at the bottom

### What You'll See:
- Settings tab with dropdown menus
- Start button (grayed out initially)
- Results, Graph, and other tabs

---

## Step 8: Configure Strategy Tester (3 minutes)

### Action - Fill in these fields:

**Expert Advisor:**
- Click dropdown
- Select: **BCS_Ultimate_v2.ex5**

**Symbol:**
- Click dropdown
- Select: **EURUSD**

**Period:**
- Click dropdown
- Select: **M5** (5 minutes)

**Date:**
- From: **3 months ago** (e.g., if today is Feb 2025, set to Nov 2024)
- To: **Today's date**

**Execution:**
- Select: **Every tick** (most accurate)

**Optimization:**
- Leave **unchecked** (disabled)

---

## Step 9: Set EA Parameters (5 minutes)

### Action:
1. Click **"Expert properties"** button (next to EA dropdown)
2. Go to **"Inputs"** tab
3. **Set these values**:

```
=== Layer 1: Macro Context ===
Use_Volatility_Filter = true
Use_Session_Filter = true
Use_News_Filter = false

=== Layer 2: Structural Analysis ===
Min_Trend_Score = 40
Use_Order_Blocks = true
Use_Liquidity_Sweep = true

=== Layer 3: Momentum ===
ADX_Threshold = 20.0
Use_Divergence_Veto = true
Use_MTF_Momentum = true

=== Layer 4: Precision Entry ===
Volume_Min_Mult = 1.5
Use_ONNX_Model = false
ONNX_Model_Path = ""

=== Layer 5: Risk & Execution ===
Base_Risk_Percent = 1.0
Use_Equity_Curve = true
Use_Scaled_Entry = false
RR_Ratio = 1.5

=== Layer 6: Trade Management ===
Use_Partial_TP = true
Stage1_RR = 0.8
Stage2_RR = 1.5
Daily_Loss_Limit = 3.0
Weekly_Loss_Limit = 6.0

=== System Settings ===
Use_Self_Optimize = false
Magic_Number = 20240001
Trade_Comment = "BCS_Test"
```

4. Click **OK**

---

## Step 10: Run Your First Test! (10-15 minutes)

### Action:
1. **Click the "Start" button** in Strategy Tester
2. **Watch the progress bar** at the bottom
3. **Monitor the Journal tab** for messages

### What You'll See:
- Progress bar moving (0% → 100%)
- Journal showing:
  - "BCS Ultimate v2.0 Initialization"
  - "Layer X initialized"
  - Possibly "TRADE SIGNAL DETECTED"
  - "TRADE EXECUTED SUCCESSFULLY"

### Wait Time:
- 3 months of data: ~10-15 minutes
- Be patient, don't close anything!

---

## Step 11: Review Results (5 minutes)

### When Test Completes:

**Go to "Results" tab:**

Look for these key metrics:

```
✅ GOOD RESULTS:
Total Trades: 50-200
Profit Trades %: 75-90%
Profit Factor: > 2.0
Expected Payoff: Positive
Maximal Drawdown: < 10%

⚠️ NEEDS TUNING:
Total Trades: 10-50
Profit Trades %: 65-75%
Profit Factor: 1.5-2.0
Maximal Drawdown: 10-15%

❌ PROBLEM:
Total Trades: 0 (EA not working)
Profit Trades %: < 60%
Profit Factor: < 1.0
Maximal Drawdown: > 15%
```

**Go to "Graph" tab:**
- Should see equity curve going up
- Small drawdowns
- Smooth growth

---

## Step 12: Check Log Files (2 minutes)

### Action:
1. **In MT5**, click **File** → **Open Data Folder**
2. Navigate to: **MQL5\Files\**
3. Look for files:
   - `BCS_Trades_YYYYMMDD.csv`
   - `BCS_Events_YYYYMMDD.csv`

### Open in Excel/Notepad:
- Should see trade details
- Entry/exit prices
- Layer scores
- Profit/loss

---

## Step 13: Attach to Live Chart (3 minutes)

### Action:
1. **In MT5**, press **Ctrl+U** (Market Watch)
2. Find **EURUSD**, right-click → **Chart Window**
3. **Change timeframe** to **M5** (top toolbar)
4. **In Navigator** (Ctrl+N), expand **Experts**
5. **Drag "BCS_Ultimate_v2"** onto the chart
6. Parameter window opens → Click **OK**
7. **Click "AutoTrading" button** in top toolbar (or press F7)
8. Button should be highlighted/green

### What You'll See:
- **Smiley face** in top-right corner of chart ☺
- **Dashboard appears** on the left side of chart:
  - Title: "BILLIONAIRE CONFLUENCE SCALPER v2.0"
  - Layer status with scores
  - Account info

### Verify:
- [ ] Smiley face visible
- [ ] Dashboard showing
- [ ] AutoTrading button is ON
- [ ] No errors in Experts tab (Ctrl+T)

---

## Step 14: Monitor Live (Ongoing)

### What to Watch:

**Dashboard Updates:**
- Layer scores change as market moves
- Colors change (green/yellow/red)
- Trade info appears when trades execute

**Experts Tab (Ctrl+T):**
- Shows EA messages
- "Layer X updated"
- "TRADE SIGNAL DETECTED" when conditions met
- Any errors or warnings

**Chart:**
- Trades appear as arrows
- Stop loss and take profit lines
- Position info

---

## Troubleshooting Quick Reference

### Issue: EA Not Compiling
**Solution:**
1. Verify all files copied correctly
2. Check BCS folder is in Include directory
3. Restart MetaEditor
4. Try compiling again

### Issue: No Trades in Strategy Tester
**Solution:**
1. Reduce Min_Trend_Score to 30
2. Set Use_News_Filter to false
3. Check Journal for "Layer X failed" messages
4. Run test again

### Issue: Dashboard Not Showing
**Solution:**
1. Verify AutoTrading is ON (F7)
2. Check smiley face is present
3. Look in Experts tab for errors
4. Re-attach EA to chart

### Issue: Too Many Trades
**Solution:**
1. Increase Min_Trend_Score to 50
2. Increase Volume_Min_Mult to 2.0
3. Enable Use_News_Filter
4. Run test again

---

## Success Checklist

- [ ] MT5 installed and running
- [ ] Files copied to correct folders
- [ ] EA compiled successfully (0 errors)
- [ ] Demo account created
- [ ] Strategy Tester configured
- [ ] First test completed
- [ ] Results reviewed (win rate, profit factor)
- [ ] Log files created
- [ ] EA attached to chart
- [ ] AutoTrading enabled
- [ ] Dashboard visible
- [ ] Monitoring for signals

---

## What's Next?

### If Test Results Are Good (Win Rate > 75%, PF > 2.0):
1. ✅ Run longer test (6 months)
2. ✅ Test on other pairs (GBPUSD, USDJPY)
3. ✅ Optimize parameters
4. ✅ Monitor on demo for 1-2 weeks
5. ✅ Consider live trading with small lots

### If Test Results Need Improvement:
1. ⚙️ Adjust parameters (see TESTING_GUIDE.md)
2. ⚙️ Run multiple tests with different settings
3. ⚙️ Check which layers are failing
4. ⚙️ Fine-tune thresholds
5. ⚙️ Re-test until results improve

### If You Encounter Errors:
1. 📝 Note the exact error message
2. 📝 Check which step it occurred
3. 📝 Review troubleshooting section
4. 📝 Check TESTING_GUIDE.md for detailed help

---

## Quick Commands Reference

```
F4  = Open MetaEditor
F7  = Compile (in MetaEditor) / AutoTrading (in MT5)
F7  = Compile in MetaEditor
Ctrl+R = Open Strategy Tester
Ctrl+U = Open Market Watch
Ctrl+N = Open Navigator
Ctrl+T = Open Terminal (Experts tab)
Ctrl+S = Save file
```

---

## You're Ready! 🚀

Follow these steps in order, and you'll have the EA running in about 30-45 minutes.

**Current Step**: You've installed MT5
**Next Step**: Go to Step 1 and find your data folder

**Good luck!** The EA is fully implemented and ready to trade. Just follow the steps above carefully.

---

*Need help? Refer to TESTING_GUIDE.md for more detailed information.*
