//+------------------------------------------------------------------+
//|                          MicrostructureCheck.mqh                 |
//|                Layer 4: Execution Quality Validation             |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CMicrostructureCheck
{
private:
    string m_symbol;
    bool m_execution_quality_good;
    
    // Spread tracking
    double m_spread_history[100];
    int m_spread_history_index;
    double m_average_spread;
    double m_current_spread;
    
    // Requote tracking
    bool m_requote_history[10];
    int m_requote_history_index;
    int m_requote_count;
    
    // Tick speed tracking
    datetime m_last_tick_times[10];
    int m_tick_time_index;
    double m_tick_speed;
    
    void UpdateSpreadHistory();
    void UpdateRequoteHistory(bool requote);
    void UpdateTickSpeed();
    
public:
    CMicrostructureCheck();
    ~CMicrostructureCheck();
    
    bool Initialize(string symbol);
    void Update();
    bool IsExecutionQualityGood();
    double GetSpreadRatio();
    double GetRequoteRate();
    int GetTickSpeed() { return (int)m_tick_speed; }
    
    void RecordRequote(bool requote);
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CMicrostructureCheck::CMicrostructureCheck()
{
    m_symbol = "";
    m_execution_quality_good = true;
    
    m_spread_history_index = 0;
    m_average_spread = 0;
    m_current_spread = 0;
    
    m_requote_history_index = 0;
    m_requote_count = 0;
    
    m_tick_time_index = 0;
    m_tick_speed = 10.0;
    
    // Initialize arrays
    ArrayInitialize(m_spread_history, 0);
    ArrayInitialize(m_requote_history, false);
    ArrayInitialize(m_last_tick_times, 0);
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CMicrostructureCheck::~CMicrostructureCheck()
{
    // No resources to release
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CMicrostructureCheck::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Initialize spread history with current spread
    double current_spread = SymbolInfoInteger(m_symbol, SYMBOL_SPREAD) * SymbolInfoDouble(m_symbol, SYMBOL_POINT);
    
    for(int i = 0; i < 100; i++)
    {
        m_spread_history[i] = current_spread;
    }
    
    m_average_spread = current_spread;
    m_current_spread = current_spread;
    
    Print("Microstructure Check initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CMicrostructureCheck::Update()
{
    // Update spread history
    UpdateSpreadHistory();
    
    // Update tick speed
    UpdateTickSpeed();
    
    // Check execution quality
    m_execution_quality_good = IsExecutionQualityGood();
}

//+------------------------------------------------------------------+
//| Update spread history                                             |
//+------------------------------------------------------------------+
void CMicrostructureCheck::UpdateSpreadHistory()
{
    // Get current spread in price units
    int spread_points = (int)SymbolInfoInteger(m_symbol, SYMBOL_SPREAD);
    double point = SymbolInfoDouble(m_symbol, SYMBOL_POINT);
    m_current_spread = spread_points * point;
    
    // Add to history
    m_spread_history[m_spread_history_index] = m_current_spread;
    m_spread_history_index = (m_spread_history_index + 1) % 100;
    
    // Calculate average spread
    double sum = 0;
    for(int i = 0; i < 100; i++)
    {
        sum += m_spread_history[i];
    }
    m_average_spread = sum / 100.0;
}

//+------------------------------------------------------------------+
//| Update requote history                                            |
//+------------------------------------------------------------------+
void CMicrostructureCheck::UpdateRequoteHistory(bool requote)
{
    // Add to history
    m_requote_history[m_requote_history_index] = requote;
    m_requote_history_index = (m_requote_history_index + 1) % 10;
    
    // Count requotes
    m_requote_count = 0;
    for(int i = 0; i < 10; i++)
    {
        if(m_requote_history[i])
            m_requote_count++;
    }
}

//+------------------------------------------------------------------+
//| Update tick speed                                                 |
//+------------------------------------------------------------------+
void CMicrostructureCheck::UpdateTickSpeed()
{
    datetime current_time = TimeCurrent();
    
    // Add current time to history
    m_last_tick_times[m_tick_time_index] = current_time;
    m_tick_time_index = (m_tick_time_index + 1) % 10;
    
    // Calculate ticks per second
    // Find oldest and newest times
    datetime oldest = m_last_tick_times[0];
    datetime newest = m_last_tick_times[0];
    
    for(int i = 1; i < 10; i++)
    {
        if(m_last_tick_times[i] > 0)
        {
            if(m_last_tick_times[i] < oldest || oldest == 0)
                oldest = m_last_tick_times[i];
            if(m_last_tick_times[i] > newest)
                newest = m_last_tick_times[i];
        }
    }
    
    // Calculate tick speed
    int time_diff = (int)(newest - oldest);
    if(time_diff > 0)
    {
        // 10 ticks over time_diff seconds
        m_tick_speed = 10.0 / time_diff;
    }
    else
    {
        m_tick_speed = 10.0;  // Default
    }
}

//+------------------------------------------------------------------+
//| Check if execution quality is good                                |
//+------------------------------------------------------------------+
bool CMicrostructureCheck::IsExecutionQualityGood()
{
    // Check 1: Spread check
    // Reject if current_spread > 2.0 * average_spread
    bool spread_ok = true;
    if(m_average_spread > 0)
    {
        double spread_ratio = m_current_spread / m_average_spread;
        spread_ok = (spread_ratio <= 2.0);
    }
    
    // Check 2: Requote check
    // Reject if requote_rate > 10%
    double requote_rate = (m_requote_count / 10.0) * 100.0;
    bool requote_ok = (requote_rate <= 10.0);
    
    // Check 3: Tick speed check
    // Reject if tick_speed < 1 tick/second (stale prices)
    // Reject if tick_speed > 50 ticks/second (potential spike/error)
    bool tick_speed_ok = (m_tick_speed >= 1.0 && m_tick_speed <= 50.0);
    
    // All checks must pass
    return (spread_ok && requote_ok && tick_speed_ok);
}

//+------------------------------------------------------------------+
//| Get spread ratio                                                  |
//+------------------------------------------------------------------+
double CMicrostructureCheck::GetSpreadRatio()
{
    if(m_average_spread > 0)
        return m_current_spread / m_average_spread;
    
    return 1.0;
}

//+------------------------------------------------------------------+
//| Get requote rate                                                  |
//+------------------------------------------------------------------+
double CMicrostructureCheck::GetRequoteRate()
{
    return (m_requote_count / 10.0) * 100.0;
}

//+------------------------------------------------------------------+
//| Record requote                                                    |
//+------------------------------------------------------------------+
void CMicrostructureCheck::RecordRequote(bool requote)
{
    UpdateRequoteHistory(requote);
}
//+------------------------------------------------------------------+
