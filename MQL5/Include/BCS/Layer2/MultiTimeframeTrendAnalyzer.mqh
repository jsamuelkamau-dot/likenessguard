//+------------------------------------------------------------------+
//|                            MultiTimeframeTrendAnalyzer.mqh       |
//|                        Layer 2: Multi-Timeframe Trend Analysis   |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CMultiTimeframeTrendAnalyzer
{
private:
    string m_symbol;
    double m_trend_score;
    
    // EMA handles for each timeframe
    int m_ema20_m5, m_ema50_m5;
    int m_ema50_m15;
    int m_ema200_h1;
    int m_ema200_h4;
    
    // Trend values per timeframe
    double m_trend_m5;
    double m_trend_m15;
    double m_trend_h1;
    double m_trend_h4;
    
    double CalculateTrendForTimeframe(ENUM_TIMEFRAMES tf);
    double GetWeightForTimeframe(ENUM_TIMEFRAMES tf);
    bool IsEMARising(int ema_handle, ENUM_TIMEFRAMES tf);
    
public:
    CMultiTimeframeTrendAnalyzer();
    ~CMultiTimeframeTrendAnalyzer();
    
    bool Initialize(string symbol);
    void Update();
    double GetTrendScore() { return m_trend_score; }
    bool IsTrendingUp() { return m_trend_score > 40; }
    bool IsTrendingDown() { return m_trend_score < -40; }
    bool IsRanging() { return MathAbs(m_trend_score) < 40; }
    
    // Get individual timeframe trends
    double GetM5Trend() { return m_trend_m5; }
    double GetM15Trend() { return m_trend_m15; }
    double GetH1Trend() { return m_trend_h1; }
    double GetH4Trend() { return m_trend_h4; }
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CMultiTimeframeTrendAnalyzer::CMultiTimeframeTrendAnalyzer()
{
    m_symbol = "";
    m_trend_score = 0;
    
    m_ema20_m5 = INVALID_HANDLE;
    m_ema50_m5 = INVALID_HANDLE;
    m_ema50_m15 = INVALID_HANDLE;
    m_ema200_h1 = INVALID_HANDLE;
    m_ema200_h4 = INVALID_HANDLE;
    
    m_trend_m5 = 0;
    m_trend_m15 = 0;
    m_trend_h1 = 0;
    m_trend_h4 = 0;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CMultiTimeframeTrendAnalyzer::~CMultiTimeframeTrendAnalyzer()
{
    if(m_ema20_m5 != INVALID_HANDLE) IndicatorRelease(m_ema20_m5);
    if(m_ema50_m5 != INVALID_HANDLE) IndicatorRelease(m_ema50_m5);
    if(m_ema50_m15 != INVALID_HANDLE) IndicatorRelease(m_ema50_m15);
    if(m_ema200_h1 != INVALID_HANDLE) IndicatorRelease(m_ema200_h1);
    if(m_ema200_h4 != INVALID_HANDLE) IndicatorRelease(m_ema200_h4);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CMultiTimeframeTrendAnalyzer::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Create EMA indicators for each timeframe
    m_ema20_m5 = iMA(m_symbol, PERIOD_M5, 20, 0, MODE_EMA, PRICE_CLOSE);
    m_ema50_m5 = iMA(m_symbol, PERIOD_M5, 50, 0, MODE_EMA, PRICE_CLOSE);
    m_ema50_m15 = iMA(m_symbol, PERIOD_M15, 50, 0, MODE_EMA, PRICE_CLOSE);
    m_ema200_h1 = iMA(m_symbol, PERIOD_H1, 200, 0, MODE_EMA, PRICE_CLOSE);
    m_ema200_h4 = iMA(m_symbol, PERIOD_H4, 200, 0, MODE_EMA, PRICE_CLOSE);
    
    // Validate handles
    if(m_ema20_m5 == INVALID_HANDLE || m_ema50_m5 == INVALID_HANDLE ||
       m_ema50_m15 == INVALID_HANDLE || m_ema200_h1 == INVALID_HANDLE ||
       m_ema200_h4 == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create EMA indicators for MTF Trend Analyzer");
        return false;
    }
    
    Print("MTF Trend Analyzer initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CMultiTimeframeTrendAnalyzer::Update()
{
    // Calculate trend for each timeframe
    m_trend_m5 = CalculateTrendForTimeframe(PERIOD_M5);
    m_trend_m15 = CalculateTrendForTimeframe(PERIOD_M15);
    m_trend_h1 = CalculateTrendForTimeframe(PERIOD_H1);
    m_trend_h4 = CalculateTrendForTimeframe(PERIOD_H4);
    
    // Calculate weighted score
    // Weights: H4=40%, H1=30%, M15=20%, M5=10%
    m_trend_score = (m_trend_h4 * 0.40) + 
                    (m_trend_h1 * 0.30) + 
                    (m_trend_m15 * 0.20) + 
                    (m_trend_m5 * 0.10);
    
    // Scale to -100 to +100 range
    m_trend_score = m_trend_score * 100.0;
    
    // Log significant trend changes
    static double last_score = 0;
    if(MathAbs(m_trend_score - last_score) > 20)
    {
        string trend_direction = "RANGING";
        if(m_trend_score > 40) trend_direction = "BULLISH";
        else if(m_trend_score < -40) trend_direction = "BEARISH";
        
        Print("MTF Trend Score: ", DoubleToString(m_trend_score, 1), 
              " | Direction: ", trend_direction,
              " | M5:", DoubleToString(m_trend_m5, 2),
              " M15:", DoubleToString(m_trend_m15, 2),
              " H1:", DoubleToString(m_trend_h1, 2),
              " H4:", DoubleToString(m_trend_h4, 2));
        
        last_score = m_trend_score;
    }
}

//+------------------------------------------------------------------+
//| Calculate trend for specific timeframe                           |
//+------------------------------------------------------------------+
double CMultiTimeframeTrendAnalyzer::CalculateTrendForTimeframe(ENUM_TIMEFRAMES tf)
{
    double ema_fast[], ema_slow[], close[];
    ArraySetAsSeries(ema_fast, true);
    ArraySetAsSeries(ema_slow, true);
    ArraySetAsSeries(close, true);
    
    int ema_fast_handle, ema_slow_handle;
    
    // Select appropriate EMAs for timeframe
    if(tf == PERIOD_M5)
    {
        ema_fast_handle = m_ema20_m5;
        ema_slow_handle = m_ema50_m5;
    }
    else if(tf == PERIOD_M15)
    {
        ema_fast_handle = m_ema50_m15;
        ema_slow_handle = m_ema200_h1;  // Use H1 EMA200 as reference
    }
    else if(tf == PERIOD_H1)
    {
        ema_fast_handle = m_ema200_h1;
        ema_slow_handle = m_ema200_h4;  // Use H4 EMA200 as reference
    }
    else if(tf == PERIOD_H4)
    {
        ema_fast_handle = m_ema200_h4;
        ema_slow_handle = INVALID_HANDLE;  // H4 uses only EMA200
    }
    else
    {
        return 0;  // Unsupported timeframe
    }
    
    // Copy indicator buffers
    if(CopyBuffer(ema_fast_handle, 0, 0, 3, ema_fast) < 3)
        return 0;
    
    if(ema_slow_handle != INVALID_HANDLE)
    {
        if(CopyBuffer(ema_slow_handle, 0, 0, 3, ema_slow) < 3)
            return 0;
    }
    
    // Get current close price
    if(CopyClose(m_symbol, tf, 0, 1, close) < 1)
        return 0;
    
    double current_price = close[0];
    double trend_value = 0;
    
    // Determine trend based on timeframe
    if(tf == PERIOD_H4)
    {
        // H4: Price vs EMA200 + EMA direction
        if(current_price > ema_fast[0])
        {
            trend_value = 1.0;  // Bullish
            // Bonus if EMA is rising
            if(IsEMARising(ema_fast_handle, tf))
                trend_value = 1.0;  // Strong bullish
        }
        else if(current_price < ema_fast[0])
        {
            trend_value = -1.0;  // Bearish
            // Bonus if EMA is falling
            if(!IsEMARising(ema_fast_handle, tf))
                trend_value = -1.0;  // Strong bearish
        }
        else
        {
            trend_value = 0;  // Neutral
        }
    }
    else
    {
        // Other timeframes: Price vs fast EMA vs slow EMA
        bool price_above_fast = (current_price > ema_fast[0]);
        bool fast_above_slow = (ema_slow_handle != INVALID_HANDLE) ? 
                               (ema_fast[0] > ema_slow[0]) : true;
        
        if(price_above_fast && fast_above_slow)
        {
            // Strong bullish: Price > EMA_fast > EMA_slow
            trend_value = 1.0;
            
            // Check if both EMAs are rising for extra confirmation
            if(IsEMARising(ema_fast_handle, tf))
                trend_value = 1.0;  // Very strong bullish
        }
        else if(!price_above_fast && !fast_above_slow)
        {
            // Strong bearish: Price < EMA_fast < EMA_slow
            trend_value = -1.0;
            
            // Check if both EMAs are falling for extra confirmation
            if(!IsEMARising(ema_fast_handle, tf))
                trend_value = -1.0;  // Very strong bearish
        }
        else if(price_above_fast && !fast_above_slow)
        {
            // Weak bullish: Price > EMA_fast but EMA_fast < EMA_slow
            trend_value = 0.5;
        }
        else if(!price_above_fast && fast_above_slow)
        {
            // Weak bearish: Price < EMA_fast but EMA_fast > EMA_slow
            trend_value = -0.5;
        }
        else
        {
            // Neutral/conflicting
            trend_value = 0;
        }
    }
    
    return trend_value;
}

//+------------------------------------------------------------------+
//| Get weight for timeframe                                          |
//+------------------------------------------------------------------+
double CMultiTimeframeTrendAnalyzer::GetWeightForTimeframe(ENUM_TIMEFRAMES tf)
{
    switch(tf)
    {
        case PERIOD_M5:  return 0.10;  // 10%
        case PERIOD_M15: return 0.20;  // 20%
        case PERIOD_H1:  return 0.30;  // 30%
        case PERIOD_H4:  return 0.40;  // 40%
        default:         return 0.0;
    }
}

//+------------------------------------------------------------------+
//| Check if EMA is rising                                            |
//+------------------------------------------------------------------+
bool CMultiTimeframeTrendAnalyzer::IsEMARising(int ema_handle, ENUM_TIMEFRAMES tf)
{
    double ema[];
    ArraySetAsSeries(ema, true);
    
    if(CopyBuffer(ema_handle, 0, 0, 3, ema) < 3)
        return false;
    
    // EMA is rising if current > previous
    return (ema[0] > ema[1] && ema[1] > ema[2]);
}
//+------------------------------------------------------------------+
