# BCS_LiquiditySweep_NewStructure EA - Complete Summary

## Overview
NewStructure EA combines REVERSED liquidity sweep logic with Flag/Pennant pattern confirmation.

## Key Features

### 1. REVERSED Sweep Logic
- **High Swept = SELL Signal** (opposite of original Structure)
- **Low Swept = BUY Signal** (opposite of original Structure)
- All detection conditions remain the same, only trade direction is reversed

### 2. Pattern Confirmation Required
After detecting a liquidity sweep, the EA waits for either:
- **Flag Pattern**: Consolidation after strong move, then breakout
- **Pennant Pattern**: Converging price action, then breakout

### 3. Profit Management
- **Take Profit**: 10 pips (configurable)
- **Stop Loss**: 15 pips (configurable)
- Standard pip-based TP/SL management

### 4. Multi-Currency Support
Trades up to 8 currency pairs simultaneously with independent tracking.

## Configuration Parameters

### Trade Settings
- `TakeProfit_Pips = 10.0` - Take profit in pips
- `StopLoss_Pips = 15.0` - Stop loss in pips
- `LotSize = 1.0` - Fixed lot size per pair
- `Magic_Number = 20240014` - Unique identifier
- `Lookback_Bars = 20` - Bars to scan for highs/lows
- `Max_Trades_Per_Pair = 1` - Max simultaneous trades per symbol

### Pattern Detection
- `Pattern_Lookback = 10` - Bars to analyze for patterns
- `Flag_Max_Retracement = 0.5` - Max 50% retracement for flag
- `Pennant_Convergence = 0.7` - Convergence ratio for pennant

## Trading Logic Flow

1. **Sweep Detection**
   - High swept (wick above recent high, close below) → SELL signal
   - Low swept (wick below recent low, close above) → BUY signal

2. **Pattern Wait**
   - EA marks sweep as "pending"
   - Monitors next 20 bars for Flag or Pennant pattern
   - Cancels if no pattern forms within timeout

3. **Pattern Confirmation**
   - **Flag**: Consolidation with max 50% retracement, then breakout
   - **Pennant**: Converging highs/lows (70% convergence), then breakout

4. **Trade Execution**
   - Opens trade in direction indicated by sweep (REVERSED)
   - Sets 15-pip stop loss
   - Sets 10-pip take profit

## Differences from Original Structure EA

| Feature | Original Structure | NewStructure |
|---------|-------------------|--------------|
| High Swept | BUY signal | SELL signal |
| Low Swept | SELL signal | BUY signal |
| Take Profit | 10 pips | 10 pips |
| Stop Loss | 20 pips | 15 pips |
| Magic Number | 20240004 | 20240014 |

## Example Scenarios

### Scenario 1: High Swept → SELL
1. Price wicks above recent high, closes below
2. EA detects sweep, waits for pattern
3. Flag pattern forms (consolidation)
4. Price breaks below flag → Opens SELL
5. Trade closes at 10-pip TP or 15-pip SL

### Scenario 2: Low Swept → BUY
1. Price wicks below recent low, closes above
2. EA detects sweep, waits for pattern
3. Pennant pattern forms (converging)
4. Price breaks above pennant → Opens BUY
5. Trade closes at 10-pip TP or 15-pip SL

## Installation
1. Copy to: `MQL5/Experts/BCS_LiquiditySweep_NewStructure/`
2. Compile in MetaEditor
3. Attach to any chart (monitors all enabled pairs)
4. Adjust parameters as needed

## Important Notes
- Reversed logic means opposite trades from Structure EA
- Can run simultaneously with other BCS EAs (unique magic number)
- TP:SL ratio is 10:15 (approximately 1:1.5)
- Pattern confirmation prevents false entries
- Maximum 20 bars wait for pattern formation
