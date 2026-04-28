//+------------------------------------------------------------------+
//|                           RiskEngine.mqh                         |
//|                Layer 5: Risk Management Coordinator              |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CRiskEngine
{
private:
    string m_symbol;
    int m_max_trades_per_pair;
    int m_max_trades_total;
    
    int CountOpenTrades(string symbol);
    int CountTotalOpenTrades();
    bool ExecuteOrderWithRetry(MqlTradeRequest &request, MqlTradeResult &result, int max_attempts);
    
public:
    CRiskEngine();
    ~CRiskEngine();
    
    bool Initialize(string symbol, int max_per_pair, int max_total);
    bool CanOpenNewTrade();
    int GetOpenTradeCount();
    int GetOpenTradeCountForPair(string symbol);
    bool SendOrder(MqlTradeRequest &request, MqlTradeResult &result);
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CRiskEngine::CRiskEngine()
{
    m_symbol = "";
    m_max_trades_per_pair = 3;
    m_max_trades_total = 6;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CRiskEngine::~CRiskEngine()
{
    // No resources to release
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CRiskEngine::Initialize(string symbol, int max_per_pair = 3, int max_total = 6)
{
    m_symbol = symbol;
    m_max_trades_per_pair = max_per_pair;
    m_max_trades_total = max_total;
    
    Print("Risk Engine initialized for ", m_symbol, 
          " (Max per pair: ", m_max_trades_per_pair, 
          ", Max total: ", m_max_trades_total, ")");
    return true;
}

//+------------------------------------------------------------------+
//| Check if can open new trade                                       |
//+------------------------------------------------------------------+
bool CRiskEngine::CanOpenNewTrade()
{
    // Check per-pair limit
    int trades_this_pair = CountOpenTrades(m_symbol);
    if(trades_this_pair >= m_max_trades_per_pair)
    {
        Print("Cannot open trade: Max trades per pair reached (", trades_this_pair, "/", m_max_trades_per_pair, ")");
        return false;
    }
    
    // Check total limit
    int total_trades = CountTotalOpenTrades();
    if(total_trades >= m_max_trades_total)
    {
        Print("Cannot open trade: Max total trades reached (", total_trades, "/", m_max_trades_total, ")");
        return false;
    }
    
    return true;
}

//+------------------------------------------------------------------+
//| Get open trade count                                              |
//+------------------------------------------------------------------+
int CRiskEngine::GetOpenTradeCount()
{
    return CountOpenTrades(m_symbol);
}

//+------------------------------------------------------------------+
//| Get open trade count for specific pair                            |
//+------------------------------------------------------------------+
int CRiskEngine::GetOpenTradeCountForPair(string symbol)
{
    return CountOpenTrades(symbol);
}

//+------------------------------------------------------------------+
//| Count open trades for symbol                                      |
//+------------------------------------------------------------------+
int CRiskEngine::CountOpenTrades(string symbol)
{
    int count = 0;
    
    for(int i = 0; i < PositionsTotal(); i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket == 0) continue;
        
        if(PositionGetString(POSITION_SYMBOL) == symbol)
            count++;
    }
    
    return count;
}

//+------------------------------------------------------------------+
//| Count total open trades                                           |
//+------------------------------------------------------------------+
int CRiskEngine::CountTotalOpenTrades()
{
    return PositionsTotal();
}

//+------------------------------------------------------------------+
//| Send order with retry logic                                       |
//+------------------------------------------------------------------+
bool CRiskEngine::SendOrder(MqlTradeRequest &request, MqlTradeResult &result)
{
    return ExecuteOrderWithRetry(request, result, 3);
}

//+------------------------------------------------------------------+
//| Execute order with retry                                          |
//+------------------------------------------------------------------+
bool CRiskEngine::ExecuteOrderWithRetry(MqlTradeRequest &request, MqlTradeResult &result, int max_attempts)
{
    for(int attempt = 1; attempt <= max_attempts; attempt++)
    {
        // Reset result
        ZeroMemory(result);
        
        // Send order
        if(!OrderSend(request, result))
        {
            int error = GetLastError();
            Print("OrderSend error on attempt ", attempt, ": ", error);
            
            if(attempt < max_attempts)
            {
                Sleep(500);  // Wait 500ms before retry
                continue;
            }
            
            return false;
        }
        
        // Check result
        if(result.retcode == TRADE_RETCODE_DONE || 
           result.retcode == TRADE_RETCODE_PLACED)
        {
            Print("Order executed successfully on attempt ", attempt);
            return true;
        }
        
        // Handle specific error codes
        if(result.retcode == TRADE_RETCODE_REQUOTE ||
           result.retcode == TRADE_RETCODE_PRICE_OFF ||
           result.retcode == TRADE_RETCODE_PRICE_CHANGED)
        {
            // Update price and retry
            if(request.action == TRADE_ACTION_DEAL)
            {
                if(request.type == ORDER_TYPE_BUY)
                    request.price = SymbolInfoDouble(request.symbol, SYMBOL_ASK);
                else if(request.type == ORDER_TYPE_SELL)
                    request.price = SymbolInfoDouble(request.symbol, SYMBOL_BID);
            }
            
            if(attempt < max_attempts)
            {
                Print("Requote on attempt ", attempt, ", retrying with new price...");
                Sleep(500);
                continue;
            }
        }
        
        // Other errors
        Print("Order failed on attempt ", attempt, " with retcode: ", result.retcode);
        
        if(attempt < max_attempts)
        {
            Sleep(500);
            continue;
        }
        
        return false;
    }
    
    return false;
}
//+------------------------------------------------------------------+
