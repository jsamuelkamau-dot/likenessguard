//+------------------------------------------------------------------+
//|                      BCS_LiquiditySweep_Opposite.mq5             |
//|              Multi-Currency Opposite Liquidity Sweep Trader      |
//|       Low Swept = SELL | High Swept = BUY + Continuation        |
//+------------------------------------------------------------------+
#property copyright "BCS v2.1"
#property version   "2.10"
#property strict

//--- Input Parameters
input group "=== Trade Settings ==="
input double TakeProfit_Pips = 10.0;      // Take Profit in pips
input double StopLoss_Pips = 20.0;       // Stop Loss in pips
input double LotSize = 1.0;              // Fixed lot size per pair
input int Magic_Number = 20240004;       // Magic number
input int Lookback_Bars = 20;            // Bars to look back for highs/lows
input int Max_Trades_Per_Pair = 1;       // Max simultaneous trades per pair

input group "=== Continuation Filter ==="
input bool Use_Continuation_Filter = true;  // Wait for continuation confirmation
input int Continuation_Bars = 3;            // Bars to wait for continuation
input double Min_Continuation_Pips = 3.0;   // Minimum move in continuation direction

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
    Print("=== BCS Liquidity Sweep OPPOSITE Multi-Currency EA Started ===");
    Print("OPPOSITE LOGIC: Low Swept = SELL | High Swept = BUY");
    Print("CONTINUATION FILTER: Wait for trend continuation after sweep");
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
    
    Print("Continuation Filter: ", Use_Continuation_Filter ? "ENABLED" : "DISABLED");
    if(Use_Continuation_Filter)
    {
        Print("Continuation Bars: ", Continuation_Bars);
        Print("Min Continuation: ", Min_Continuation_Pips, " pips");
    }
    
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
    Print("=== BCS Liquidity Sweep OPPOSITE Multi-Currency EA Stopped ===");
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
        
        // Check for pending sweep continuation
        if(g_symbols[i].pending_sweep.is_active)
        {
            CheckContinuation(symbol, i);
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
    
    // OPPOSITE LOGIC: High swept = BUY (continuation)
    if(high[1] > swing_high && close[1] < swing_high)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: High swept at ", swing_high);
        
        if(Use_Continuation_Filter)
        {
            // Mark as pending and wait for continuation
            g_symbols[symbolIndex].pending_sweep.is_active = true;
            g_symbols[symbolIndex].pending_sweep.is_buy_signal = true;
            g_symbols[symbolIndex].pending_sweep.sweep_price = close[1];
            g_symbols[symbolIndex].pending_sweep.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
            g_symbols[symbolIndex].pending_sweep.bars_since_sweep = 0;
            Print(symbol, " - Waiting for BULLISH continuation confirmation...");
        }
        else
        {
            Print(symbol, " - OPPOSITE LOGIC: Opening BUY");
            OpenTrade(symbol, true);
        }
        return;
    }
    
    // OPPOSITE LOGIC: Low swept = SELL (continuation)
    if(low[1] < swing_low && close[1] > swing_low)
    {
        Print(symbol, " - LIQUIDITY SWEEP DETECTED: Low swept at ", swing_low);
        
        if(Use_Continuation_Filter)
        {
            // Mark as pending and wait for continuation
            g_symbols[symbolIndex].pending_sweep.is_active = true;
            g_symbols[symbolIndex].pending_sweep.is_buy_signal = false;
            g_symbols[symbolIndex].pending_sweep.sweep_price = close[1];
            g_symbols[symbolIndex].pending_sweep.sweep_time = iTime(symbol, PERIOD_CURRENT, 1);
            g_symbols[symbolIndex].pending_sweep.bars_since_sweep = 0;
            Print(symbol, " - Waiting for BEARISH continuation confirmation...");
        }
        else
        {
            Print(symbol, " - OPPOSITE LOGIC: Opening SELL");
            OpenTrade(symbol, false);
        }
        return;
    }
}

//+------------------------------------------------------------------+
//| Check for continuation after liquidity sweep                      |
//+------------------------------------------------------------------+
void CheckContinuation(string symbol, int symbolIndex)
{
    PendingSweep sweep = g_symbols[symbolIndex].pending_sweep;
    
    // Increment bars counter
    g_symbols[symbolIndex].pending_sweep.bars_since_sweep++;
    
    // Check if we've waited too long
    if(sweep.bars_since_sweep > Continuation_Bars)
    {
        Print(symbol, " - Continuation timeout - canceling pending sweep");
        g_symbols[symbolIndex].pending_sweep.is_active = false;
        return;
    }
    
    // Get current price data
    double close[];
    ArraySetAsSeries(close, true);
    if(CopyClose(symbol, PERIOD_CURRENT, 0, 2, close) < 2) return;
    
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    double min_move = Min_Continuation_Pips * pip_value;
    
    if(sweep.is_buy_signal)
    {
        // For BUY: Check if price moved up (continuation)
        double move = close[0] - sweep.sweep_price;
        
        if(move >= min_move)
        {
            Print(symbol, " - BULLISH CONTINUATION CONFIRMED: ", DoubleToString(move / pip_value, 1), " pips");
            Print(symbol, " - OPPOSITE LOGIC + CONTINUATION: Opening BUY");
            OpenTrade(symbol, true);
            g_symbols[symbolIndex].pending_sweep.is_active = false;
        }
        else if(move < -min_move)
        {
            // Price moved against us - cancel
            Print(symbol, " - Price moved against continuation - canceling");
            g_symbols[symbolIndex].pending_sweep.is_active = false;
        }
    }
    else
    {
        // For SELL: Check if price moved down (continuation)
        double move = sweep.sweep_price - close[0];
        
        if(move >= min_move)
        {
            Print(symbol, " - BEARISH CONTINUATION CONFIRMED: ", DoubleToString(move / pip_value, 1), " pips");
            Print(symbol, " - OPPOSITE LOGIC + CONTINUATION: Opening SELL");
            OpenTrade(symbol, false);
            g_symbols[symbolIndex].pending_sweep.is_active = false;
        }
        else if(move < -min_move)
        {
            // Price moved against us - cancel
            Print(symbol, " - Price moved against continuation - canceling");
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
    request.comment = is_buy ? "Opposite BUY" : "Opposite SELL";
    
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
