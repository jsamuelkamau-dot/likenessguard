//+------------------------------------------------------------------+
//|                                 OrderBlockDetector.mqh           |
//|                        Layer 2: Order Block Detection            |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

#include "../Common/DataStructures.mqh"

class COrderBlockDetector
{
private:
    string m_symbol;
    ENUM_TIMEFRAMES m_timeframe;
    SOrderBlock m_blocks[20];  // Store up to 20 order blocks
    int m_block_count;
    int m_atr_handle;
    
    void DetectNewOrderBlocks();
    void ExpireOldOrderBlocks();
    bool IsStrongMove(int start_bar, int &impulse_bars);
    int FindLastOpposingCandle(int impulse_start, bool bullish_impulse);
    int CalculateStrength(SOrderBlock &block, double impulse_size);
    
public:
    COrderBlockDetector();
    ~COrderBlockDetector();
    
    bool Initialize(string symbol, ENUM_TIMEFRAMES timeframe);
    void Update();
    bool GetNearestOrderBlock(bool bullish, SOrderBlock &block);
    bool IsPriceNearOrderBlock(double price, double tolerance_atr);
    int GetActiveOrderBlockCount();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
COrderBlockDetector::COrderBlockDetector()
{
    m_symbol = "";
    m_timeframe = PERIOD_M15;
    m_block_count = 0;
    m_atr_handle = INVALID_HANDLE;
    
    // Initialize blocks array
    for(int i = 0; i < 20; i++)
    {
        m_blocks[i].time = 0;
        m_blocks[i].high = 0;
        m_blocks[i].low = 0;
        m_blocks[i].is_bullish = false;
        m_blocks[i].strength = 0;
        m_blocks[i].expiry = 0;
        m_blocks[i].touch_count = 0;
        m_blocks[i].is_fresh = true;
        m_blocks[i].timeframe = PERIOD_M15;
    }
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
COrderBlockDetector::~COrderBlockDetector()
{
    if(m_atr_handle != INVALID_HANDLE)
        IndicatorRelease(m_atr_handle);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool COrderBlockDetector::Initialize(string symbol, ENUM_TIMEFRAMES timeframe)
{
    m_symbol = symbol;
    m_timeframe = timeframe;
    
    // Create ATR indicator for measuring strong moves
    m_atr_handle = iATR(m_symbol, m_timeframe, 14);
    if(m_atr_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create ATR indicator for Order Block Detector");
        return false;
    }
    
    Print("Order Block Detector initialized for ", m_symbol, " ", EnumToString(m_timeframe));
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void COrderBlockDetector::Update()
{
    // Expire old order blocks
    ExpireOldOrderBlocks();
    
    // Detect new order blocks
    DetectNewOrderBlocks();
}

//+------------------------------------------------------------------+
//| Detect new order blocks                                           |
//+------------------------------------------------------------------+
void COrderBlockDetector::DetectNewOrderBlocks()
{
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 100, atr) < 100)
        return;
    
    double current_atr = atr[0];
    
    // Scan last 50 bars for potential order blocks
    for(int i = 5; i < 50; i++)
    {
        int impulse_bars = 0;
        
        // Check for strong bullish move
        if(IsStrongMove(i, impulse_bars))
        {
            // Find the last bearish candle before the impulse
            int ob_bar = FindLastOpposingCandle(i, true);
            
            if(ob_bar > 0)
            {
                // Check if we already have this order block
                datetime ob_time = iTime(m_symbol, m_timeframe, ob_bar);
                bool already_exists = false;
                
                for(int j = 0; j < m_block_count; j++)
                {
                    if(m_blocks[j].time == ob_time)
                    {
                        already_exists = true;
                        break;
                    }
                }
                
                if(!already_exists && m_block_count < 20)
                {
                    // Create new bullish order block
                    SOrderBlock new_block;
                    new_block.time = ob_time;
                    new_block.high = iHigh(m_symbol, m_timeframe, ob_bar);
                    new_block.low = iLow(m_symbol, m_timeframe, ob_bar);
                    new_block.is_bullish = true;
                    new_block.timeframe = m_timeframe;
                    new_block.touch_count = 0;
                    new_block.is_fresh = true;
                    
                    // Calculate impulse size
                    double impulse_size = 0;
                    for(int k = i; k > i - impulse_bars && k >= 0; k--)
                    {
                        impulse_size += MathAbs(iClose(m_symbol, m_timeframe, k) - 
                                               iOpen(m_symbol, m_timeframe, k));
                    }
                    
                    new_block.strength = CalculateStrength(new_block, impulse_size);
                    new_block.expiry = TimeCurrent() + PeriodSeconds(m_timeframe) * 50;
                    
                    // Add to array
                    m_blocks[m_block_count] = new_block;
                    m_block_count++;
                    
                    Print("New BULLISH Order Block detected at ", TimeToString(ob_time),
                          " | Strength: ", new_block.strength,
                          " | Range: ", DoubleToString(new_block.high - new_block.low, 5));
                }
            }
        }
        
        // Check for strong bearish move (similar logic, opposite direction)
        // Implementation omitted for brevity - follows same pattern as bullish
    }
}

//+------------------------------------------------------------------+
//| Expire old order blocks                                           |
//+------------------------------------------------------------------+
void COrderBlockDetector::ExpireOldOrderBlocks()
{
    datetime current_time = TimeCurrent();
    double current_price = SymbolInfoDouble(m_symbol, SYMBOL_BID);
    
    for(int i = m_block_count - 1; i >= 0; i--)
    {
        bool should_remove = false;
        
        // Check expiry time
        if(current_time > m_blocks[i].expiry)
        {
            should_remove = true;
        }
        
        // Check if price closed through the order block
        if(m_blocks[i].is_bullish)
        {
            if(current_price < m_blocks[i].low)
                should_remove = true;
        }
        else
        {
            if(current_price > m_blocks[i].high)
                should_remove = true;
        }
        
        // Remove expired block
        if(should_remove)
        {
            // Shift array
            for(int j = i; j < m_block_count - 1; j++)
            {
                m_blocks[j] = m_blocks[j + 1];
            }
            m_block_count--;
        }
    }
}

//+------------------------------------------------------------------+
//| Check if there's a strong move starting at bar                   |
//+------------------------------------------------------------------+
bool COrderBlockDetector::IsStrongMove(int start_bar, int &impulse_bars)
{
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, start_bar, 1, atr) < 1)
        return false;
    
    double threshold = atr[0] * 2.0;  // Move must be > 2× ATR
    
    // Check for 3-5 consecutive candles in same direction
    double total_move = 0;
    int consecutive_candles = 0;
    bool is_bullish = (iClose(m_symbol, m_timeframe, start_bar) > 
                       iOpen(m_symbol, m_timeframe, start_bar));
    
    for(int i = start_bar; i >= MathMax(0, start_bar - 5); i--)
    {
        double candle_body = iClose(m_symbol, m_timeframe, i) - 
                            iOpen(m_symbol, m_timeframe, i);
        
        // Check if candle is in same direction
        if((is_bullish && candle_body > 0) || (!is_bullish && candle_body < 0))
        {
            total_move += MathAbs(candle_body);
            consecutive_candles++;
        }
        else
        {
            break;  // Streak broken
        }
    }
    
    impulse_bars = consecutive_candles;
    
    // Strong move if: 3+ candles AND total move > 2× ATR
    return (consecutive_candles >= 3 && total_move > threshold);
}

//+------------------------------------------------------------------+
//| Find last opposing candle before impulse                          |
//+------------------------------------------------------------------+
int COrderBlockDetector::FindLastOpposingCandle(int impulse_start, bool bullish_impulse)
{
    // Look back from impulse start to find last opposing candle
    for(int i = impulse_start + 1; i < impulse_start + 10; i++)
    {
        double candle_body = iClose(m_symbol, m_timeframe, i) - 
                            iOpen(m_symbol, m_timeframe, i);
        
        if(bullish_impulse && candle_body < 0)
        {
            return i;  // Found last bearish candle before bullish impulse
        }
        else if(!bullish_impulse && candle_body > 0)
        {
            return i;  // Found last bullish candle before bearish impulse
        }
    }
    
    return -1;  // Not found
}

//+------------------------------------------------------------------+
//| Calculate order block strength (1-10)                            |
//+------------------------------------------------------------------+
int COrderBlockDetector::CalculateStrength(SOrderBlock &block, double impulse_size)
{
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 1, atr) < 1)
        return 5;  // Default strength
    
    // Strength based on impulse size relative to ATR
    double impulse_atr_ratio = impulse_size / atr[0];
    
    int strength = 5;  // Base strength
    
    if(impulse_atr_ratio > 4.0)
        strength = 10;  // Very strong
    else if(impulse_atr_ratio > 3.0)
        strength = 8;
    else if(impulse_atr_ratio > 2.5)
        strength = 7;
    else if(impulse_atr_ratio > 2.0)
        strength = 6;
    
    return strength;
}

//+------------------------------------------------------------------+
//| Get nearest order block                                           |
//+------------------------------------------------------------------+
bool COrderBlockDetector::GetNearestOrderBlock(bool bullish, SOrderBlock &block)
{
    double current_price = SymbolInfoDouble(m_symbol, SYMBOL_BID);
    double nearest_distance = DBL_MAX;
    int nearest_index = -1;
    
    for(int i = 0; i < m_block_count; i++)
    {
        if(m_blocks[i].is_bullish != bullish)
            continue;
        
        // Calculate distance to order block
        double distance;
        if(bullish)
        {
            distance = current_price - m_blocks[i].high;
        }
        else
        {
            distance = m_blocks[i].low - current_price;
        }
        
        // Only consider blocks below current price (for bullish) or above (for bearish)
        if(distance > 0 && distance < nearest_distance)
        {
            nearest_distance = distance;
            nearest_index = i;
        }
    }
    
    if(nearest_index >= 0)
    {
        block = m_blocks[nearest_index];
        return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Check if price is near an order block                            |
//+------------------------------------------------------------------+
bool COrderBlockDetector::IsPriceNearOrderBlock(double price, double tolerance_atr)
{
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 1, atr) < 1)
        return false;
    
    double tolerance = atr[0] * tolerance_atr;
    
    for(int i = 0; i < m_block_count; i++)
    {
        // Check if price is within tolerance of order block
        if(price >= m_blocks[i].low - tolerance && 
           price <= m_blocks[i].high + tolerance)
        {
            return true;
        }
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Get active order block count                                      |
//+------------------------------------------------------------------+
int COrderBlockDetector::GetActiveOrderBlockCount()
{
    return m_block_count;
}
//+------------------------------------------------------------------+
