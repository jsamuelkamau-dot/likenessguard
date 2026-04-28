//+------------------------------------------------------------------+
//|                           BCS_LiquiditySweep_Simple.mq5          |
//|                    Simple Liquidity Sweep Trading EA             |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property version   "1.00"
#property strict

//--- Input Parameters
input double TakeProfit_Pips = 10.0;     // Take Profit in pips
input double StopLoss_Pips = 6.0;        // Stop Loss in pips
input double LotSize = 1.0;              // Fixed lot size
input int Magic_Number = 20240002;       // Magic number
input int Lookback_Bars = 20;            // Bars to look back for highs/lows

//--- Global Variables
datetime g_lastBarTime = 0;
double g_lastHigh = 0;
double g_lastLow = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=== BCS Liquidity Sweep Simple EA Started ===");
    Print("Take Profit: ", TakeProfit_Pips, " pips");
    Print("Stop Loss: ", StopLoss_Pips, " pips");
    Print("Lot Size: ", LotSize);
    
    g_lastBarTime = 0;
    g_lastHigh = 0;
    g_lastLow = 0;
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("=== BCS Liquidity Sweep Simple EA Stopped ===");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
    // Check for new bar
    datetime currentBarTime = iTime(_Symbol, PERIOD_CURRENT, 0);
    
    if(currentBarTime == g_lastBarTime)
        return;  // Not a new bar
    
    g_lastBarTime = currentBarTime;
    
    // Don't trade if we already have an open position
    if(PositionsTotal() > 0)
        return;
    
    // Check for liquidity sweep
    CheckLiquiditySweep();
}

//+------------------------------------------------------------------+
//| Check for liquidity sweep                                         |
//+------------------------------------------------------------------+
void CheckLiquiditySweep()
{
    // Get recent highs and lows
    double high[], low[], close[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    
    if(CopyHigh(_Symbol, PERIOD_CURRENT, 0, Lookback_Bars + 5, high) < Lookback_Bars + 5)
        return;
    if(CopyLow(_Symbol, PERIOD_CURRENT, 0, Lookback_Bars + 5, low) < Lookback_Bars + 5)
        return;
    if(CopyClose(_Symbol, PERIOD_CURRENT, 0, 5, close) < 5)
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
    
    // Check if current bar swept the high
    if(high[1] > swing_high && close[1] < swing_high)
    {
        // HIGH SWEPT - Price went above recent high but closed below it
        // This is a liquidity grab - SELL signal
        Print("LIQUIDITY SWEEP DETECTED: High swept at ", swing_high);
        OpenTrade(false);  // Open SELL
        return;
    }
    
    // Check if current bar swept the low
    if(low[1] < swing_low && close[1] > swing_low)
    {
        // LOW SWEPT - Price went below recent low but closed above it
        // This is a liquidity grab - BUY signal
        Print("LIQUIDITY SWEEP DETECTED: Low swept at ", swing_low);
        OpenTrade(true);  // Open BUY
        return;
    }
}

//+------------------------------------------------------------------+
//| Open trade                                                        |
//+------------------------------------------------------------------+
void OpenTrade(bool is_buy)
{
    double price = is_buy ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
    
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
    request.symbol = _Symbol;
    request.volume = LotSize;
    request.type = is_buy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    request.price = price;
    request.sl = sl;
    request.tp = tp;
    request.deviation = 10;
    request.magic = Magic_Number;
    request.comment = is_buy ? "Sweep BUY" : "Sweep SELL";
    
    // Send order
    if(!OrderSend(request, result))
    {
        Print("OrderSend error: ", GetLastError());
        return;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE)
    {
        Print("=== TRADE OPENED ===");
        Print("Direction: ", is_buy ? "BUY" : "SELL");
        Print("Price: ", price);
        Print("SL: ", sl, " (", StopLoss_Pips, " pips)");
        Print("TP: ", tp, " (", TakeProfit_Pips, " pips)");
        Print("Ticket: ", result.order);
    }
    else
    {
        Print("Trade failed: ", result.retcode, " - ", result.comment);
    }
}
//+------------------------------------------------------------------+
