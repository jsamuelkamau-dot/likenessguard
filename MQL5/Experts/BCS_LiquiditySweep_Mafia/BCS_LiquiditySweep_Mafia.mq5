//+------------------------------------------------------------------+
//|                     BCS_LiquiditySweep_Mafia.mq5                 |
//|              Multi-Currency Liquidity Sweep + Double Retest      |
//|         High Swept = BUY | Low Swept = SELL + V-Shape Retest   |
//+------------------------------------------------------------------+
#property copyright "BCS Mafia v1.0"
#property version   "1.00"
#property strict

//--- Input Parameters
input group "=== Trade Settings ==="
input double TakeProfit_Pips = 10.0;     // Take Profit in pips
input double StopLoss_Pips = 15.0;       // Stop Loss in pips
input double LotSize = 1.0;              // Fixed lot size per pair
input int Magic_Number = 20240015;       // Magic number (unique for Mafia)
input int Lookback_Bars = 20;            // Bars to look back for highs/lows
input int Max_Trades_Per_Pair = 1;       // Max simultaneous trades per pair

input group "=== Double Retest Pattern ==="
input double Min_Pullback_Pips = 5.0;    // Minimum pullback for V-shape (pips)
input double Retest_Tolerance_Pips = 3.0; // Tolerance for retest level (pips)
input int Max_Pattern_Bars = 30;         // Max bars to wait for pattern completion

input group "=== Currency Pairs ==="
input bool Trade_EURUSD = true;          // Trade EURUSD
input bool Trade_GBPUSD = true;          // Trade GBPUSD
input bool Trade_USDJPY = true;          // Trade USDJPY
input bool Trade_AUDUSD = true;          // Trade AUDUSD
input bool Trade_USDCAD = true;          // Trade USDCAD
input bool Trade_NZDUSD = true;          // Trade NZDUSD
input bool Trade_EURGBP = false;         // Trade EURGBP
input bool Trade_EURJPY = false;         // Trade EURJPY

//--- Pattern Tracking States
enum PatternState
{
    STATE_NONE,              // No pattern detected
    STATE_SWEEP_DETECTED,    // Liquidity sweep detected
    STATE_FIRST_REJECTION,   // Rejected at first test
    STATE_PULLBACK,          // V-shape pullback in progress
    STATE_BREAKOUT,          // Broke first test level
    STATE_READY_FOR_RETEST   // Ready for second retest
};

//--- Global Variables
struct PendingPattern
{
    bool is_active;
    bool is_buy_signal;          // true = BUY, false = SELL
    PatternState state;
    double sweep_price;
    double first_test_price;
    double pullback_extreme;
    double breakout_price;
    datetime sweep_time;
    int bars_since_sweep;
};

struct SymbolData
{
    string symbol;
    datetime lastBarTime;
    bool enabled;
    PendingPattern pattern;
};

SymbolData g_symbols[];
int g_symbolCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=== BCS Liquidity Sweep MAFIA Multi-Currency EA Started ===");
    Print("LOGIC: High Swept = BUY | Low Swept = SELL");
    Print("PATTERN: Double Retest with V-Shape Confirmation");
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
    
    Print("Min Pullback: ", Min_Pullback_Pips, " pips");
    Print("Retest Tolerance: ", Retest_Tolerance_Pips, " pips");
    Print("Max Pattern Bars: ", Max_Pattern_Bars);
    
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
    g_symbols[g_symbolCount].pattern.is_active = false;
    g_symbols[g_symbolCount].pattern.state = STATE_NONE;
    g_symbolCount++;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("=== BCS Liquidity Sweep MAFIA Multi-Currency EA Stopped ===");
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
        
        // Process pattern state machine
        if(g_symbols[i].pattern.is_active)
        {
            ProcessPattern(symbol, i);
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
    
    // MAFIA LOGIC: High swept = BUY signal
    if(high[1] > swing_high && close[1] < swing_high)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: High swept at ", swing_high);
        Print(symbol, " - MAFIA LOGIC: BUY signal - Waiting for double retest pattern...");
        
        // Initialize pattern tracking
        g_symbols[symbolIndex].pattern.is_active = true;
        g_symbols[symbolIndex].pattern.is_buy_signal = true;
        g_symbols[symbolIndex].pattern.state = STATE_SWEEP_DETECTED;
        g_symbols[symbolIndex].pattern.sweep_price = swing_high;
        g_symbols[symbolIndex].pattern.first_test_price = 0;
        g_symbols[symbolIndex].pattern.pullback_extreme = 0;
        g_symbols[symbolIndex].pattern.breakout_price = 0;
        g_symbols[symbolIndex].pattern.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
        g_symbols[symbolIndex].pattern.bars_since_sweep = 0;
        return;
    }
    
    // MAFIA LOGIC: Low swept = SELL signal
    if(low[1] < swing_low && close[1] > swing_low)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: Low swept at ", swing_low);
        Print(symbol, " - MAFIA LOGIC: SELL signal - Waiting for double retest pattern...");
        
        // Initialize pattern tracking
        g_symbols[symbolIndex].pattern.is_active = true;
        g_symbols[symbolIndex].pattern.is_buy_signal = false;
        g_symbols[symbolIndex].pattern.state = STATE_SWEEP_DETECTED;
        g_symbols[symbolIndex].pattern.sweep_price = swing_low;
        g_symbols[symbolIndex].pattern.first_test_price = 0;
        g_symbols[symbolIndex].pattern.pullback_extreme = 0;
        g_symbols[symbolIndex].pattern.breakout_price = 0;
        g_symbols[symbolIndex].pattern.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
        g_symbols[symbolIndex].pattern.bars_since_sweep = 0;
        return;
    }
}

//+------------------------------------------------------------------+
//| Process pattern state machine                                     |
//+------------------------------------------------------------------+
void ProcessPattern(string symbol, int symbolIndex)
{
    PendingPattern pattern = g_symbols[symbolIndex].pattern;
    
    // Increment bars counter
    g_symbols[symbolIndex].pattern.bars_since_sweep++;
    
    // Check timeout
    if(pattern.bars_since_sweep > Max_Pattern_Bars)
    {
        Print(symbol, " - Pattern timeout - canceling");
        g_symbols[symbolIndex].pattern.is_active = false;
        g_symbols[symbolIndex].pattern.state = STATE_NONE;
        return;
    }
    
    // Get current price data
    double high[], low[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, 3, high) < 3) return;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, 3, low) < 3) return;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, 3, close) < 3) return;
    
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    
    // State machine for BUY pattern
    if(pattern.is_buy_signal)
    {
        ProcessBuyPattern(symbol, symbolIndex, high, low, close, pip_value);
    }
    // State machine for SELL pattern
    else
    {
        ProcessSellPattern(symbol, symbolIndex, high, low, close, pip_value);
    }
}

//+------------------------------------------------------------------+
//| Process BUY pattern (High swept)                                  |
//+------------------------------------------------------------------+
void ProcessBuyPattern(string symbol, int symbolIndex, double &high[], double &low[], double &close[], double pip_value)
{
    PendingPattern pattern = g_symbols[symbolIndex].pattern;
    
    if(pattern.state == STATE_SWEEP_DETECTED)
    {
        // Looking for first test and rejection
        // Price should move up toward sweep level, then reject
        if(high[1] >= pattern.sweep_price - (Retest_Tolerance_Pips * pip_value))
        {
            // First test reached
            g_symbols[symbolIndex].pattern.first_test_price = high[1];
            g_symbols[symbolIndex].pattern.state = STATE_FIRST_REJECTION;
            Print(symbol, " - First test at ", high[1], " - Looking for rejection...");
        }
    }
    else if(pattern.state == STATE_FIRST_REJECTION)
    {
        // Looking for pullback (V-shape down)
        double pullback_distance = pattern.first_test_price - low[1];
        
        if(pullback_distance >= Min_Pullback_Pips * pip_value)
        {
            // Significant pullback detected
            g_symbols[symbolIndex].pattern.pullback_extreme = low[1];
            g_symbols[symbolIndex].pattern.state = STATE_PULLBACK;
            Print(symbol, " - V-shape pullback to ", low[1], " (", DoubleToString(pullback_distance / pip_value, 1), " pips)");
        }
    }
    else if(pattern.state == STATE_PULLBACK)
    {
        // Looking for breakout above first test
        if(close[1] > pattern.first_test_price)
        {
            // Broke above first test
            g_symbols[symbolIndex].pattern.breakout_price = close[1];
            g_symbols[symbolIndex].pattern.state = STATE_BREAKOUT;
            Print(symbol, " - Breakout above first test at ", close[1]);
        }
    }
    else if(pattern.state == STATE_BREAKOUT)
    {
        // Looking for retest (second test)
        // Price should come back down near first test level
        double retest_level = pattern.first_test_price;
        double retest_tolerance = Retest_Tolerance_Pips * pip_value;
        
        if(low[1] <= retest_level + retest_tolerance && 
           low[1] >= retest_level - retest_tolerance)
        {
            // Second retest confirmed - EXECUTE BUY
            Print(symbol, " - SECOND RETEST CONFIRMED at ", low[1]);
            Print(symbol, " - MAFIA PATTERN COMPLETE - Opening BUY");
            OpenTrade(symbol, true);
            g_symbols[symbolIndex].pattern.is_active = false;
            g_symbols[symbolIndex].pattern.state = STATE_NONE;
        }
    }
}

//+------------------------------------------------------------------+
//| Process SELL pattern (Low swept)                                  |
//+------------------------------------------------------------------+
void ProcessSellPattern(string symbol, int symbolIndex, double &high[], double &low[], double &close[], double pip_value)
{
    PendingPattern pattern = g_symbols[symbolIndex].pattern;
    
    if(pattern.state == STATE_SWEEP_DETECTED)
    {
        // Looking for first test and rejection
        // Price should move down toward sweep level, then reject
        if(low[1] <= pattern.sweep_price + (Retest_Tolerance_Pips * pip_value))
        {
            // First test reached
            g_symbols[symbolIndex].pattern.first_test_price = low[1];
            g_symbols[symbolIndex].pattern.state = STATE_FIRST_REJECTION;
            Print(symbol, " - First test at ", low[1], " - Looking for rejection...");
        }
    }
    else if(pattern.state == STATE_FIRST_REJECTION)
    {
        // Looking for bounce (inverted V-shape up)
        double bounce_distance = high[1] - pattern.first_test_price;
        
        if(bounce_distance >= Min_Pullback_Pips * pip_value)
        {
            // Significant bounce detected
            g_symbols[symbolIndex].pattern.pullback_extreme = high[1];
            g_symbols[symbolIndex].pattern.state = STATE_PULLBACK;
            Print(symbol, " - Inverted V-shape bounce to ", high[1], " (", DoubleToString(bounce_distance / pip_value, 1), " pips)");
        }
    }
    else if(pattern.state == STATE_PULLBACK)
    {
        // Looking for breakout below first test
        if(close[1] < pattern.first_test_price)
        {
            // Broke below first test
            g_symbols[symbolIndex].pattern.breakout_price = close[1];
            g_symbols[symbolIndex].pattern.state = STATE_BREAKOUT;
            Print(symbol, " - Breakout below first test at ", close[1]);
        }
    }
    else if(pattern.state == STATE_BREAKOUT)
    {
        // Looking for retest (second test)
        // Price should come back up near first test level
        double retest_level = pattern.first_test_price;
        double retest_tolerance = Retest_Tolerance_Pips * pip_value;
        
        if(high[1] >= retest_level - retest_tolerance && 
           high[1] <= retest_level + retest_tolerance)
        {
            // Second retest confirmed - EXECUTE SELL
            Print(symbol, " - SECOND RETEST CONFIRMED at ", high[1]);
            Print(symbol, " - MAFIA PATTERN COMPLETE - Opening SELL");
            OpenTrade(symbol, false);
            g_symbols[symbolIndex].pattern.is_active = false;
            g_symbols[symbolIndex].pattern.state = STATE_NONE;
        }
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
    request.comment = is_buy ? "Mafia BUY" : "Mafia SELL";
    
    // Send order
    if(!OrderSend(request, result))
    {
        Print(symbol, " - OrderSend error: ", GetLastError());
        return;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE)
    {
        Print("=== MAFIA TRADE OPENED: ", symbol, " ===");
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
