# ✅ MT5 Configuration Checklist

## Pre-Flight Check

- [x] MT5 Installed
- [ ] Files Copied
- [ ] EA Compiled
- [ ] Demo Account Created
- [ ] First Test Run
- [ ] Results Reviewed

---

## Detailed Checklist

### 📁 File Setup
- [ ] Opened MT5 Data Folder (File → Open Data Folder)
- [ ] Copied `BCS_Ultimate_v2` folder to `MQL5/Experts/`
- [ ] Copied `BCS` folder to `MQL5/Include/`
- [ ] Verified all 28 files are present
- [ ] Closed and reopened MT5

### 🔧 Compilation
- [ ] Opened MetaEditor (F4)
- [ ] Found BCS_Ultimate_v2.mq5 in Navigator
- [ ] Opened the file (double-click)
- [ ] Clicked Compile (F7)
- [ ] Got "0 error(s)" message
- [ ] Saw green checkmark
- [ ] File BCS_Ultimate_v2.ex5 created

### 👤 Demo Account
- [ ] Clicked File → Open an Account
- [ ] Selected demo server
- [ ] Chose "Open a demo account"
- [ ] Set deposit to $10,000
- [ ] Set leverage to 1:100
- [ ] Saved login credentials
- [ ] Verified "Connected" status

### 🧪 Strategy Tester Setup
- [ ] Opened Strategy Tester (Ctrl+R)
- [ ] Selected Expert: BCS_Ultimate_v2.ex5
- [ ] Selected Symbol: EURUSD
- [ ] Selected Period: M5
- [ ] Set Date: Last 3 months
- [ ] Set Execution: Every tick
- [ ] Optimization: Disabled

### ⚙️ EA Parameters
- [ ] Clicked "Expert properties"
- [ ] Went to "Inputs" tab
- [ ] Set Use_Volatility_Filter = true
- [ ] Set Use_Session_Filter = true
- [ ] Set Use_News_Filter = false
- [ ] Set Min_Trend_Score = 40
- [ ] Set Base_Risk_Percent = 1.0
- [ ] Set Use_Scaled_Entry = false
- [ ] Set Use_Partial_TP = true
- [ ] Set Daily_Loss_Limit = 3.0
- [ ] Set Weekly_Loss_Limit = 6.0
- [ ] Clicked OK

### ▶️ Run Test
- [ ] Clicked "Start" button
- [ ] Watched progress bar
- [ ] Monitored Journal tab
- [ ] Saw initialization messages
- [ ] Test completed (100%)
- [ ] No critical errors

### 📊 Review Results
- [ ] Checked "Results" tab
- [ ] Noted Total Trades count
- [ ] Checked Profit Trades %
- [ ] Checked Profit Factor
- [ ] Checked Maximal Drawdown
- [ ] Viewed "Graph" tab
- [ ] Equity curve trending up
- [ ] Reviewed trade list

### 📝 Check Logs
- [ ] Opened MT5 Data Folder
- [ ] Navigated to MQL5/Files/
- [ ] Found BCS_Trades_*.csv
- [ ] Found BCS_Events_*.csv
- [ ] Opened in Excel/Notepad
- [ ] Verified trade details logged

### 📈 Live Chart Setup
- [ ] Opened EURUSD chart
- [ ] Changed to M5 timeframe
- [ ] Opened Navigator (Ctrl+N)
- [ ] Dragged EA onto chart
- [ ] Clicked OK on parameters
- [ ] Enabled AutoTrading (F7)
- [ ] Saw smiley face ☺
- [ ] Dashboard appeared
- [ ] Checked Experts tab (Ctrl+T)

### 🎯 Verification
- [ ] Dashboard showing layer status
- [ ] Layer scores updating
- [ ] Colors changing (green/yellow/red)
- [ ] Account info displaying
- [ ] No errors in Experts tab
- [ ] EA running smoothly

---

## Results Evaluation

### ✅ Excellent Results
- [ ] Win Rate: 80-90%
- [ ] Profit Factor: > 3.0
- [ ] Max Drawdown: < 6%
- [ ] 100-200 trades
- [ ] Smooth equity curve

### ⚠️ Good Results (Needs Minor Tuning)
- [ ] Win Rate: 70-80%
- [ ] Profit Factor: 2.0-3.0
- [ ] Max Drawdown: 6-10%
- [ ] 50-100 trades
- [ ] Generally upward curve

### ❌ Needs Improvement
- [ ] Win Rate: < 70%
- [ ] Profit Factor: < 2.0
- [ ] Max Drawdown: > 10%
- [ ] < 50 trades or > 300 trades
- [ ] Erratic equity curve

---

## Troubleshooting Checklist

### If Compilation Failed:
- [ ] Verified BCS folder in Include directory
- [ ] Checked all subfolders present
- [ ] Restarted MetaEditor
- [ ] Tried compiling again
- [ ] Checked specific error message
- [ ] Fixed the reported line

### If No Trades Generated:
- [ ] Reduced Min_Trend_Score to 30
- [ ] Disabled Use_News_Filter
- [ ] Checked Journal for layer failures
- [ ] Verified all layers initialized
- [ ] Ran test again

### If Dashboard Not Showing:
- [ ] Verified EA attached to chart
- [ ] Enabled AutoTrading (F7)
- [ ] Checked for smiley face
- [ ] Looked in Experts tab for errors
- [ ] Restarted MT5
- [ ] Re-attached EA

### If Too Many Trades:
- [ ] Increased Min_Trend_Score to 50
- [ ] Enabled Use_News_Filter
- [ ] Increased Volume_Min_Mult to 2.0
- [ ] Ran test again

### If High Drawdown:
- [ ] Reduced Base_Risk_Percent to 0.5
- [ ] Enabled Use_Equity_Curve
- [ ] Reduced Daily_Loss_Limit to 2.0
- [ ] Checked emergency exit working

---

## Next Steps Checklist

### Optimization Phase:
- [ ] Run 6-month backtest
- [ ] Test on GBPUSD
- [ ] Test on USDJPY
- [ ] Enable optimization
- [ ] Test parameter variations
- [ ] Select best parameters
- [ ] Re-test with optimized settings

### Demo Testing Phase:
- [ ] Monitor for 1 week
- [ ] Check daily performance
- [ ] Review log files
- [ ] Compare to backtest
- [ ] Adjust if needed
- [ ] Monitor for 2nd week
- [ ] Validate consistency

### Live Trading Phase:
- [ ] Open live account ($1,000+)
- [ ] Start with 0.01 lots
- [ ] Enable all safety features
- [ ] Monitor closely (first week)
- [ ] Check daily (first month)
- [ ] Scale up gradually
- [ ] Add more pairs

---

## Performance Tracking

### Week 1:
- [ ] Total trades: _____
- [ ] Win rate: _____%
- [ ] Profit/Loss: $_____
- [ ] Max drawdown: _____%
- [ ] Issues noted: _____________

### Week 2:
- [ ] Total trades: _____
- [ ] Win rate: _____%
- [ ] Profit/Loss: $_____
- [ ] Max drawdown: _____%
- [ ] Issues noted: _____________

### Month 1:
- [ ] Total trades: _____
- [ ] Win rate: _____%
- [ ] Profit/Loss: $_____
- [ ] Max drawdown: _____%
- [ ] Ready for live: Yes / No

---

## Documentation Reference

- [ ] Read QUICK_START.md
- [ ] Read STEP_BY_STEP_SETUP.md
- [ ] Read TESTING_GUIDE.md
- [ ] Read INSTALLATION_INSTRUCTIONS.md
- [ ] Read IMPLEMENTATION_COMPLETE.md

---

## Support Resources

### If You Need Help:
- [ ] Checked troubleshooting section
- [ ] Reviewed error messages
- [ ] Consulted documentation
- [ ] Noted specific issue
- [ ] Prepared screenshots

### Useful Links:
- [ ] MT5 Documentation: mql5.com/en/docs
- [ ] MT5 Forum: mql5.com/en/forum
- [ ] Video Tutorials: YouTube "MT5 Tutorial"

---

## Final Verification

Before going live, ensure:
- [ ] Backtest shows 75%+ win rate
- [ ] Profit factor > 2.0
- [ ] Max drawdown < 10%
- [ ] Demo test successful (1-2 weeks)
- [ ] No critical errors
- [ ] All safety features enabled
- [ ] Starting with minimum lots
- [ ] Monitoring plan in place

---

## Status Summary

**Current Phase:** ________________
**Last Completed:** ________________
**Next Step:** ________________
**Issues:** ________________
**Notes:** ________________

---

**Print this checklist and mark items as you complete them!** ✅

**Estimated Time to Complete All Steps:** 1-2 hours
**Estimated Time to First Test:** 30 minutes
**Estimated Time to Live Trading:** 1-2 weeks (after demo testing)

---

*Good luck! You're on your way to running a sophisticated institutional-grade trading system!* 🚀
