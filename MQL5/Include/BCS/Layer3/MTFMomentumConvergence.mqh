//+------------------------------------------------------------------+
//|                          MTFMomentumConvergence.mqh              |
//|              Layer 3: Multi-Timeframe Momentum Convergence       |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CMTFMomentumConvergence
{
private:
    string m_symbol;
    double m_convergence_score;
    
    // Indicator handles for M1, M5, M15, H1
    int m_rsi_m1, m_rsi_m5, m_rsi_m15, m_rsi_h1;
    int m_macd_m1, m_macd_m5, m_macd_m15, m_macd_h1;
    int m_stoch_m1, m_stoch_m5, m_stoch_m15, m_stoch_h1;
    
    // Momentum states per timeframe
    bool m_bullish_m1, m_bullish_m5, m_bullish_m15, m_bullish_h1;
    bool m_bearish_m1, m_bearish_m5, m_bearish_m15, m_bearish_h1;
    
    bool IsMomentumBullish(ENUM_TIMEFRAMES tf);
    bool IsMomentumBearish(ENUM_TIMEFRAMES tf);
    
public:
    CMTFMomentumConvergence();
    ~CMTFMomentumConvergence();
    
    bool Initialize(string symbol);
    void Update();
    int GetBullishTimeframeCount();
    int GetBearishTimeframeCount();
    bool IsMomentumConverged(bool bullish);
    double GetConvergenceScore() { return m_convergence_score; }
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CMTFMomentumConvergence::CMTFMomentumConvergence()
{
    m_symbol = "";
    m_convergence_score = 0;
    
    m_rsi_m1 = INVALID_HANDLE;
    m_rsi_m5 = INVALID_HANDLE;
    m_rsi_m15 = INVALID_HANDLE;
    m_rsi_h1 = INVALID_HANDLE;
    
    m_macd_m1 = INVALID_HANDLE;
    m_macd_m5 = INVALID_HANDLE;
    m_macd_m15 = INVALID_HANDLE;
    m_macd_h1 = INVALID_HANDLE;
    
    m_stoch_m1 = INVALID_HANDLE;
    m_stoch_m5 = INVALID_HANDLE;
    m_stoch_m15 = INVALID_HANDLE;
    m_stoch_h1 = INVALID_HANDLE;
    
    m_bullish_m1 = false;
    m_bullish_m5 = false;
    m_bullish_m15 = false;
    m_bullish_h1 = false;
    
    m_bearish_m1 = false;
    m_bearish_m5 = false;
    m_bearish_m15 = false;
    m_bearish_h1 = false;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CMTFMomentumConvergence::~CMTFMomentumConvergence()
{
    if(m_rsi_m1 != INVALID_HANDLE) IndicatorRelease(m_rsi_m1);
    if(m_rsi_m5 != INVALID_HANDLE) IndicatorRelease(m_rsi_m5);
    if(m_rsi_m15 != INVALID_HANDLE) IndicatorRelease(m_rsi_m15);
    if(m_rsi_h1 != INVALID_HANDLE) IndicatorRelease(m_rsi_h1);
    
    if(m_macd_m1 != INVALID_HANDLE) IndicatorRelease(m_macd_m1);
    if(m_macd_m5 != INVALID_HANDLE) IndicatorRelease(m_macd_m5);
    if(m_macd_m15 != INVALID_HANDLE) IndicatorRelease(m_macd_m15);
    if(m_macd_h1 != INVALID_HANDLE) IndicatorRelease(m_macd_h1);
    
    if(m_stoch_m1 != INVALID_HANDLE) IndicatorRelease(m_stoch_m1);
    if(m_stoch_m5 != INVALID_HANDLE) IndicatorRelease(m_stoch_m5);
    if(m_stoch_m15 != INVALID_HANDLE) IndicatorRelease(m_stoch_m15);
    if(m_stoch_h1 != INVALID_HANDLE) IndicatorRelease(m_stoch_h1);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CMTFMomentumConvergence::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Create RSI indicators for all timeframes
    m_rsi_m1 = iRSI(m_symbol, PERIOD_M1, 14, PRICE_CLOSE);
    m_rsi_m5 = iRSI(m_symbol, PERIOD_M5, 14, PRICE_CLOSE);
    m_rsi_m15 = iRSI(m_symbol, PERIOD_M15, 14, PRICE_CLOSE);
    m_rsi_h1 = iRSI(m_symbol, PERIOD_H1, 14, PRICE_CLOSE);
    
    // Create MACD indicators for all timeframes
    m_macd_m1 = iMACD(m_symbol, PERIOD_M1, 12, 26, 9, PRICE_CLOSE);
    m_macd_m5 = iMACD(m_symbol, PERIOD_M5, 12, 26, 9, PRICE_CLOSE);
    m_macd_m15 = iMACD(m_symbol, PERIOD_M15, 12, 26, 9, PRICE_CLOSE);
    m_macd_h1 = iMACD(m_symbol, PERIOD_H1, 12, 26, 9, PRICE_CLOSE);
    
    // Create Stochastic indicators for all timeframes
    m_stoch_m1 = iStochastic(m_symbol, PERIOD_M1, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
    m_stoch_m5 = iStochastic(m_symbol, PERIOD_M5, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
    m_stoch_m15 = iStochastic(m_symbol, PERIOD_M15, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
    m_stoch_h1 = iStochastic(m_symbol, PERIOD_H1, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
    
    // Validate handles
    if(m_rsi_m1 == INVALID_HANDLE || m_rsi_m5 == INVALID_HANDLE || 
       m_rsi_m15 == INVALID_HANDLE || m_rsi_h1 == INVALID_HANDLE ||
       m_macd_m1 == INVALID_HANDLE || m_macd_m5 == INVALID_HANDLE ||
       m_macd_m15 == INVALID_HANDLE || m_macd_h1 == INVALID_HANDLE ||
       m_stoch_m1 == INVALID_HANDLE || m_stoch_m5 == INVALID_HANDLE ||
       m_stoch_m15 == INVALID_HANDLE || m_stoch_h1 == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create indicators for MTF Momentum Convergence");
        return false;
    }
    
    Print("MTF Momentum Convergence initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CMTFMomentumConvergence::Update()
{
    // Update momentum states for all timeframes
    m_bullish_m1 = IsMomentumBullish(PERIOD_M1);
    m_bullish_m5 = IsMomentumBullish(PERIOD_M5);
    m_bullish_m15 = IsMomentumBullish(PERIOD_M15);
    m_bullish_h1 = IsMomentumBullish(PERIOD_H1);
    
    m_bearish_m1 = IsMomentumBearish(PERIOD_M1);
    m_bearish_m5 = IsMomentumBearish(PERIOD_M5);
    m_bearish_m15 = IsMomentumBearish(PERIOD_M15);
    m_bearish_h1 = IsMomentumBearish(PERIOD_H1);
    
    // Calculate convergence score
    int bullish_count = GetBullishTimeframeCount();
    int bearish_count = GetBearishTimeframeCount();
    
    // Score based on alignment
    if(bullish_count >= 3)
        m_convergence_score = (bullish_count / 4.0) * 100.0;
    else if(bearish_count >= 3)
        m_convergence_score = -(bearish_count / 4.0) * 100.0;
    else
        m_convergence_score = 0;  // No convergence
}

//+------------------------------------------------------------------+
//| Check if momentum is bullish for timeframe                       |
//+------------------------------------------------------------------+
bool CMTFMomentumConvergence::IsMomentumBullish(ENUM_TIMEFRAMES tf)
{
    int rsi_handle, macd_handle, stoch_handle;
    
    // Select handles based on timeframe
    if(tf == PERIOD_M1)
    {
        rsi_handle = m_rsi_m1;
        macd_handle = m_macd_m1;
        stoch_handle = m_stoch_m1;
    }
    else if(tf == PERIOD_M5)
    {
        rsi_handle = m_rsi_m5;
        macd_handle = m_macd_m5;
        stoch_handle = m_stoch_m5;
    }
    else if(tf == PERIOD_M15)
    {
        rsi_handle = m_rsi_m15;
        macd_handle = m_macd_m15;
        stoch_handle = m_stoch_m15;
    }
    else if(tf == PERIOD_H1)
    {
        rsi_handle = m_rsi_h1;
        macd_handle = m_macd_h1;
        stoch_handle = m_stoch_h1;
    }
    else
        return false;
    
    // Get indicator values
    double rsi[], macd[], stoch[];
    ArraySetAsSeries(rsi, true);
    ArraySetAsSeries(macd, true);
    ArraySetAsSeries(stoch, true);
    
    if(CopyBuffer(rsi_handle, 0, 0, 1, rsi) < 1) return false;
    if(CopyBuffer(macd_handle, 0, 0, 1, macd) < 1) return false;
    if(CopyBuffer(stoch_handle, 0, 0, 1, stoch) < 1) return false;
    
    // Bullish conditions:
    // RSI > 50, MACD > 0, Stochastic > 50
    // Require at least 2 of 3 indicators to agree
    
    int bullish_indicators = 0;
    
    if(rsi[0] > 50) bullish_indicators++;
    if(macd[0] > 0) bullish_indicators++;
    if(stoch[0] > 50) bullish_indicators++;
    
    return (bullish_indicators >= 2);
}

//+------------------------------------------------------------------+
//| Check if momentum is bearish for timeframe                       |
//+------------------------------------------------------------------+
bool CMTFMomentumConvergence::IsMomentumBearish(ENUM_TIMEFRAMES tf)
{
    int rsi_handle, macd_handle, stoch_handle;
    
    // Select handles based on timeframe
    if(tf == PERIOD_M1)
    {
        rsi_handle = m_rsi_m1;
        macd_handle = m_macd_m1;
        stoch_handle = m_stoch_m1;
    }
    else if(tf == PERIOD_M5)
    {
        rsi_handle = m_rsi_m5;
        macd_handle = m_macd_m5;
        stoch_handle = m_stoch_m5;
    }
    else if(tf == PERIOD_M15)
    {
        rsi_handle = m_rsi_m15;
        macd_handle = m_macd_m15;
        stoch_handle = m_stoch_m15;
    }
    else if(tf == PERIOD_H1)
    {
        rsi_handle = m_rsi_h1;
        macd_handle = m_macd_h1;
        stoch_handle = m_stoch_h1;
    }
    else
        return false;
    
    // Get indicator values
    double rsi[], macd[], stoch[];
    ArraySetAsSeries(rsi, true);
    ArraySetAsSeries(macd, true);
    ArraySetAsSeries(stoch, true);
    
    if(CopyBuffer(rsi_handle, 0, 0, 1, rsi) < 1) return false;
    if(CopyBuffer(macd_handle, 0, 0, 1, macd) < 1) return false;
    if(CopyBuffer(stoch_handle, 0, 0, 1, stoch) < 1) return false;
    
    // Bearish conditions:
    // RSI < 50, MACD < 0, Stochastic < 50
    // Require at least 2 of 3 indicators to agree
    
    int bearish_indicators = 0;
    
    if(rsi[0] < 50) bearish_indicators++;
    if(macd[0] < 0) bearish_indicators++;
    if(stoch[0] < 50) bearish_indicators++;
    
    return (bearish_indicators >= 2);
}

//+------------------------------------------------------------------+
//| Get count of bullish timeframes                                  |
//+------------------------------------------------------------------+
int CMTFMomentumConvergence::GetBullishTimeframeCount()
{
    int count = 0;
    
    if(m_bullish_m1) count++;
    if(m_bullish_m5) count++;
    if(m_bullish_m15) count++;
    if(m_bullish_h1) count++;
    
    return count;
}

//+------------------------------------------------------------------+
//| Get count of bearish timeframes                                  |
//+------------------------------------------------------------------+
int CMTFMomentumConvergence::GetBearishTimeframeCount()
{
    int count = 0;
    
    if(m_bearish_m1) count++;
    if(m_bearish_m5) count++;
    if(m_bearish_m15) count++;
    if(m_bearish_h1) count++;
    
    return count;
}

//+------------------------------------------------------------------+
//| Check if momentum is converged                                   |
//+------------------------------------------------------------------+
bool CMTFMomentumConvergence::IsMomentumConverged(bool bullish)
{
    // Require at least 3 of 4 timeframes to agree
    if(bullish)
        return (GetBullishTimeframeCount() >= 3);
    else
        return (GetBearishTimeframeCount() >= 3);
}
//+------------------------------------------------------------------+
