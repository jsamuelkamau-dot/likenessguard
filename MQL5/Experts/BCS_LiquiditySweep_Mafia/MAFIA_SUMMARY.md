# BCS_LiquiditySweep_Mafia EA - Complete Summary

## Overview
The Mafia EA uses liquidity sweep detection combined with a sophisticated double retest pattern with V-shape confirmation.

## Key Features

### 1. Sweep Logic (OPPOSITE Direction)
- **High Swept = BUY Signal**
- **Low Swept = SELL Signal**

### 2. Double Retest Pattern (Required for Entry)

#### For BUY Trades (After High Swept):
1. **Market moves upside** - Price approaches the swept high
2. **Gets rejected at first test** - Price reaches near sweep level and rejects
3. **Pulls back forming V-shape** - Price drops minimum 5 pips (configurable)
4. **Moves up again breaking first test** - Price closes above first test level
5. **Wait for retest at second test** - Price comes back down to first test level
6. **Execute BUY** - Pattern complete, open BUY trade

#### For SELL Trades (After Low Swept):
1. **Market moves downside** - Price approaches the swept low
2. **Gets rejected at first test** - Price reaches near sweep level and rejects
3. **Bounces forming inverted V-shape** - Price rises minimum 5 pips (configurable)
4. **Moves down again breaking first test** - Price closes below first test level
5. **Wait for retest at second test** - Price comes back up to first test level
6. **Execute SELL** - Pattern complete, open SELL trade

### 3. Multi-Currency Support
Trades up to 8 currency pairs simultaneously with independent pattern tracking.

## Configuration Parameters

### Trade Settings
- `TakeProfit_Pips = 10.0` - Take profit in pips
- `StopLoss_Pips = 15.0` - Stop loss in pips
- `LotSize = 1.0` - Fixed lot size per pair
- `Magic_Number = 20240015` - Unique identifier for Mafia EA
- `Lookback_Bars = 20` - Bars to scan for highs/lows
- `Max_Trades_Per_Pair = 1` - Max simultaneous trades per symbol

### Double Retest Pattern
- `Min_Pullback_Pips = 5.0` - Minimum V-shape pullback/bounce distance
- `Retest_Tolerance_Pips = 3.0` - Tolerance for retest level detection
- `Max_Pattern_Bars = 30` - Maximum bars to wait for pattern completion

## Pattern State Machine

The EA uses a 5-state machine to track pattern progression:

1. **STATE_SWEEP_DETECTED** - Liquidity sweep identified, waiting for first test
2. **STATE_FIRST_REJECTION** - First test reached, waiting for pullback/bounce
3. **STATE_PULLBACK** - V-shape formed, waiting for breakout
4. **STATE_BREAKOUT** - Broke first test level, waiting for second retest
5. **STATE_READY_FOR_RETEST** - Second retest confirmed, execute trade

## Trading Logic Flow

### BUY Example (High Swept):
```
1. High swept at 1.1050
2. Price moves up to 1.1048 (first test) → Rejection
3. Price pulls back to 1.1038 (10 pips V-shape)
4. Price breaks above 1.1048 (breakout)
5. Price retests 1.1047 (within 3 pip tolerance)
6. → OPEN BUY
```

### SELL Example (Low Swept):
```
1. Low swept at 1.1000
2. Price moves down to 1.1002 (first test) → Rejection
3. Price bounces to 1.1012 (10 pips inverted V)
4. Price breaks below 1.1002 (breakout)
5. Price retests 1.1003 (within 3 pip tolerance)
6. → OPEN SELL
```

## Important Notes

- **Opposite Logic**: High swept triggers BUY (not SELL), Low swept triggers SELL (not BUY)
- **V-Shape Required**: Must see clear rejection and pullback before breakout
- **Double Confirmation**: Both breakout AND retest must occur
- **Timeout Protection**: Pattern cancelled if not completed within 30 bars
- **Unique Magic Number**: Can run alongside other BCS EAs without conflicts

## Risk Management

- TP:SL Ratio: 10:15 (approximately 1:1.5)
- Maximum 1 trade per currency pair
- Pattern must complete all stages before entry
- Automatic timeout prevents stale signals

## Installation

1. Copy to: `MQL5/Experts/BCS_LiquiditySweep_Mafia/`
2. Compile in MetaEditor
3. Attach to any chart (monitors all enabled pairs)
4. Adjust pattern parameters based on market conditions

## Advantages

- **High Probability**: Multiple confirmations reduce false signals
- **Clear Structure**: V-shape pattern is visually identifiable
- **Flexible**: Configurable pullback and retest tolerances
- **Multi-Stage**: Each stage must complete before proceeding
- **Timeout Protection**: Prevents waiting indefinitely for pattern

## Pattern Validation

The EA validates:
- Sweep detection (wick + close relationship)
- First test proximity to sweep level
- Minimum pullback/bounce distance
- Breakout confirmation (close beyond first test)
- Second retest within tolerance range

All conditions must be met before trade execution.
