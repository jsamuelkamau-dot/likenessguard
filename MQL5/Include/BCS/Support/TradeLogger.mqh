//+------------------------------------------------------------------+
//|                          TradeLogger.mqh                         |
//|                Support: CSV Trade Logging                        |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CTradeLogger
{
private:
    string m_trades_filename;
    string m_events_filename;
    int m_buffer_count;
    datetime m_last_flush;
    
    string GetDateString();
    bool WriteToFile(string filename, string data);
    void FlushBuffer();
    
public:
    CTradeLogger();
    ~CTradeLogger();
    
    bool Initialize();
    bool LogTradeOpen(ulong ticket, string symbol, int direction, double entry, double sl, double tp, double lots, 
                      double layer1_score, double layer2_score, double layer3_score, double layer4_score, double layer5_score);
    bool LogTradeClose(ulong ticket, double exit_price, double profit, string exit_reason);
    bool LogEvent(string event_type, string description);
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CTradeLogger::CTradeLogger()
{
    m_trades_filename = "";
    m_events_filename = "";
    m_buffer_count = 0;
    m_last_flush = 0;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CTradeLogger::~CTradeLogger()
{
    FlushBuffer();
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CTradeLogger::Initialize()
{
    string date_str = GetDateString();
    
    m_trades_filename = "BCS_Trades_" + date_str + ".csv";
    m_events_filename = "BCS_Events_" + date_str + ".csv";
    
    // Create trades file with header if it doesn't exist
    int file_handle = FileOpen(m_trades_filename, FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI, ',');
    
    if(file_handle != INVALID_HANDLE)
    {
        if(FileSize(file_handle) == 0)
        {
            // Write header
            FileWrite(file_handle, 
                     "Timestamp", "Ticket", "Symbol", "Direction", "Entry", "SL", "TP", "Lots",
                     "Layer1", "Layer2", "Layer3", "Layer4", "Layer5",
                     "Exit_Time", "Exit_Price", "Profit", "Exit_Reason");
        }
        FileClose(file_handle);
    }
    else
    {
        Print("ERROR: Failed to create trades log file");
        return false;
    }
    
    // Create events file with header if it doesn't exist
    file_handle = FileOpen(m_events_filename, FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI, ',');
    
    if(file_handle != INVALID_HANDLE)
    {
        if(FileSize(file_handle) == 0)
        {
            // Write header
            FileWrite(file_handle, "Timestamp", "Event_Type", "Description");
        }
        FileClose(file_handle);
    }
    else
    {
        Print("ERROR: Failed to create events log file");
        return false;
    }
    
    m_last_flush = TimeCurrent();
    
    Print("Trade Logger initialized");
    Print("  Trades file: ", m_trades_filename);
    Print("  Events file: ", m_events_filename);
    
    return true;
}

//+------------------------------------------------------------------+
//| Get date string                                                   |
//+------------------------------------------------------------------+
string CTradeLogger::GetDateString()
{
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    
    return StringFormat("%04d%02d%02d", dt.year, dt.mon, dt.day);
}

//+------------------------------------------------------------------+
//| Log trade open                                                    |
//+------------------------------------------------------------------+
bool CTradeLogger::LogTradeOpen(ulong ticket, string symbol, int direction, double entry, double sl, double tp, double lots,
                                double layer1_score, double layer2_score, double layer3_score, double layer4_score, double layer5_score)
{
    int file_handle = FileOpen(m_trades_filename, FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI, ',');
    
    if(file_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to open trades log file for writing");
        return false;
    }
    
    // Seek to end
    FileSeek(file_handle, 0, SEEK_END);
    
    // Write trade open data
    string dir_str = (direction == 0) ? "BUY" : "SELL";
    
    FileWrite(file_handle,
             TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
             IntegerToString(ticket),
             symbol,
             dir_str,
             DoubleToString(entry, 5),
             DoubleToString(sl, 5),
             DoubleToString(tp, 5),
             DoubleToString(lots, 2),
             DoubleToString(layer1_score, 1),
             DoubleToString(layer2_score, 1),
             DoubleToString(layer3_score, 1),
             DoubleToString(layer4_score, 1),
             DoubleToString(layer5_score, 1),
             "",  // Exit time (empty for now)
             "",  // Exit price (empty for now)
             "",  // Profit (empty for now)
             ""); // Exit reason (empty for now)
    
    FileClose(file_handle);
    
    m_buffer_count++;
    
    // Flush buffer every 10 entries or 5 minutes
    if(m_buffer_count >= 10 || (TimeCurrent() - m_last_flush) > 300)
    {
        FlushBuffer();
    }
    
    Print("Trade opened logged: Ticket ", ticket, " ", symbol, " ", dir_str, " @ ", entry);
    
    return true;
}

//+------------------------------------------------------------------+
//| Log trade close                                                   |
//+------------------------------------------------------------------+
bool CTradeLogger::LogTradeClose(ulong ticket, double exit_price, double profit, string exit_reason)
{
    // Read entire file
    int file_handle = FileOpen(m_trades_filename, FILE_READ|FILE_CSV|FILE_ANSI, ',');
    
    if(file_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to open trades log file for reading");
        return false;
    }
    
    string lines[];
    int line_count = 0;
    
    // Read all lines
    while(!FileIsEnding(file_handle))
    {
        string line = "";
        for(int i = 0; i < 17; i++)  // 17 columns
        {
            string value = FileReadString(file_handle);
            if(i > 0) line += ",";
            line += value;
        }
        
        if(line != "")
        {
            ArrayResize(lines, line_count + 1);
            lines[line_count] = line;
            line_count++;
        }
    }
    
    FileClose(file_handle);
    
    // Find and update the trade line
    bool found = false;
    string ticket_str = IntegerToString(ticket);
    
    for(int i = 1; i < line_count; i++)  // Skip header
    {
        if(StringFind(lines[i], ticket_str) >= 0)
        {
            // Update exit information
            string parts[];
            int count = StringSplit(lines[i], ',', parts);
            
            if(count >= 13)
            {
                // Update exit fields
                lines[i] = parts[0] + "," + parts[1] + "," + parts[2] + "," + parts[3] + "," +
                          parts[4] + "," + parts[5] + "," + parts[6] + "," + parts[7] + "," +
                          parts[8] + "," + parts[9] + "," + parts[10] + "," + parts[11] + "," + parts[12] + "," +
                          TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "," +
                          DoubleToString(exit_price, 5) + "," +
                          DoubleToString(profit, 2) + "," +
                          exit_reason;
                
                found = true;
                break;
            }
        }
    }
    
    if(!found)
    {
        Print("WARNING: Trade ticket ", ticket, " not found in log");
        return false;
    }
    
    // Write updated file
    file_handle = FileOpen(m_trades_filename, FILE_WRITE|FILE_CSV|FILE_ANSI, ',');
    
    if(file_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to open trades log file for writing");
        return false;
    }
    
    for(int i = 0; i < line_count; i++)
    {
        FileWriteString(file_handle, lines[i] + "\n");
    }
    
    FileClose(file_handle);
    
    Print("Trade close logged: Ticket ", ticket, " Profit: ", profit, " Reason: ", exit_reason);
    
    return true;
}

//+------------------------------------------------------------------+
//| Log event                                                         |
//+------------------------------------------------------------------+
bool CTradeLogger::LogEvent(string event_type, string description)
{
    int file_handle = FileOpen(m_events_filename, FILE_READ|FILE_WRITE|FILE_CSV|FILE_ANSI, ',');
    
    if(file_handle == INVALID_HANDLE)
    {
        Print("ERROR: Failed to open events log file");
        return false;
    }
    
    // Seek to end
    FileSeek(file_handle, 0, SEEK_END);
    
    // Write event
    FileWrite(file_handle,
             TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS),
             event_type,
             description);
    
    FileClose(file_handle);
    
    return true;
}

//+------------------------------------------------------------------+
//| Flush buffer                                                      |
//+------------------------------------------------------------------+
void CTradeLogger::FlushBuffer()
{
    m_buffer_count = 0;
    m_last_flush = TimeCurrent();
}
//+------------------------------------------------------------------+
