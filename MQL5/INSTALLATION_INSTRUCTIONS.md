# 🚀 MT5 Installation & EA Setup Instructions

## Part 1: Install MetaTrader 5

### Download MT5
1. **Visit**: https://www.metatrader5.com/en/download
2. **Click**: "Download MetaTrader 5"
3. **Run**: The downloaded installer (mt5setup.exe)
4. **Follow**: Installation wizard (accept defaults)
5. **Wait**: For installation to complete (~2-3 minutes)

### First Launch
1. MT5 will open automatically
2. You'll see a login window - **Close it** (we'll use demo account later)
3. MT5 main window should now be visible

---

## Part 2: Locate MT5 Data Folder

### Find Your Data Folder
1. In MT5, click **File** → **Open Data Folder**
2. A Windows Explorer window opens
3. **Note this location** - you'll need it!
4. It should look like: `C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\[RandomID]\`

### Verify Folder Structure
You should see folders like:
```
MQL5/
├── Experts/
├── Include/
├── Indicators/
├── Scripts/
└── Files/
```

---

## Part 3: Copy EA Files

### Current Project Structure
Your files are currently in:
```
[Your Project]/MQL5/
├── Experts/
│   └── BCS_Ultimate_v2/
│       └── BCS_Ultimate_v2.mq5
└── Include/
    └── BCS/
        ├── Common/
        ├── Layer1/
        ├── Layer2/
        ├── Layer3/
        ├── Layer4/
        ├── Layer5/
        ├── Layer6/
        └── Support/
```

### Copy Instructions

**Step 1: Copy the Expert Advisor**
```
FROM: [Your Project]/MQL5/Experts/BCS_Ultimate_v2/
TO:   [MT5 Data Folder]/MQL5/Experts/BCS_Ultimate_v2/

Copy the entire BCS_Ultimate_v2 folder
```

**Step 2: Copy the Include Files**
```
FROM: [Your Project]/MQL5/Include/BCS/
TO:   [MT5 Data Folder]/MQL5/Include/BCS/

Copy the entire BCS folder with all subfolders
```

### Verify File Locations
After copying, your MT5 data folder should have:
```
[MT5 Data Folder]/MQL5/
├── Experts/
│   └── BCS_Ultimate_v2/
│       └── BCS_Ultimate_v2.mq5
└── Include/
    └── BCS/
        ├── Common/
        │   ├── DataStructures.mqh
        │   ├── Utils.mqh
        │   └── ErrorHandler.mqh
        ├── Layer1/
        │   ├── VolatilityRegimeFilter.mqh
        │   ├── SessionQualityFilter.mqh
        │   └── NewsBlackoutFilter.mqh
        ├── Layer2/
        │   ├── MultiTimeframeTrendAnalyzer.mqh
        │   ├── OrderBlockDetector.mqh
        │   └── LiquiditySweepDetector.mqh
        ├── Layer3/
        │   ├── SorosReflexivityModule.mqh
        │   ├── KriegerOverextensionFilter.mqh
        │   └── MTFMomentumConvergence.mqh
        ├── Layer4/
        │   ├── VolumeSpikeConfirmation.mqh
        │   ├── CandlePatternQualityGate.mqh
        │   └── MicrostructureCheck.mqh
        ├── Layer5/
        │   ├── EquityCurveAdaptiveSizer.mqh
        │   ├── ScaledEntrySystem.mqh
        │   ├── AdaptiveStopLossCalculator.mqh
        │   ├── AdaptiveTakeProfitCalculator.mqh
        │   └── RiskEngine.mqh
        ├── Layer6/
        │   ├── PartialProfitSystem.mqh
        │   ├── AdaptiveTrailingEngine.mqh
        │   └── EmergencyExitSystem.mqh
        └── Support/
            ├── ConfigurationManager.mqh
            ├── TradeLogger.mqh
            ├── OnChartDashboard.mqh
            ├── WalkForwardOptimizer.mqh
            └── ONNXModule.mqh
```

---

## Part 4: Compile the EA

### Open MetaEditor
1. In MT5, press **F4** (or click Tools → MetaQuotes Language Editor)
2. MetaEditor window opens

### Navigate to EA
1. In the left panel (Navigator), expand **Experts**
2. Expand **BCS_Ultimate_v2**
3. Double-click **BCS_Ultimate_v2.mq5**
4. The code opens in the editor

### Compile
1. Click the **Compile** button (or press F7)
2. Watch the **Errors** tab at the bottom
3. **Success**: You should see "0 error(s), 0 warning(s)"
4. **If errors**: See troubleshooting section below

### Compilation Success
If successful, you'll see:
- Green checkmark in toolbar
- "0 error(s)" message
- A new file created: `BCS_Ultimate_v2.ex5` (compiled version)

---

## Part 5: Setup Demo Account

### Create Demo Account
1. In MT5, click **File** → **Open an Account**
2. Select a broker from the list (or use "MetaQuotes-Demo")
3. Click **Next**
4. Select **Open a demo account**
5. Fill in details:
   - Account Type: Standard or ECN
   - Deposit: $10,000
   - Leverage: 1:100
   - Currency: USD
6. Click **Next** and **Finish**
7. Save your login credentials!

### Verify Connection
- Top-right corner should show connection status
- Should say "Connected" with green bars
- If not, check your internet connection

---

## Part 6: Run Strategy Tester

### Open Strategy Tester
1. Press **Ctrl+R** (or View → Strategy Tester)
2. Strategy Tester panel opens at bottom

### Configure Test
```
Expert Advisor: BCS_Ultimate_v2.ex5
Symbol: EURUSD
Period: M5
Date: Last 3 months
Execution: Every tick
Optimization: Disabled
```

### Set Parameters
1. Click **Expert properties** button
2. Go to **Inputs** tab
3. Set initial parameters:
   - Use_Volatility_Filter = true
   - Use_Session_Filter = true
   - Use_News_Filter = false
   - Min_Trend_Score = 40
   - Base_Risk_Percent = 1.0
   - Use_Scaled_Entry = false
   - Use_Partial_TP = true
   - Daily_Loss_Limit = 3.0
   - Weekly_Loss_Limit = 6.0

### Run Test
1. Click **Start** button
2. Wait for test to complete (5-15 minutes)
3. Monitor progress bar

### Review Results
Check the **Results** tab:
- Total Trades
- Profit Trades %
- Profit Factor
- Expected Payoff
- Maximal Drawdown

**Target Results:**
- Win Rate: 75-90%
- Profit Factor: > 2.0
- Max Drawdown: < 10%

---

## Part 7: Attach to Live Chart (Demo)

### Open Chart
1. In MT5, press **Ctrl+U** to open Market Watch
2. Find **EURUSD**
3. Right-click → **Chart Window**
4. Change timeframe to **M5** (top toolbar)

### Attach EA
1. In Navigator panel (Ctrl+N), expand **Experts**
2. Find **BCS_Ultimate_v2**
3. **Drag and drop** onto the EURUSD M5 chart
4. Parameter window opens - configure as needed
5. Click **OK**

### Enable AutoTrading
1. Click **AutoTrading** button in top toolbar (or press F7)
2. Button should be highlighted/pressed
3. A smiley face appears in top-right corner of chart
4. Dashboard should appear on the chart

### Monitor
- Dashboard shows layer status
- Check Experts tab (Ctrl+T) for messages
- Watch for trade signals
- Monitor for 1-2 weeks

---

## Troubleshooting

### Error: "Cannot open include file"
**Problem**: Include files not in correct location

**Solution**:
1. Verify BCS folder is in: `[MT5 Data]/MQL5/Include/BCS/`
2. Check all subfolders are present
3. Restart MetaEditor
4. Compile again

### Error: "Undeclared identifier"
**Problem**: Missing struct or variable definition

**Solution**:
1. Check DataStructures.mqh is complete
2. Verify all #include statements are correct
3. Make sure no files are corrupted

### Error: "Invalid function definition"
**Problem**: Syntax error in code

**Solution**:
1. Check for missing semicolons
2. Verify all brackets match
3. Look at the line number in error message
4. Fix the specific line

### EA Not Generating Trades
**Problem**: Too selective or configuration issue

**Solution**:
1. Reduce Min_Trend_Score to 30
2. Disable Use_News_Filter
3. Check Journal tab for "Layer X failed" messages
4. Adjust parameters based on which layer is failing

### Dashboard Not Showing
**Problem**: EA not attached or AutoTrading disabled

**Solution**:
1. Verify EA is attached (smiley face in corner)
2. Enable AutoTrading (F7)
3. Check Experts tab for errors
4. Restart MT5 and re-attach EA

### Compilation Takes Forever
**Problem**: Large codebase, normal behavior

**Solution**:
- First compilation can take 30-60 seconds
- Subsequent compilations are faster
- Be patient, don't interrupt

---

## Quick Start Checklist

- [ ] Download and install MT5
- [ ] Open MT5 and locate data folder
- [ ] Copy BCS_Ultimate_v2 folder to Experts
- [ ] Copy BCS folder to Include
- [ ] Open MetaEditor (F4)
- [ ] Navigate to BCS_Ultimate_v2.mq5
- [ ] Compile (F7) - verify 0 errors
- [ ] Create demo account
- [ ] Open Strategy Tester (Ctrl+R)
- [ ] Configure test parameters
- [ ] Run 3-month backtest
- [ ] Review results
- [ ] Attach to EURUSD M5 chart
- [ ] Enable AutoTrading (F7)
- [ ] Monitor dashboard
- [ ] Check for trade signals

---

## File Paths Reference

### Windows Paths
```
MT5 Installation: C:\Program Files\MetaTrader 5\
MT5 Data Folder: C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\[ID]\

Your Project: [Wherever you saved it]\MQL5\
```

### What Goes Where
```
[Your Project]/MQL5/Experts/BCS_Ultimate_v2/
    → [MT5 Data]/MQL5/Experts/BCS_Ultimate_v2/

[Your Project]/MQL5/Include/BCS/
    → [MT5 Data]/MQL5/Include/BCS/
```

---

## Next Steps After Installation

1. **Compile Successfully** - Get 0 errors
2. **Run Strategy Tester** - Verify EA works
3. **Analyze Results** - Check win rate and profit factor
4. **Optimize Parameters** - Fine-tune for best performance
5. **Demo Test** - Run for 1-2 weeks
6. **Go Live** - Start with minimum lots

---

## Support Resources

### MT5 Documentation
- https://www.mql5.com/en/docs
- https://www.metatrader5.com/en/terminal/help

### MQL5 Community
- https://www.mql5.com/en/forum
- https://www.mql5.com/en/code

### Video Tutorials
- Search YouTube: "MT5 Strategy Tester Tutorial"
- Search YouTube: "MT5 Expert Advisor Installation"

---

**You're ready to start! Follow the steps above and you'll have the EA running in 30-60 minutes.** 🚀

**Need help?** Check the troubleshooting section or refer to TESTING_GUIDE.md for detailed testing instructions.
