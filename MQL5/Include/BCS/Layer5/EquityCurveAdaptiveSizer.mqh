//+------------------------------------------------------------------+
//|                      EquityCurveAdaptiveSizer.mqh                |
//|                Layer 5: Adaptive Position Sizing                 |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CEquityCurveAdaptiveSizer
{
private:
    double m_base_risk;
    double m_current_risk_percent;
    double m_recent_win_rate;
    double m_current_drawdown;
    double m_equity_peak;
    
    double CalculateRecentWinRate(int trades);
    double GetCurrentDrawdown();
    double AdjustRiskForPerformance();
    
public:
    CEquityCurveAdaptiveSizer();
    ~CEquityCurveAdaptiveSizer();
    
    bool Initialize(double base_risk_percent);
    double GetCurrentRiskPercent() { return m_current_risk_percent; }
    double CalculatePositionSize(double stop_loss_pips);
    void UpdatePerformanceMetrics();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CEquityCurveAdaptiveSizer::CEquityCurveAdaptiveSizer()
{
    m_base_risk = 1.0;
    m_current_risk_percent = 1.0;
    m_recent_win_rate = 0.65;  // Default assumption
    m_current_drawdown = 0;
    m_equity_peak = 0;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CEquityCurveAdaptiveSizer::~CEquityCurveAdaptiveSizer()
{
    // No resources to release
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CEquityCurveAdaptiveSizer::Initialize(double base_risk_percent)
{
    m_base_risk = base_risk_percent;
    m_current_risk_percent = base_risk_percent;
    m_equity_peak = AccountInfoDouble(ACCOUNT_EQUITY);
    
    Print("Equity Curve Adaptive Sizer initialized with base risk: ", m_base_risk, "%");
    return true;
}

//+------------------------------------------------------------------+
//| Update performance metrics                                        |
//+------------------------------------------------------------------+
void CEquityCurveAdaptiveSizer::UpdatePerformanceMetrics()
{
    // Calculate recent win rate
    m_recent_win_rate = CalculateRecentWinRate(20);
    
    // Calculate current drawdown
    m_current_drawdown = GetCurrentDrawdown();
    
    // Adjust risk based on performance
    m_current_risk_percent = AdjustRiskForPerformance();
}

//+------------------------------------------------------------------+
//| Calculate recent win rate                                         |
//+------------------------------------------------------------------+
double CEquityCurveAdaptiveSizer::CalculateRecentWinRate(int trades)
{
    // Get closed trades from history
    HistorySelect(0, TimeCurrent());
    
    int total_deals = HistoryDealsTotal();
    if(total_deals == 0) return 0.65;  // Default
    
    int wins = 0;
    int losses = 0;
    int count = 0;
    
    // Scan from most recent
    for(int i = total_deals - 1; i >= 0 && count < trades; i--)
    {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket == 0) continue;
        
        // Only count exit deals
        if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT)
            continue;
        
        double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
        
        if(profit > 0)
            wins++;
        else if(profit < 0)
            losses++;
        
        count++;
    }
    
    if(wins + losses == 0) return 0.65;  // Default
    
    return (double)wins / (wins + losses);
}

//+------------------------------------------------------------------+
//| Get current drawdown                                              |
//+------------------------------------------------------------------+
double CEquityCurveAdaptiveSizer::GetCurrentDrawdown()
{
    double current_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    
    // Update equity peak
    if(current_equity > m_equity_peak)
        m_equity_peak = current_equity;
    
    // Calculate drawdown percentage
    if(m_equity_peak > 0)
        return ((m_equity_peak - current_equity) / m_equity_peak) * 100.0;
    
    return 0;
}

//+------------------------------------------------------------------+
//| Adjust risk for performance                                       |
//+------------------------------------------------------------------+
double CEquityCurveAdaptiveSizer::AdjustRiskForPerformance()
{
    double adjusted_risk = m_base_risk;
    
    // Risk adjustment algorithm
    if(m_recent_win_rate > 0.75 && m_current_drawdown < 2.0)
    {
        // Excellent performance: increase to 1.5x
        adjusted_risk = m_base_risk * 1.5;
    }
    else if(m_recent_win_rate > 0.65 && m_current_drawdown < 3.0)
    {
        // Good performance: keep at 1.0x
        adjusted_risk = m_base_risk * 1.0;
    }
    else if(m_recent_win_rate > 0.55 && m_current_drawdown < 5.0)
    {
        // Moderate performance: reduce to 0.75x
        adjusted_risk = m_base_risk * 0.75;
    }
    else
    {
        // Poor performance: reduce to 0.5x
        adjusted_risk = m_base_risk * 0.5;
    }
    
    // Cap maximum risk at 2.0%
    adjusted_risk = MathMin(2.0, adjusted_risk);
    
    // Cap minimum risk at 0.5%
    adjusted_risk = MathMax(0.5, adjusted_risk);
    
    return adjusted_risk;
}

//+------------------------------------------------------------------+
//| Calculate position size                                           |
//+------------------------------------------------------------------+
double CEquityCurveAdaptiveSizer::CalculatePositionSize(double stop_loss_pips)
{
    if(stop_loss_pips <= 0) return 0;
    
    double account_equity = AccountInfoDouble(ACCOUNT_EQUITY);
    string symbol = Symbol();
    
    // Calculate risk amount in account currency
    double risk_amount = account_equity * (m_current_risk_percent / 100.0);
    
    // Get pip value for 1 lot
    double tick_size = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
    double tick_value = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    
    // Calculate pip value
    double pip_value = 0;
    if(tick_size > 0)
        pip_value = (tick_value / tick_size) * point * 10;  // For 1 lot
    
    if(pip_value <= 0) return 0;
    
    // Calculate lot size
    double lot_size = risk_amount / (stop_loss_pips * pip_value);
    
    // Round to lot step
    double lot_step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    if(lot_step > 0)
        lot_size = MathFloor(lot_size / lot_step) * lot_step;
    
    // Enforce min/max lot limits
    double min_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    double max_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    
    lot_size = MathMax(min_lot, MathMin(max_lot, lot_size));
    
    return lot_size;
}
//+------------------------------------------------------------------+
