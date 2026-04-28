//+------------------------------------------------------------------+
//|                                                Utils.mqh          |
//|                        Utility functions for BCS v2.0            |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

//+------------------------------------------------------------------+
//| Time Conversion Functions                                         |
//+------------------------------------------------------------------+

// Convert broker time to GMT
datetime BrokerTimeToGMT(datetime broker_time, int gmt_offset_hours = 0)
{
    return broker_time - (gmt_offset_hours * 3600);
}

// Get current GMT time
datetime GetGMTTime(int gmt_offset_hours = 0)
{
    return BrokerTimeToGMT(TimeCurrent(), gmt_offset_hours);
}

// Get current hour in GMT
int GetGMTHour(int gmt_offset_hours = 0)
{
    MqlDateTime dt;
    TimeToStruct(GetGMTTime(gmt_offset_hours), dt);
    return dt.hour;
}

// Check if current time is within a time range (GMT)
bool IsWithinTimeRange(int start_hour, int end_hour, int gmt_offset = 0)
{
    int current_hour = GetGMTHour(gmt_offset);
    
    if(start_hour <= end_hour)
    {
        return (current_hour >= start_hour && current_hour < end_hour);
    }
    else  // Range crosses midnight
    {
        return (current_hour >= start_hour || current_hour < end_hour);
    }
}

// Check if it's a new day
bool IsNewDay(datetime &last_day_time)
{
    MqlDateTime current_dt, last_dt;
    TimeToStruct(TimeCurrent(), current_dt);
    TimeToStruct(last_day_time, last_dt);
    
    if(current_dt.day != last_dt.day || current_dt.mon != last_dt.mon || current_dt.year != last_dt.year)
    {
        last_day_time = TimeCurrent();
        return true;
    }
    return false;
}

// Check if it's a new week
bool IsNewWeek(datetime &last_week_time)
{
    MqlDateTime current_dt, last_dt;
    TimeToStruct(TimeCurrent(), current_dt);
    TimeToStruct(last_week_time, last_dt);
    
    // Check if we crossed into Monday
    if(current_dt.day_of_week == 1 && last_dt.day_of_week != 1)
    {
        last_week_time = TimeCurrent();
        return true;
    }
    return false;
}

//+------------------------------------------------------------------+
//| Price Calculation Functions                                       |
//+------------------------------------------------------------------+

// Calculate pip value for current symbol
double GetPipValue(string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    double tick_size = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
    double tick_value = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    
    if(point == 0) return 0;
    
    return (tick_value / tick_size) * point;
}

// Convert pips to price for current symbol
double PipsToPrice(double pips, string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    
    if(digits == 3 || digits == 5)
        return pips * point * 10;
    else
        return pips * point;
}

// Convert price to pips
double PriceToPips(double price_diff, string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    
    if(point == 0) return 0;
    
    if(digits == 3 || digits == 5)
        return price_diff / (point * 10);
    else
        return price_diff / point;
}

// Normalize price to symbol's digits
double NormalizePrice(double price, string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    return NormalizeDouble(price, digits);
}

// Normalize lot size to symbol's lot step
double NormalizeLots(double lots, string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    double lot_step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    double min_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    double max_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    
    if(lot_step == 0) return 0;
    
    lots = MathFloor(lots / lot_step) * lot_step;
    lots = MathMax(lots, min_lot);
    lots = MathMin(lots, max_lot);
    
    return NormalizeDouble(lots, 2);
}

// Calculate position size based on risk
double CalculatePositionSize(double risk_percent, double stop_loss_pips, string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    double account_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double risk_amount = account_equity * (risk_percent / 100.0);
    
    double pip_value = GetPipValue(symbol);
    if(pip_value == 0 || stop_loss_pips == 0) return 0;
    
    double lots = risk_amount / (stop_loss_pips * pip_value);
    
    return NormalizeLots(lots, symbol);
}

//+------------------------------------------------------------------+
//| Validation Functions                                              |
//+------------------------------------------------------------------+

// Validate stop loss level against broker requirements
bool ValidateStopLevel(double entry_price, double stop_loss, bool is_buy, string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    int stop_level = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    
    double min_distance = stop_level * point;
    double actual_distance = MathAbs(entry_price - stop_loss);
    
    return (actual_distance >= min_distance);
}

// Validate take profit level
bool ValidateTakeProfit(double entry_price, double take_profit, bool is_buy, string symbol = "")
{
    return ValidateStopLevel(entry_price, take_profit, is_buy, symbol);
}

// Check if trading is allowed for symbol
bool IsTradingAllowed(string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    // Check if trading is allowed in general
    if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
    {
        Print("ERROR: Trading is not allowed in terminal");
        return false;
    }
    
    // Check if EA trading is allowed
    if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
    {
        Print("ERROR: EA trading is not allowed");
        return false;
    }
    
    // Check if symbol is tradeable
    if(!SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE))
    {
        Print("ERROR: Trading is not allowed for ", symbol);
        return false;
    }
    
    return true;
}

// Check if market is open
bool IsMarketOpen(string symbol = "")
{
    if(symbol == "") symbol = _Symbol;
    
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    
    // Check if it's weekend
    if(dt.day_of_week == 0 || dt.day_of_week == 6)
        return false;
    
    // Check symbol-specific trading session
    datetime from, to;
    if(SymbolInfoSessionTrade(symbol, (ENUM_DAY_OF_WEEK)dt.day_of_week, 0, from, to))
    {
        datetime current = TimeCurrent();
        if(current >= from && current <= to)
            return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Statistical Functions                                             |
//+------------------------------------------------------------------+

// Calculate simple moving average of array
double CalculateSMA(const double &array[], int period, int start = 0)
{
    if(period <= 0 || start < 0) return 0;
    if(ArraySize(array) < start + period) return 0;
    
    double sum = 0;
    for(int i = start; i < start + period; i++)
    {
        sum += array[i];
    }
    
    return sum / period;
}

// Calculate standard deviation
double CalculateStdDev(const double &array[], int period, int start = 0)
{
    if(period <= 0 || start < 0) return 0;
    if(ArraySize(array) < start + period) return 0;
    
    double mean = CalculateSMA(array, period, start);
    double sum_squared_diff = 0;
    
    for(int i = start; i < start + period; i++)
    {
        double diff = array[i] - mean;
        sum_squared_diff += diff * diff;
    }
    
    return MathSqrt(sum_squared_diff / period);
}

// Find maximum value in array
double FindMaxValue(const double &array[], int count, int start = 0)
{
    if(count <= 0 || start < 0) return 0;
    if(ArraySize(array) < start + count) return 0;
    
    double max_val = array[start];
    for(int i = start + 1; i < start + count; i++)
    {
        if(array[i] > max_val)
            max_val = array[i];
    }
    
    return max_val;
}

// Find minimum value in array
double FindMinValue(const double &array[], int count, int start = 0)
{
    if(count <= 0 || start < 0) return 0;
    if(ArraySize(array) < start + count) return 0;
    
    double min_val = array[start];
    for(int i = start + 1; i < start + count; i++)
    {
        if(array[i] < min_val)
            min_val = array[i];
    }
    
    return min_val;
}

//+------------------------------------------------------------------+
//| String Formatting Functions                                       |
//+------------------------------------------------------------------+

// Format double to string with specified decimals
string FormatDouble(double value, int decimals = 2)
{
    return DoubleToString(value, decimals);
}

// Format percentage
string FormatPercent(double value, int decimals = 2)
{
    return FormatDouble(value, decimals) + "%";
}

// Format currency
string FormatCurrency(double value, int decimals = 2)
{
    return "$" + FormatDouble(value, decimals);
}

// Format R-multiple
string FormatRMultiple(double value, int decimals = 2)
{
    return FormatDouble(value, decimals) + "R";
}

//+------------------------------------------------------------------+
//| Array Helper Functions                                            |
//+------------------------------------------------------------------+

// Shift array elements (for circular buffer)
void ShiftArray(double &array[], double new_value)
{
    int size = ArraySize(array);
    if(size <= 0) return;
    
    for(int i = size - 1; i > 0; i--)
    {
        array[i] = array[i-1];
    }
    array[0] = new_value;
}

// Shift integer array
void ShiftArray(int &array[], int new_value)
{
    int size = ArraySize(array);
    if(size <= 0) return;
    
    for(int i = size - 1; i > 0; i--)
    {
        array[i] = array[i-1];
    }
    array[0] = new_value;
}

// Shift boolean array
void ShiftArray(bool &array[], bool new_value)
{
    int size = ArraySize(array);
    if(size <= 0) return;
    
    for(int i = size - 1; i > 0; i--)
    {
        array[i] = array[i-1];
    }
    array[0] = new_value;
}
//+------------------------------------------------------------------+
