//+------------------------------------------------------------------+
//|                  AdaptiveTakeProfitCalculator.mqh                |
//|               Layer 5: Adaptive Take Profit Logic                |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CAdaptiveTakeProfitCalculator
{
private:
    string m_symbol;
    int m_atr_handle;
    
    double CalculateRMultiple(double entry, double stop_loss, double r_multiple);
    
public:
    CAdaptiveTakeProfitCalculator();
    ~CAdaptiveTakeProfitCalculator();
    
    bool Initialize(string symbol);
    double CalculateTakeProfit(bool is_buy, double entry_price, double stop_loss, int tp_level);
    double CalculateTakeProfit(bool is_buy, double entry_price, double stop_loss);
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CAdaptiveTakeProfitCalculator::CAdaptiveTakeProfitCalculator()
{
    m_symbol = "";
    m_atr_handle = INVALID_HANDLE;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CAdaptiveTakeProfitCalculator::~CAdaptiveTakeProfitCalculator()
{
    if(m_atr_handle != INVALID_HANDLE)
        IndicatorRelease(m_atr_handle);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CAdaptiveTakeProfitCalculator::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Create ATR indicator for regime-based adjustment
    m_atr_handle = iATR(m_symbol, PERIOD_M5, 14);
    
    if(m_atr_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create ATR indicator for Adaptive TP Calculator");
        return false;
    }
    
    Print("Adaptive TP Calculator initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Calculate take profit (default - TP1)                             |
//+------------------------------------------------------------------+
double CAdaptiveTakeProfitCalculator::CalculateTakeProfit(bool is_buy, double entry_price, double stop_loss)
{
    return CalculateTakeProfit(is_buy, entry_price, stop_loss, 1);
}

//+------------------------------------------------------------------+
//| Calculate take profit with level specification                    |
//+------------------------------------------------------------------+
double CAdaptiveTakeProfitCalculator::CalculateTakeProfit(bool is_buy, double entry_price, double stop_loss, int tp_level)
{
    // R-multiple targets:
    // TP1: 0.8R
    // TP2: 1.5R
    // TP3: 2.5R
    
    double r_multiple = 0.8;
    
    switch(tp_level)
    {
        case 1:
            r_multiple = 0.8;
            break;
        case 2:
            r_multiple = 1.5;
            break;
        case 3:
            r_multiple = 2.5;
            break;
        default:
            r_multiple = 0.8;
    }
    
    // Calculate base TP using R-multiple
    double base_tp = CalculateRMultiple(entry_price, stop_loss, r_multiple);
    
    // Regime-based adjustment (optional enhancement)
    // Get current ATR for volatility assessment
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 1, atr) > 0)
    {
        // Calculate ATR ratio to determine regime
        double atr_avg[];
        ArraySetAsSeries(atr_avg, true);
        
        if(CopyBuffer(m_atr_handle, 0, 0, 50, atr_avg) >= 50)
        {
            double sum = 0;
            for(int i = 0; i < 50; i++)
                sum += atr_avg[i];
            
            double avg_atr = sum / 50.0;
            double atr_ratio = atr[0] / avg_atr;
            
            // Adjust TP based on volatility regime
            if(atr_ratio < 0.5)
            {
                // QUIET regime: tighter targets
                base_tp = CalculateRMultiple(entry_price, stop_loss, r_multiple * 0.8);
            }
            else if(atr_ratio > 1.5 && atr_ratio <= 2.5)
            {
                // VOLATILE regime: wider targets
                base_tp = CalculateRMultiple(entry_price, stop_loss, r_multiple * 1.2);
            }
            else if(atr_ratio > 2.5)
            {
                // EXTREME regime: much wider targets
                base_tp = CalculateRMultiple(entry_price, stop_loss, r_multiple * 1.5);
            }
            // NORMAL regime: use base targets (no adjustment)
        }
    }
    
    // Validate against broker's stop level
    double point = SymbolInfoDouble(m_symbol, SYMBOL_POINT);
    int stop_level = (int)SymbolInfoInteger(m_symbol, SYMBOL_TRADE_STOPS_LEVEL);
    double min_distance = stop_level * point;
    
    if(is_buy)
    {
        if(base_tp - entry_price < min_distance)
            base_tp = entry_price + min_distance;
    }
    else
    {
        if(entry_price - base_tp < min_distance)
            base_tp = entry_price - min_distance;
    }
    
    return base_tp;
}

//+------------------------------------------------------------------+
//| Calculate R-multiple                                              |
//+------------------------------------------------------------------+
double CAdaptiveTakeProfitCalculator::CalculateRMultiple(double entry, double stop_loss, double r_multiple)
{
    // R = initial risk (distance from entry to stop)
    double risk_distance = MathAbs(entry - stop_loss);
    
    // TP = entry + (R * r_multiple) for longs
    // TP = entry - (R * r_multiple) for shorts
    
    if(entry > stop_loss)
    {
        // Long position
        return entry + (risk_distance * r_multiple);
    }
    else
    {
        // Short position
        return entry - (risk_distance * r_multiple);
    }
}
//+------------------------------------------------------------------+
