import React from 'react';
import { getRiskColor, getRiskGlow } from '../styles/theme';
import './RiskGauge.css';

interface RiskGaugeProps {
  score: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = getRiskColor(clampedScore);
  const glow = getRiskGlow(clampedScore);
  const shouldPulse = clampedScore > 70;
  
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (clampedScore / 100) * circumference;
  const strokeDasharray = progress + ' ' + circumference;
  
  return (
    <div className={'risk-gauge' + (shouldPulse ? ' pulse' : '')} data-testid="risk-gauge">
      <svg viewBox="0 0 100 100" width="100" height="100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{
            filter: 'drop-shadow(' + glow + ')',
            transition: 'stroke-dasharray 0.3s ease, stroke 0.3s ease'
          }}
          data-testid="gauge-circle"
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fill={color}
          fontSize="20"
          fontWeight="bold"
          data-testid="gauge-score"
        >
          {clampedScore}
        </text>
      </svg>
    </div>
  );
};

export default RiskGauge;