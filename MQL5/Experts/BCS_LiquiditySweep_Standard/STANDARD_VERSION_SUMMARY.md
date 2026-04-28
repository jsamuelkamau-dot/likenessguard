# BCS Liquidity Sweep STANDARD Version 2.00

## Overview
This is the **STANDARD LOGIC** version of the Liquidity Sweep EA with continuation filter. It trades in the traditional direction after liquidity sweeps are detected.

## Trading Logic

### STANDARD LOGIC (Version 2.00)
- **High Swept** → Opens **SELL** (reversal/continuation down)
- **Low Swept** → Opens **BUY** (reversal/continuation up)

This is the OPPOSITE of the "Opposite" version which does:
- High Swept → BUY
- Low Swept → SELL

## Key Features

### 1. Liquidity Sweep Detection
- Monitors recent swing highs and lows over configurable lookback period (default: 20 bars)
- Detects when price briefly breaks structure to grab stops
- Identifies false breakouts that reverse

### 2. Continuation Filter (NEW in v2.00)
- **Enabled by default** - waits for price continuation confirmation after sweep
- Prevents premature entries on false signals
- Configurable parameters:
  - `Continuation_Bars` (default: 3) - How many bars to wait
  - `Min_Continuation_Pips` (default: 3.0) - Minimum move required

### 3. Multi-Currency Support
- Trades up to 8 currency pairs simultaneously
- Independent tracking for each pair
- Configurable max trades per pair

## Parameters

### Trade Settings
- **TakeProfit_Pips**: 10.0 (default) - 2:1 Risk/Reward Ratio
- **StopLoss_Pips**: 5.0 (default)
- **LotSize**: 1.0 per pair
- **Magic_Number**: 20240009 (unique identifier)
- **Lookback_Bars**: 20
- **Max_Trades_Per_Pair**: 1

### Continuation Filter
- **Use_Continuation_Filter**: true (recommended)
- **Continuation_Bars**: 3
- **Min_Continuation_Pips**: 3.0

### Currency Pairs
- EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD (enabled by default)
- EURGBP, EURJPY (disabled by default)

## How It Works

### Without Continuation Filter
1. Detects liquidity sweep (high or low broken)
2. Immediately opens trade in standard direction
3. Sets TP and SL

### With Continuation Filter (Recommended)
1. Detects liquidity sweep
2. Marks as "pending" and waits for confirmation
3. Monitors price movement for continuation
4. Opens trade only if:
   - Price moves minimum pips in expected direction
   - Within the continuation bars timeout
5. Cancels if:
   - Price moves against expected direction
   - Timeout reached without confirmation

## Example Scenarios

### High Swept → SELL
```
1. Price breaks above recent swing high
2. Closes back below the high (sweep detected)
3. [If continuation filter enabled] Wait for bearish move
4. Open SELL position
```

### Low Swept → BUY
```
1. Price breaks below recent swing low
2. Closes back above the low (sweep detected)
3. [If continuation filter enabled] Wait for bullish move
4. Open BUY position
```

## Differences from Opposite Version

| Feature | STANDARD (v2.00) | OPPOSITE (v2.1) |
|---------|------------------|-----------------|
| High Swept | SELL | BUY |
| Low Swept | BUY | SELL |
| Magic Number | 20240009 | 20240004 |
| Trade Comment | "Standard BUY/SELL" | "Opposite BUY/SELL" |
| Version | 2.00 | 2.10 |

## Installation

1. Copy `BCS_LiquiditySweep_Standard.mq5` to `MQL5/Experts/BCS_LiquiditySweep_Standard/`
2. Compile in MetaEditor (F7)
3. Attach to any chart (the EA trades multiple pairs independently)
4. Configure parameters as needed
5. Enable AutoTrading

## Risk Management

- Fixed lot size per pair (no martingale)
- Fixed TP/SL in pips
- Max 1 trade per pair by default
- Continuation filter reduces false signals
- Each pair trades independently

## Testing Recommendations

1. **Backtest both versions** (Standard and Opposite) on same data
2. **Compare results** to see which logic works better for your pairs/timeframe
3. **Start with demo account** to verify behavior
4. **Use continuation filter** for more conservative entries
5. **Adjust continuation parameters** based on volatility

## Version History

- **v2.00** (Current) - Standard logic with continuation filter
  - Based on Opposite v2.1 with reversed buy/sell logic
  - Unique magic number (20240009)
  - Updated comments and print statements

## Notes

- Can run simultaneously with Opposite version (different magic numbers)
- Both versions use same continuation filter logic
- Choose version based on backtesting results for your strategy
- Standard logic follows traditional "buy low, sell high" after sweep
- Opposite logic follows "buy strength, sell weakness" after sweep
