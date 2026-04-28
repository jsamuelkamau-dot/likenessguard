# BCS Liquidity Sweep BREAKOUT Version 2.40

## Overview
The BREAKOUT version waits for a large candle body to close above (BUY) or below (SELL) the detected sweep level before entering trades. This provides strong momentum confirmation.

## Trading Logic

### Two-Step Entry Process

1. **Liquidity Sweep Detection** (Step 1)
   - High swept = Potential BUY setup
   - Low swept = Potential SELL setup
   - Uses OPPOSITE logic

2. **Large Candle Breakout** (Step 2)
   - Wait for large candle body to form
   - BUY: Bullish candle body closes ABOVE sweep
   - SELL: Bearish candle body closes BELOW sweep
   - Minimum body size required (default: 5 pips)

## Key Features

### 1. Body-Based Confirmation
- Checks candle BODY (open to close), not wicks
- Ensures strong directional momentum
- Filters out weak/indecisive candles

### 2. Candle Requirements

**For BUY Signal:**
- Candle must be bullish (close > open)
- BOTH open AND close above sweep price
- Body size >= minimum pips

**For SELL Signal:**
- Candle must be bearish (close < open)
- BOTH open AND close below sweep price
- Body size >= minimum pips

### 3. Timeout Protection
- Max wait: 10 bars (default)
- Cancels stale signals
- Keeps entries fresh

## Parameters

### Trade Settings
- **TakeProfit_Pips**: 6.0
- **StopLoss_Pips**: 10.0
- **LotSize**: 1.0 per pair
- **Magic_Number**: 20240012 (unique)
- **Lookback_Bars**: 20
- **Max_Trades_Per_Pair**: 1

### Breakout Candle Filter
- **Min_Candle_Body_Pips**: 5.0 (minimum body size)
- **Max_Breakout_Wait_Bars**: 10 (timeout)

## How It Works

### Complete Trade Flow

**Example: Bullish Setup**

1. **Sweep Detection**
   - High swept at 1.1050
   - Close back below at 1.1045
   - Start monitoring for breakout candle

2. **Wait for Breakout Candle** (Bars 1-10)
   - Bar 3: Small bullish candle (3 pips) - ignored
   - Bar 5: Large bullish candle (7 pips)
   - Open: 1.1046, Close: 1.1053
   - Body: 7 pips (above 5 pip minimum)
   - Both open and close above sweep (1.1045)

3. **Entry Confirmed**
   - BULLISH BREAKOUT CANDLE CONFIRMED
   - Open BUY trade

## Comparison with Other Versions

| Feature | Opposite (v2.1) | Breakout (v2.40) |
|---------|-----------------|------------------|
| Entry Trigger | 3-pip continuation | Large candle body breakout |
| Confirmation | Price movement | Candle body position |
| Body Check | No | Yes (both open & close) |
| Min Size | 3 pips move | 5 pips body |
| False Signals | Moderate | Lower |
| Entry Quality | Good | Excellent |

## Installation

1. Copy to MQL5/Experts/BCS_LiquiditySweep_Breakout/
2. Compile in MetaEditor (F7)
3. Attach to chart
4. Configure parameters
5. Enable AutoTrading

## Configuration Tips

### For Aggressive Trading
- Min_Candle_Body_Pips = 3.0
- Max_Breakout_Wait_Bars = 15

### For Conservative Trading
- Min_Candle_Body_Pips = 8.0
- Max_Breakout_Wait_Bars = 8

### For Scalping
- Min_Candle_Body_Pips = 2.0
- Max_Breakout_Wait_Bars = 5

## Advantages

1. **Strong Momentum**: Large body = strong directional move
2. **Clear Entry**: Precise candle close trigger
3. **Body Validation**: Both open and close must be beyond sweep
4. **Filters Noise**: Ignores small/weak candles
5. **Visual Clarity**: Easy to see on chart

## Notes

- Can run with other versions (different magic numbers)
- More selective than Opposite v2.1
- Higher quality entries
- May miss some trades waiting for large candle
- Best on trending markets

## Version History

- **v2.40** (Current) - Large candle body breakout confirmation
  - Body-based entry (not just close)
  - Minimum body size filter
  - Timeout protection
  - Unique magic number (20240012)
