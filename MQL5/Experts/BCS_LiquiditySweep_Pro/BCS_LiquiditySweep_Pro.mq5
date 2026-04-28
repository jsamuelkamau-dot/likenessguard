//+------------------------------------------------------------------+
//|                           BCS_LiquiditySweep_Pro.mq5             |
//|              High Accuracy Liquidity Sweep Trading EA            |
//|              Target: 85%+ Win Rate with Smart Filters            |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property version   "1.00"
#property strict

//--- Input Parameters
input group "=== Trade Settings ==="
input double TakeProfit_Pips = 10.0;     // Take Profit in pips
input double StopLoss_Pips = 6.0;        // Stop Loss in pips
input double LotSize = 1.0;              // Fixed lot size
input int Magic_Number = 20240003;       // Magic number

input group "=== Sweep Detection ==="
input int Lookback_Bars = 20;            // Bars to look back for highs/lows
input double Min_Wick_Ratio = 0.4;       // Minimum wick ratio (0.4 = 40% of candle)

input group "=== Trend Filter ==="
input bool Use_Trend_Filter = true;     // Use trend filter
input int EMA_Fast = 50;                 // Fast EMA period
input int EMA_Slow = 200;                // Slow EMA period

input group "=== Volume Filter ==="
input bool Use_Volume_Filter = true;    // Use volume filter
input double Min_Volume_Mult = 1.5;     // Minimum volume multiplier
input int Volume_Period = 20;            // Volume average period

input group "=== Time Filter ==="
input bool Use_Time_Filter = true;      // Use time filter (golden hours)
input int Golden_Start1 = 7;            // London open (GMT)
input int Golden_End1 = 11;             // London close
input int Golden_Start2 = 13;           // NY open (GMT)
input int Golden_End2 = 17;             // NY close

input group "=== Spread Filter ==="
input bool Use_Spread_Filter = true;    // Use spread filter
input double Max_Spread_Pips = 2.0;     // Maximum spread in pips

//--- Global Variables
datetime g_lastBarTime = 0;
int g_emaFastHandle = INVALID_HANDLE;
int g_emaSlowHandle = INVALID_HANDLE;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=== BCS Liquidity Sweep PRO EA Started ===");
    Print("Target: 85%+ Win Rate");
    Print("Take Profit: ", TakeProfit_Pips, " pips");
    Print("Stop Loss: ", StopLoss_Pips, " pips");
    Print("Lot Size: ", LotSize);
    
    // Create EMA indicators
    if(Use_Trend_Filter)
    {
        g_emaFastHandle = iMA(_Symbol, PERIOD_CURRENT, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
        g_emaSlowHandle = iMA(_Symbol, PERIOD_CURRENT, EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
        
        if(g_emaFastHandle == INVALID_HANDLE || g_emaSlowHandle == INVALID_HANDLE)
        {
            Print("ERROR: Failed to create EMA indicators");
            return INIT_FAILED;
        }
    }
    
    g_lastBarTime = 0;
    
    Print("Filters enabled:");
    Print("  Trend Filter: ", Use_Trend_Filter ? "YES" : "NO");
    Print("  Volume Filter: ", Use_Volume_Filter ? "YES" : "NO");
    Print("  Time Filter: ", Use_Time_Filter ? "YES" : "NO");
    Print("  Spread Filter: ", Use_Spread_Filter ? "YES" : "NO");
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    if(g_emaFastHandle != INVALID_HANDLE)
        IndicatorRelease(g_emaFastHandle);
    if(g_emaSlowHandle != INVALID_HANDLE)
        IndicatorRelease(g_emaSlowHandle);
    
    Print("=== BCS Liquidity Sweep PRO EA Stopped ===");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
    // Check for new bar
    datetime currentBarTime = iTime(_Symbol, PERIOD_CURRENT, 0);
    
    if(currentBarTime == g_lastBarTime)
        return;
    
    g_lastBarTime = currentBarTime;
    
    // Don't trade if we already have an open position
    if(PositionsTotal() > 0)
        return;
    
    // Check all filters before looking for sweep
    if(!PassAllFilters())
        return;
    
    // Check for liquidity sweep
    CheckLiquiditySweep();
}

//+------------------------------------------------------------------+
//| Check if all filters pass                                         |
//+------------------------------------------------------------------+
bool PassAllFilters()
{
    // Time filter
    if(Use_Time_Filter && !IsGoldenHour())
    {
        return false;
    }
    
    // Spread filter
    if(Use_Spread_Filter && !IsSpreadAcceptable())
    {
        return false;
    }
    
    return true;
}

//+------------------------------------------------------------------+
//| Check if current time is in golden hours                          |
//+------------------------------------------------------------------+
bool IsGoldenHour()
{
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    int hour = dt.hour;
    
    // Check London session
    if(hour >= Golden_Start1 && hour < Golden_End1)
        return true;
    
    // Check NY session
    if(hour >= Golden_Start2 && hour < Golden_End2)
        return true;
    
    return false;
}

//+------------------------------------------------------------------+
//| Check if spread is acceptable                                     |
//+------------------------------------------------------------------+
bool IsSpreadAcceptable()
{
    double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
    
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    double spread_pips = spread * point / pip_value;
    
    return (spread_pips <= Max_Spread_Pips);
}

//+------------------------------------------------------------------+
//| Get trend direction                                               |
//+------------------------------------------------------------------+
int GetTrendDirection()
{
    if(!Use_Trend_Filter)
        return 0;  // Neutral - allow both directions
    
    double emaFast[], emaSlow[];
    ArraySetAsSeries(emaFast, true);
    ArraySetAsSeries(emaSlow, true);
    
    if(CopyBuffer(g_emaFastHandle, 0, 0, 3, emaFast) < 3)
        return 0;
    if(CopyBuffer(g_emaSlowHandle, 0, 0, 3, emaSlow) < 3)
        return 0;
    
    // Bullish trend: Fast EMA > Slow EMA
    if(emaFast[0] > emaSlow[0] && emaFast[1] > emaSlow[1])
        return 1;
    
    // Bearish trend: Fast EMA < Slow EMA
    if(emaFast[0] < emaSlow[0] && emaFast[1] < emaSlow[1])
        return -1;
    
    return 0;  // No clear trend
}

//+------------------------------------------------------------------+
//| Check volume confirmation                                         |
//+------------------------------------------------------------------+
bool HasVolumeConfirmation()
{
    if(!Use_Volume_Filter)
        return true;
    
    long volume[];
    ArraySetAsSeries(volume, true);
    
    if(CopyTickVolume(_Symbol, PERIOD_CURRENT, 0, Volume_Period + 1, volume) < Volume_Period + 1)
        return false;
    
    // Calculate average volume
    double avg_volume = 0;
    for(int i = 1; i <= Volume_Period; i++)
    {
        avg_volume += (double)volume[i];
    }
    avg_volume /= Volume_Period;
    
    // Current bar volume must be above average
    double current_volume = (double)volume[0];
    
    return (current_volume >= avg_volume * Min_Volume_Mult);
}

//+------------------------------------------------------------------+
//| Check candle rejection quality                                    |
//+------------------------------------------------------------------+
bool HasStrongRejection(bool is_high_sweep)
{
    double open[], high[], low[], close[];
    ArraySetAsSeries(open, true);
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    
    if(CopyOpen(_Symbol, PERIOD_CURRENT, 0, 2, open) < 2)
        return false;
    if(CopyHigh(_Symbol, PERIOD_CURRENT, 0, 2, high) < 2)
        return false;
    if(CopyLow(_Symbol, PERIOD_CURRENT, 0, 2, low) < 2)
        return false;
    if(CopyClose(_Symbol, PERIOD_CURRENT, 0, 2, close) < 2)
        return false;
    
    double candle_size = high[1] - low[1];
    if(candle_size == 0)
        return false;
    
    if(is_high_sweep)
    {
        // For high sweep: need long upper wick and bearish close
        double upper_wick = high[1] - MathMax(open[1], close[1]);
        double wick_ratio = upper_wick / candle_size;
        
        bool bearish_close = close[1] < open[1];
        
        return (wick_ratio >= Min_Wick_Ratio && bearish_close);
    }
    else
    {
        // For low sweep: need long lower wick and bullish close
        double lower_wick = MathMin(open[1], close[1]) - low[1];
        double wick_ratio = lower_wick / candle_size;
        
        bool bullish_close = close[1] > open[1];
        
        return (wick_ratio >= Min_Wick_Ratio && bullish_close);
    }
}

//+------------------------------------------------------------------+
//| Check for liquidity sweep                                         |
//+------------------------------------------------------------------+
void CheckLiquiditySweep()
{
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
    
    // Find recent swing high and low
    double swing_high = high[2];
    double swing_low = low[2];
    
    for(int i = 3; i < Lookback_Bars; i++)
    {
        if(high[i] > swing_high)
            swing_high = high[i];
        if(low[i] < swing_low)
            swing_low = low[i];
    }
    
    int trend = GetTrendDirection();
    
    // Check HIGH SWEEP (SELL signal)
    if(high[1] > swing_high && close[1] < swing_high)
    {
        // Only trade if trend is bearish or neutral
        if(trend == 1)  // Skip if bullish trend
        {
            Print("High sweep detected but skipped - bullish trend");
            return;
        }
        
        // Check rejection quality
        if(!HasStrongRejection(true))
        {
            Print("High sweep detected but skipped - weak rejection");
            return;
        }
        
        // Check volume
        if(!HasVolumeConfirmation())
        {
            Print("High sweep detected but skipped - low volume");
            return;
        }
        
        Print("=== HIGH QUALITY SELL SIGNAL ===");
        Print("High swept at ", swing_high);
        Print("Trend: ", trend == -1 ? "Bearish" : "Neutral");
        OpenTrade(false);
        return;
    }
    
    // Check LOW SWEEP (BUY signal)
    if(low[1] < swing_low && close[1] > swing_low)
    {
        // Only trade if trend is bullish or neutral
        if(trend == -1)  // Skip if bearish trend
        {
            Print("Low sweep detected but skipped - bearish trend");
            return;
        }
        
        // Check rejection quality
        if(!HasStrongRejection(false))
        {
            Print("Low sweep detected but skipped - weak rejection");
            return;
        }
        
        // Check volume
        if(!HasVolumeConfirmation())
        {
            Print("Low sweep detected but skipped - low volume");
            return;
        }
        
        Print("=== HIGH QUALITY BUY SIGNAL ===");
        Print("Low swept at ", swing_low);
        Print("Trend: ", trend == 1 ? "Bullish" : "Neutral");
        OpenTrade(true);
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
    
    double pip_value = (digits == 3 || digits == 5) ? point * 10 : point;
    
    double sl = is_buy ? 
                price - (StopLoss_Pips * pip_value) : 
                price + (StopLoss_Pips * pip_value);
                
    double tp = is_buy ? 
                price + (TakeProfit_Pips * pip_value) : 
                price - (TakeProfit_Pips * pip_value);
    
    sl = NormalizeDouble(sl, digits);
    tp = NormalizeDouble(tp, digits);
    price = NormalizeDouble(price, digits);
    
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
    request.comment = is_buy ? "PRO Sweep BUY" : "PRO Sweep SELL";
    
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
        Print("Trade failed: ", result.retcode);
    }
}
//+------------------------------------------------------------------+
