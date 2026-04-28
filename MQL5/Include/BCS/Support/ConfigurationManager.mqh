//+------------------------------------------------------------------+
//|                      ConfigurationManager.mqh                    |
//|                Support: Pair-Specific Configuration              |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict
#include "../Common/DataStructures.mqh"

class CConfigurationManager
{
private:
    string m_symbol;
    SPairConfig m_config;
    
    void LoadDefaultConfig();
    void LoadPairSpecificConfig();
    
public:
    CConfigurationManager();
    ~CConfigurationManager();
    
    bool Initialize(string symbol);
    SPairConfig GetConfig() { return m_config; }
    bool ValidateParameters();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CConfigurationManager::CConfigurationManager()
{
    m_symbol = "";
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CConfigurationManager::~CConfigurationManager()
{
    // No resources to release
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CConfigurationManager::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Load default configuration
    LoadDefaultConfig();
    
    // Load pair-specific overrides
    LoadPairSpecificConfig();
    
    // Validate
    if(!ValidateParameters())
    {
        Print("ERROR: Configuration validation failed for ", m_symbol);
        return false;
    }
    
    Print("Configuration Manager initialized for ", m_symbol);
    Print("  Golden Hours: ", m_config.golden_hour_start1, "-", m_config.golden_hour_end1, 
          ", ", m_config.golden_hour_start2, "-", m_config.golden_hour_end2);
    Print("  Max Spread: ", m_config.max_spread_pips, " pips");
    Print("  ATR Multipliers: SL=", m_config.atr_sl_multiplier, ", TP=", m_config.atr_tp_multiplier);
    
    return true;
}

//+------------------------------------------------------------------+
//| Load default configuration                                        |
//+------------------------------------------------------------------+
void CConfigurationManager::LoadDefaultConfig()
{
    // Default values that work across all pairs
    m_config.symbol = m_symbol;
    m_config.golden_hour_start1 = 7;   // 07:00 GMT
    m_config.golden_hour_end1 = 11;    // 11:00 GMT
    m_config.golden_hour_start2 = 13;  // 13:00 GMT
    m_config.golden_hour_end2 = 17;    // 17:00 GMT
    m_config.max_spread_pips = 3.0;
    m_config.atr_sl_multiplier = 1.5;
    m_config.atr_tp_multiplier = 2.5;
    m_config.min_trend_score = 40;
    m_config.min_momentum_score = 60;
    m_config.min_volume_ratio = 2.0;
}

//+------------------------------------------------------------------+
//| Load pair-specific configuration                                  |
//+------------------------------------------------------------------+
void CConfigurationManager::LoadPairSpecificConfig()
{
    // Pair-specific golden hours and parameters
    
    if(m_symbol == "EURUSD" || m_symbol == "GBPUSD")
    {
        // European pairs: London + NY sessions
        m_config.golden_hour_start1 = 7;   // 07:00 GMT (London open)
        m_config.golden_hour_end1 = 11;    // 11:00 GMT
        m_config.golden_hour_start2 = 13;  // 13:00 GMT (NY open)
        m_config.golden_hour_end2 = 17;    // 17:00 GMT
        m_config.max_spread_pips = 2.0;    // Tight spreads
    }
    else if(m_symbol == "USDJPY")
    {
        // Tokyo + NY sessions
        m_config.golden_hour_start1 = 0;   // 00:00 GMT (Tokyo open)
        m_config.golden_hour_end1 = 3;     // 03:00 GMT
        m_config.golden_hour_start2 = 13;  // 13:00 GMT (NY open)
        m_config.golden_hour_end2 = 17;    // 17:00 GMT
        m_config.max_spread_pips = 2.5;
    }
    else if(m_symbol == "AUDUSD" || m_symbol == "NZDUSD")
    {
        // Sydney + London sessions
        m_config.golden_hour_start1 = 22;  // 22:00 GMT (Sydney open)
        m_config.golden_hour_end1 = 2;     // 02:00 GMT
        m_config.golden_hour_start2 = 7;   // 07:00 GMT (London open)
        m_config.golden_hour_end2 = 9;     // 09:00 GMT
        m_config.max_spread_pips = 2.5;
    }
    else if(m_symbol == "EURJPY" || m_symbol == "GBPJPY")
    {
        // Tokyo + London sessions
        m_config.golden_hour_start1 = 0;   // 00:00 GMT (Tokyo open)
        m_config.golden_hour_end1 = 3;     // 03:00 GMT
        m_config.golden_hour_start2 = 7;   // 07:00 GMT (London open)
        m_config.golden_hour_end2 = 11;    // 11:00 GMT
        m_config.max_spread_pips = 3.0;
    }
    else if(m_symbol == "AUDJPY")
    {
        // Tokyo + Sydney sessions
        m_config.golden_hour_start1 = 0;   // 00:00 GMT (Tokyo open)
        m_config.golden_hour_end1 = 3;     // 03:00 GMT
        m_config.golden_hour_start2 = 22;  // 22:00 GMT (Sydney open)
        m_config.golden_hour_end2 = 2;     // 02:00 GMT
        m_config.max_spread_pips = 3.0;
    }
    else if(m_symbol == "USDCAD")
    {
        // NY + Toronto sessions
        m_config.golden_hour_start1 = 13;  // 13:00 GMT (NY open)
        m_config.golden_hour_end1 = 17;    // 17:00 GMT
        m_config.golden_hour_start2 = 18;  // 18:00 GMT
        m_config.golden_hour_end2 = 21;    // 21:00 GMT
        m_config.max_spread_pips = 2.5;
    }
    else if(m_symbol == "EURGBP")
    {
        // London session
        m_config.golden_hour_start1 = 7;   // 07:00 GMT (London open)
        m_config.golden_hour_end1 = 11;    // 11:00 GMT
        m_config.golden_hour_start2 = 12;  // 12:00 GMT
        m_config.golden_hour_end2 = 16;    // 16:00 GMT
        m_config.max_spread_pips = 2.0;
    }
    
    // Adjust ATR multipliers for volatile pairs
    if(m_symbol == "GBPJPY" || m_symbol == "EURJPY" || m_symbol == "AUDJPY")
    {
        m_config.atr_sl_multiplier = 2.0;  // Wider stops for JPY crosses
        m_config.atr_tp_multiplier = 3.0;  // Wider targets
    }
}

//+------------------------------------------------------------------+
//| Validate parameters                                               |
//+------------------------------------------------------------------+
bool CConfigurationManager::ValidateParameters()
{
    // Validate golden hours
    if(m_config.golden_hour_start1 < 0 || m_config.golden_hour_start1 > 23)
    {
        Print("ERROR: Invalid golden_hour_start1: ", m_config.golden_hour_start1);
        return false;
    }
    
    if(m_config.golden_hour_end1 < 0 || m_config.golden_hour_end1 > 23)
    {
        Print("ERROR: Invalid golden_hour_end1: ", m_config.golden_hour_end1);
        return false;
    }
    
    // Validate spread
    if(m_config.max_spread_pips <= 0 || m_config.max_spread_pips > 10)
    {
        Print("ERROR: Invalid max_spread_pips: ", m_config.max_spread_pips);
        return false;
    }
    
    // Validate ATR multipliers
    if(m_config.atr_sl_multiplier < 0.5 || m_config.atr_sl_multiplier > 5.0)
    {
        Print("ERROR: Invalid atr_sl_multiplier: ", m_config.atr_sl_multiplier);
        return false;
    }
    
    if(m_config.atr_tp_multiplier < 0.5 || m_config.atr_tp_multiplier > 10.0)
    {
        Print("ERROR: Invalid atr_tp_multiplier: ", m_config.atr_tp_multiplier);
        return false;
    }
    
    // Validate thresholds
    if(m_config.min_trend_score < 0 || m_config.min_trend_score > 100)
    {
        Print("ERROR: Invalid min_trend_score: ", m_config.min_trend_score);
        return false;
    }
    
    if(m_config.min_momentum_score < 0 || m_config.min_momentum_score > 100)
    {
        Print("ERROR: Invalid min_momentum_score: ", m_config.min_momentum_score);
        return false;
    }
    
    if(m_config.min_volume_ratio < 1.0 || m_config.min_volume_ratio > 5.0)
    {
        Print("ERROR: Invalid min_volume_ratio: ", m_config.min_volume_ratio);
        return false;
    }
    
    return true;
}
//+------------------------------------------------------------------+
