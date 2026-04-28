//+------------------------------------------------------------------+
//|                            KriegerOverextensionFilter.mqh        |
//|                   Layer 3: Krieger Overextension Detection       |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CKriegerOverextensionFilter
{
private:
    string m_symbol;
    ENUM_TIMEFRAMES m_timeframe;
    double m_overextension_score;
    
    // Indicator handles
    int m_bb_handle;        // Bollinger Bands
    int m_stoch_handle;     // Stochastic
    int m_keltner_ema;      // Keltner EMA
    int m_atr_handle;       // ATR for Keltner
    
    // Current values
    double m_bb_upper;
    double m_bb_middle;
    double m_bb_lower;
    double m_stoch_main;
    double m_stoch_signal;
    bool m_is_squeeze;
    
    void CalculateBollingerPosition();
    void CalculateStochasticLevel();
    bool DetectKeltnerSqueeze();
    
public:
    CKriegerOverextensionFilter();
    ~CKriegerOverextensionFilter();
    
    bool Initialize(string symbol, ENUM_TIMEFRAMES timeframe);
    void Update();
    double GetOverextensionScore() { return m_overextension_score; }
    bool IsOverextendedUp();
    bool IsOverextendedDown();
    bool IsInSqueeze() { return m_is_squeeze; }
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CKriegerOverextensionFilter::CKriegerOverextensionFilter()
{
    m_symbol = "";
    m_timeframe = PERIOD_M5;
    m_overextension_score = 50;
    
    m_bb_handle = INVALID_HANDLE;
    m_stoch_handle = INVALID_HANDLE;
    m_keltner_ema = INVALID_HANDLE;
    m_atr_handle = INVALID_HANDLE;
    
    m_bb_upper = 0;
    m_bb_middle = 0;
    m_bb_lower = 0;
    m_stoch_main = 50;
    m_stoch_signal = 50;
    m_is_squeeze = false;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CKriegerOverextensionFilter::~CKriegerOverextensionFilter()
{
    if(m_bb_handle != INVALID_HANDLE) IndicatorRelease(m_bb_handle);
    if(m_stoch_handle != INVALID_HANDLE) IndicatorRelease(m_stoch_handle);
    if(m_keltner_ema != INVALID_HANDLE) IndicatorRelease(m_keltner_ema);
    if(m_atr_handle != INVALID_HANDLE) IndicatorRelease(m_atr_handle);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CKriegerOverextensionFilter::Initialize(string symbol, ENUM_TIMEFRAMES timeframe)
{
    m_symbol = symbol;
    m_timeframe = timeframe;
    
    // Create Bollinger Bands (20, 2.0)
    m_bb_handle = iBands(m_symbol, m_timeframe, 20, 0, 2.0, PRICE_CLOSE);
    
    // Create Stochastic (14, 3, 3)
    m_stoch_handle = iStochastic(m_symbol, m_timeframe, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
    
    // Create EMA for Keltner Channels (20)
    m_keltner_ema = iMA(m_symbol, m_timeframe, 20, 0, MODE_EMA, PRICE_CLOSE);
    
    // Create ATR for Keltner Channels (20)
    m_atr_handle = iATR(m_symbol, m_timeframe, 20);
    
    // Validate handles
    if(m_bb_handle == INVALID_HANDLE || m_stoch_handle == INVALID_HANDLE ||
       m_keltner_ema == INVALID_HANDLE || m_atr_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create indicators for Krieger Overextension Filter");
        return false;
    }
    
    Print("Krieger Overextension Filter initialized for ", m_symbol, " on ", EnumToString(m_timeframe));
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CKriegerOverextensionFilter::Update()
{
    // Get Bollinger Bands values
    double bb_upper[], bb_middle[], bb_lower[];
    ArraySetAsSeries(bb_upper, true);
    ArraySetAsSeries(bb_middle, true);
    ArraySetAsSeries(bb_lower, true);
    
    if(CopyBuffer(m_bb_handle, 1, 0, 1, bb_upper) > 0 &&
       CopyBuffer(m_bb_handle, 0, 0, 1, bb_middle) > 0 &&
       CopyBuffer(m_bb_handle, 2, 0, 1, bb_lower) > 0)
    {
        m_bb_upper = bb_upper[0];
        m_bb_middle = bb_middle[0];
        m_bb_lower = bb_lower[0];
    }
    
    // Get Stochastic values
    double stoch_main[], stoch_signal[];
    ArraySetAsSeries(stoch_main, true);
    ArraySetAsSeries(stoch_signal, true);
    
    if(CopyBuffer(m_stoch_handle, 0, 0, 1, stoch_main) > 0 &&
       CopyBuffer(m_stoch_handle, 1, 0, 1, stoch_signal) > 0)
    {
        m_stoch_main = stoch_main[0];
        m_stoch_signal = stoch_signal[0];
    }
    
    // Calculate Bollinger position
    CalculateBollingerPosition();
    
    // Calculate Stochastic level
    CalculateStochasticLevel();
    
    // Detect Keltner squeeze
    m_is_squeeze = DetectKeltnerSqueeze();
}

//+------------------------------------------------------------------+
//| Calculate Bollinger position                                      |
//+------------------------------------------------------------------+
void CKriegerOverextensionFilter::CalculateBollingerPosition()
{
    double current_price = SymbolInfoDouble(m_symbol, SYMBOL_BID);
    
    // Calculate position within Bollinger Bands (0 to 1)
    double bb_range = m_bb_upper - m_bb_lower;
    double bb_position = 0.5;
    
    if(bb_range > 0)
    {
        bb_position = (current_price - m_bb_lower) / bb_range;
        bb_position = MathMax(0, MathMin(1.0, bb_position));
    }
    
    // Calculate overextension score
    // bb_position > 0.95 = overextended up
    // bb_position < 0.05 = overextended down
    
    double bb_score = bb_position * 100.0;
    double stoch_score = m_stoch_main;
    
    // Combine BB position (50% weight) and Stochastic (50% weight)
    m_overextension_score = (bb_score * 0.5) + (stoch_score * 0.5);
    
    // Add squeeze bonus
    if(m_is_squeeze)
        m_overextension_score += 20.0;
    
    // Clamp to 0-100
    m_overextension_score = MathMax(0, MathMin(100, m_overextension_score));
}

//+------------------------------------------------------------------+
//| Calculate Stochastic level                                        |
//+------------------------------------------------------------------+
void CKriegerOverextensionFilter::CalculateStochasticLevel()
{
    // Stochastic already stored in m_stoch_main
    // Values: 0-100
    // >80 = overbought
    // <20 = oversold
}

//+------------------------------------------------------------------+
//| Detect Keltner squeeze                                            |
//+------------------------------------------------------------------+
bool CKriegerOverextensionFilter::DetectKeltnerSqueeze()
{
    // Keltner Channels = EMA(20) ± (2.0 * ATR(20))
    // Squeeze occurs when Bollinger Bands are inside Keltner Channels
    
    double ema[], atr[];
    ArraySetAsSeries(ema, true);
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_keltner_ema, 0, 0, 1, ema) < 1) return false;
    if(CopyBuffer(m_atr_handle, 0, 0, 1, atr) < 1) return false;
    
    double keltner_upper = ema[0] + (2.0 * atr[0]);
    double keltner_lower = ema[0] - (2.0 * atr[0]);
    
    // Squeeze: BB inside Keltner
    bool squeeze = (m_bb_upper < keltner_upper) && (m_bb_lower > keltner_lower);
    
    return squeeze;
}

//+------------------------------------------------------------------+
//| Check if overextended up                                          |
//+------------------------------------------------------------------+
bool CKriegerOverextensionFilter::IsOverextendedUp()
{
    double current_price = SymbolInfoDouble(m_symbol, SYMBOL_BID);
    double bb_range = m_bb_upper - m_bb_lower;
    
    if(bb_range <= 0) return false;
    
    double bb_position = (current_price - m_bb_lower) / bb_range;
    
    // Overextended up: price > 95% of BB range AND Stochastic > 80
    return (bb_position > 0.95 && m_stoch_main > 80);
}

//+------------------------------------------------------------------+
//| Check if overextended down                                        |
//+------------------------------------------------------------------+
bool CKriegerOverextensionFilter::IsOverextendedDown()
{
    double current_price = SymbolInfoDouble(m_symbol, SYMBOL_BID);
    double bb_range = m_bb_upper - m_bb_lower;
    
    if(bb_range <= 0) return false;
    
    double bb_position = (current_price - m_bb_lower) / bb_range;
    
    // Overextended down: price < 5% of BB range AND Stochastic < 20
    return (bb_position < 0.05 && m_stoch_main < 20);
}
//+------------------------------------------------------------------+
