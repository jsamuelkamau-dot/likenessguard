//+------------------------------------------------------------------+
//|                  BCS_LiquiditySweep_NewStructure.mq5             |
//|         Multi-Currency REVERSED Liquidity Sweep + Structure      |
//|    High Swept = SELL | Low Swept = BUY + Flag/Pennant Pattern   |
//+------------------------------------------------------------------+
#property copyright "BCS v2.71"
#property version   "2.71"
#property strict

//--- Input Parameters
input group "=== Trade Settings ==="
input double TakeProfit_Pips = 10.0;     // Take Profit in pips
input double StopLoss_Pips = 15.0;       // Stop Loss in pips
input double LotSize = 1.0;              // Fixed lot size per pair
input int Magic_Number = 20240014;       // Magic number (unique for NewStructure)
input int Lookback_Bars = 20;            // Bars to look back for highs/lows
input int Max_Trades_Per_Pair = 1;       // Max simultaneous trades per pair

input group "=== Pattern Detection ==="
input int Pattern_Lookback = 10;            // Bars to look back for patterns
input double Flag_Max_Retracement = 0.5;    // Max retracement for flag (0.5 = 50%)
input double Pennant_Convergence = 0.7;     // Pennant convergence ratio

input group "=== Currency Pairs ==="
input bool Trade_EURUSD = true;          // Trade EURUSD
input bool Trade_GBPUSD = true;          // Trade GBPUSD
input bool Trade_USDJPY = true;          // Trade USDJPY
input bool Trade_AUDUSD = true;          // Trade AUDUSD
input bool Trade_USDCAD = true;          // Trade USDCAD
input bool Trade_NZDUSD = true;          // Trade NZDUSD
input bool Trade_EURGBP = false;         // Trade EURGBP
input bool Trade_EURJPY = false;         // Trade EURJPY

//--- Global Variables
struct PendingSweep
{
    bool is_active;
    bool is_buy_signal;
    double sweep_price;
    datetime sweep_time;
    int bars_since_sweep;
};

struct SymbolData
{
    string symbol;
    datetime lastBarTime;
    bool enabled;
    PendingSweep pending_sweep;
};

SymbolData g_symbols[];
int g_symbolCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=== BCS Liquidity Sweep NewStructure Multi-Currency EA Started ===");
    Print("REVERSED LOGIC: High Swept = SELL | Low Swept = BUY");
    Print("PATTERN CONFIRMATION: Flag/Pennant breakout required");
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
    
    Print("Pattern Lookback: ", Pattern_Lookback, " bars");
    Print("Flag Max Retracement: ", Flag_Max_Retracement * 100, "%");
    Print("Pennant Convergence: ", Pennant_Convergence * 100, "%");
    
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
    g_symbols[g_symbolCount].pending_sweep.is_active = false;
    g_symbolCount++;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("=== BCS Liquidity Sweep NewStructure Multi-Currency EA Stopped ===");
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
            continue;  // Not a new bar
        
        g_symbols[i].lastBarTime = currentBarTime;
        
        // Check if we can trade this pair
        if(CountTradesForSymbol(symbol) >= Max_Trades_Per_Pair)
            continue;
        
        // Check for pending sweep pattern confirmation
        if(g_symbols[i].pending_sweep.is_active)
        {
            CheckPatternBreakout(symbol, i);
        }
        else
        {
            // Check for liquidity sweep on this symbol
            CheckLiquiditySweep(symbol, i);
        }
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
//| Check for liquidity sweep                                         |
//+------------------------------------------------------------------+
void CheckLiquiditySweep(string symbol, int symbolIndex)
{
    // Get recent highs and lows
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
    
    // Find recent swing high and low (excluding last 2 bars)
    double swing_high = high[2];
    double swing_low = low[2];
    
    for(int i = 3; i < Lookback_Bars; i++)
    {
        if(high[i] > swing_high)
            swing_high = high[i];
        if(low[i] < swing_low)
            swing_low = low[i];
    }
    
    // REVERSED LOGIC: High swept = SELL signal (wait for pattern)
    if(high[1] > swing_high && close[1] < swing_high)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: High swept at ", swing_high);
        
        // Mark as pending and wait for Flag/Pennant pattern
        g_symbols[symbolIndex].pending_sweep.is_active = true;
        g_symbols[symbolIndex].pending_sweep.is_buy_signal = false;  // SELL signal
        g_symbols[symbolIndex].pending_sweep.sweep_price = swing_high;
        g_symbols[symbolIndex].pending_sweep.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
        g_symbols[symbolIndex].pending_sweep.bars_since_sweep = 0;
        Print(symbol, " - Waiting for Flag/Pennant breakout for SELL...");
        return;
    }
    
    // REVERSED LOGIC: Low swept = BUY signal (wait for pattern)
    if(low[1] < swing_low && close[1] > swing_low)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: Low swept at ", swing_low);
        
        // Mark as pending and wait for Flag/Pennant pattern
        g_symbols[symbolIndex].pending_sweep.is_active = true;
        g_symbols[symbolIndex].pending_sweep.is_buy_signal = true;  // BUY signal
        g_symbols[symbolIndex].pending_sweep.sweep_price = swing_low;
        g_symbols[symbolIndex].pending_sweep.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
        g_symbols[symbolIndex].pending_sweep.bars_since_sweep = 0;
        Print(symbol, " - Waiting for Flag/Pennant breakout for BUY...");
        return;
    }
}

//+------------------------------------------------------------------+
//| Check for Flag or Pennant pattern breakout                       |
//+------------------------------------------------------------------+
void CheckPatternBreakout(string symbol, int symbolIndex)
{
    PendingSweep sweep = g_symbols[symbolIndex].pending_sweep;
    
    // Increment bars counter
    g_symbols[symbolIndex].pending_sweep.bars_since_sweep++;
    
    // Check if we've waited too long (max 20 bars)
    if(sweep.bars_since_sweep > 20)
    {
        Print(symbol, " - Pattern timeout - canceling pending sweep");
        g_symbols[symbolIndex].pending_sweep.is_active = false;
        return;
    }
    
    // Check for Flag pattern
    if(DetectFlagPattern(symbol, sweep.is_buy_signal))
    {
        Print(symbol, " - FLAG PATTERN DETECTED - Opening ", sweep.is_buy_signal ? "BUY" : "SELL");
        OpenTrade(symbol, sweep.is_buy_signal);
        g_symbols[symbolIndex].pending_sweep.is_active = false;
        return;
    }
    
    // Check for Pennant pattern
    if(DetectPennantPattern(symbol, sweep.is_buy_signal))
    {
        Print(symbol, " - PENNANT PATTERN DETECTED - Opening ", sweep.is_buy_signal ? "BUY" : "SELL");
        OpenTrade(symbol, sweep.is_buy_signal);
        g_symbols[symbolIndex].pending_sweep.is_active = false;
        return;
    }
}

//+------------------------------------------------------------------+
//| Detect Flag pattern                                              |
//+------------------------------------------------------------------+
bool DetectFlagPattern(string symbol, bool is_bullish)
{
    double high[], low[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, Pattern_Lookback + 2, high) < Pattern_Lookback + 2) return false;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, Pattern_Lookback + 2, low) < Pattern_Lookback + 2) return false;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, Pattern_Lookback + 2, close) < Pattern_Lookback + 2) return false;
    
    // Find the initial strong move (pole)
    double pole_start = close[Pattern_Lookback];
    double pole_end = close[Pattern_Lookback - 3];
    double pole_range = MathAbs(pole_end - pole_start);
    
    if(pole_range < SymbolInfoDouble(symbol, SYMBOL_POINT) * 50) return false;  // Pole too small
    
    // Check for consolidation (flag)
    double flag_high = high[1];
    double flag_low = low[1];
    
    for(int i = 2; i < Pattern_Lookback - 3; i++)
    {
        if(high[i] > flag_high) flag_high = high[i];
        if(low[i] < flag_low) flag_low = low[i];
    }
    
    double flag_range = flag_high - flag_low;
    double retracement = flag_range / pole_range;
    
    // Flag should be smaller than pole
    if(retracement > Flag_Max_Retracement) return false;
    
    // Check for breakout
    if(is_bullish)
    {
        // For BUY: price should break above flag high
        return (close[0] > flag_high);
    }
    else
    {
        // For SELL: price should break below flag low
        return (close[0] < flag_low);
    }
}

//+------------------------------------------------------------------+
//| Detect Pennant pattern                                           |
//+------------------------------------------------------------------+
bool DetectPennantPattern(string symbol, bool is_bullish)
{
    double high[], low[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, Pattern_Lookback + 2, high) < Pattern_Lookback + 2) return false;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, Pattern_Lookback + 2, low) < Pattern_Lookback + 2) return false;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, Pattern_Lookback + 2, close) < Pattern_Lookback + 2) return false;
    
    // Find initial range
    double initial_high = high[Pattern_Lookback];
    double initial_low = low[Pattern_Lookback];
    double initial_range = initial_high - initial_low;
    
    // Find recent range
    double recent_high = high[1];
    double recent_low = low[1];
    
    for(int i = 2; i < 5; i++)
    {
        if(high[i] > recent_high) recent_high = high[i];
        if(low[i] < recent_low) recent_low = low[i];
    }
    
    double recent_range = recent_high - recent_low;
    
    // Pennant should show convergence (narrowing range)
    double convergence_ratio = recent_range / initial_range;
    
    if(convergence_ratio > Pennant_Convergence) return false;  // Not converging enough
    
    // Check for breakout
    if(is_bullish)
    {
        // For BUY: price should break above recent high
        return (close[0] > recent_high);
    }
    else
    {
        // For SELL: price should break below recent low
        return (close[0] < recent_low);
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
    
    // Calculate pip value (for 5-digit brokers, 1 pip = 10 points)
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    
    // Calculate SL and TP
    double sl = is_buy ? 
                price - (StopLoss_Pips * pip_value) : 
                price + (StopLoss_Pips * pip_value);
                
    double tp = is_buy ? 
                price + (TakeProfit_Pips * pip_value) : 
                price - (TakeProfit_Pips * pip_value);
    
    // Normalize prices
    sl = NormalizeDouble(sl, digits);
    tp = NormalizeDouble(tp, digits);
    price = NormalizeDouble(price, digits);
    
    // Prepare trade request
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
    request.comment = is_buy ? "NewStructure BUY" : "NewStructure SELL";
    
    // Send order
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
        Print(symbol, " - Trade failed: ", result.retcode, " - ", result.comment);
    }
}
//+------------------------------------------------------------------+
