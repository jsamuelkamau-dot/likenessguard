//+------------------------------------------------------------------+
//|                        ScaledEntrySystem.mqh                     |
//|                Layer 5: Scaled Entry Execution                   |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict
#include "../Common/DataStructures.mqh"

class CScaledEntrySystem
{
private:
    string m_symbol;
    SScaledEntry m_current_entry;
    int m_atr_handle;
    
    bool PlaceFirstEntry(bool is_buy, double lots, double price, double sl, double tp);
    bool PlaceSecondEntry(bool is_buy, double lots, double price, double sl, double tp);
    bool PlaceThirdEntry(bool is_buy, double lots, double price, double sl, double tp);
    void CancelUnfilledEntries();
    
public:
    CScaledEntrySystem();
    ~CScaledEntrySystem();
    
    bool Initialize(string symbol);
    bool ExecuteScaledEntry(bool is_buy, double total_lots, double entry_price, double stop_loss, double take_profit);
    void UpdatePendingEntries();
    SScaledEntry GetCurrentEntry() { return m_current_entry; }
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CScaledEntrySystem::CScaledEntrySystem()
{
    m_symbol = "";
    m_atr_handle = INVALID_HANDLE;
    
    // Initialize scaled entry structure
    m_current_entry.ticket1 = 0;
    m_current_entry.ticket2 = 0;
    m_current_entry.ticket3 = 0;
    m_current_entry.entry1_filled = false;
    m_current_entry.entry2_filled = false;
    m_current_entry.entry3_filled = false;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CScaledEntrySystem::~CScaledEntrySystem()
{
    if(m_atr_handle != INVALID_HANDLE)
        IndicatorRelease(m_atr_handle);
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CScaledEntrySystem::Initialize(string symbol)
{
    m_symbol = symbol;
    
    // Create ATR for calculating entry levels
    m_atr_handle = iATR(m_symbol, PERIOD_M5, 14);
    
    if(m_atr_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to create ATR for Scaled Entry System");
        return false;
    }
    
    Print("Scaled Entry System initialized for ", m_symbol);
    return true;
}

//+------------------------------------------------------------------+
//| Execute scaled entry                                              |
//+------------------------------------------------------------------+
bool CScaledEntrySystem::ExecuteScaledEntry(bool is_buy, double total_lots, double entry_price, double stop_loss, double take_profit)
{
    // Split position: 40% / 35% / 25%
    double lot_step = SymbolInfoDouble(m_symbol, SYMBOL_VOLUME_STEP);
    
    m_current_entry.lots1 = MathFloor((total_lots * 0.40) / lot_step) * lot_step;
    m_current_entry.lots2 = MathFloor((total_lots * 0.35) / lot_step) * lot_step;
    m_current_entry.lots3 = MathFloor((total_lots * 0.25) / lot_step) * lot_step;
    
    // Ensure minimum lot size
    double min_lot = SymbolInfoDouble(m_symbol, SYMBOL_VOLUME_MIN);
    m_current_entry.lots1 = MathMax(min_lot, m_current_entry.lots1);
    m_current_entry.lots2 = MathMax(min_lot, m_current_entry.lots2);
    m_current_entry.lots3 = MathMax(min_lot, m_current_entry.lots3);
    
    // Get ATR for calculating pullback levels
    double atr[];
    ArraySetAsSeries(atr, true);
    
    if(CopyBuffer(m_atr_handle, 0, 0, 1, atr) < 1)
    {
        Print("ERROR: Failed to get ATR for scaled entry");
        return false;
    }
    
    // Calculate entry prices
    m_current_entry.entry1 = entry_price;  // Market entry
    
    if(is_buy)
    {
        m_current_entry.entry2 = entry_price - (0.3 * atr[0]);
        m_current_entry.entry3 = entry_price - (0.5 * atr[0]);
    }
    else
    {
        m_current_entry.entry2 = entry_price + (0.3 * atr[0]);
        m_current_entry.entry3 = entry_price + (0.5 * atr[0]);
    }
    
    // Place first entry (market order)
    if(!PlaceFirstEntry(is_buy, m_current_entry.lots1, m_current_entry.entry1, stop_loss, take_profit))
    {
        Print("ERROR: Failed to place first entry");
        return false;
    }
    
    m_current_entry.entry1_time = TimeCurrent();
    m_current_entry.entry1_filled = true;
    
    // Place second entry (limit order)
    if(!PlaceSecondEntry(is_buy, m_current_entry.lots2, m_current_entry.entry2, stop_loss, take_profit))
    {
        Print("WARNING: Failed to place second entry limit order");
    }
    else
    {
        m_current_entry.entry2_time = TimeCurrent();
    }
    
    // Place third entry (limit order)
    if(!PlaceThirdEntry(is_buy, m_current_entry.lots3, m_current_entry.entry3, stop_loss, take_profit))
    {
        Print("WARNING: Failed to place third entry limit order");
    }
    else
    {
        m_current_entry.entry3_time = TimeCurrent();
    }
    
    return true;
}

//+------------------------------------------------------------------+
//| Place first entry (market)                                        |
//+------------------------------------------------------------------+
bool CScaledEntrySystem::PlaceFirstEntry(bool is_buy, double lots, double price, double sl, double tp)
{
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = m_symbol;
    request.volume = lots;
    request.type = is_buy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    request.price = is_buy ? SymbolInfoDouble(m_symbol, SYMBOL_ASK) : SymbolInfoDouble(m_symbol, SYMBOL_BID);
    request.sl = sl;
    request.tp = tp;
    request.deviation = 10;
    request.magic = 123456;
    request.comment = "BCS Entry 1/3";
    
    if(!OrderSend(request, result))
    {
        Print("OrderSend error: ", GetLastError());
        return false;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE)
    {
        m_current_entry.ticket1 = result.order;
        return true;
    }
    
    Print("Entry 1 failed: ", result.retcode);
    return false;
}

//+------------------------------------------------------------------+
//| Place second entry (limit)                                        |
//+------------------------------------------------------------------+
bool CScaledEntrySystem::PlaceSecondEntry(bool is_buy, double lots, double price, double sl, double tp)
{
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_PENDING;
    request.symbol = m_symbol;
    request.volume = lots;
    request.type = is_buy ? ORDER_TYPE_BUY_LIMIT : ORDER_TYPE_SELL_LIMIT;
    request.price = price;
    request.sl = sl;
    request.tp = tp;
    request.magic = 123456;
    request.comment = "BCS Entry 2/3";
    request.expiration = TimeCurrent() + (10 * 60);  // 10 bars timeout
    request.type_time = ORDER_TIME_SPECIFIED;
    
    if(!OrderSend(request, result))
    {
        Print("OrderSend error: ", GetLastError());
        return false;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)
    {
        m_current_entry.ticket2 = result.order;
        return true;
    }
    
    Print("Entry 2 failed: ", result.retcode);
    return false;
}

//+------------------------------------------------------------------+
//| Place third entry (limit)                                         |
//+------------------------------------------------------------------+
bool CScaledEntrySystem::PlaceThirdEntry(bool is_buy, double lots, double price, double sl, double tp)
{
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_PENDING;
    request.symbol = m_symbol;
    request.volume = lots;
    request.type = is_buy ? ORDER_TYPE_BUY_LIMIT : ORDER_TYPE_SELL_LIMIT;
    request.price = price;
    request.sl = sl;
    request.tp = tp;
    request.magic = 123456;
    request.comment = "BCS Entry 3/3";
    request.expiration = TimeCurrent() + (15 * 60);  // 15 bars timeout
    request.type_time = ORDER_TIME_SPECIFIED;
    
    if(!OrderSend(request, result))
    {
        Print("OrderSend error: ", GetLastError());
        return false;
    }
    
    if(result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)
    {
        m_current_entry.ticket3 = result.order;
        return true;
    }
    
    Print("Entry 3 failed: ", result.retcode);
    return false;
}

//+------------------------------------------------------------------+
//| Update pending entries                                            |
//+------------------------------------------------------------------+
void CScaledEntrySystem::UpdatePendingEntries()
{
    // Check if entry 2 filled
    if(m_current_entry.ticket2 > 0 && !m_current_entry.entry2_filled)
    {
        if(PositionSelectByTicket(m_current_entry.ticket2))
        {
            m_current_entry.entry2_filled = true;
            Print("Entry 2/3 filled");
        }
    }
    
    // Check if entry 3 filled
    if(m_current_entry.ticket3 > 0 && !m_current_entry.entry3_filled)
    {
        if(PositionSelectByTicket(m_current_entry.ticket3))
        {
            m_current_entry.entry3_filled = true;
            Print("Entry 3/3 filled");
        }
    }
    
    // Cancel unfilled entries after timeout
    CancelUnfilledEntries();
}

//+------------------------------------------------------------------+
//| Cancel unfilled entries                                           |
//+------------------------------------------------------------------+
void CScaledEntrySystem::CancelUnfilledEntries()
{
    // Entry 2: 10-bar timeout
    if(m_current_entry.ticket2 > 0 && !m_current_entry.entry2_filled)
    {
        if(TimeCurrent() - m_current_entry.entry2_time > (10 * 60))
        {
            MqlTradeRequest request = {};
            MqlTradeResult result = {};
            
            request.action = TRADE_ACTION_REMOVE;
            request.order = m_current_entry.ticket2;
            
            if(!OrderSend(request, result))
            {
                Print("Failed to cancel Entry 2/3: Error ", GetLastError());
            }
            else
            {
                Print("Entry 2/3 cancelled (timeout)");
            }
            m_current_entry.ticket2 = 0;
        }
    }
    
    // Entry 3: 15-bar timeout
    if(m_current_entry.ticket3 > 0 && !m_current_entry.entry3_filled)
    {
        if(TimeCurrent() - m_current_entry.entry3_time > (15 * 60))
        {
            MqlTradeRequest request = {};
            MqlTradeResult result = {};
            
            request.action = TRADE_ACTION_REMOVE;
            request.order = m_current_entry.ticket3;
            
            if(!OrderSend(request, result))
            {
                Print("Failed to cancel Entry 3/3: Error ", GetLastError());
            }
            else
            {
                Print("Entry 3/3 cancelled (timeout)");
            }
            m_current_entry.ticket3 = 0;
        }
    }
}
//+------------------------------------------------------------------+
