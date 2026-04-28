//+------------------------------------------------------------------+
//|                                    SessionQualityFilter.mqh      |
//|                        Layer 1: Session Quality Filter           |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

#include "../Common/DataStructures.mqh"
#include "../Common/Utils.mqh"

// Pair-specific golden hours (GMT)
struct SGoldenHours
{
    int start1, end1;
    int start2, end2;
};

class CSessionQualityFilter
{
private:
    string          m_symbol;
    ESessionTier    m_current_tier;
    double          m_quality_score;
    
    SGoldenHours GetGoldenHours(string symbol);
    bool IsInGoldenHours(int current_hour, const SGoldenHours &hours);
    bool IsSessionOverlap(int current_hour);
    
public:
    CSessionQualityFilter();
    ~CSessionQualityFilter();
    
    bool            Initialize(string symbol);
    void            Update();
    ESessionTier    GetCurrentTier() { return m_current_tier; }
    double          GetQualityScore() { return m_quality_score; }
    bool            IsTradeableSession();
};

CSessionQualityFilter::CSessionQualityFilter()
{
    m_symbol = "";
    m_current_tier = TIER_1_GOLDEN;
    m_quality_score = 100.0;
}

CSessionQualityFilter::~CSessionQualityFilter() {}

bool CSessionQualityFilter::Initialize(string symbol)
{
    m_symbol = symbol;
    Print("Session Quality Filter initialized for ", m_symbol);
    return true;
}

void CSessionQualityFilter::Update()
{
    int current_hour = GetGMTHour(0);
    SGoldenHours hours = GetGoldenHours(m_symbol);
    
    // Check if we're in a dead zone first (17:00-22:00 GMT)
    if(current_hour >= 17 && current_hour < 22)
    {
        m_current_tier = TIER_4_AVOID;
        m_quality_score = 0.0;
        return;
    }
    
    // Check for golden hours + session overlap (Tier 1)
    if(IsInGoldenHours(current_hour, hours) && IsSessionOverlap(current_hour))
    {
        m_current_tier = TIER_1_GOLDEN;
        m_quality_score = 100.0;
        return;
    }
    
    // Check for golden hours without overlap (Tier 2)
    if(IsInGoldenHours(current_hour, hours))
    {
        m_current_tier = TIER_2_GOOD;
        m_quality_score = 75.0;
        return;
    }
    
    // Check for major session without golden hours (Tier 2)
    // London: 07:00-17:00, NY: 13:00-22:00, Tokyo: 00:00-09:00
    if((current_hour >= 7 && current_hour < 17) ||   // London
       (current_hour >= 13 && current_hour < 22) ||  // NY
       (current_hour >= 0 && current_hour < 9))      // Tokyo
    {
        m_current_tier = TIER_2_GOOD;
        m_quality_score = 75.0;
        return;
    }
    
    // Everything else is Tier 3 (acceptable but not ideal)
    m_current_tier = TIER_3_ACCEPTABLE;
    m_quality_score = 50.0;
}

bool CSessionQualityFilter::IsTradeableSession()
{
    return (m_current_tier != TIER_4_AVOID);
}

//+------------------------------------------------------------------+
//| Get golden hours for specific pair                               |
//+------------------------------------------------------------------+
SGoldenHours CSessionQualityFilter::GetGoldenHours(string symbol)
{
    SGoldenHours hours;
    
    // Default values
    hours.start1 = 7;
    hours.end1 = 11;
    hours.start2 = 13;
    hours.end2 = 17;
    
    // Pair-specific golden hours (GMT)
    if(symbol == "EURUSD" || symbol == "GBPUSD")
    {
        hours.start1 = 7;
        hours.end1 = 11;
        hours.start2 = 13;
        hours.end2 = 17;
    }
    else if(symbol == "USDJPY")
    {
        hours.start1 = 0;
        hours.end1 = 3;
        hours.start2 = 13;
        hours.end2 = 17;
    }
    else if(symbol == "AUDUSD" || symbol == "NZDUSD")
    {
        hours.start1 = 22;
        hours.end1 = 2;   // Crosses midnight
        hours.start2 = 7;
        hours.end2 = 9;
    }
    else if(symbol == "EURJPY" || symbol == "GBPJPY")
    {
        hours.start1 = 0;
        hours.end1 = 3;
        hours.start2 = 7;
        hours.end2 = 11;
    }
    else if(symbol == "AUDJPY")
    {
        hours.start1 = 0;
        hours.end1 = 3;
        hours.start2 = 22;
        hours.end2 = 2;   // Crosses midnight
    }
    else if(symbol == "USDCAD")
    {
        hours.start1 = 13;
        hours.end1 = 17;
        hours.start2 = 18;
        hours.end2 = 21;
    }
    else if(symbol == "EURGBP")
    {
        hours.start1 = 7;
        hours.end1 = 11;
        hours.start2 = 12;
        hours.end2 = 16;
    }
    
    return hours;
}

//+------------------------------------------------------------------+
//| Check if current hour is in golden hours                         |
//+------------------------------------------------------------------+
bool CSessionQualityFilter::IsInGoldenHours(int current_hour, const SGoldenHours &hours)
{
    // Check first golden hour range
    bool in_range1 = false;
    if(hours.start1 <= hours.end1)
    {
        in_range1 = (current_hour >= hours.start1 && current_hour < hours.end1);
    }
    else  // Range crosses midnight
    {
        in_range1 = (current_hour >= hours.start1 || current_hour < hours.end1);
    }
    
    // Check second golden hour range
    bool in_range2 = false;
    if(hours.start2 <= hours.end2)
    {
        in_range2 = (current_hour >= hours.start2 && current_hour < hours.end2);
    }
    else  // Range crosses midnight
    {
        in_range2 = (current_hour >= hours.start2 || current_hour < hours.end2);
    }
    
    return (in_range1 || in_range2);
}

//+------------------------------------------------------------------+
//| Check if current hour is in session overlap                      |
//+------------------------------------------------------------------+
bool CSessionQualityFilter::IsSessionOverlap(int current_hour)
{
    // London-NY overlap: 13:00-17:00 GMT
    if(current_hour >= 13 && current_hour < 17)
        return true;
    
    // Tokyo-London overlap: 07:00-09:00 GMT
    if(current_hour >= 7 && current_hour < 9)
        return true;
    
    // Sydney-Tokyo overlap: 00:00-02:00 GMT
    if(current_hour >= 0 && current_hour < 2)
        return true;
    
    return false;
}
//+------------------------------------------------------------------+
