//+------------------------------------------------------------------+
//|                      EmergencyExitSystem.mqh                     |
//|                Layer 6: Emergency Exit Logic                     |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CEmergencyExitSystem
{
private:
    double m_daily_start_equity;
    double m_weekly_start_equity;
    datetime m_last_daily_reset;
    datetime m_last_weekly_reset;
    bool m_trading_paused;
    datetime m_pause_until;
    
    bool CheckDailyLossLimit();
    bool CheckWeeklyLossLimit();
    bool CheckPriceSpike();
    bool CheckCorrelationRisk();
    void LogEmergencyExit(string reason);
    
public:
    CEmergencyExitSystem();
    ~CEmergencyExitSystem();
    
    bool Initialize();
    void Update();
    bool ShouldEmergencyExit();
    bool ShouldPauseTrading();
    void CloseAllTrades(string reason);
    void ResetDailyTracking();
    void ResetWeeklyTracking();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CEmergencyExitSystem::CEmergencyExitSystem()
{
    m_daily_start_equity = 0;
    m_weekly_start_equity = 0;
    m_last_daily_reset = 0;
    m_last_weekly_reset = 0;
    m_trading_paused = false;
    m_pause_until = 0;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CEmergencyExitSystem::~CEmergencyExitSystem()
{
    // No resources to release
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CEmergencyExitSystem::Initialize()
{
    m_daily_start_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    m_weekly_start_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    m_last_daily_reset = TimeCurrent();
    m_last_weekly_reset = TimeCurrent();
    
    Print("Emergency Exit System initialized");
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CEmergencyExitSystem::Update()
{
    // Check if need to reset daily tracking
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    
    MqlDateTime last_dt;
    TimeToStruct(m_last_daily_reset, last_dt);
    
    // Reset at 00:00 GMT
    if(dt.day != last_dt.day)
    {
        ResetDailyTracking();
    }
    
    // Reset weekly at Monday 00:00 GMT
    if(dt.day_of_week == 1 && last_dt.day_of_week != 1)
    {
        ResetWeeklyTracking();
    }
    
    // Check if pause expired
    if(m_trading_paused && TimeCurrent() >= m_pause_until)
    {
        m_trading_paused = false;
        Print("Trading pause expired, resuming normal operations");
    }
}

//+------------------------------------------------------------------+
//| Reset daily tracking                                              |
//+------------------------------------------------------------------+
void CEmergencyExitSystem::ResetDailyTracking()
{
    m_daily_start_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    m_last_daily_reset = TimeCurrent();
    Print("Daily tracking reset. Starting equity: ", m_daily_start_equity);
}

//+------------------------------------------------------------------+
//| Reset weekly tracking                                             |
//+------------------------------------------------------------------+
void CEmergencyExitSystem::ResetWeeklyTracking()
{
    m_weekly_start_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    m_last_weekly_reset = TimeCurrent();
    Print("Weekly tracking reset. Starting equity: ", m_weekly_start_equity);
}

//+------------------------------------------------------------------+
//| Check if should emergency exit                                    |
//+------------------------------------------------------------------+
bool CEmergencyExitSystem::ShouldEmergencyExit()
{
    // Check daily loss limit
    if(CheckDailyLossLimit())
    {
        CloseAllTrades("Daily loss limit exceeded (2%)");
        m_trading_paused = true;
        
        // Pause until next day
        MqlDateTime dt;
        TimeToStruct(TimeCurrent(), dt);
        dt.hour = 0;
        dt.min = 0;
        dt.sec = 0;
        m_pause_until = StructToTime(dt) + 86400;  // Next day 00:00
        
        return true;
    }
    
    // Check weekly loss limit
    if(CheckWeeklyLossLimit())
    {
        CloseAllTrades("Weekly loss limit exceeded (5%)");
        m_trading_paused = true;
        
        // Pause until next Monday
        MqlDateTime dt;
        TimeToStruct(TimeCurrent(), dt);
        int days_until_monday = (8 - dt.day_of_week) % 7;
        if(days_until_monday == 0) days_until_monday = 7;
        
        m_pause_until = TimeCurrent() + (days_until_monday * 86400);
        
        return true;
    }
    
    // Check price spike
    if(CheckPriceSpike())
    {
        CloseAllTrades("Extreme price spike detected");
        m_trading_paused = true;
        m_pause_until = TimeCurrent() + 3600;  // Pause for 1 hour
        
        return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Check if should pause trading                                     |
//+------------------------------------------------------------------+
bool CEmergencyExitSystem::ShouldPauseTrading()
{
    if(m_trading_paused)
        return true;
    
    // Check correlation risk
    if(CheckCorrelationRisk())
    {
        Print("WARNING: High correlation risk detected, pausing new entries");
        return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Check daily loss limit                                            |
//+------------------------------------------------------------------+
bool CEmergencyExitSystem::CheckDailyLossLimit()
{
    double current_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double daily_loss = m_daily_start_equity - current_equity;
    double daily_loss_percent = (daily_loss / m_daily_start_equity) * 100.0;
    
    if(daily_loss_percent > 2.0)
    {
        Print("ALERT: Daily loss limit exceeded: ", daily_loss_percent, "%");
        return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Check weekly loss limit                                           |
//+------------------------------------------------------------------+
bool CEmergencyExitSystem::CheckWeeklyLossLimit()
{
    double current_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double weekly_loss = m_weekly_start_equity - current_equity;
    double weekly_loss_percent = (weekly_loss / m_weekly_start_equity) * 100.0;
    
    if(weekly_loss_percent > 5.0)
    {
        Print("ALERT: Weekly loss limit exceeded: ", weekly_loss_percent, "%");
        return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Check price spike                                                 |
//+------------------------------------------------------------------+
bool CEmergencyExitSystem::CheckPriceSpike()
{
    // Check all open positions for extreme moves
    for(int i = 0; i < PositionsTotal(); i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket == 0) continue;
        
        string symbol = PositionGetString(POSITION_SYMBOL);
        double entry_price = PositionGetDouble(POSITION_PRICE_OPEN);
        double current_price = PositionGetDouble(POSITION_PRICE_CURRENT);
        bool is_buy = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
        
        // Get ATR for the symbol
        int atr_handle = iATR(symbol, PERIOD_M5, 14);
        if(atr_handle == INVALID_HANDLE) continue;
        
        double atr[];
        ArraySetAsSeries(atr, true);
        
        if(CopyBuffer(atr_handle, 0, 0, 1, atr) < 1)
        {
            IndicatorRelease(atr_handle);
            continue;
        }
        
        // Check if price moved >3 ATR against position in last 5 minutes
        double price_move = is_buy ? (entry_price - current_price) : (current_price - entry_price);
        
        if(price_move > 3.0 * atr[0])
        {
            Print("ALERT: Extreme price spike detected on ", symbol, ": ", price_move / atr[0], " ATR");
            IndicatorRelease(atr_handle);
            return true;
        }
        
        IndicatorRelease(atr_handle);
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Check correlation risk                                            |
//+------------------------------------------------------------------+
bool CEmergencyExitSystem::CheckCorrelationRisk()
{
    // Count positions by direction for correlated pairs
    int eurusd_long = 0, eurusd_short = 0;
    int gbpusd_long = 0, gbpusd_short = 0;
    int audusd_long = 0, audusd_short = 0;
    int nzdusd_long = 0, nzdusd_short = 0;
    
    for(int i = 0; i < PositionsTotal(); i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket == 0) continue;
        
        string symbol = PositionGetString(POSITION_SYMBOL);
        bool is_buy = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
        
        if(symbol == "EURUSD")
        {
            if(is_buy) eurusd_long++; else eurusd_short++;
        }
        else if(symbol == "GBPUSD")
        {
            if(is_buy) gbpusd_long++; else gbpusd_short++;
        }
        else if(symbol == "AUDUSD")
        {
            if(is_buy) audusd_long++; else audusd_short++;
        }
        else if(symbol == "NZDUSD")
        {
            if(is_buy) nzdusd_long++; else nzdusd_short++;
        }
    }
    
    // Check if more than 4 correlated pairs in same direction
    int total_usd_long = eurusd_long + gbpusd_long + audusd_long + nzdusd_long;
    int total_usd_short = eurusd_short + gbpusd_short + audusd_short + nzdusd_short;
    
    if(total_usd_long > 4 || total_usd_short > 4)
    {
        Print("WARNING: Correlation risk - too many USD pairs in same direction");
        return true;
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| Close all trades                                                  |
//+------------------------------------------------------------------+
void CEmergencyExitSystem::CloseAllTrades(string reason)
{
    Print("EMERGENCY EXIT: ", reason);
    LogEmergencyExit(reason);
    
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket == 0) continue;
        
        string symbol = PositionGetString(POSITION_SYMBOL);
        double volume = PositionGetDouble(POSITION_VOLUME);
        ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
        
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_DEAL;
        request.symbol = symbol;
        request.volume = volume;
        request.type = (type == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
        request.position = ticket;
        request.price = (request.type == ORDER_TYPE_SELL) ? 
                        SymbolInfoDouble(symbol, SYMBOL_BID) : 
                        SymbolInfoDouble(symbol, SYMBOL_ASK);
        request.deviation = 20;
        request.magic = 123456;
        request.comment = "Emergency Exit";
        
        if(!OrderSend(request, result))
        {
            Print("Failed to close position ", ticket, ": Error ", GetLastError());
        }
        else if(result.retcode != TRADE_RETCODE_DONE)
        {
            Print("Failed to close position ", ticket, ": Retcode ", result.retcode);
        }
    }
    
    Print("All trades closed due to emergency exit");
}

//+------------------------------------------------------------------+
//| Log emergency exit                                                |
//+------------------------------------------------------------------+
void CEmergencyExitSystem::LogEmergencyExit(string reason)
{
    // Log to file
    int file_handle = FileOpen("BCS_EmergencyExits.csv", FILE_WRITE|FILE_READ|FILE_CSV|FILE_ANSI, ',');
    
    if(file_handle != INVALID_HANDLE)
    {
        FileSeek(file_handle, 0, SEEK_END);
        
        FileWrite(file_handle, 
                  TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
                  reason,
                  AccountInfoDouble(ACCOUNT_EQUITY),
                  AccountInfoDouble(ACCOUNT_BALANCE));
        
        FileClose(file_handle);
    }
}
//+------------------------------------------------------------------+
