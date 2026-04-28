//+------------------------------------------------------------------+
//|                                     NewsBlackoutFilter.mqh       |
//|                        Layer 1: News Blackout Filter             |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CNewsBlackoutFilter
{
private:
    bool      m_is_blackout;
    datetime  m_next_event_time;
    int       m_minutes_until_event;
    datetime  m_last_check_time;
    int       m_check_interval;  // seconds
    
    bool      CheckEconomicCalendar();
    bool      IsHighImpactEvent(MqlCalendarEvent &event);
    
public:
    CNewsBlackoutFilter();
    ~CNewsBlackoutFilter();
    
    bool      Initialize();
    void      Update();
    bool      IsNewsBlackout() { return m_is_blackout; }
    int       MinutesUntilNextEvent() { return m_minutes_until_event; }
};

CNewsBlackoutFilter::CNewsBlackoutFilter()
{
    m_is_blackout = false;
    m_next_event_time = 0;
    m_minutes_until_event = 999;
    m_last_check_time = 0;
    m_check_interval = 300;  // Check every 5 minutes
}

CNewsBlackoutFilter::~CNewsBlackoutFilter() {}

bool CNewsBlackoutFilter::Initialize()
{
    Print("News Blackout Filter initialized");
    return true;
}

void CNewsBlackoutFilter::Update()
{
    // Only check calendar every 5 minutes to reduce overhead
    if(TimeCurrent() - m_last_check_time < m_check_interval)
        return;
    
    m_last_check_time = TimeCurrent();
    
    // Check economic calendar
    m_is_blackout = CheckEconomicCalendar();
}

//+------------------------------------------------------------------+
//| Check Economic Calendar for high-impact events                   |
//+------------------------------------------------------------------+
bool CNewsBlackoutFilter::CheckEconomicCalendar()
{
    MqlCalendarValue values[];
    
    // Get events for next 60 minutes
    datetime from = TimeCurrent() - 900;  // 15 minutes before
    datetime to = TimeCurrent() + 3600;   // 60 minutes ahead
    
    // Fetch calendar events
    int count = CalendarValueHistory(values, from, to, NULL, NULL);
    
    if(count <= 0)
    {
        m_minutes_until_event = 999;
        return false;  // No events or calendar not available
    }
    
    // Check each event
    for(int i = 0; i < count; i++)
    {
        MqlCalendarEvent event;
        if(!CalendarEventById(values[i].event_id, event))
            continue;
        
        // Check if it's a high-impact event
        if(!IsHighImpactEvent(event))
            continue;
        
        // Get event time
        datetime event_time = values[i].time;
        
        // Calculate time difference in minutes
        int time_diff = (int)((event_time - TimeCurrent()) / 60);
        
        // Create blackout window: 30 minutes before to 15 minutes after
        if(time_diff >= -15 && time_diff <= 30)
        {
            m_minutes_until_event = time_diff;
            
            // Log blackout
            static datetime last_log_time = 0;
            if(TimeCurrent() - last_log_time > 60)  // Log once per minute
            {
                Print("NEWS BLACKOUT ACTIVE: ", event.name, 
                      " | Time until event: ", time_diff, " minutes");
                last_log_time = TimeCurrent();
            }
            
            return true;  // We're in blackout period
        }
        
        // Track next upcoming event
        if(time_diff > 0 && time_diff < m_minutes_until_event)
        {
            m_minutes_until_event = time_diff;
            m_next_event_time = event_time;
        }
    }
    
    return false;  // No blackout
}

//+------------------------------------------------------------------+
//| Check if event is high-impact                                    |
//+------------------------------------------------------------------+
bool CNewsBlackoutFilter::IsHighImpactEvent(MqlCalendarEvent &event)
{
    // Check importance level
    if(event.importance != CALENDAR_IMPORTANCE_HIGH)
        return false;
    
    // Check event type - focus on major market-moving events
    string event_name = event.name;
    
    // Interest rate decisions
    if(StringFind(event_name, "Interest Rate") >= 0 ||
       StringFind(event_name, "Rate Decision") >= 0 ||
       StringFind(event_name, "Monetary Policy") >= 0)
        return true;
    
    // Employment data
    if(StringFind(event_name, "Non-Farm") >= 0 ||
       StringFind(event_name, "NFP") >= 0 ||
       StringFind(event_name, "Employment") >= 0 ||
       StringFind(event_name, "Unemployment") >= 0 ||
       StringFind(event_name, "Payrolls") >= 0)
        return true;
    
    // Inflation data
    if(StringFind(event_name, "CPI") >= 0 ||
       StringFind(event_name, "Consumer Price") >= 0 ||
       StringFind(event_name, "Inflation") >= 0 ||
       StringFind(event_name, "PPI") >= 0 ||
       StringFind(event_name, "Producer Price") >= 0)
        return true;
    
    // GDP
    if(StringFind(event_name, "GDP") >= 0 ||
       StringFind(event_name, "Gross Domestic") >= 0)
        return true;
    
    // Central bank speeches and minutes
    if(StringFind(event_name, "FOMC") >= 0 ||
       StringFind(event_name, "Fed Chair") >= 0 ||
       StringFind(event_name, "ECB President") >= 0 ||
       StringFind(event_name, "BOE Governor") >= 0 ||
       StringFind(event_name, "Minutes") >= 0)
        return true;
    
    // Retail Sales
    if(StringFind(event_name, "Retail Sales") >= 0)
        return true;
    
    // Trade Balance
    if(StringFind(event_name, "Trade Balance") >= 0)
        return true;
    
    // Manufacturing and Services PMI
    if(StringFind(event_name, "PMI") >= 0 && event.importance == CALENDAR_IMPORTANCE_HIGH)
        return true;
    
    return false;
}
//+------------------------------------------------------------------+
