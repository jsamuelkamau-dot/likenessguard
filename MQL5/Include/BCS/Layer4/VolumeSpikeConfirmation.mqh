//+------------------------------------------------------------------+
//|                        VolumeSpikeConfirmation.mqh               |
//|                   Layer 4: Volume Spike Detection                |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

class CVolumeSpikeConfirmation
{
private:
    string m_symbol;
    ENUM_TIMEFRAMES m_timeframe;
    double m_volume_score;
    double m_average_volume;
    double m_current_volume_ratio;
    
    double CalculateAverageVolume(int periods);
    bool DetectVolumeSpike();
    
public:
    CVolumeSpikeConfirmation();
    ~CVolumeSpikeConfirmation();
    
    bool Initialize(string symbol, ENUM_TIMEFRAMES timeframe);
    void Update();
    double GetVolumeScore() { return m_volume_score; }
    bool IsVolumeSpikePresent();
    double GetCurrentVolumeRatio() { return m_current_volume_ratio; }
};

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CVolumeSpikeConfirmation::CVolumeSpikeConfirmation()
{
    m_symbol = "";
    m_timeframe = PERIOD_M5;
    m_volume_score = 0;
    m_average_volume = 0;
    m_current_volume_ratio = 1.0;
}

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CVolumeSpikeConfirmation::~CVolumeSpikeConfirmation()
{
    // No indicator handles to release
}

//+------------------------------------------------------------------+
//| Initialize                                                        |
//+------------------------------------------------------------------+
bool CVolumeSpikeConfirmation::Initialize(string symbol, ENUM_TIMEFRAMES timeframe)
{
    m_symbol = symbol;
    m_timeframe = timeframe;
    
    // Calculate initial average volume
    m_average_volume = CalculateAverageVolume(20);
    
    Print("Volume Spike Confirmation initialized for ", m_symbol, " on ", EnumToString(m_timeframe));
    return true;
}

//+------------------------------------------------------------------+
//| Update                                                            |
//+------------------------------------------------------------------+
void CVolumeSpikeConfirmation::Update()
{
    // Calculate 20-period average volume
    m_average_volume = CalculateAverageVolume(20);
    
    // Get current bar volume
    long volume[];
    ArraySetAsSeries(volume, true);
    
    if(CopyTickVolume(m_symbol, m_timeframe, 0, 1, volume) < 1)
    {
        m_volume_score = 0;
        m_current_volume_ratio = 1.0;
        return;
    }
    
    double current_volume = (double)volume[0];
    
    // Calculate volume ratio
    if(m_average_volume > 0)
        m_current_volume_ratio = current_volume / m_average_volume;
    else
        m_current_volume_ratio = 1.0;
    
    // Calculate volume score based on ratio
    // Ratio 2.0-3.0: Score = 80
    // Ratio 3.0-5.0: Score = 90
    // Ratio >5.0: Score = 100
    // Ratio <2.0: Score = (ratio / 2.0) * 80
    
    if(m_current_volume_ratio >= 5.0)
    {
        m_volume_score = 100.0;
    }
    else if(m_current_volume_ratio >= 3.0)
    {
        m_volume_score = 90.0;
    }
    else if(m_current_volume_ratio >= 2.0)
    {
        m_volume_score = 80.0;
    }
    else
    {
        // Linear scaling from 0 to 80 for ratios 0 to 2.0
        m_volume_score = (m_current_volume_ratio / 2.0) * 80.0;
    }
    
    // Clamp to 0-100
    m_volume_score = MathMax(0, MathMin(100, m_volume_score));
}

//+------------------------------------------------------------------+
//| Calculate average volume                                          |
//+------------------------------------------------------------------+
double CVolumeSpikeConfirmation::CalculateAverageVolume(int periods)
{
    long volume[];
    ArraySetAsSeries(volume, true);
    
    // Get volume for the specified number of periods
    // Start from bar 1 to exclude current incomplete bar
    if(CopyTickVolume(m_symbol, m_timeframe, 1, periods, volume) < periods)
        return 0;
    
    double sum = 0;
    for(int i = 0; i < periods; i++)
    {
        sum += (double)volume[i];
    }
    
    return sum / periods;
}

//+------------------------------------------------------------------+
//| Detect volume spike                                               |
//+------------------------------------------------------------------+
bool CVolumeSpikeConfirmation::DetectVolumeSpike()
{
    // Spike detected if current volume > 2.0 * average volume
    return (m_current_volume_ratio > 2.0);
}

//+------------------------------------------------------------------+
//| Check if volume spike is present                                  |
//+------------------------------------------------------------------+
bool CVolumeSpikeConfirmation::IsVolumeSpikePresent()
{
    return DetectVolumeSpike();
}
//+------------------------------------------------------------------+
