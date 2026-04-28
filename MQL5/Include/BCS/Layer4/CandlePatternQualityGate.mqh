//+------------------------------------------------------------------+
//|                      CandlePatternQualityGate.mqh                |
//|              Layer 4: Candle Pattern Recognition                 |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CCandlePatternQualityGate
{
private:
    string m_symbol;
    ENUM_TIMEFRAMES m_timeframe;
    bool m_use_onnx;
    double m_pattern_score;
    string m_pattern_name;
    
    // Candle data
    double m_open[4];
    double m_high[4];
    double m_low[4];
    double m_close[4];
    long m_volume[4];
    
    // Pattern detection methods
    bool DetectHammer();
    bool DetectShootingStar();
    bool DetectBullishEngulfing();
    bool DetectBearishEngulfing();
    bool DetectMorningStar();
    bool DetectEveningStar();
    bool DetectPiercingLine();
    bool DetectDarkCloudCover();
    
    // Quality evaluation
    double EvaluateRuleBased();
    double EvaluatePatternQuality(string pattern_name, bool bullish);
    
    // Helper methods
    double GetBodySize(int index);
    double GetUpperWick(int index);
    double GetLowerWick(int index);
    double GetCandleRange(int index);
    bool IsBullish(int index);
    bool IsBearish(int index);
    
public:
    CCandlePatternQualityGate();
    ~CCandlePatternQualityGate();
    
    bool Initialize(string symbol, ENUM_TIMEFRAMES timeframe, bool use_onnx);
    void Update();
    double GetPatternScore() { return m_pattern_score; }
    bool IsQualityPattern(bool bullish);
    string GetPatternName() { return m_pattern_name; }
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CCandlePatternQualityGate::CCandlePatternQualityGate()
{
    m_symbol = "";
    m_timeframe = PERIOD_M5;
    m_use_onnx = false;
    m_pattern_score = 0;
    m_pattern_name = "None";
    
    ArrayInitialize(m_open, 0);
    ArrayInitialize(m_high, 0);
    ArrayInitialize(m_low, 0);
    ArrayInitialize(m_close, 0);
    ArrayInitialize(m_volume, 0);
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CCandlePatternQualityGate::~CCandlePatternQualityGate()
{
    // No resources to release
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::Initialize(string symbol, ENUM_TIMEFRAMES timeframe, bool use_onnx)
{
    m_symbol = symbol;
    m_timeframe = timeframe;
    m_use_onnx = use_onnx;
    
    if(m_use_onnx)
    {
        Print("WARNING: ONNX mode requested but not implemented. Falling back to rule-based.");
        m_use_onnx = false;
    }
    
    Print("Candle Pattern Quality Gate initialized for ", m_symbol, " on ", EnumToString(m_timeframe));
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CCandlePatternQualityGate::Update()
{
    // Get last 4 candles (current + 3 previous)
    double open[], high[], low[], close[];
    long volume[];
    
    ArraySetAsSeries(open, true);
    ArraySetAsSeries(high, true);
    ArraySetAsSeries(low, true);
    ArraySetAsSeries(close, true);
    ArraySetAsSeries(volume, true);
    
    if(CopyOpen(m_symbol, m_timeframe, 0, 4, open) < 4 ||
       CopyHigh(m_symbol, m_timeframe, 0, 4, high) < 4 ||
       CopyLow(m_symbol, m_timeframe, 0, 4, low) < 4 ||
       CopyClose(m_symbol, m_timeframe, 0, 4, close) < 4 ||
       CopyTickVolume(m_symbol, m_timeframe, 0, 4, volume) < 4)
    {
        m_pattern_score = 0;
        m_pattern_name = "None";
        return;
    }
    
    // Store candle data
    for(int i = 0; i < 4; i++)
    {
        m_open[i] = open[i];
        m_high[i] = high[i];
        m_low[i] = low[i];
        m_close[i] = close[i];
        m_volume[i] = volume[i];
    }
    
    // Evaluate patterns
    m_pattern_score = EvaluateRuleBased();
}

//+------------------------------------------------------------------+
//| Evaluate rule-based patterns                                      |
//+------------------------------------------------------------------+
double CCandlePatternQualityGate::EvaluateRuleBased()
{
    m_pattern_name = "None";
    double best_score = 0;
    
    // Check bullish patterns
    if(DetectHammer())
    {
        double score = EvaluatePatternQuality("Hammer", true);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Hammer";
        }
    }
    
    if(DetectBullishEngulfing())
    {
        double score = EvaluatePatternQuality("Bullish Engulfing", true);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Bullish Engulfing";
        }
    }
    
    if(DetectMorningStar())
    {
        double score = EvaluatePatternQuality("Morning Star", true);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Morning Star";
        }
    }
    
    if(DetectPiercingLine())
    {
        double score = EvaluatePatternQuality("Piercing Line", true);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Piercing Line";
        }
    }
    
    // Check bearish patterns
    if(DetectShootingStar())
    {
        double score = EvaluatePatternQuality("Shooting Star", false);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Shooting Star";
        }
    }
    
    if(DetectBearishEngulfing())
    {
        double score = EvaluatePatternQuality("Bearish Engulfing", false);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Bearish Engulfing";
        }
    }
    
    if(DetectEveningStar())
    {
        double score = EvaluatePatternQuality("Evening Star", false);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Evening Star";
        }
    }
    
    if(DetectDarkCloudCover())
    {
        double score = EvaluatePatternQuality("Dark Cloud Cover", false);
        if(score > best_score)
        {
            best_score = score;
            m_pattern_name = "Dark Cloud Cover";
        }
    }
    
    return best_score;
}

//+------------------------------------------------------------------+
//| Detect Hammer pattern                                             |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectHammer()
{
    // Hammer: Small body at top, long lower wick (2x body), small/no upper wick
    int idx = 0;  // Current candle
    
    double body = GetBodySize(idx);
    double lower_wick = GetLowerWick(idx);
    double upper_wick = GetUpperWick(idx);
    double range = GetCandleRange(idx);
    
    if(range == 0) return false;
    
    // Body should be small (< 30% of range)
    if(body / range > 0.3) return false;
    
    // Lower wick should be at least 2x body
    if(lower_wick < body * 2.0) return false;
    
    // Upper wick should be small (< 10% of range)
    if(upper_wick / range > 0.1) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Detect Shooting Star pattern                                      |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectShootingStar()
{
    // Shooting Star: Small body at bottom, long upper wick (2x body), small/no lower wick
    int idx = 0;
    
    double body = GetBodySize(idx);
    double lower_wick = GetLowerWick(idx);
    double upper_wick = GetUpperWick(idx);
    double range = GetCandleRange(idx);
    
    if(range == 0) return false;
    
    // Body should be small (< 30% of range)
    if(body / range > 0.3) return false;
    
    // Upper wick should be at least 2x body
    if(upper_wick < body * 2.0) return false;
    
    // Lower wick should be small (< 10% of range)
    if(lower_wick / range > 0.1) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Detect Bullish Engulfing pattern                                  |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectBullishEngulfing()
{
    // Bullish Engulfing: Bearish candle followed by larger bullish candle
    if(!IsBearish(1)) return false;
    if(!IsBullish(0)) return false;
    
    // Current candle should engulf previous
    if(m_close[0] <= m_open[1]) return false;
    if(m_open[0] >= m_close[1]) return false;
    
    // Current body should be larger
    if(GetBodySize(0) <= GetBodySize(1)) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Detect Bearish Engulfing pattern                                  |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectBearishEngulfing()
{
    // Bearish Engulfing: Bullish candle followed by larger bearish candle
    if(!IsBullish(1)) return false;
    if(!IsBearish(0)) return false;
    
    // Current candle should engulf previous
    if(m_close[0] >= m_open[1]) return false;
    if(m_open[0] <= m_close[1]) return false;
    
    // Current body should be larger
    if(GetBodySize(0) <= GetBodySize(1)) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Detect Morning Star pattern                                       |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectMorningStar()
{
    // Morning Star: Large bearish, small body, large bullish
    if(!IsBearish(2)) return false;
    if(!IsBullish(0)) return false;
    
    // Middle candle should have small body
    double middle_body = GetBodySize(1);
    double first_body = GetBodySize(2);
    double last_body = GetBodySize(0);
    
    if(middle_body > first_body * 0.3) return false;
    if(middle_body > last_body * 0.3) return false;
    
    // Last candle should close above midpoint of first
    double first_midpoint = (m_open[2] + m_close[2]) / 2.0;
    if(m_close[0] <= first_midpoint) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Detect Evening Star pattern                                       |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectEveningStar()
{
    // Evening Star: Large bullish, small body, large bearish
    if(!IsBullish(2)) return false;
    if(!IsBearish(0)) return false;
    
    // Middle candle should have small body
    double middle_body = GetBodySize(1);
    double first_body = GetBodySize(2);
    double last_body = GetBodySize(0);
    
    if(middle_body > first_body * 0.3) return false;
    if(middle_body > last_body * 0.3) return false;
    
    // Last candle should close below midpoint of first
    double first_midpoint = (m_open[2] + m_close[2]) / 2.0;
    if(m_close[0] >= first_midpoint) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Detect Piercing Line pattern                                      |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectPiercingLine()
{
    // Piercing Line: Bearish candle, bullish opens below low, closes above midpoint
    if(!IsBearish(1)) return false;
    if(!IsBullish(0)) return false;
    
    // Current should open below previous low
    if(m_open[0] >= m_low[1]) return false;
    
    // Current should close above midpoint of previous
    double prev_midpoint = (m_open[1] + m_close[1]) / 2.0;
    if(m_close[0] <= prev_midpoint) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Detect Dark Cloud Cover pattern                                   |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::DetectDarkCloudCover()
{
    // Dark Cloud Cover: Bullish candle, bearish opens above high, closes below midpoint
    if(!IsBullish(1)) return false;
    if(!IsBearish(0)) return false;
    
    // Current should open above previous high
    if(m_open[0] <= m_high[1]) return false;
    
    // Current should close below midpoint of previous
    double prev_midpoint = (m_open[1] + m_close[1]) / 2.0;
    if(m_close[0] >= prev_midpoint) return false;
    
    return true;
}

//+------------------------------------------------------------------+
//| Evaluate pattern quality                                          |
//+------------------------------------------------------------------+
double CCandlePatternQualityGate::EvaluatePatternQuality(string pattern_name, bool bullish)
{
    double score = 50.0;  // Base score
    
    // Criterion 1: Body size (>40% of range) +20 points
    double body = GetBodySize(0);
    double range = GetCandleRange(0);
    if(range > 0 && body / range > 0.4)
        score += 20.0;
    
    // Criterion 2: Volume above average +20 points
    double avg_volume = (m_volume[1] + m_volume[2] + m_volume[3]) / 3.0;
    if(m_volume[0] > avg_volume)
        score += 20.0;
    
    // Criterion 3: Pattern-specific quality +10 points
    // (Already validated by detection, so add bonus)
    score += 10.0;
    
    return MathMin(100.0, score);
}

//+------------------------------------------------------------------+
//| Helper: Get body size                                             |
//+------------------------------------------------------------------+
double CCandlePatternQualityGate::GetBodySize(int index)
{
    return MathAbs(m_close[index] - m_open[index]);
}

//+------------------------------------------------------------------+
//| Helper: Get upper wick                                            |
//+------------------------------------------------------------------+
double CCandlePatternQualityGate::GetUpperWick(int index)
{
    return m_high[index] - MathMax(m_open[index], m_close[index]);
}

//+------------------------------------------------------------------+
//| Helper: Get lower wick                                            |
//+------------------------------------------------------------------+
double CCandlePatternQualityGate::GetLowerWick(int index)
{
    return MathMin(m_open[index], m_close[index]) - m_low[index];
}

//+------------------------------------------------------------------+
//| Helper: Get candle range                                          |
//+------------------------------------------------------------------+
double CCandlePatternQualityGate::GetCandleRange(int index)
{
    return m_high[index] - m_low[index];
}

//+------------------------------------------------------------------+
//| Helper: Check if bullish                                          |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::IsBullish(int index)
{
    return m_close[index] > m_open[index];
}

//+------------------------------------------------------------------+
//| Helper: Check if bearish                                          |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::IsBearish(int index)
{
    return m_close[index] < m_open[index];
}

//+------------------------------------------------------------------+
//| Check if quality pattern                                          |
//+------------------------------------------------------------------+
bool CCandlePatternQualityGate::IsQualityPattern(bool bullish)
{
    if(m_pattern_score < 60) return false;
    
    if(bullish)
    {
        return (m_pattern_name == "Hammer" || 
                m_pattern_name == "Bullish Engulfing" ||
                m_pattern_name == "Morning Star" ||
                m_pattern_name == "Piercing Line");
    }
    else
    {
        return (m_pattern_name == "Shooting Star" ||
                m_pattern_name == "Bearish Engulfing" ||
                m_pattern_name == "Evening Star" ||
                m_pattern_name == "Dark Cloud Cover");
    }
}
//+------------------------------------------------------------------+
