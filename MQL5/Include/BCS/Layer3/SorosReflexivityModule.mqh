//+------------------------------------------------------------------+
//|                                 SorosReflexivityModule.mqh       |
//|                        Layer 3: Soros Reflexivity Analysis       |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict
#include "../Common/DataStructures.mqh"

class CSorosReflexivityModule
{
private:
    string m_symbol;
    double m_reflexivity_score;
    
    // Indicator handles
    int m_rsi_m5, m_rsi_m15, m_rsi_h1;
    int m_macd_m5, m_macd_m15, m_macd_h1;
    int m_adx_m5;
    
    // VWAP calculation
    double m_vwap;
    double m_vwap_std_dev;
    
    // Divergence tracking
    EDivergenceType m_current_divergence;
    
    bool DetectRSIDivergence(ENUM_TIMEFRAMES tf, EDivergenceType &div_type);
    bool DetectMACDDivergence(ENUM_TIMEFRAMES tf, EDivergenceType &div_type);
    double CalculateVWAPDeviation();
    void CalculateVWAP();
    
public:
    CSorosReflexivityModule();
    ~CSorosReflexivityModule();
    
    bool Initialize(string symbol);
    void Update();
    EDivergenceType GetDivergence(ENUM_TIMEFRAMES tf);
    double GetReflexivityScore() { return m_reflexivity_score; }
    bool IsReflexiveBullish();
    bool IsReflexiveBearish();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CSorosReflexivityModule::CSorosReflexivityModule()
{
    m_symbol = "";
    m_reflexivity_score = 0;
    m_current_divergence = NO_DIVERGENCE;
    m_vwap = 0;
    m_vwap_std_dev = 0;
    
    m_rsi_m5 = INVALID_HANDLE;
    m_rsi_m15 = INVALID_HANDLE;
    m_rsi_h1 = INVALID_HANDLE;
    m_macd_m5 = INVALID_HANDLE;
    m_macd_m15 = INVALID_HANDLE;
    m_macd_h1 = INVALID_HANDLE;
    m_adx_m5 = INVALID_HANDLE;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CSorosReflexivityModule::~CSorosReflexivityModule()
{
    if(m_rsi_m5 != INVALID_HANDLE) IndicatorRelease(m_rsi_m5);
    if(m_rsi_m15 != INVALID_HANDLE) IndicatorRelease(m_rsi_m15);
    if(m_rsi_h1 != INVALID_HANDLE) IndicatorRelease(m_rsi_h1);
    if(m_macd_m5 != INVALID_HANDLE) IndicatorRelease(m_macd_m5);
    if(m_macd_m15 != INVALID_HANDLE) IndicatorRelease(m_macd_m15);
    if(m_macd_h1 != INVALID_HANDLE) IndicatorRelease(m_macd_h1);
    if(m_adx_m5 != INVALID_HANDLE) IndicatorRelease(m_adx_m5);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CSorosReflexivityModule::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Create RSI indicators
    m_rsi_m5 = iRSI(m_symbol, PERIOD_M5, 14, PRICE_CLOSE);
    m_rsi_m15 = iRSI(m_symbol, PERIOD_M15, 14, PRICE_CLOSE);
    m_rsi_h1 = iRSI(m_symbol, PERIOD_H1, 14, PRICE_CLOSE);
    
    // Create MACD indicators
    m_macd_m5 = iMACD(m_symbol, PERIOD_M5, 12, 26, 9, PRICE_CLOSE);
    m_macd_m15 = iMACD(m_symbol, PERIOD_M15, 12, 26, 9, PRICE_CLOSE);
    m_macd_h1 = iMACD(m_symbol, PERIOD_H1, 12, 26, 9, PRICE_CLOSE);
    
    // Create ADX indicator
    m_adx_m5 = iADX(m_symbol, PERIOD_M5, 14);
    
    // Validate handles
    if(m_rsi_m5 == INVALID_HANDLE || m_rsi_m15 == INVALID_HANDLE || m_rsi_h1 == INVALID_HANDLE ||
       m_macd_m5 == INVALID_HANDLE || m_macd_m15 == INVALID_HANDLE || m_macd_h1 == INVALID_HANDLE ||
       m_adx_m5 == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create indicators for Soros Reflexivity Module");
        return false;
    }
    
    Print("Soros Reflexivity Module initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CSorosReflexivityModule::Update()
{
    // Calculate VWAP
    CalculateVWAP();
    
    // Check for divergences on multiple timeframes
    EDivergenceType div_m5 = NO_DIVERGENCE;
    EDivergenceType div_m15 = NO_DIVERGENCE;
    EDivergenceType div_h1 = NO_DIVERGENCE;
    
    DetectRSIDivergence(PERIOD_M5, div_m5);
    DetectRSIDivergence(PERIOD_M15, div_m15);
    DetectRSIDivergence(PERIOD_H1, div_h1);
    
    // Store most significant divergence
    if(div_h1 != NO_DIVERGENCE)
        m_current_divergence = div_h1;
    else if(div_m15 != NO_DIVERGENCE)
        m_current_divergence = div_m15;
    else if(div_m5 != NO_DIVERGENCE)
        m_current_divergence = div_m5;
    else
        m_current_divergence = NO_DIVERGENCE;
    
    // Calculate reflexivity score
    double divergence_weight = 0;
    if(m_current_divergence == REGULAR_BULLISH || m_current_divergence == HIDDEN_BULLISH)
        divergence_weight = 30.0;
    else if(m_current_divergence == REGULAR_BEARISH || m_current_divergence == HIDDEN_BEARISH)
        divergence_weight = -30.0;
    
    // VWAP deviation factor
    double vwap_deviation = CalculateVWAPDeviation();
    double vwap_factor = 0;
    if(vwap_deviation > 2.0)
        vwap_factor = -20.0;  // Overextended
    else if(vwap_deviation < -2.0)
        vwap_factor = 20.0;   // Oversold
    
    // ADX factor
    double adx[];
    ArraySetAsSeries(adx, true);
    double adx_factor = 0;
    
    if(CopyBuffer(m_adx_m5, 0, 0, 1, adx) > 0)
    {
        if(adx[0] > 25)
            adx_factor = 20.0;  // Strong trend
        else if(adx[0] < 20)
            adx_factor = -10.0; // Weak trend
    }
    
    // Combine factors
    m_reflexivity_score = 50.0 + divergence_weight + vwap_factor + adx_factor;
    
    // Clamp to 0-100
    m_reflexivity_score = MathMax(0, MathMin(100, m_reflexivity_score));
}

//+------------------------------------------------------------------+
//| Detect RSI divergence                                             |
//+------------------------------------------------------------------+
bool CSorosReflexivityModule::DetectRSIDivergence(ENUM_TIMEFRAMES tf, EDivergenceType &div_type)
{
    div_type = NO_DIVERGENCE;
    
    int rsi_handle;
    if(tf == PERIOD_M5) rsi_handle = m_rsi_m5;
    else if(tf == PERIOD_M15) rsi_handle = m_rsi_m15;
    else if(tf == PERIOD_H1) rsi_handle = m_rsi_h1;
    else return false;
    
    double rsi[], high[], low[];
    ArraySetAsSeries(rsi, true);
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    
    if(CopyBuffer(rsi_handle, 0, 0, 20, rsi) < 20) return false;
    if(CopyHigh(m_symbol, tf, 0, 20, high) < 20) return false;
    if(CopyLow(m_symbol, tf, 0, 20, low) < 20) return false;
    
    // Find recent highs and lows in price
    int price_high_idx1 = -1, price_high_idx2 = -1;
    int price_low_idx1 = -1, price_low_idx2 = -1;
    
    // Find two most recent price highs
    for(int i = 2; i < 18; i++)
    {
        if(high[i] > high[i-1] && high[i] > high[i+1])
        {
            if(price_high_idx1 == -1)
                price_high_idx1 = i;
            else if(price_high_idx2 == -1)
            {
                price_high_idx2 = i;
                break;
            }
        }
    }
    
    // Find two most recent price lows
    for(int i = 2; i < 18; i++)
    {
        if(low[i] < low[i-1] && low[i] < low[i+1])
        {
            if(price_low_idx1 == -1)
                price_low_idx1 = i;
            else if(price_low_idx2 == -1)
            {
                price_low_idx2 = i;
                break;
            }
        }
    }
    
    // Check for regular bearish divergence
    if(price_high_idx1 >= 0 && price_high_idx2 >= 0)
    {
        if(high[price_high_idx1] > high[price_high_idx2] &&
           rsi[price_high_idx1] < rsi[price_high_idx2])
        {
            div_type = REGULAR_BEARISH;
            return true;
        }
    }
    
    // Check for regular bullish divergence
    if(price_low_idx1 >= 0 && price_low_idx2 >= 0)
    {
        if(low[price_low_idx1] < low[price_low_idx2] &&
           rsi[price_low_idx1] > rsi[price_low_idx2])
        {
            div_type = REGULAR_BULLISH;
            return true;
        }
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Detect MACD divergence                                            |
//+------------------------------------------------------------------+
bool CSorosReflexivityModule::DetectMACDDivergence(ENUM_TIMEFRAMES tf, EDivergenceType &div_type)
{
    div_type = NO_DIVERGENCE;
    // Similar implementation to RSI divergence
    // Omitted for brevity
    return false;
}

//+------------------------------------------------------------------+
//| Calculate VWAP                                                    |
//+------------------------------------------------------------------+
void CSorosReflexivityModule::CalculateVWAP()
{
    double high[], low[], close[];
    long volume[];
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    ArraySetAsSeries(volume, true);
    
    int bars = 50;
    ENUM_TIMEFRAMES tf = PERIOD_M5;
    
    if(CopyHigh(m_symbol, tf, 0, bars, high) < bars) return;
    if(CopyLow(m_symbol, tf, 0, bars, low) < bars) return;
    if(CopyClose(m_symbol, tf, 0, bars, close) < bars) return;
    if(CopyTickVolume(m_symbol, tf, 0, bars, volume) < bars) return;
    
    double sum_pv = 0;
    double sum_v = 0;
    
    for(int i = 0; i < bars; i++)
    {
        double typical_price = (high[i] + low[i] + close[i]) / 3.0;
        sum_pv += typical_price * (double)volume[i];
        sum_v += (double)volume[i];
    }
    
    if(sum_v > 0)
        m_vwap = sum_pv / sum_v;
    else
        m_vwap = close[0];
    
    // Calculate standard deviation
    double sum_squared_diff = 0;
    for(int i = 0; i < bars; i++)
    {
        double typical_price = (high[i] + low[i] + close[i]) / 3.0;
        double diff = typical_price - m_vwap;
        sum_squared_diff += diff * diff * volume[i];
    }
    
    if(sum_v > 0)
        m_vwap_std_dev = MathSqrt(sum_squared_diff / sum_v);
}

//+------------------------------------------------------------------+
//| Calculate VWAP deviation                                          |
//+------------------------------------------------------------------+
double CSorosReflexivityModule::CalculateVWAPDeviation()
{
    double current_price = SymbolInfoDouble(m_symbol, SYMBOL_BID);
    
    if(m_vwap_std_dev > 0)
        return (current_price - m_vwap) / m_vwap_std_dev;
    
    return 0;
}

//+------------------------------------------------------------------+
//| Get divergence for specific timeframe                            |
//+------------------------------------------------------------------+
EDivergenceType CSorosReflexivityModule::GetDivergence(ENUM_TIMEFRAMES tf)
{
    EDivergenceType div_type = NO_DIVERGENCE;
    DetectRSIDivergence(tf, div_type);
    return div_type;
}

//+------------------------------------------------------------------+
//| Check if reflexive bullish                                        |
//+------------------------------------------------------------------+
bool CSorosReflexivityModule::IsReflexiveBullish()
{
    return (m_reflexivity_score > 60 && 
            (m_current_divergence == REGULAR_BULLISH || 
             m_current_divergence == HIDDEN_BULLISH ||
             m_current_divergence == NO_DIVERGENCE));
}

//+------------------------------------------------------------------+
//| Check if reflexive bearish                                        |
//+------------------------------------------------------------------+
bool CSorosReflexivityModule::IsReflexiveBearish()
{
    return (m_reflexivity_score < 40 && 
            (m_current_divergence == REGULAR_BEARISH || 
             m_current_divergence == HIDDEN_BEARISH ||
             m_current_divergence == NO_DIVERGENCE));
}
//+------------------------------------------------------------------+
