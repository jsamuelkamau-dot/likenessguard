//+------------------------------------------------------------------+
//|                      BCS_LiquiditySweep_Breakout.mq5             |
//|              Multi-Currency Opposite Liquidity Sweep Trader      |
//|    Low Swept = SELL | High Swept = BUY + Large Candle Breakout  |
//+------------------------------------------------------------------+
#property copyright "BCS v2.40"
#property version   "2.40"
#property strict

//--- Input Parameters
input group "=== Trade Settings ==="
input double TakeProfit_Pips = 6.0;      // Take Profit in pips
input double StopLoss_Pips = 10.0;       // Stop Loss in pips
input double LotSize = 1.0;              // Fixed lot size per pair
input int Magic_Number = 20240012;       // Magic number
input int Lookback_Bars = 20;            // Bars to look back for highs/lows
input int Max_Trades_Per_Pair = 1;       // Max simultaneous trades per pair

input group "=== Breakout Candle Filter ==="
input double Min_Candle_Body_Pips = 2.0;     // Minimum candle body size in pips
input int Max_Breakout_Wait_Bars = 10;       // Max bars to wait for breakout candle

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
    Print("=== BCS Liquidity Sweep BREAKOUT Multi-Currency EA Started ===");
    Print("OPPOSITE LOGIC: Low Swept = SELL | High Swept = BUY");
    Print("BREAKOUT FILTER: Wait for large candle body breakout after sweep");
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
    
    Print("Breakout Filter:");
    Print("  Min Candle Body: ", Min_Candle_Body_Pips, " pips");
    Print("  Max Wait: ", Max_Breakout_Wait_Bars, " bars");
    
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
    Print("=== BCS Liquidity Sweep BREAKOUT Multi-Currency EA Stopped ===");
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
        
        // Check for pending sweep breakout confirmation
        if(g_symbols[i].pending_sweep.is_active)
        {
            CheckBreakoutCandle(symbol, i);
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
    
    // OPPOSITE LOGIC: High swept = BUY (wait for breakout candle)
    if(high[1] > swing_high && close[1] < swing_high)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: High swept at ", swing_high);
        
        // Mark as pending and wait for breakout candle
        g_symbols[symbolIndex].pending_sweep.is_active = true;
        g_symbols[symbolIndex].pending_sweep.is_buy_signal = true;
        g_symbols[symbolIndex].pending_sweep.sweep_price = close[1];
        g_symbols[symbolIndex].pending_sweep.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
        g_symbols[symbolIndex].pending_sweep.bars_since_sweep = 0;
        Print(symbol, " - Waiting for BULLISH breakout candle...");
        return;
    }
    
    // OPPOSITE LOGIC: Low swept = SELL (wait for breakout candle)
    if(low[1] < swing_low && close[1] > swing_low)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: Low swept at ", swing_low);
        
        // Mark as pending and wait for breakout candle
        g_symbols[symbolIndex].pending_sweep.is_active = true;
        g_symbols[symbolIndex].pending_sweep.is_buy_signal = false;
        g_symbols[symbolIndex].pending_sweep.sweep_price = close[1];
        g_symbols[symbolIndex].pending_sweep.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
        g_symbols[symbolIndex].pending_sweep.bars_since_sweep = 0;
        Print(symbol, " - Waiting for BEARISH breakout candle...");
        return;
    }
}

//+------------------------------------------------------------------+
//| Check for large breakout candle after liquidity sweep            |
//+------------------------------------------------------------------+
void CheckBreakoutCandle(string symbol, int symbolIndex)
{
    PendingSweep sweep = g_symbols[symbolIndex].pending_sweep;
    
    // Increment bars counter
    g_symbols[symbolIndex].pending_sweep.bars_since_sweep++;
    
    // Check if we've waited too long
    if(sweep.bars_since_sweep > Max_Breakout_Wait_Bars)
    {
        Print(symbol, " - Breakout timeout - canceling pending sweep");
        g_symbols[symbolIndex].pending_sweep.is_active = false;
        return;
    }
    
    // Get current candle data
    double open[], close[], high[], low[];
    ArraySetAsSeries(open, true);
    ArraySetAsSeries(close, true);
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    
    if(CopyOpen(symbol, PERIOD_CURRENT, 0, 2, open) < 2) return;
    if(CopyClose(symbol, PERIOD_CURRENT, 0, 2, close) < 2) return;
    if(CopyHigh(symbol, PERIOD_CURRENT, 0, 2, high) < 2) return;
    if(CopyLow(symbol, PERIOD_CURRENT, 0, 2, low) < 2) return;
    
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    double min_body = Min_Candle_Body_Pips * pip_value;
    
    // Check last closed candle (bar 1)
    double candle_body = MathAbs(close[1] - open[1]);
    
    if(sweep.is_buy_signal)
    {
        // For BUY: Check if candle BODY closed above sweep price
        // Candle must be bullish (close > open) and close above sweep
        bool is_bullish = close[1] > open[1];
        bool body_above_sweep = close[1] > sweep.sweep_price && open[1] > sweep.sweep_price;
        bool large_enough = candle_body >= min_body;
        
        if(is_bullish && body_above_sweep && large_enough)
        {
            double body_pips = candle_body / pip_value;
            Print(symbol, " - BULLISH BREAKOUT CANDLE CONFIRMED!");
            Print(symbol, " - Candle body: ", DoubleToString(body_pips, 1), " pips");
            Print(symbol, " - Body closed above sweep at ", sweep.sweep_price);
            Print(symbol, " - OPPOSITE LOGIC + BREAKOUT: Opening BUY");
            OpenTrade(symbol, true);
            g_symbols[symbolIndex].pending_sweep.is_active = false;
        }
    }
    else
    {
        // For SELL: Check if candle BODY closed below sweep price
        // Candle must be bearish (close < open) and close below sweep
        bool is_bearish = close[1] < open[1];
        bool body_below_sweep = close[1] < sweep.sweep_price && open[1] < sweep.sweep_price;
        bool large_enough = candle_body >= min_body;
        
        if(is_bearish && body_below_sweep && large_enough)
        {
            double body_pips = candle_body / pip_value;
            Print(symbol, " - BEARISH BREAKOUT CANDLE CONFIRMED!");
            Print(symbol, " - Candle body: ", DoubleToString(body_pips, 1), " pips");
            Print(symbol, " - Body closed below sweep at ", sweep.sweep_price);
            Print(symbol, " - OPPOSITE LOGIC + BREAKOUT: Opening SELL");
            OpenTrade(symbol, false);
            g_symbols[symbolIndex].pending_sweep.is_active = false;
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
    request.comment = is_buy ? "Breakout BUY" : "Breakout SELL";
    
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
