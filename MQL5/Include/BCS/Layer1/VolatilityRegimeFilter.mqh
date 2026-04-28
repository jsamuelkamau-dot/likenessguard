//+------------------------------------------------------------------+
//|                                   VolatilityRegimeFilter.mqh     |
//|                        Layer 1: Volatility Regime Filter         |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

#include "../Common/DataStructures.mqh"

//+------------------------------------------------------------------+
//| Volatility Regime Filter Class                                   |
//+------------------------------------------------------------------+
class CVolatilityRegimeFilter
{
private:
    string              m_symbol;
    ENUM_TIMEFRAMES     m_timeframe;
    int                 m_atr_handle;
    EVolatilityRegime   m_current_regime;
    double              m_regime_score;
    
public:
    CVolatilityRegimeFilter();
    ~CVolatilityRegimeFilter();
    
    bool                Initialize(string symbol, ENUM_TIMEFRAMES timeframe);
    void                Update();
    EVolatilityRegime   GetCurrentRegime() { return m_current_regime; }
    double              GetRegimeScore() { return m_regime_score; }
    bool                IsTradeableRegime();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CVolatilityRegimeFilter::CVolatilityRegimeFilter()
{
    m_symbol = "";
    m_timeframe = PERIOD_H4;
    m_atr_handle = INVALID_HANDLE;
    m_current_regime = REGIME_NORMAL;
    m_regime_score = 100.0;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CVolatilityRegimeFilter::~CVolatilityRegimeFilter()
{
    if(m_atr_handle != INVALID_HANDLE)
        IndicatorRelease(m_atr_handle);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CVolatilityRegimeFilter::Initialize(string symbol, ENUM_TIMEFRAMES timeframe)
{
    m_symbol = symbol;
    m_timeframe = timeframe;
    
    // Create ATR indicator
    m_atr_handle = iATR(m_symbol, m_timeframe, 14);
    if(m_atr_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create ATR indicator for ", m_symbol);
        return false;
    }
    
    Print("Volatility Regime Filter initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CVolatilityRegimeFilter::Update()
{
    // Get ATR values
    double atr_buffer[];
    ArraySetAsSeries(atr_buffer, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 51, atr_buffer) < 51)
    {
        Print("ERROR: Failed to copy ATR buffer");
        return;
    }
    
    // Current ATR value
    double current_atr = atr_buffer[0];
    
    // Calculate 50-period average of ATR
    double atr_sum = 0;
    for(int i = 1; i <= 50; i++)
    {
        atr_sum += atr_buffer[i];
    }
    double atr_average = atr_sum / 50.0;
    
    // Calculate volatility ratio
    double volatility_ratio = 0;
    if(atr_average > 0)
        volatility_ratio = current_atr / atr_average;
    
    // Classify regime based on ratio
    if(volatility_ratio < 0.5)
    {
        m_current_regime = REGIME_QUIET;
        m_regime_score = 40.0;
    }
    else if(volatility_ratio >= 0.5 && volatility_ratio <= 1.5)
    {
        m_current_regime = REGIME_NORMAL;
        m_regime_score = 100.0;
    }
    else if(volatility_ratio > 1.5 && volatility_ratio <= 2.5)
    {
        m_current_regime = REGIME_VOLATILE;
        m_regime_score = 70.0;
    }
    else  // volatility_ratio > 2.5
    {
        m_current_regime = REGIME_EXTREME;
        m_regime_score = 20.0;
    }
    
    // Log regime changes
    static EVolatilityRegime last_regime = REGIME_NORMAL;
    if(m_current_regime != last_regime)
    {
        string regime_name = "";
        switch(m_current_regime)
        {
            case REGIME_QUIET:    regime_name = "QUIET"; break;
            case REGIME_NORMAL:   regime_name = "NORMAL"; break;
            case REGIME_VOLATILE: regime_name = "VOLATILE"; break;
            case REGIME_EXTREME:  regime_name = "EXTREME"; break;
        }
        
        Print("Volatility Regime Changed: ", regime_name, 
              " | Ratio: ", DoubleToString(volatility_ratio, 2),
              " | Score: ", DoubleToString(m_regime_score, 1));
        
        last_regime = m_current_regime;
    }
}

//+------------------------------------------------------------------+
//| Check if regime is tradeable                                      |
//+------------------------------------------------------------------+
bool CVolatilityRegimeFilter::IsTradeableRegime()
{
    return (m_current_regime == REGIME_NORMAL || m_current_regime == REGIME_VOLATILE);
}
//+------------------------------------------------------------------+
