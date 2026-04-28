/**
 * TimelineChart Component
 * Displays a line chart showing log entry counts aggregated by hour for the past 24 hours
 * Uses recharts library for visualization with theme colors
 */

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LogEntry } from '../types';
import { theme } from '../styles/theme';

interface TimelineChartProps {
  logs: LogEntry[];
}

interface HourlyData {
  hour: string;
  count: number;
  timestamp: number;
}

/**
 * Filters logs to only include entries from the past 24 hours
 */
const filterLast24Hours = (logs: LogEntry[]): LogEntry[] => {
  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  return logs.filter(log => log.timestamp >= twentyFourHoursAgo && log.timestamp <= now);
};

/**
 * Aggregates logs by hour and returns data for the chart
 */
const aggregateByHour = (logs: LogEntry[]): HourlyData[] => {
  // Create a map to count logs per hour
  const hourlyMap = new Map<number, number>();
  
  // Initialize all hours in the past 24 hours with 0 count
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    const hourTimestamp = now - (i * 60 * 60 * 1000);
    const hourKey = Math.floor(hourTimestamp / (60 * 60 * 1000));
    hourlyMap.set(hourKey, 0);
  }
  
  // Count logs for each hour
  logs.forEach(log => {
    const hourKey = Math.floor(log.timestamp / (60 * 60 * 1000));
    const currentCount = hourlyMap.get(hourKey) || 0;
    hourlyMap.set(hourKey, currentCount + 1);
  });
  
  // Convert map to array and format for recharts
  const data: HourlyData[] = Array.from(hourlyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hourKey, count]) => {
      const timestamp = hourKey * 60 * 60 * 1000;
      const date = new Date(timestamp);
      const hour = date.getHours().toString().padStart(2, '0');
      return {
        hour: `${hour}:00`,
        count,
        timestamp
      };
    });
  
  return data;
};

export const TimelineChart: React.FC<TimelineChartProps> = ({ logs }) => {
  // Filter logs to past 24 hours and aggregate by hour
  const chartData = useMemo(() => {
    const filteredLogs = filterLast24Hours(logs);
    return aggregateByHour(filteredLogs);
  }, [logs]);
  
  return (
    <div style={{
      background: theme.effects.glassMorphism.background,
      backdropFilter: theme.effects.glassMorphism.backdropFilter,
      border: theme.effects.glassMorphism.border,
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h3 style={{
        color: theme.colors.text.primary,
        marginTop: 0,
        marginBottom: '20px',
        fontSize: '18px',
        fontWeight: 600
      }}>
        Activity Timeline (Past 24 Hours)
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.colors.text.muted}
            opacity={0.2}
          />
          <XAxis 
            dataKey="hour" 
            stroke={theme.colors.text.secondary}
            tick={{ fill: theme.colors.text.secondary }}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke={theme.colors.text.secondary}
            tick={{ fill: theme.colors.text.secondary }}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: theme.colors.background.tertiary,
              border: `1px solid ${theme.colors.accent.cyan}`,
              borderRadius: '4px',
              color: theme.colors.text.primary
            }}
            labelStyle={{ color: theme.colors.text.primary }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke={theme.colors.accent.cyan}
            strokeWidth={2}
            dot={{ fill: theme.colors.accent.cyan, r: 4 }}
            activeDot={{ r: 6, fill: theme.colors.accent.magenta }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimelineChart;