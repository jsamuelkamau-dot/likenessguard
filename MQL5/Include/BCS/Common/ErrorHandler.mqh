//+------------------------------------------------------------------+
//|                                            ErrorHandler.mqh      |
//|                        Error handling for BCS v2.0               |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

//+------------------------------------------------------------------+
//| Error Handler Class                                               |
//+------------------------------------------------------------------+
class CErrorHandler
{
private:
    int       m_last_error;
    string    m_last_error_desc;
    int       m_error_count;
    int       m_consecutive_errors;
    datetime  m_last_error_time;
    
    // Circuit breaker
    bool      m_circuit_breaker_active;
    datetime  m_circuit_breaker_time;
    int       m_circuit_breaker_threshold;
    int       m_circuit_breaker_duration;  // seconds
    
    // Error statistics
    int       m_error_history[100];
    int       m_error_history_index;
    
public:
    CErrorHandler();
    ~CErrorHandler();
    
    bool      Initialize();
    bool      HandleError(int error_code, string context = "");
    void      Reset();
    
    // Getters
    int       GetLastError() { return m_last_error; }
    string    GetLastErrorDescription() { return m_last_error_desc; }
    int       GetErrorCount() { return m_error_count; }
    bool      IsCircuitBreakerActive();
    
    // Error classification
    bool      IsRetryableError(int error_code);
    bool      IsCriticalError(int error_code);
    
private:
    string    GetErrorDescription(int error_code);
    void      LogError(int error_code, string context);
    void      ActivateCircuitBreaker();
    void      CheckCircuitBreaker();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CErrorHandler::CErrorHandler()
{
    m_last_error = 0;
    m_last_error_desc = "";
    m_error_count = 0;
    m_consecutive_errors = 0;
    m_last_error_time = 0;
    
    m_circuit_breaker_active = false;
    m_circuit_breaker_time = 0;
    m_circuit_breaker_threshold = 10;  // 10 errors in short time
    m_circuit_breaker_duration = 300;  // 5 minutes
    
    m_error_history_index = 0;
    ArrayInitialize(m_error_history, 0);
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CErrorHandler::~CErrorHandler()
{
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CErrorHandler::Initialize()
{
    Reset();
    Print("Error Handler initialized");
    return true;
}

//+------------------------------------------------------------------+
//| Handle Error                                                      |
//+------------------------------------------------------------------+
bool CErrorHandler::HandleError(int error_code, string context = "")
{
    if(error_code == 0) return true;  // No error
    
    m_last_error = error_code;
    m_last_error_desc = GetErrorDescription(error_code);
    m_error_count++;
    m_consecutive_errors++;
    m_last_error_time = TimeCurrent();
    
    // Store in history
    m_error_history[m_error_history_index] = error_code;
    m_error_history_index = (m_error_history_index + 1) % 100;
    
    // Log the error
    LogError(error_code, context);
    
    // Check if we should activate circuit breaker
    if(m_consecutive_errors >= m_circuit_breaker_threshold)
    {
        ActivateCircuitBreaker();
        return false;
    }
    
    // Determine action based on error type
    if(IsCriticalError(error_code))
    {
        Print("CRITICAL ERROR: ", m_last_error_desc, " - Trading paused");
        ActivateCircuitBreaker();
        return false;
    }
    
    if(IsRetryableError(error_code))
    {
        Print("Retryable error: ", m_last_error_desc);
        return true;  // Can retry
    }
    
    return false;  // Cannot retry
}

//+------------------------------------------------------------------+
//| Reset error counters                                              |
//+------------------------------------------------------------------+
void CErrorHandler::Reset()
{
    m_consecutive_errors = 0;
}

//+------------------------------------------------------------------+
//| Check if circuit breaker is active                                |
//+------------------------------------------------------------------+
bool CErrorHandler::IsCircuitBreakerActive()
{
    CheckCircuitBreaker();
    return m_circuit_breaker_active;
}

//+------------------------------------------------------------------+
//| Check if error is retryable                                       |
//+------------------------------------------------------------------+
bool CErrorHandler::IsRetryableError(int error_code)
{
    switch(error_code)
    {
        case 10004:  // Trade server is busy
        case 10006:  // Request rejected
        case 10007:  // Request canceled
        case 10018:  // Market is closed
        case 10019:  // Not enough money
        case 10021:  // Order already exists
        case 10025:  // Trade is disabled
        case 10027:  // Autotrading disabled
        case 10030:  // Invalid volume
        case 10035:  // Invalid price
        case 10036:  // Invalid stops
        case 138:    // Requote
        case 4756:   // Trade context is busy
            return true;
            
        default:
            return false;
    }
}

//+------------------------------------------------------------------+
//| Check if error is critical                                        |
//+------------------------------------------------------------------+
bool CErrorHandler::IsCriticalError(int error_code)
{
    switch(error_code)
{
        case 2:      // Common error
        case 64:     // Account blocked
        case 65:     // Invalid account
        case 133:    // Trading forbidden
        case 134:    // Not enough money
        case 4051:   // Invalid function parameter
        case 4109:   // Trading not allowed
        case 10015:  // Invalid request
        case 10016:  // Request canceled
        case 10017:  // Request placed
        case 10024:  // Too many requests
            return true;
            
        default:
            return false;
    }
}

//+------------------------------------------------------------------+
//| Get error description                                             |
//+------------------------------------------------------------------+
string CErrorHandler::GetErrorDescription(int error_code)
{
    switch(error_code)
    {
        case 0:      return "No error";
        case 2:      return "Common error";
        case 64:     return "Account blocked";
        case 65:     return "Invalid account";
        case 128:    return "Trade timeout";
        case 129:    return "Invalid price";
        case 130:    return "Invalid stops";
        case 131:    return "Invalid trade volume";
        case 132:    return "Market is closed";
        case 133:    return "Trading is disabled";
        case 134:    return "Not enough money";
        case 135:    return "Price changed";
        case 136:    return "Off quotes";
        case 137:    return "Broker is busy";
        case 138:    return "Requote";
        case 139:    return "Order is locked";
        case 140:    return "Long positions only allowed";
        case 141:    return "Too many requests";
        case 145:    return "Modification denied";
        case 146:    return "Trade context is busy";
        case 4051:   return "Invalid function parameter value";
        case 4109:   return "Trading is not allowed";
        case 4756:   return "Trade context is busy";
        case 10004:  return "Trade server is busy";
        case 10006:  return "Request rejected";
        case 10007:  return "Request canceled by trader";
        case 10008:  return "Order placed";
        case 10009:  return "Request completed";
        case 10010:  return "Only part of request completed";
        case 10011:  return "Request processing error";
        case 10012:  return "Request canceled by timeout";
        case 10013:  return "Invalid request";
        case 10014:  return "Invalid volume in request";
        case 10015:  return "Invalid price in request";
        case 10016:  return "Invalid stops in request";
        case 10017:  return "Trade disabled";
        case 10018:  return "Market closed";
        case 10019:  return "Not enough money to complete request";
        case 10020:  return "Prices changed";
        case 10021:  return "No quotes to process request";
        case 10022:  return "Invalid order expiration";
        case 10023:  return "Order state changed";
        case 10024:  return "Too frequent requests";
        case 10025:  return "No changes in request";
        case 10026:  return "Autotrading disabled by server";
        case 10027:  return "Autotrading disabled by client";
        case 10028:  return "Request locked for processing";
        case 10029:  return "Order or position frozen";
        case 10030:  return "Invalid order filling type";
        case 10031:  return "No connection with trade server";
        case 10032:  return "Operation allowed only for live accounts";
        case 10033:  return "Number of pending orders reached limit";
        case 10034:  return "Volume of orders reached limit";
        case 10035:  return "Invalid or prohibited order type";
        case 10036:  return "Position with specified ID already closed";
        
        default:     return "Unknown error (" + IntegerToString(error_code) + ")";
    }
}

//+------------------------------------------------------------------+
//| Log error                                                         |
//+------------------------------------------------------------------+
void CErrorHandler::LogError(int error_code, string context)
{
    string log_message = StringFormat(
        "ERROR [%d]: %s | Context: %s | Count: %d | Consecutive: %d",
        error_code,
        m_last_error_desc,
        context,
        m_error_count,
        m_consecutive_errors
    );
    
    Print(log_message);
}

//+------------------------------------------------------------------+
//| Activate circuit breaker                                          |
//+------------------------------------------------------------------+
void CErrorHandler::ActivateCircuitBreaker()
{
    m_circuit_breaker_active = true;
    m_circuit_breaker_time = TimeCurrent();
    
    Print("=== CIRCUIT BREAKER ACTIVATED ===");
    Print("Too many consecutive errors (", m_consecutive_errors, ")");
    Print("Trading paused for ", m_circuit_breaker_duration, " seconds");
    Print("=================================");
}

//+------------------------------------------------------------------+
//| Check circuit breaker status                                      |
//+------------------------------------------------------------------+
void CErrorHandler::CheckCircuitBreaker()
{
    if(!m_circuit_breaker_active) return;
    
    // Check if duration has passed
    if(TimeCurrent() - m_circuit_breaker_time >= m_circuit_breaker_duration)
    {
        m_circuit_breaker_active = false;
        m_consecutive_errors = 0;
        
        Print("=== CIRCUIT BREAKER DEACTIVATED ===");
        Print("Trading resumed");
        Print("===================================");
    }
}
//+------------------------------------------------------------------+
