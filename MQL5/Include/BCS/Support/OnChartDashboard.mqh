//+------------------------------------------------------------------+
//|                       OnChartDashboard.mqh                       |
//|                Support: Visual Status Display                    |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class COnChartDashboard
{
private:
    long m_chart_id;
    int m_x_offset;
    int m_y_offset;
    color m_bg_color;
    color m_text_color;
    
    void CreateDashboardObjects();
    void UpdateLayerDisplay(int layer_index, string name, double score, bool passed);
    void UpdateTradeDisplay();
    void UpdateAccountDisplay();
    string GetColorForScore(double score, bool passed);
    void CreateLabel(string name, int x, int y, string text, color clr, int font_size = 9);
    void UpdateLabel(string name, string text, color clr);
    
public:
    COnChartDashboard();
    ~COnChartDashboard();
    
    bool Initialize(long chart_id);
    void Update();
    void UpdateLayerStatus(string layer_name, double score, bool passed);
    void UpdateTradeInfo(ulong ticket, double pnl, double entry, double sl, double tp);
    void UpdateAccountInfo(double equity, double daily_pnl, double weekly_pnl);
    void Cleanup();
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
COnChartDashboard::COnChartDashboard()
{
    m_chart_id = 0;
    m_x_offset = 20;
    m_y_offset = 30;
    m_bg_color = clrBlack;
    m_text_color = clrWhite;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
COnChartDashboard::~COnChartDashboard()
{
    Cleanup();
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool COnChartDashboard::Initialize(long chart_id)
{
    m_chart_id = chart_id;
    
    // Create dashboard objects
    CreateDashboardObjects();
    
    Print("Dashboard initialized for chart ", m_chart_id);
    return true;
}

//+------------------------------------------------------------------+
//| Create dashboard objects                                          |
//+------------------------------------------------------------------+
void COnChartDashboard::CreateDashboardObjects()
{
    int y = m_y_offset;
    
    // Title
    CreateLabel("BCS_Title", m_x_offset, y, "BILLIONAIRE CONFLUENCE SCALPER v2.0", clrGold, 11);
    y += 25;
    
    // Separator
    CreateLabel("BCS_Sep1", m_x_offset, y, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", clrDimGray, 8);
    y += 20;
    
    // Layer status section
    CreateLabel("BCS_LayerTitle", m_x_offset, y, "LAYER STATUS", clrWhite, 10);
    y += 20;
    
    CreateLabel("BCS_Layer1", m_x_offset, y, "● Layer 1: Macro Context      [--] -", clrGray, 9);
    y += 18;
    CreateLabel("BCS_Layer2", m_x_offset, y, "● Layer 2: Structural         [--] -", clrGray, 9);
    y += 18;
    CreateLabel("BCS_Layer3", m_x_offset, y, "● Layer 3: Momentum           [--] -", clrGray, 9);
    y += 18;
    CreateLabel("BCS_Layer4", m_x_offset, y, "● Layer 4: Precision Entry    [--] -", clrGray, 9);
    y += 18;
    CreateLabel("BCS_Layer5", m_x_offset, y, "● Layer 5: Risk Engine        [--] -", clrGray, 9);
    y += 18;
    CreateLabel("BCS_Layer6", m_x_offset, y, "● Layer 6: Trade Management   [--] -", clrGray, 9);
    y += 25;
    
    // Separator
    CreateLabel("BCS_Sep2", m_x_offset, y, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", clrDimGray, 8);
    y += 20;
    
    // Active trades section
    CreateLabel("BCS_TradeTitle", m_x_offset, y, "ACTIVE TRADES: 0", clrWhite, 10);
    y += 20;
    CreateLabel("BCS_TradeInfo", m_x_offset, y, "No active trades", clrGray, 9);
    y += 25;
    
    // Separator
    CreateLabel("BCS_Sep3", m_x_offset, y, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", clrDimGray, 8);
    y += 20;
    
    // Account info section
    CreateLabel("BCS_AccTitle", m_x_offset, y, "ACCOUNT INFO", clrWhite, 10);
    y += 20;
    CreateLabel("BCS_Equity", m_x_offset, y, "Equity: $0.00", clrGray, 9);
    y += 18;
    CreateLabel("BCS_DailyPnL", m_x_offset, y, "Daily P&L: $0.00 (0.00%)", clrGray, 9);
    y += 18;
    CreateLabel("BCS_WeeklyPnL", m_x_offset, y, "Weekly P&L: $0.00 (0.00%)", clrGray, 9);
    y += 18;
    CreateLabel("BCS_TotalTrades", m_x_offset, y, "Total Trades: 0", clrGray, 9);
    
    ChartRedraw(m_chart_id);
}

//+------------------------------------------------------------------+
//| Create label                                                      |
//+------------------------------------------------------------------+
void COnChartDashboard::CreateLabel(string name, int x, int y, string text, color clr, int font_size = 9)
{
    ObjectCreate(m_chart_id, name, OBJ_LABEL, 0, 0, 0);
    ObjectSetInteger(m_chart_id, name, OBJPROP_XDISTANCE, x);
    ObjectSetInteger(m_chart_id, name, OBJPROP_YDISTANCE, y);
    ObjectSetInteger(m_chart_id, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
    ObjectSetInteger(m_chart_id, name, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
    ObjectSetString(m_chart_id, name, OBJPROP_TEXT, text);
    ObjectSetInteger(m_chart_id, name, OBJPROP_COLOR, clr);
    ObjectSetInteger(m_chart_id, name, OBJPROP_FONTSIZE, font_size);
    ObjectSetString(m_chart_id, name, OBJPROP_FONT, "Consolas");
    ObjectSetInteger(m_chart_id, name, OBJPROP_SELECTABLE, false);
    ObjectSetInteger(m_chart_id, name, OBJPROP_HIDDEN, true);
}

//+------------------------------------------------------------------+
//| Update label                                                      |
//+------------------------------------------------------------------+
void COnChartDashboard::UpdateLabel(string name, string text, color clr)
{
    ObjectSetString(m_chart_id, name, OBJPROP_TEXT, text);
    ObjectSetInteger(m_chart_id, name, OBJPROP_COLOR, clr);
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void COnChartDashboard::Update()
{
    ChartRedraw(m_chart_id);
}

//+------------------------------------------------------------------+
//| Update layer status                                               |
//+------------------------------------------------------------------+
void COnChartDashboard::UpdateLayerStatus(string layer_name, double score, bool passed)
{
    string label_name = "";
    string display_name = "";
    
    if(layer_name == "Layer1" || layer_name == "Macro Context")
    {
        label_name = "BCS_Layer1";
        display_name = "Layer 1: Macro Context";
    }
    else if(layer_name == "Layer2" || layer_name == "Structural")
    {
        label_name = "BCS_Layer2";
        display_name = "Layer 2: Structural";
    }
    else if(layer_name == "Layer3" || layer_name == "Momentum")
    {
        label_name = "BCS_Layer3";
        display_name = "Layer 3: Momentum";
    }
    else if(layer_name == "Layer4" || layer_name == "Precision Entry")
    {
        label_name = "BCS_Layer4";
        display_name = "Layer 4: Precision Entry";
    }
    else if(layer_name == "Layer5" || layer_name == "Risk Engine")
    {
        label_name = "BCS_Layer5";
        display_name = "Layer 5: Risk Engine";
    }
    else if(layer_name == "Layer6" || layer_name == "Trade Management")
    {
        label_name = "BCS_Layer6";
        display_name = "Layer 6: Trade Management";
    }
    
    if(label_name == "")
        return;
    
    // Format text
    string status_char = passed ? "✓" : "✗";
    string score_str = StringFormat("[%02.0f]", score);
    string text = StringFormat("● %s      %s %s", display_name, score_str, status_char);
    
    // Determine color
    color clr = clrGray;
    if(passed)
    {
        if(score >= 80)
            clr = clrLime;
        else if(score >= 60)
            clr = clrYellow;
        else
            clr = clrOrange;
    }
    else
    {
        clr = clrRed;
    }
    
    UpdateLabel(label_name, text, clr);
}

//+------------------------------------------------------------------+
//| Update trade info                                                 |
//+------------------------------------------------------------------+
void COnChartDashboard::UpdateTradeInfo(ulong ticket, double pnl, double entry, double sl, double tp)
{
    int trade_count = PositionsTotal();
    
    // Update title
    string title = StringFormat("ACTIVE TRADES: %d", trade_count);
    UpdateLabel("BCS_TradeTitle", title, clrWhite);
    
    // Update trade info
    if(trade_count == 0)
    {
        UpdateLabel("BCS_TradeInfo", "No active trades", clrGray);
    }
    else
    {
        // Show first trade info
        string info = StringFormat("Ticket: %I64u | Entry: %.5f\nP&L: %+.2f pips (%+.2f)\nSL: %.5f | TP: %.5f",
                                  ticket, entry, pnl, pnl, sl, tp);
        
        color pnl_color = (pnl >= 0) ? clrLime : clrRed;
        UpdateLabel("BCS_TradeInfo", info, pnl_color);
    }
}

//+------------------------------------------------------------------+
//| Update account info                                               |
//+------------------------------------------------------------------+
void COnChartDashboard::UpdateAccountInfo(double equity, double daily_pnl, double weekly_pnl)
{
    // Equity
    string equity_str = StringFormat("Equity: $%.2f", equity);
    UpdateLabel("BCS_Equity", equity_str, clrWhite);
    
    // Daily P&L
    double daily_pct = (equity > 0) ? (daily_pnl / equity) * 100.0 : 0;
    string daily_str = StringFormat("Daily P&L: %+.2f (%+.2f%%)", daily_pnl, daily_pct);
    color daily_color = (daily_pnl >= 0) ? clrLime : clrRed;
    UpdateLabel("BCS_DailyPnL", daily_str, daily_color);
    
    // Weekly P&L
    double weekly_pct = (equity > 0) ? (weekly_pnl / equity) * 100.0 : 0;
    string weekly_str = StringFormat("Weekly P&L: %+.2f (%+.2f%%)", weekly_pnl, weekly_pct);
    color weekly_color = (weekly_pnl >= 0) ? clrLime : clrRed;
    UpdateLabel("BCS_WeeklyPnL", weekly_str, weekly_color);
    
    // Total trades
    HistorySelect(0, TimeCurrent());
    int total_trades = HistoryDealsTotal();
    string trades_str = StringFormat("Total Trades: %d", total_trades);
    UpdateLabel("BCS_TotalTrades", trades_str, clrGray);
}

//+------------------------------------------------------------------+
//| Get color for score                                               |
//+------------------------------------------------------------------+
string COnChartDashboard::GetColorForScore(double score, bool passed)
{
    if(!passed)
        return "Red";
    
    if(score >= 80)
        return "Green";
    else if(score >= 60)
        return "Yellow";
    else
        return "Orange";
}

//+------------------------------------------------------------------+
//| Cleanup                                                           |
//+------------------------------------------------------------------+
void COnChartDashboard::Cleanup()
{
    // Delete all dashboard objects
    ObjectDelete(m_chart_id, "BCS_Title");
    ObjectDelete(m_chart_id, "BCS_Sep1");
    ObjectDelete(m_chart_id, "BCS_Sep2");
    ObjectDelete(m_chart_id, "BCS_Sep3");
    ObjectDelete(m_chart_id, "BCS_LayerTitle");
    ObjectDelete(m_chart_id, "BCS_Layer1");
    ObjectDelete(m_chart_id, "BCS_Layer2");
    ObjectDelete(m_chart_id, "BCS_Layer3");
    ObjectDelete(m_chart_id, "BCS_Layer4");
    ObjectDelete(m_chart_id, "BCS_Layer5");
    ObjectDelete(m_chart_id, "BCS_Layer6");
    ObjectDelete(m_chart_id, "BCS_TradeTitle");
    ObjectDelete(m_chart_id, "BCS_TradeInfo");
    ObjectDelete(m_chart_id, "BCS_AccTitle");
    ObjectDelete(m_chart_id, "BCS_Equity");
    ObjectDelete(m_chart_id, "BCS_DailyPnL");
    ObjectDelete(m_chart_id, "BCS_WeeklyPnL");
    ObjectDelete(m_chart_id, "BCS_TotalTrades");
    
    ChartRedraw(m_chart_id);
}
//+------------------------------------------------------------------+
