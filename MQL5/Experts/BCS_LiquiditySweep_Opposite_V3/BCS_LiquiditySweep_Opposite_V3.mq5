//+------------------------------------------------------------------+
//|                  BCS_LiquiditySweep_Opposite_V3.mq5              |
//|     Multi-Currency with EMA + Order Block Retest Confirmation    |
//|     Liquidity Sweep + EMA Pullback + Order Block Retest         |
//+------------------------------------------------------------------+
#property copyright "BCS v3.0"
#property version   "3.00"
#property strict

//--- Input Parameters
input group "=== Trade Settings ==="
input double TakeProfit_Pips = 6.0;      // Take Profit in pips
input double StopLoss_Pips = 10.0;       // Stop Loss in pips
input double LotSize = 1.0;              // Fixed lot size per pair
input int Magic_Number = 20240006;       // Magic number
input int Lookback_Bars = 20;            // Bars to look back for highs/lows
input int Max_Trades_Per_Pair = 1;       // Max simultaneous trades per pair

input group "=== EMA Pullback Filter ==="
input bool Use_EMA_Filter = true;        // Use EMA pullback confirmation
input int EMA_Fast = 9;                  // Fast EMA period
input int EMA_Slow = 21;                 // Slow EMA period
input double EMA_Touch_Distance = 3.0;   // Max pips from EMA to consider "touch"

input group "=== Order Block Retest Filter ==="
input bool Use_OrderBlock_Filter = true;     // Use Order Block retest confirmation
input int OB_Lookback = 15;                  // Bars to look back for order blocks
input double OB_Min_Impulse_Pips = 8.0;      // Minimum impulse move size in pips
input double OB_Retest_Distance = 5.0;       // Max pips from OB zone to consider retest
input double Min_Rejection_Wick_Pct = 40.0;  // Minimum rejection wick % on retest candle

input group "=== Currency Pairs ==="
input bool Trade_EURUSD = true;          // Trade EURUSD
input bool Trade_GBPUSD = true;          // Trade GBPUSD
input bool Trade_USDJPY = true;          // Trade USDJPY
input bool Trade_AUDUSD = true;          // Trade AUDUSD
input bool Trade_USDCAD = true;          // Trade USDCAD
input bool Trade_NZDUSD = true;          // Trade NZDUSD
input bool Trade_EURGBP = false;         // Trade EURGBP
input bool Trade_EURJPY = false;         // Trade EURJPY

//--- Structures
struct OrderBlock
{
    double high;
    double low;
    double open;
    double close;
    int bar_index;
    bool is_bullish;  // false = bearish OB (for buy), true = bullish OB (for sell)
};

struct SymbolData
{
    string symbol;
    datetime lastBarTime;
    bool enabled;
    int emaFastHandle;
    int emaSlowHandle;
    OrderBlock lastOrderBlock;
    bool hasOrderBlock;
};

SymbolData g_symbols[];
int g_symbolCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=== BCS Liquidity Sweep OPPOSITE V3 Multi-Currency EA Started ===");
    Print("OPPOSITE LOGIC: Low Swept = SELL | High Swept = BUY");
    Print("EMA FILTER: 9/21 EMA Pullback Confirmation");
    Print("ORDER BLOCK FILTER: Impulse + Retest Confirmation");
    Print("Take Profit: ", TakeProfit_Pips, " pips");
    Print("Stop Loss: ", StopLoss_Pips, " pips");
    Print("Lot Size: ", LotSize, " per pair");
    
    // Initialize symbol list
    ArrayResize(g_symbols, 0);
    g_symbolCount = 0;
    
    // Add enabled symbols
    if(Trade_EURUSD) AddSymbol("EURUSD");
    if(Trade_GBPUSD) AddSymbol("GBPUSD");
    if(Trade_USDJPY) AddSymbol("USDJPY");
    if(Trade_AUDUSD) AddSymbol("AUDUSD");
    if(Trade_USDCAD) AddSymbol("USDCAD");
    if(Trade_NZDUSD) AddSymbol("NZDUSD");
    if(Trade_EURGBP) AddSymbol("EURGBP");
    if(Trade_EURJPY) AddSymbol("EURJPY");
    
    Print("Trading ", g_symbolCount, " currency pairs:");
    for(int i = 0; i < g_symbolCount; i++)
    {
        Print("  ", i+1, ". ", g_symbols[i].symbol);
    }
    
    Print("EMA Filter: ", Use_EMA_Filter ? "ENABLED" : "DISABLED");
    Print("Order Block Filter: ", Use_OrderBlock_Filter ? "ENABLED" : "DISABLED");
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Add symbol to trading list                                        |
//+------------------------------------------------------------------+
void AddSymbol(string symbol)
{
    ArrayResize(g_symbols, g_symbolCount + 1);
    g_symbols[g_symbolCount].symbol = symbol;
    g_symbols[g_symbolCount].lastBarTime = 0;
    g_symbols[g_symbolCount].enabled = true;
    g_symbols[g_symbolCount].hasOrderBlock = false;
    
    // Create EMA indicators for this symbol
    if(Use_EMA_Filter)
    {
        g_symbols[g_symbolCount].emaFastHandle = iMA(symbol, PERIOD_CURRENT, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
        g_symbols[g_symbolCount].emaSlowHandle = iMA(symbol, PERIOD_CURRENT, EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
        
        if(g_symbols[g_symbolCount].emaFastHandle == INVALID_HANDLE || 
           g_symbols[g_symbolCount].emaSlowHandle == INVALID_HANDLE)
        {
            Print("WARNING: Failed to create EMA indicators for ", symbol);
        }
    }
    else
    {
        g_symbols[g_symbolCount].emaFastHandle = INVALID_HANDLE;
        g_symbols[g_symbolCount].emaSlowHandle = INVALID_HANDLE;
    }
    
    g_symbolCount++;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    // Release all indicator handles
    for(int i = 0; i < g_symbolCount; i++)
    {
        if(g_symbols[i].emaFastHandle != INVALID_HANDLE)
            IndicatorRelease(g_symbols[i].emaFastHandle);
        if(g_symbols[i].emaSlowHandle != INVALID_HANDLE)
            IndicatorRelease(g_symbols[i].emaSlowHandle);
    }
    
    Print("=== BCS Liquidity Sweep OPPOSITE V3 Multi-Currency EA Stopped ===");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
    // Loop through all enabled symbols
    for(int i = 0; i < g_symbolCount; i++)
    {
        if(!g_symbols[i].enabled)
            continue;
        
        string symbol = g_symbols[i].symbol;
        
        // Check for new bar on this symbol
        datetime currentBarTime = iTime(symbol, PERIOD_CURRENT, 0);
        
        if(currentBarTime == g_symbols[i].lastBarTime)
            continue;
        
        g_symbols[i].lastBarTime = currentBarTime;
        
        // Check if we can trade this pair
        if(CountTradesForSymbol(symbol) >= Max_Trades_Per_Pair)
            continue;
        
        // Update order blocks for this symbol
        if(Use_OrderBlock_Filter)
            UpdateOrderBlocks(symbol, i);
        
        // Check for liquidity sweep on this symbol
        CheckLiquiditySweep(symbol, i);
    }
}

//+------------------------------------------------------------------+
//| Count open trades for specific symbol                            |
//+------------------------------------------------------------------+
int CountTradesForSymbol(string symbol)
{
    int count = 0;
    
    for(int i = 0; i < PositionsTotal(); i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket == 0) continue;
        
        if(PositionGetString(POSITION_SYMBOL) == symbol &&
           PositionGetInteger(POSITION_MAGIC) == Magic_Number)
        {
            count++;
        }
    }
    
    return count;
}

//+------------------------------------------------------------------+
//| Detect strong impulse move and mark order block                  |
//+------------------------------------------------------------------+
void UpdateOrderBlocks(string symbol, int symbolIndex)
{
    double high[], low[], open[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(open, true);
    ArraySetAsSeries(close, true);
    
    int bars_needed = OB_Lookback + 5;
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, bars_needed, high) < bars_needed) return;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, bars_needed, low) < bars_needed) return;
    if(CopyOpen(symbol, PERIOD_CURRENT, 0, bars_needed, open) < bars_needed) return;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, bars_needed, close) < bars_needed) return;
    
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    double min_impulse = OB_Min_Impulse_Pips * pip_value;
    
    // Look for bullish impulse (for SELL setups - bearish OB before bullish move)
    for(int i = 2; i < OB_Lookback; i++)
    {
        // Check for strong bullish move (close[i-1] significantly higher than close[i])
        double impulse_size = close[i-1] - close[i];
        
        if(impulse_size >= min_impulse)
        {
            // Found bullish impulse, mark the last bearish candle before it as order block
            if(close[i] < open[i])  // Bearish candle
            {
                g_symbols[symbolIndex].lastOrderBlock.high = high[i];
                g_symbols[symbolIndex].lastOrderBlock.low = low[i];
                g_symbols[symbolIndex].lastOrderBlock.open = open[i];
                g_symbols[symbolIndex].lastOrderBlock.close = close[i];
                g_symbols[symbolIndex].lastOrderBlock.bar_index = i;
                g_symbols[symbolIndex].lastOrderBlock.is_bullish = false;  // Bearish OB
                g_symbols[symbolIndex].hasOrderBlock = true;
                break;
            }
        }
    }
    
    // Look for bearish impulse (for BUY setups - bullish OB before bearish move)
    for(int i = 2; i < OB_Lookback; i++)
    {
        // Check for strong bearish move (close[i] significantly higher than close[i-1])
        double impulse_size = close[i] - close[i-1];
        
        if(impulse_size >= min_impulse)
        {
            // Found bearish impulse, mark the last bullish candle before it as order block
            if(close[i] > open[i])  // Bullish candle
            {
                g_symbols[symbolIndex].lastOrderBlock.high = high[i];
                g_symbols[symbolIndex].lastOrderBlock.low = low[i];
                g_symbols[symbolIndex].lastOrderBlock.open = open[i];
                g_symbols[symbolIndex].lastOrderBlock.close = close[i];
                g_symbols[symbolIndex].lastOrderBlock.bar_index = i;
                g_symbols[symbolIndex].lastOrderBlock.is_bullish = true;  // Bullish OB
                g_symbols[symbolIndex].hasOrderBlock = true;
                break;
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Check if price is retesting order block with rejection           |
//+------------------------------------------------------------------+
bool CheckOrderBlockRetest(string symbol, int symbolIndex, bool is_buy_signal)
{
    if(!Use_OrderBlock_Filter)
        return true;  // Filter disabled, allow trade
    
    if(!g_symbols[symbolIndex].hasOrderBlock)
    {
        Print(symbol, " - OB Filter: No order block identified yet");
        return false;
    }
    
    OrderBlock ob = g_symbols[symbolIndex].lastOrderBlock;
    
    // Get current candle data
    double high[], low[], open[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(open, true);
    ArraySetAsSeries(close, true);
    
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, 3, high) < 3) return false;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, 3, low) < 3) return false;
    if(CopyOpen(symbol, PERIOD_CURRENT, 0, 3, open) < 3) return false;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, 3, close) < 3) return false;
    
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    double retest_distance = OB_Retest_Distance * pip_value;
    
    if(is_buy_signal)
    {
        // For BUY: Need bullish OB retest (price returns to bullish OB zone and rejects up)
        if(ob.is_bullish)
        {
            // Check if current candle touched the OB zone
            bool touched_ob = (low[1] <= ob.high + retest_distance && low[1] >= ob.low - retest_distance);
            
            if(touched_ob)
            {
                // Check for rejection (bullish candle with significant lower wick)
                double candle_range = high[1] - low[1];
                double body_size = MathAbs(close[1] - open[1]);
                double lower_wick = MathMin(open[1], close[1]) - low[1];
                
                if(candle_range > 0)
                {
                    double wick_pct = (lower_wick / candle_range) * 100.0;
                    bool is_bullish_candle = close[1] > open[1];
                    
                    if(is_bullish_candle && wick_pct >= Min_Rejection_Wick_Pct)
                    {
                        Print(symbol, " - OB Filter PASSED: Bullish OB retest with ", DoubleToString(wick_pct, 1), "% rejection wick");
                        return true;
                    }
                }
            }
            
            Print(symbol, " - OB Filter: No valid bullish OB retest with rejection");
            return false;
        }
        else
        {
            Print(symbol, " - OB Filter: Wrong OB type for BUY signal");
            return false;
        }
    }
    else  // SELL signal
    {
        // For SELL: Need bearish OB retest (price returns to bearish OB zone and rejects down)
        if(!ob.is_bullish)
        {
            // Check if current candle touched the OB zone
            bool touched_ob = (high[1] >= ob.low - retest_distance && high[1] <= ob.high + retest_distance);
            
            if(touched_ob)
            {
                // Check for rejection (bearish candle with significant upper wick)
                double candle_range = high[1] - low[1];
                double body_size = MathAbs(close[1] - open[1]);
                double upper_wick = high[1] - MathMax(open[1], close[1]);
                
                if(candle_range > 0)
                {
                    double wick_pct = (upper_wick / candle_range) * 100.0;
                    bool is_bearish_candle = close[1] < open[1];
                    
                    if(is_bearish_candle && wick_pct >= Min_Rejection_Wick_Pct)
                    {
                        Print(symbol, " - OB Filter PASSED: Bearish OB retest with ", DoubleToString(wick_pct, 1), "% rejection wick");
                        return true;
                    }
                }
            }
            
            Print(symbol, " - OB Filter: No valid bearish OB retest with rejection");
            return false;
        }
        else
        {
            Print(symbol, " - OB Filter: Wrong OB type for SELL signal");
            return false;
        }
    }
}

//+------------------------------------------------------------------+
//| Check EMA pullback confirmation                                   |
//+------------------------------------------------------------------+
bool CheckEMAPullback(string symbol, int symbolIndex, bool is_buy_signal)
{
    if(!Use_EMA_Filter)
        return true;  // Filter disabled, allow trade
    
    if(g_symbols[symbolIndex].emaFastHandle == INVALID_HANDLE || 
       g_symbols[symbolIndex].emaSlowHandle == INVALID_HANDLE)
        return true;  // Indicators not available, allow trade
    
    // Get EMA values
    double emaFast[], emaSlow[];
    ArraySetAsSeries(emaFast, true);
    ArraySetAsSeries(emaSlow, true);
    
    if(CopyBuffer(g_symbols[symbolIndex].emaFastHandle, 0, 0, 3, emaFast) < 3)
        return false;
    if(CopyBuffer(g_symbols[symbolIndex].emaSlowHandle, 0, 0, 3, emaSlow) < 3)
        return false;
    
    // Get price data
    double high[], low[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, 3, high) < 3) return false;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, 3, low) < 3) return false;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, 3, close) < 3) return false;
    
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    double touch_distance = EMA_Touch_Distance * pip_value;
    
    if(is_buy_signal)
    {
        // For BUY: Price should have pulled back to 9 EMA and closed back above it
        // Trend should be bullish (9 EMA > 21 EMA)
        
        // Check trend direction
        if(emaFast[0] <= emaSlow[0])
        {
            Print(symbol, " - EMA Filter: No bullish trend (9 EMA not above 21 EMA)");
            return false;
        }
        
        // Check if previous candle touched/wicked through 9 EMA
        bool touched_ema = (low[1] <= emaFast[1] + touch_distance);
        
        // Check if current candle closed back above 9 EMA (in trend direction)
        bool closed_above = (close[0] > emaFast[0]);
        
        if(touched_ema && closed_above)
        {
            Print(symbol, " - EMA Filter PASSED: Bullish pullback confirmed");
            return true;
        }
        else
        {
            Print(symbol, " - EMA Filter: No valid pullback (touched=", touched_ema, ", closed_above=", closed_above, ")");
            return false;
        }
    }
    else  // SELL signal
    {
        // For SELL: Price should have pulled back to 9 EMA and closed back below it
        // Trend should be bearish (9 EMA < 21 EMA)
        
        // Check trend direction
        if(emaFast[0] >= emaSlow[0])
        {
            Print(symbol, " - EMA Filter: No bearish trend (9 EMA not below 21 EMA)");
            return false;
        }
        
        // Check if previous candle touched/wicked through 9 EMA
        bool touched_ema = (high[1] >= emaFast[1] - touch_distance);
        
        // Check if current candle closed back below 9 EMA (in trend direction)
        bool closed_below = (close[0] < emaFast[0]);
        
        if(touched_ema && closed_below)
        {
            Print(symbol, " - EMA Filter PASSED: Bearish pullback confirmed");
            return true;
        }
        else
        {
            Print(symbol, " - EMA Filter: No valid pullback (touched=", touched_ema, ", closed_below=", closed_below, ")");
            return false;
        }
    }
}

//+------------------------------------------------------------------+
//| Check for liquidity sweep                                         |
//+------------------------------------------------------------------+
void CheckLiquiditySweep(string symbol, int symbolIndex)
{
    double high[], low[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, Lookback_Bars + 5, high) < Lookback_Bars + 5)
        return;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, Lookback_Bars + 5, low) < Lookback_Bars + 5)
        return;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, 5, close) < 5)
        return;
    
    double swing_high = high[2];
    double swing_low = low[2];
    
    for(int i = 3; i < Lookback_Bars; i++)
    {
        if(high[i] > swing_high)
            swing_high = high[i];
        if(low[i] < swing_low)
            swing_low = low[i];
    }
    
    // High swept = BUY signal
    if(high[1] > swing_high && close[1] < swing_high)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: High swept at ", swing_high);
        
        // Check EMA pullback confirmation
        if(!CheckEMAPullback(symbol, symbolIndex, true))
        {
            Print(symbol, " - Trade SKIPPED: EMA pullback filter not met");
            return;
        }
        
        // Check Order Block retest confirmation
        if(!CheckOrderBlockRetest(symbol, symbolIndex, true))
        {
            Print(symbol, " - Trade SKIPPED: Order Block retest filter not met");
            return;
        }
        
        Print(symbol, " - ALL FILTERS PASSED: Opening BUY");
        OpenTrade(symbol, true);
        return;
    }
    
    // Low swept = SELL signal
    if(low[1] < swing_low && close[1] > swing_low)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: Low swept at ", swing_low);
        
        // Check EMA pullback confirmation
        if(!CheckEMAPullback(symbol, symbolIndex, false))
        {
            Print(symbol, " - Trade SKIPPED: EMA pullback filter not met");
            return;
        }
        
        // Check Order Block retest confirmation
        if(!CheckOrderBlockRetest(symbol, symbolIndex, false))
        {
            Print(symbol, " - Trade SKIPPED: Order Block retest filter not met");
            return;
        }
        
        Print(symbol, " - ALL FILTERS PASSED: Opening SELL");
        OpenTrade(symbol, false);
        return;
    }
}

//+------------------------------------------------------------------+
//| Open trade                                                        |
//+------------------------------------------------------------------+
void OpenTrade(string symbol, bool is_buy)
{
    double price = is_buy ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    
    double sl = is_buy ? price - (StopLoss_Pips * pip_value) : price + (StopLoss_Pips * pip_value);
    double tp = is_buy ? price + (TakeProfit_Pips * pip_value) : price - (TakeProfit_Pips * pip_value);
    
    sl = NormalizeDouble(sl, digits);
    tp = NormalizeDouble(tp, digits);
    price = NormalizeDouble(price, digits);
    
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = symbol;
    request.volume = LotSize;
    request.type = is_buy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    request.price = price;
    request.sl = sl;
    request.tp = tp;
    request.deviation = 10;
    request.magic = Magic_Number;
    request.comment = is_buy ? "V3 BUY" : "V3 SELL";
    
    if(!OrderSend(request, result))
    {
        Print(symbol, " - OrderSend error: ", GetLastError());
        return;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE)
    {
        Print("=== TRADE OPENED: ", symbol, " ===");
        Print("Direction: ", is_buy ? "BUY" : "SELL");
        Print("Price: ", price);
        Print("SL: ", sl, " (", StopLoss_Pips, " pips)");
        Print("TP: ", tp, " (", TakeProfit_Pips, " pips)");
        Print("Ticket: ", result.order);
    }
    else
    {
        Print(symbol, " - Trade failed: ", result.retcode);
    }
}
//+------------------------------------------------------------------+
