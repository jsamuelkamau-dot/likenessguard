# BCS Liquidity Sweep STANDARD-20 Version 2.20

## Overview
This is the **STANDARD-20** version with a **wider 20-pip stop loss** for more volatile market conditions. It uses the same standard logic as the base Standard version but with more breathing room for price fluctuations.

## Trading Logic

### STANDARD LOGIC
- **High Swept** → Opens **SELL** (reversal/continuation down)
- **Low Swept** → Opens **BUY** (reversal/continuation up)

### Risk/Reward Profile
- **Take Profit**: 10 pips
- **Stop Loss**: 20 pips
- **Risk/Reward Ratio**: 1:2 (risking 20 to make 10)

This is a **conservative** approach that gives trades more room to breathe before hitting stop loss, reducing the chance of being stopped out by normal market noise.

## Key Features

### 1. Wider Stop Loss (20 pips)
- Accommodates higher volatility
- Reduces premature stop-outs
- Better for news events and volatile sessions
- Suitable for pairs like GBPUSD, EURJPY

### 2. Liquidity Sweep Detection
- Monitors recent swing highs and lows over 20 bars
- Detects when price briefly breaks structure to grab stops
- Identifies false breakouts that reverse

### 3. Continuation Filter
- **Enabled by default** - waits for price continuation confirmation
- Prevents premature entries on false signals
- Configurable parameters:
  - `Continuation_Bars` (default: 3)
  - `Min_Continuation_Pips` (default: 3.0)

### 4. Multi-Currency Support
- Trades up to 8 currency pairs simultaneously
- Independent tracking for each pair
- Configurable max trades per pair

## Parameters

### Trade Settings
- **TakeProfit_Pips**: 10.0
- **StopLoss_Pips**: 20.0 (WIDER for volatility)
- **LotSize**: 1.0 per pair
- **Magic_Number**: 20240010 (unique identifier)
- **Lookback_Bars**: 20
- **Max_Trades_Per_Pair**: 1

### Continuation Filter
- **Use_Continuation_Filter**: true (recommended)
- **Continuation_Bars**: 3
- **Min_Continuation_Pips**: 3.0

### Currency Pairs
- EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD (enabled by default)
- EURGBP, EURJPY (disabled by default)

## When to Use Standard-20

### Best For:
- **Volatile market conditions** (news events, high-impact releases)
- **Wider spread pairs** (GBPUSD, EURJPY, exotic pairs)
- **Higher timeframes** (H1, H4, D1)
- **Traders who want fewer stop-outs**
- **Conservative risk management**

### Not Ideal For:
- Scalping on lower timeframes (M1, M5)
- Low volatility periods
- Tight spread environments where 5-pip SL is sufficient

## Comparison with Other Versions

| Feature | Standard (v2.00) | Standard-20 (v2.20) | Opposite (v2.1) |
|---------|------------------|---------------------|-----------------|
| High Swept | SELL | SELL | BUY |
| Low Swept | BUY | BUY | SELL |
| Take Profit | 10 pips | 10 pips | 6 pips |
| Stop Loss | 5 pips | **20 pips** | 10 pips |
| R/R Ratio | 2:1 | 1:2 | 0.6:1 |
| Magic Number | 20240009 | 20240010 | 20240004 |
| Best For | Tight markets | Volatile markets | Trend following |

## Risk Management

### Position Sizing Considerations
Since this version has a **20-pip stop loss** (4x larger than Standard v2.00), you should:

1. **Reduce lot size** proportionally to maintain same dollar risk
   - If Standard uses 1.0 lot with 5-pip SL
   - Standard-20 should use 0.25 lot with 20-pip SL
   - This keeps dollar risk equal

2. **Calculate position size** based on account risk percentage
   - Example: Risk 1% of $10,000 account = $100 risk
   - With 20-pip SL on EURUSD: $100 / ($10 per pip × 20 pips) = 0.5 lots

3. **Consider volatility** of each pair
   - GBPUSD, EURJPY: May need full 20-pip buffer
   - EURUSD, USDCAD: Might be over-protected with 20 pips

## Installation

1. Copy `BCS_LiquiditySweep_Standard_20.mq5` to `MQL5/Experts/BCS_LiquiditySweep_Standard_20/`
2. Compile in MetaEditor (F7)
3. Attach to any chart
4. **IMPORTANT**: Adjust lot size to account for wider stop loss
5. Enable AutoTrading

## Testing Recommendations

1. **Backtest on volatile periods** (NFP, FOMC, Brexit, etc.)
2. **Compare with Standard v2.00** to see which performs better
3. **Test on different timeframes** (H1, H4, D1)
4. **Monitor stop-out rate** - should be lower than Standard v2.00
5. **Calculate actual R/R** achieved vs theoretical 1:2

## Strategy Notes

### Advantages of 20-Pip Stop Loss:
- Fewer stop-outs from market noise
- Better for swing trading
- Handles news volatility better
- More forgiving of imperfect entries

### Disadvantages:
- Larger dollar risk per trade
- Lower R/R ratio (1:2 instead of 2:1)
- May hold losing trades longer
- Requires smaller position sizes

## Version History

- **v2.20** (Current) - Standard logic with 20-pip stop loss
  - Based on Standard v2.00 with wider SL
  - Unique magic number (20240010)
  - Optimized for volatile conditions

## Notes

- Can run simultaneously with Standard v2.00 and Opposite v2.1 (different magic numbers)
- Use this version when market volatility increases
- Switch to Standard v2.00 during calm market conditions
- Always adjust position size to maintain consistent dollar risk
