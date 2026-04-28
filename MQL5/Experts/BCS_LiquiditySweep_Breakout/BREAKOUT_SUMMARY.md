# BCS Liquidity Sweep BREAKOUT Version 2.40

## Overview
This EA waits for a **large candle body** to close above (BUY) or below (SELL) the detected sweep level before entering trades. This ensures strong momentum confirmation.

## Trading Logic

### Entry Requirements
1. **Liquidity Sweep Detected** (same as Opposite EA)
   - High swept  Potential BUY
   - Low swept  Potential SELL

2. **Large Breakout Candle** (NEW)
   - Candle body must be minimum size (default: 5 pips)
   - For BUY: Bullish candle with BOTH open and close above sweep
   - For SELL: Bearish candle with BOTH open and close below sweep

### Key Difference from Opposite EA
- **Opposite EA**: Enters after 3-pip price move
- **Breakout EA**: Enters only when large candle BODY breaks through sweep level

## Parameters

### Trade Settings
- **TakeProfit_Pips**: 6.0
- **StopLoss_Pips**: 10.0
- **LotSize**: 1.0
- **Magic_Number**: 20240012
- **Lookback_Bars**: 20
- **Max_Trades_Per_Pair**: 1

### Breakout Candle Filter
- **Min_Candle_Body_Pips**: 5.0 (minimum candle body size)
- **Max_Breakout_Wait_Bars**: 10 (timeout for breakout)

## How It Works

### BUY Setup Example
1. High swept at 1.1050
2. Wait for breakout candle
3. Candle forms: Open 1.1051, Close 1.1057 (6-pip body)
4. Both open AND close above sweep (1.1050)
5. Body size  5 pips 
6. Enter BUY

### SELL Setup Example
1. Low swept at 1.1020
2. Wait for breakout candle
3. Candle forms: Open 1.1018, Close 1.1012 (6-pip body)
4. Both open AND close below sweep (1.1020)
5. Body size  5 pips 
6. Enter SELL

## Advantages

1. **Strong Momentum**: Large candle shows conviction
2. **Body Confirmation**: Entire body must break through
3. **Reduces Fakeouts**: Wicks don't trigger entry
4. **Clear Signal**: Visual confirmation on chart
5. **Better R/R**: Enters with momentum

## Installation

1. Copy to: MQL5/Experts/BCS_LiquiditySweep_Breakout/
2. Compile (F7)
3. Attach to chart
4. Configure parameters
5. Enable AutoTrading

## Configuration Tips

### Aggressive (More Trades)
- Min_Candle_Body_Pips = 3.0
- Max_Breakout_Wait_Bars = 15

### Conservative (Quality Trades)
- Min_Candle_Body_Pips = 8.0
- Max_Breakout_Wait_Bars = 8

### Scalping (M5/M15)
- Min_Candle_Body_Pips = 3.0
- Max_Breakout_Wait_Bars = 5

### Swing Trading (H1/H4)
- Min_Candle_Body_Pips = 10.0
- Max_Breakout_Wait_Bars = 15

## Version History
- **v2.40** - Breakout candle confirmation
  - Large candle body filter
  - Body must close through sweep level
  - Unique magic number (20240012)
