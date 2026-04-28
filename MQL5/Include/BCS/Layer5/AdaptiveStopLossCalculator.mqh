//+------------------------------------------------------------------+
//|                   AdaptiveStopLossCalculator.mqh                 |
//|                Layer 5: Adaptive Stop Loss Logic                 |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CAdaptiveStopLossCalculator
{
private:
    string m_symbol;
    double m_stop_loss_pips;
    string m_stop_loss_method;
    int m_atr_handle;
    
    double CalculateATRStop(bool is_buy, double entry);
    double CalculateOrderBlockStop(bool is_buy, double entry);
    double CalculateStructureStop(bool is_buy, double entry);
    
public:
    CAdaptiveStopLossCalculator();
    ~CAdaptiveStopLossCalculator();
    
    bool Initialize(string symbol);
    double CalculateStopLoss(bool is_buy, double entry_price);
    double GetStopLossPips() { return m_stop_loss_pips; }
    string GetStopLossMethod() { return m_stop_loss_method; }
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CAdaptiveStopLossCalculator::CAdaptiveStopLossCalculator()
{
    m_symbol = "";
    m_stop_loss_pips = 0;
    m_stop_loss_method = "ATR";
    m_atr_handle = INVALID_HANDLE;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CAdaptiveStopLossCalculator::~CAdaptiveStopLossCalculator()
{
    if(m_atr_handle != INVALID_HANDLE)
        IndicatorRelease(m_atr_handle);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CAdaptiveStopLossCalculator::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Create ATR indicator
    m_atr_handle = iATR(m_symbol, PERIOD_M5, 14);
    
    if(m_atr_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create ATR indicator for Adaptive SL Calculator");
        return false;
    }
    
    Print("Adaptive SL Calculator initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Calculate stop loss                                               |
//+------------------------------------------------------------------+
double CAdaptiveStopLossCalculator::CalculateStopLoss(bool is_buy, double entry_price)
{
    // Calculate all three methods
    double atr_stop = CalculateATRStop(is_buy, entry_price);
    double ob_stop = CalculateOrderBlockStop(is_buy, entry_price);
    double structure_stop = CalculateStructureStop(is_buy, entry_price);
    
    // Select the widest stop (most conservative)
    double selected_stop = 0;
    
    if(is_buy)
    {
        // For longs, widest = lowest stop
        selected_stop = MathMin(atr_stop, MathMin(ob_stop, structure_stop));
        
        if(selected_stop == atr_stop)
            m_stop_loss_method = "ATR";
        else if(selected_stop == ob_stop)
            m_stop_loss_method = "OrderBlock";
        else
            m_stop_loss_method = "Structure";
    }
    else
    {
        // For shorts, widest = highest stop
        selected_stop = MathMax(atr_stop, MathMax(ob_stop, structure_stop));
        
        if(selected_stop == atr_stop)
            m_stop_loss_method = "ATR";
        else if(selected_stop == ob_stop)
            m_stop_loss_method = "OrderBlock";
        else
            m_stop_loss_method = "Structure";
    }
    
    // Calculate pips
    double point = SymbolInfoDouble(m_symbol, SYMBOL_POINT);
    m_stop_loss_pips = MathAbs(entry_price - selected_stop) / (point * 10);
    
    // Validate against broker's stop level
    int stop_level = (int)SymbolInfoInteger(m_symbol, SYMBOL_TRADE_STOPS_LEVEL);
    double min_distance = stop_level * point;
    
    if(is_buy)
    {
        if(entry_price - selected_stop < min_distance)
            selected_stop = entry_price - min_distance;
    }
    else
    {
        if(selected_stop - entry_price < min_distance)
            selected_stop = entry_price + min_distance;
    }
    
    return selected_stop;
}

//+------------------------------------------------------------------+
//| Calculate ATR-based stop                                          |
//+------------------------------------------------------------------+
double CAdaptiveStopLossCalculator::CalculateATRStop(bool is_buy, double entry)
{
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 1, atr) < 1)
        return entry;  // Fallback
    
    // ATR multiplier based on volatility regime (default: 1.5)
    // This would ideally come from VolatilityRegimeFilter
    double multiplier = 1.5;
    
    double stop_distance = atr[0] * multiplier;
    
    if(is_buy)
        return entry - stop_distance;
    else
        return entry + stop_distance;
}

//+------------------------------------------------------------------+
//| Calculate order block-based stop                                  |
//+------------------------------------------------------------------+
double CAdaptiveStopLossCalculator::CalculateOrderBlockStop(bool is_buy, double entry)
{
    // This would ideally use OrderBlockDetector to find nearest OB
    // For now, use a simplified approach based on recent swing points
    
    double high[], low[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    
    if(CopyHigh(m_symbol, PERIOD_M5, 0, 20, high) < 20 ||
       CopyLow(m_symbol, PERIOD_M5, 0, 20, low) < 20)
        return entry;  // Fallback
    
    double atr[];
    ArraySetAsSeries(atr, true);
    CopyBuffer(m_atr_handle, 0, 0, 1, atr);
    double buffer = atr[0] * 0.2;
    
    if(is_buy)
    {
        // Find recent swing low
        double swing_low = low[0];
        for(int i = 1; i < 20; i++)
        {
            if(low[i] < swing_low)
                swing_low = low[i];
        }
        return swing_low - buffer;
    }
    else
    {
        // Find recent swing high
        double swing_high = high[0];
        for(int i = 1; i < 20; i++)
        {
            if(high[i] > swing_high)
                swing_high = high[i];
        }
        return swing_high + buffer;
    }
}

//+------------------------------------------------------------------+
//| Calculate structure-based stop                                    |
//+------------------------------------------------------------------+
double CAdaptiveStopLossCalculator::CalculateStructureStop(bool is_buy, double entry)
{
    // Find swing high/low in last 20 bars
    double high[], low[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    
    if(CopyHigh(m_symbol, PERIOD_M5, 0, 20, high) < 20 ||
       CopyLow(m_symbol, PERIOD_M5, 0, 20, low) < 20)
        return entry;  // Fallback
    
    double atr[];
    ArraySetAsSeries(atr, true);
    CopyBuffer(m_atr_handle, 0, 0, 1, atr);
    double buffer = atr[0] * 0.3;
    
    if(is_buy)
    {
        // Find swing low (local minimum)
        double swing_low = low[2];
        for(int i = 3; i < 18; i++)
        {
            if(low[i] < low[i-1] && low[i] < low[i+1])
            {
                swing_low = low[i];
                break;
            }
        }
        return swing_low - buffer;
    }
    else
    {
        // Find swing high (local maximum)
        double swing_high = high[2];
        for(int i = 3; i < 18; i++)
        {
            if(high[i] > high[i-1] && high[i] > high[i+1])
            {
                swing_high = high[i];
                break;
            }
        }
        return swing_high + buffer;
    }
}
//+------------------------------------------------------------------+
