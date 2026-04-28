//+------------------------------------------------------------------+
//|                     AdaptiveTrailingEngine.mqh                   |
//|                Layer 6: Adaptive Trailing Stop                   |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CAdaptiveTrailingEngine
{
private:
    string m_symbol;
    int m_atr_handle;
    bool m_trailing_active[];
    ulong m_tracked_tickets[];
    int m_tracked_count;
    
    double GetRegimeBasedDistance();
    bool MoveStopLoss(ulong ticket, double new_sl);
    int FindTicketIndex(ulong ticket);
    
public:
    CAdaptiveTrailingEngine();
    ~CAdaptiveTrailingEngine();
    
    bool Initialize(string symbol);
    void UpdateTrailingStops();
    bool ActivateTrailing(ulong ticket);
    double CalculateTrailingDistance();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CAdaptiveTrailingEngine::CAdaptiveTrailingEngine()
{
    m_symbol = "";
    m_atr_handle = INVALID_HANDLE;
    m_tracked_count = 0;
    ArrayResize(m_trailing_active, 0);
    ArrayResize(m_tracked_tickets, 0);
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CAdaptiveTrailingEngine::~CAdaptiveTrailingEngine()
{
    if(m_atr_handle != INVALID_HANDLE)
        IndicatorRelease(m_atr_handle);
    
    ArrayFree(m_trailing_active);
    ArrayFree(m_tracked_tickets);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CAdaptiveTrailingEngine::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Create ATR for trailing distance calculation
    m_atr_handle = iATR(m_symbol, PERIOD_M5, 14);
    
    if(m_atr_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create ATR for Adaptive Trailing Engine");
        return false;
    }
    
    Print("Adaptive Trailing Engine initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Activate trailing for ticket                                      |
//+------------------------------------------------------------------+
bool CAdaptiveTrailingEngine::ActivateTrailing(ulong ticket)
{
    int index = FindTicketIndex(ticket);
    
    if(index >= 0)
    {
        m_trailing_active[index] = true;
        return true;
    }
    
    // Add new ticket
    ArrayResize(m_tracked_tickets, m_tracked_count + 1);
    ArrayResize(m_trailing_active, m_tracked_count + 1);
    
    m_tracked_tickets[m_tracked_count] = ticket;
    m_trailing_active[m_tracked_count] = true;
    m_tracked_count++;
    
    Print("Trailing activated for ticket ", ticket);
    return true;
}

//+------------------------------------------------------------------+
//| Find ticket index                                                 |
//+------------------------------------------------------------------+
int CAdaptiveTrailingEngine::FindTicketIndex(ulong ticket)
{
    for(int i = 0; i < m_tracked_count; i++)
    {
        if(m_tracked_tickets[i] == ticket)
            return i;
    }
    return -1;
}

//+------------------------------------------------------------------+
//| Update trailing stops                                             |
//+------------------------------------------------------------------+
void CAdaptiveTrailingEngine::UpdateTrailingStops()
{
    double trailing_distance = CalculateTrailingDistance();
    
    for(int i = m_tracked_count - 1; i >= 0; i--)
    {
        if(!m_trailing_active[i])
            continue;
        
        ulong ticket = m_tracked_tickets[i];
        
        // Check if position still exists
        if(!PositionSelectByTicket(ticket))
        {
            // Remove from tracking
            for(int j = i; j < m_tracked_count - 1; j++)
            {
                m_tracked_tickets[j] = m_tracked_tickets[j + 1];
                m_trailing_active[j] = m_trailing_active[j + 1];
            }
            m_tracked_count--;
            ArrayResize(m_tracked_tickets, m_tracked_count);
            ArrayResize(m_trailing_active, m_tracked_count);
            continue;
        }
        
        // Get position info
        double current_price = PositionGetDouble(POSITION_PRICE_CURRENT);
        double current_sl = PositionGetDouble(POSITION_SL);
        double entry_price = PositionGetDouble(POSITION_PRICE_OPEN);
        bool is_buy = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
        
        // Calculate R-multiple for break-even logic
        double risk = MathAbs(entry_price - current_sl);
        double profit = is_buy ? (current_price - entry_price) : (entry_price - current_price);
        double r_multiple = (risk > 0) ? (profit / risk) : 0;
        
        // Move to break-even at 1.0R
        if(r_multiple >= 1.0 && r_multiple < 1.5)
        {
            double point = SymbolInfoDouble(m_symbol, SYMBOL_POINT);
            double be_sl = entry_price + (is_buy ? point : -point);  // Break-even + 1 pip
            
            if(is_buy)
            {
                if(be_sl > current_sl)
                    MoveStopLoss(ticket, be_sl);
            }
            else
            {
                if(be_sl < current_sl || current_sl == 0)
                    MoveStopLoss(ticket, be_sl);
            }
            
            continue;
        }
        
        // Calculate new trailing stop
        double new_sl = 0;
        
        if(is_buy)
        {
            new_sl = current_price - trailing_distance;
            
            // Only move stop in favorable direction
            if(new_sl > current_sl)
                MoveStopLoss(ticket, new_sl);
        }
        else
        {
            new_sl = current_price + trailing_distance;
            
            // Only move stop in favorable direction
            if(new_sl < current_sl || current_sl == 0)
                MoveStopLoss(ticket, new_sl);
        }
    }
}

//+------------------------------------------------------------------+
//| Calculate trailing distance                                       |
//+------------------------------------------------------------------+
double CAdaptiveTrailingEngine::CalculateTrailingDistance()
{
    return GetRegimeBasedDistance();
}

//+------------------------------------------------------------------+
//| Get regime-based trailing distance                                |
//+------------------------------------------------------------------+
double CAdaptiveTrailingEngine::GetRegimeBasedDistance()
{
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 50, atr) < 50)
        return 0;
    
    // Calculate ATR ratio to determine regime
    double sum = 0;
    for(int i = 0; i < 50; i++)
        sum += atr[i];
    
    double avg_atr = sum / 50.0;
    double atr_ratio = atr[0] / avg_atr;
    
    // Regime-based multipliers:
    // QUIET (<0.5): 0.5 ATR
    // NORMAL (0.5-1.5): 0.8 ATR
    // VOLATILE (1.5-2.5): 1.2 ATR
    // EXTREME (>2.5): 1.5 ATR
    
    double multiplier = 0.8;  // Default (NORMAL)
    
    if(atr_ratio < 0.5)
        multiplier = 0.5;
    else if(atr_ratio > 2.5)
        multiplier = 1.5;
    else if(atr_ratio > 1.5)
        multiplier = 1.2;
    
    return atr[0] * multiplier;
}

//+------------------------------------------------------------------+
//| Move stop loss                                                    |
//+------------------------------------------------------------------+
bool CAdaptiveTrailingEngine::MoveStopLoss(ulong ticket, double new_sl)
{
    if(!PositionSelectByTicket(ticket))
        return false;
    
    double current_sl = PositionGetDouble(POSITION_SL);
    double current_tp = PositionGetDouble(POSITION_TP);
    
    // Check if change is significant (at least 1 pip)
    double point = SymbolInfoDouble(m_symbol, SYMBOL_POINT);
    if(MathAbs(new_sl - current_sl) < point)
        return false;
    
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_SLTP;
    request.symbol = m_symbol;
    request.position = ticket;
    request.sl = new_sl;
    request.tp = current_tp;
    request.magic = 123456;
    
    if(!OrderSend(request, result))
    {
        Print("Modify SL error: ", GetLastError());
        return false;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE)
    {
        Print("Trailing stop moved for ticket ", ticket, " to ", new_sl);
        return true;
    }
    
    return false;
}
//+------------------------------------------------------------------+
