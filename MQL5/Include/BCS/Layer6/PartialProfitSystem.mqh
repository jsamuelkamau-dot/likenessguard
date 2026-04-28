//+------------------------------------------------------------------+
//|                       PartialProfitSystem.mqh                    |
//|                Layer 6: Partial Profit Management                |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict
#include "../Common/DataStructures.mqh"

class CPartialProfitSystem
{
private:
    SPartialProfitState m_trade_states[];
    int m_state_count;
    
    bool TakePartialProfit(ulong ticket, double lots_to_close);
    double CalculateRMultiple(double entry, double current, double sl, bool is_buy);
    int FindTradeState(ulong ticket);
    
public:
    CPartialProfitSystem();
    ~CPartialProfitSystem();
    
    bool Initialize();
    void UpdateActiveTrades();
    bool CheckPartialProfit(SPartialProfitState &trade);
    bool AddTrade(ulong ticket, double entry, double sl, double lots);
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CPartialProfitSystem::CPartialProfitSystem()
{
    m_state_count = 0;
    ArrayResize(m_trade_states, 0);
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CPartialProfitSystem::~CPartialProfitSystem()
{
    ArrayFree(m_trade_states);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CPartialProfitSystem::Initialize()
{
    Print("Partial Profit System initialized");
    return true;
}

//+------------------------------------------------------------------+
//| Add trade to tracking                                             |
//+------------------------------------------------------------------+
bool CPartialProfitSystem::AddTrade(ulong ticket, double entry, double sl, double lots)
{
    // Check if already tracking
    if(FindTradeState(ticket) >= 0)
        return true;
    
    // Add new state
    ArrayResize(m_trade_states, m_state_count + 1);
    
    m_trade_states[m_state_count].ticket = ticket;
    m_trade_states[m_state_count].entry_price = entry;
    m_trade_states[m_state_count].stop_loss = sl;
    m_trade_states[m_state_count].initial_lots = lots;
    m_trade_states[m_state_count].remaining_lots = lots;
    m_trade_states[m_state_count].tp1_taken = false;
    m_trade_states[m_state_count].tp2_taken = false;
    m_trade_states[m_state_count].trailing_active = false;
    
    m_state_count++;
    
    return true;
}

//+------------------------------------------------------------------+
//| Find trade state index                                            |
//+------------------------------------------------------------------+
int CPartialProfitSystem::FindTradeState(ulong ticket)
{
    for(int i = 0; i < m_state_count; i++)
    {
        if(m_trade_states[i].ticket == ticket)
            return i;
    }
    return -1;
}

//+------------------------------------------------------------------+
//| Update active trades                                              |
//+------------------------------------------------------------------+
void CPartialProfitSystem::UpdateActiveTrades()
{
    for(int i = m_state_count - 1; i >= 0; i--)
    {
        ulong ticket = m_trade_states[i].ticket;
        
        // Check if position still exists
        if(!PositionSelectByTicket(ticket))
        {
            // Position closed, remove from tracking
            for(int j = i; j < m_state_count - 1; j++)
            {
                m_trade_states[j] = m_trade_states[j + 1];
            }
            m_state_count--;
            ArrayResize(m_trade_states, m_state_count);
            continue;
        }
        
        // Check partial profit levels
        CheckPartialProfit(m_trade_states[i]);
    }
}

//+------------------------------------------------------------------+
//| Check partial profit                                              |
//+------------------------------------------------------------------+
bool CPartialProfitSystem::CheckPartialProfit(SPartialProfitState &trade)
{
    if(!PositionSelectByTicket(trade.ticket))
        return false;
    
    double current_price = PositionGetDouble(POSITION_PRICE_CURRENT);
    bool is_buy = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
    
    // Calculate R-multiple
    double r_multiple = CalculateRMultiple(trade.entry_price, current_price, trade.stop_loss, is_buy);
    
    // TP1: Close 30% at 0.8R
    if(!trade.tp1_taken && r_multiple >= 0.8)
    {
        double lots_to_close = trade.initial_lots * 0.30;
        
        if(TakePartialProfit(trade.ticket, lots_to_close))
        {
            trade.tp1_taken = true;
            trade.remaining_lots -= lots_to_close;
            Print("TP1 taken at 0.8R for ticket ", trade.ticket, " (closed ", lots_to_close, " lots)");
        }
    }
    
    // TP2: Close 40% of remaining at 1.5R
    if(trade.tp1_taken && !trade.tp2_taken && r_multiple >= 1.5)
    {
        double lots_to_close = trade.remaining_lots * 0.40;
        
        if(TakePartialProfit(trade.ticket, lots_to_close))
        {
            trade.tp2_taken = true;
            trade.remaining_lots -= lots_to_close;
            trade.trailing_active = true;
            Print("TP2 taken at 1.5R for ticket ", trade.ticket, " (closed ", lots_to_close, " lots)");
            Print("Trailing stop activated for remaining ", trade.remaining_lots, " lots");
        }
    }
    
    return true;
}

//+------------------------------------------------------------------+
//| Take partial profit                                               |
//+------------------------------------------------------------------+
bool CPartialProfitSystem::TakePartialProfit(ulong ticket, double lots_to_close)
{
    if(!PositionSelectByTicket(ticket))
        return false;
    
    string symbol = PositionGetString(POSITION_SYMBOL);
    double current_volume = PositionGetDouble(POSITION_VOLUME);
    
    // Ensure we don't close more than available
    lots_to_close = MathMin(lots_to_close, current_volume);
    
    // Round to lot step
    double lot_step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    lots_to_close = MathFloor(lots_to_close / lot_step) * lot_step;
    
    // Ensure minimum lot size
    double min_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    if(lots_to_close < min_lot)
        return false;
    
    // Prepare close request
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = symbol;
    request.volume = lots_to_close;
    request.type = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
    request.position = ticket;
    request.price = (request.type == ORDER_TYPE_SELL) ? 
                    SymbolInfoDouble(symbol, SYMBOL_BID) : 
                    SymbolInfoDouble(symbol, SYMBOL_ASK);
    request.deviation = 10;
    request.magic = 123456;
    request.comment = "Partial Profit";
    
    if(!OrderSend(request, result))
    {
        Print("Partial close error: ", GetLastError());
        return false;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE)
        return true;
    
    Print("Partial close failed: ", result.retcode);
    return false;
}

//+------------------------------------------------------------------+
//| Calculate R-multiple                                              |
//+------------------------------------------------------------------+
double CPartialProfitSystem::CalculateRMultiple(double entry, double current, double sl, bool is_buy)
{
    double risk = MathAbs(entry - sl);
    
    if(risk == 0)
        return 0;
    
    if(is_buy)
        return (current - entry) / risk;
    else
        return (entry - current) / risk;
}
//+------------------------------------------------------------------+
