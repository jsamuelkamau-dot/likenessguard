//+------------------------------------------------------------------+
//|                                          DataStructures.mqh      |
//|                        Common data structures for BCS v2.0       |
//+------------------------------------------------------------------+
#property copyright "BCS v2.0"
#property strict

//+------------------------------------------------------------------+
//| Trade State Structure                                             |
//+------------------------------------------------------------------+
struct STradeState
{
    ulong     ticket;
    string    symbol;
    int       direction;        // 1=buy, -1=sell, 0=none
    double    entry_price;
    double    stop_loss;
    double    take_profit;
    double    lot_size;
    datetime  entry_time;
    bool      is_active;
    
    // Scaled entry tracking
    ulong     ticket1, ticket2, ticket3;
    bool      entry1_filled, entry2_filled, entry3_filled;
    
    // Partial profit tracking
    bool      tp1_taken;
    bool      tp2_taken;
    bool      trailing_active;
    double    initial_lots;
    double    remaining_lots;
    
    // Performance tracking
    double    max_profit;
    double    max_drawdown;
    double    current_pnl;
};

//+------------------------------------------------------------------+
//| Layer Scores Structure                                            |
//+------------------------------------------------------------------+
struct SLayerScores
{
    // Layer 1: Macro Context
    double    volatility_score;
    double    session_score;
    bool      news_clear;
    bool      layer1_pass;
    
    // Layer 2: Structural Analysis
    double    trend_score;
    bool      order_block_present;
    bool      liquidity_sweep_detected;
    bool      layer2_pass;
    
    // Layer 3: Momentum & Reflexivity
    double    reflexivity_score;
    double    overextension_score;
    double    mtf_momentum_score;
    bool      divergence_detected;
    bool      layer3_pass;
    
    // Layer 4: Precision Entry
    double    volume_score;
    double    candle_quality_score;
    bool      microstructure_pass;
    bool      layer4_pass;
    
    // Layer 5: Risk & Execution
    double    current_risk_percent;
    double    position_size;
    double    calculated_sl;
    double    calculated_tp;
    bool      layer5_pass;
    
    // Layer 6: Trade Management
    bool      emergency_exit_triggered;
    bool      layer6_pass;
    
    // Overall confluence
    int       total_layers_passed;
    double    confluence_score;      // 0-100
    bool      all_layers_pass;
};

//+------------------------------------------------------------------+
//| Performance Metrics Structure                                     |
//+------------------------------------------------------------------+
struct SPerformanceMetrics
{
    // Trade statistics
    int       total_trades;
    int       winning_trades;
    int       losing_trades;
    double    win_rate;
    
    // Profit/Loss
    double    total_profit;
    double    total_loss;
    double    net_profit;
    double    profit_factor;
    
    // Risk metrics
    double    max_drawdown;
    double    current_drawdown;
    double    equity_peak;
    double    daily_pnl;
    double    weekly_pnl;
    
    // R-multiple statistics
    double    avg_r_per_trade;
    double    total_r_earned;
    
    // Consecutive tracking
    int       consecutive_wins;
    int       consecutive_losses;
    int       max_consecutive_wins;
    int       max_consecutive_losses;
    
    // Equity curve
    double    equity_ma20;
    double    equity_ma10;
    bool      equity_above_ma;
    
    // Timestamps
    datetime  last_trade_time;
    datetime  daily_reset_time;
    datetime  weekly_reset_time;
};

//+------------------------------------------------------------------+
//| Order Block Structure                                             |
//+------------------------------------------------------------------+
struct SOrderBlock
{
    datetime  time;
    double    high;
    double    low;
    bool      is_bullish;
    int       strength;          // 1-10
    datetime  expiry;
    int       touch_count;
    bool      is_fresh;
    ENUM_TIMEFRAMES timeframe;
};

//+------------------------------------------------------------------+
//| Liquidity Sweep Structure                                         |
//+------------------------------------------------------------------+
struct SLiquiditySweep
{
    datetime  time;
    double    sweep_level;
    bool      swept_high;        // true=high swept, false=low swept
    double    reversal_zone_start;
    double    reversal_zone_end;
    bool      is_valid;
    int       bars_since_sweep;
};

//+------------------------------------------------------------------+
//| Scaled Entry Structure                                            |
//+------------------------------------------------------------------+
struct SScaledEntry
{
    ulong     ticket1, ticket2, ticket3;
    double    entry1, entry2, entry3;
    double    lots1, lots2, lots3;
    bool      entry1_filled, entry2_filled, entry3_filled;
    datetime  entry1_time, entry2_time, entry3_time;
    int       bars_since_entry1;
    bool      is_active;
};

//+------------------------------------------------------------------+
//| Partial Profit State Structure                                    |
//+------------------------------------------------------------------+
struct SPartialProfitState
{
    ulong     ticket;
    double    entry_price;
    double    stop_loss;
    double    initial_lots;
    double    remaining_lots;
    bool      tp1_taken;         // 30% at 0.8R
    bool      tp2_taken;         // 40% at 1.5R
    bool      trailing_active;   // After TP2
    bool      breakeven_moved;   // SL moved to breakeven
};

//+------------------------------------------------------------------+
//| Optimization Result Structure                                     |
//+------------------------------------------------------------------+
struct SOptimizationResult
{
    datetime  timestamp;
    int       trades_analyzed;
    double    validation_profit_factor;
    double    validation_win_rate;
    double    validation_max_dd;
    bool      parameters_updated;
    string    parameters_changed;
    
    // Optimized parameters
    double    opt_adx_threshold;
    double    opt_volume_mult;
    double    opt_risk_percent;
    double    opt_tp1_r;
    double    opt_tp2_r;
};

//+------------------------------------------------------------------+
//| Pair Configuration Structure                                      |
//+------------------------------------------------------------------+
struct SPairConfig
{
    string    symbol;
    
    // Golden hours (GMT)
    int       golden_hour_start1;
    int       golden_hour_end1;
    int       golden_hour_start2;
    int       golden_hour_end2;
    
    // Spread limits
    double    max_spread_points;
    double    max_spread_pips;      // For display/config purposes
    
    // ATR multipliers
    double    atr_sl_multiplier;
    double    atr_tp_multiplier;
    
    // Lot size limits
    double    min_lot;
    double    max_lot;
    double    lot_step;
    
    // Correlation group
    string    correlation_group;
    
    // Threshold parameters
    double    min_trend_score;
    double    min_momentum_score;
    double    min_volume_ratio;
};

//+------------------------------------------------------------------+
//| Volatility Regime Enum                                            |
//+------------------------------------------------------------------+
enum EVolatilityRegime
{
    REGIME_QUIET,
    REGIME_NORMAL,
    REGIME_VOLATILE,
    REGIME_EXTREME
};

//+------------------------------------------------------------------+
//| Session Tier Enum                                                 |
//+------------------------------------------------------------------+
enum ESessionTier
{
    TIER_1_GOLDEN,
    TIER_2_GOOD,
    TIER_3_ACCEPTABLE,
    TIER_4_AVOID
};

//+------------------------------------------------------------------+
//| Divergence Type Enum                                              |
//+------------------------------------------------------------------+
enum EDivergenceType
{
    NO_DIVERGENCE,
    REGULAR_BULLISH,
    REGULAR_BEARISH,
    HIDDEN_BULLISH,
    HIDDEN_BEARISH
};

//+------------------------------------------------------------------+
//| Trade Direction Enum                                              |
//+------------------------------------------------------------------+
enum ETradeDirection
{
    DIRECTION_NONE = 0,
    DIRECTION_BUY = 1,
    DIRECTION_SELL = -1
};

//+------------------------------------------------------------------+
//| Emergency Exit Reason Enum                                        |
//+------------------------------------------------------------------+
enum EEmergencyExitReason
{
    EXIT_NONE,
    EXIT_DAILY_LOSS_LIMIT,
    EXIT_WEEKLY_LOSS_LIMIT,
    EXIT_PRICE_SPIKE,
    EXIT_CORRELATION_RISK,
    EXIT_MARGIN_PROTECTION,
    EXIT_WEEKEND_PROTECTION
};
//+------------------------------------------------------------------+
