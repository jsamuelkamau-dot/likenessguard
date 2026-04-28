//+------------------------------------------------------------------+
//|                              LiquiditySweepDetector.mqh          |
//|                        Layer 2: Liquidity Sweep Detection        |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

#include "../Common/DataStructures.mqh"

class CLiquiditySweepDetector
{
private:
    string m_symbol;
    ENUM_TIMEFRAMES m_timeframe;
    SLiquiditySweep m_recent_sweep;
    
    // Swing point tracking
    struct SSwingPoint
    {
        datetime time;
        double price;
        bool is_high;  // true=swing high, false=swing low
        int bar_index;
    };
    
    SSwingPoint m_swing_points[50];
    int m_swing_count;
    
    void DetectSwings();
    void DetectSweeps();
    bool IsSwingHighLow(int bar_index);
    bool IsSweepConfirmed(double sweep_level, bool swept_high, int sweep_bar);
    
public:
    CLiquiditySweepDetector();
    ~CLiquiditySweepDetector();
    
    bool Initialize(string symbol, ENUM_TIMEFRAMES timeframe);
    void Update();
    bool GetRecentSweep(SLiquiditySweep &sweep);
    bool IsPriceInReversalZone(double price);
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CLiquiditySweepDetector::CLiquiditySweepDetector()
{
    m_symbol = "";
    m_timeframe = PERIOD_M5;
    m_swing_count = 0;
    
    // Initialize recent sweep
    m_recent_sweep.time = 0;
    m_recent_sweep.sweep_level = 0;
    m_recent_sweep.swept_high = false;
    m_recent_sweep.reversal_zone_start = 0;
    m_recent_sweep.reversal_zone_end = 0;
    m_recent_sweep.is_valid = false;
    m_recent_sweep.bars_since_sweep = 0;
    
    // Initialize swing points
    for(int i = 0; i < 50; i++)
    {
        m_swing_points[i].time = 0;
        m_swing_points[i].price = 0;
        m_swing_points[i].is_high = false;
        m_swing_points[i].bar_index = 0;
    }
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CLiquiditySweepDetector::~CLiquiditySweepDetector() {}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CLiquiditySweepDetector::Initialize(string symbol, ENUM_TIMEFRAMES timeframe)
{
    m_symbol = symbol;
    m_timeframe = timeframe;
    
    Print("Liquidity Sweep Detector initialized for ", m_symbol, " ", EnumToString(m_timeframe));
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CLiquiditySweepDetector::Update()
{
    // Update bars since last sweep
    if(m_recent_sweep.is_valid)
    {
        m_recent_sweep.bars_since_sweep++;
        
        // Invalidate sweep after 10 bars
        if(m_recent_sweep.bars_since_sweep > 10)
        {
            m_recent_sweep.is_valid = false;
        }
    }
    
    // Detect swing points
    DetectSwings();
    
    // Detect new sweeps
    DetectSweeps();
}

//+------------------------------------------------------------------+
//| Detect swing highs and lows                                       |
//+------------------------------------------------------------------+
void CLiquiditySweepDetector::DetectSwings()
{
    m_swing_count = 0;
    
    // Scan last 50 bars for swing points
    for(int i = 3; i < 50; i++)
    {
        if(IsSwingHighLow(i))
        {
            double high = iHigh(m_symbol, m_timeframe, i);
            double low = iLow(m_symbol, m_timeframe, i);
            
            // Check for swing high
            bool is_swing_high = (high > iHigh(m_symbol, m_timeframe, i-1) &&
                                 high > iHigh(m_symbol, m_timeframe, i-2) &&
                                 high > iHigh(m_symbol, m_timeframe, i+1) &&
                                 high > iHigh(m_symbol, m_timeframe, i+2));
            
            // Check for swing low
            bool is_swing_low = (low < iLow(m_symbol, m_timeframe, i-1) &&
                                low < iLow(m_symbol, m_timeframe, i-2) &&
                                low < iLow(m_symbol, m_timeframe, i+1) &&
                                low < iLow(m_symbol, m_timeframe, i+2));
            
            if(is_swing_high && m_swing_count < 50)
            {
                m_swing_points[m_swing_count].time = iTime(m_symbol, m_timeframe, i);
                m_swing_points[m_swing_count].price = high;
                m_swing_points[m_swing_count].is_high = true;
                m_swing_points[m_swing_count].bar_index = i;
                m_swing_count++;
            }
            else if(is_swing_low && m_swing_count < 50)
            {
                m_swing_points[m_swing_count].time = iTime(m_symbol, m_timeframe, i);
                m_swing_points[m_swing_count].price = low;
                m_swing_points[m_swing_count].is_high = false;
                m_swing_points[m_swing_count].bar_index = i;
                m_swing_count++;
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Check if bar is a swing point                                     |
//+------------------------------------------------------------------+
bool CLiquiditySweepDetector::IsSwingHighLow(int bar_index)
{
    // Need at least 2 bars on each side
    if(bar_index < 2) return false;
    
    return true;  // Basic check, detailed check in DetectSwings()
}

//+------------------------------------------------------------------+
//| Detect liquidity sweeps                                           |
//+------------------------------------------------------------------+
void CLiquiditySweepDetector::DetectSweeps()
{
    // Check recent bars for sweeps
    for(int i = 1; i < 5; i++)
    {
        double bar_high = iHigh(m_symbol, m_timeframe, i);
        double bar_low = iLow(m_symbol, m_timeframe, i);
        double bar_close = iClose(m_symbol, m_timeframe, i);
        
        // Check each swing point
        for(int j = 0; j < m_swing_count; j++)
        {
            // Skip if swing is too recent (within 3 bars)
            if(m_swing_points[j].bar_index < i + 3)
                continue;
            
            double swing_price = m_swing_points[j].price;
            bool is_swing_high = m_swing_points[j].is_high;
            
            // Check for sweep of swing high
            if(is_swing_high)
            {
                // Price must break above swing high
                if(bar_high > swing_price)
                {
                    double penetration = (bar_high - swing_price) / _Point;
                    
                    // Penetration must be 2-15 pips
                    if(penetration >= 2 && penetration <= 15)
                    {
                        // Check if price closed back below swing high (reversal)
                        if(bar_close < swing_price)
                        {
                            // Confirm sweep
                            if(IsSweepConfirmed(swing_price, true, i))
                            {
                                // Create sweep record
                                m_recent_sweep.time = iTime(m_symbol, m_timeframe, i);
                                m_recent_sweep.sweep_level = swing_price;
                                m_recent_sweep.swept_high = true;
                                m_recent_sweep.reversal_zone_start = swing_price;
                                m_recent_sweep.reversal_zone_end = bar_close;
                                m_recent_sweep.is_valid = true;
                                m_recent_sweep.bars_since_sweep = 0;
                                
                                Print("LIQUIDITY SWEEP DETECTED: High swept at ", 
                                      DoubleToString(swing_price, 5),
                                      " | Reversal zone: ", DoubleToString(m_recent_sweep.reversal_zone_start, 5),
                                      " to ", DoubleToString(m_recent_sweep.reversal_zone_end, 5));
                                
                                return;  // Only track most recent sweep
                            }
                        }
                    }
                }
            }
            // Check for sweep of swing low
            else
            {
                // Price must break below swing low
                if(bar_low < swing_price)
                {
                    double penetration = (swing_price - bar_low) / _Point;
                    
                    // Penetration must be 2-15 pips
                    if(penetration >= 2 && penetration <= 15)
                    {
                        // Check if price closed back above swing low (reversal)
                        if(bar_close > swing_price)
                        {
                            // Confirm sweep
                            if(IsSweepConfirmed(swing_price, false, i))
                            {
                                // Create sweep record
                                m_recent_sweep.time = iTime(m_symbol, m_timeframe, i);
                                m_recent_sweep.sweep_level = swing_price;
                                m_recent_sweep.swept_high = false;
                                m_recent_sweep.reversal_zone_start = swing_price;
                                m_recent_sweep.reversal_zone_end = bar_close;
                                m_recent_sweep.is_valid = true;
                                m_recent_sweep.bars_since_sweep = 0;
                                
                                Print("LIQUIDITY SWEEP DETECTED: Low swept at ", 
                                      DoubleToString(swing_price, 5),
                                      " | Reversal zone: ", DoubleToString(m_recent_sweep.reversal_zone_start, 5),
                                      " to ", DoubleToString(m_recent_sweep.reversal_zone_end, 5));
                                
                                return;  // Only track most recent sweep
                            }
                        }
                    }
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Confirm sweep with additional checks                             |
//+------------------------------------------------------------------+
bool CLiquiditySweepDetector::IsSweepConfirmed(double sweep_level, bool swept_high, int sweep_bar)
{
    // Check that reversal happened within 3 bars
    for(int i = sweep_bar - 1; i >= MathMax(0, sweep_bar - 3); i--)
    {
        double close = iClose(m_symbol, m_timeframe, i);
        
        if(swept_high)
        {
            // For high sweep, price should close back below sweep level
            if(close < sweep_level)
                return true;
        }
        else
        {
            // For low sweep, price should close back above sweep level
            if(close > sweep_level)
                return true;
        }
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Get recent sweep                                                  |
//+------------------------------------------------------------------+
bool CLiquiditySweepDetector::GetRecentSweep(SLiquiditySweep &sweep)
{
    if(m_recent_sweep.is_valid)
    {
        sweep = m_recent_sweep;
        return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Check if price is in reversal zone                               |
//+------------------------------------------------------------------+
bool CLiquiditySweepDetector::IsPriceInReversalZone(double price)
{
    if(!m_recent_sweep.is_valid)
        return false;
    
    double zone_high = MathMax(m_recent_sweep.reversal_zone_start, m_recent_sweep.reversal_zone_end);
    double zone_low = MathMin(m_recent_sweep.reversal_zone_start, m_recent_sweep.reversal_zone_end);
    
    return (price >= zone_low && price <= zone_high);
}
//+------------------------------------------------------------------+
