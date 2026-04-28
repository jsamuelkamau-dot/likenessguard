/**
 * Unit Tests for RiskGauge Component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RiskGauge } from '../components/RiskGauge';
import { theme } from '../styles/theme';

describe('RiskGauge Unit Tests', () => {
  describe('Color selection for boundary scores', () => {
    test('Score 30 should display green (low risk)', () => {
      const { getByTestId } = render(<RiskGauge score={30} />);
      const gaugeCircle = getByTestId('gauge-circle');
      const gaugeScore = getByTestId('gauge-score');
      
      expect(gaugeCircle.getAttribute('stroke')).toBe(theme.colors.accent.green);
      expect(gaugeScore.getAttribute('fill')).toBe(theme.colors.accent.green);
    });

    test('Score 31 should display yellow (medium risk)', () => {
      const { getByTestId } = render(<RiskGauge score={31} />);
      const gaugeCircle = getByTestId('gauge-circle');
      const gaugeScore = getByTestId('gauge-score');
      
      expect(gaugeCircle.getAttribute('stroke')).toBe(theme.colors.accent.yellow);
      expect(gaugeScore.getAttribute('fill')).toBe(theme.colors.accent.yellow);
    });

    test('Score 70 should display yellow (medium risk)', () => {
      const { getByTestId } = render(<RiskGauge score={70} />);
      const gaugeCircle = getByTestId('gauge-circle');
      const gaugeScore = getByTestId('gauge-score');
      
      expect(gaugeCircle.getAttribute('stroke')).toBe(theme.colors.accent.yellow);
      expect(gaugeScore.getAttribute('fill')).toBe(theme.colors.accent.yellow);
    });

    test('Score 71 should display red (high risk)', () => {
      const { getByTestId } = render(<RiskGauge score={71} />);
      const gaugeCircle = getByTestId('gauge-circle');
      const gaugeScore = getByTestId('gauge-score');
      
      expect(gaugeCircle.getAttribute('stroke')).toBe(theme.colors.accent.red);
      expect(gaugeScore.getAttribute('fill')).toBe(theme.colors.accent.red);
    });
  });

  describe('Pulse animation', () => {
    test('Score 70 should NOT have pulse animation', () => {
      const { getByTestId } = render(<RiskGauge score={70} />);
      const gaugeContainer = getByTestId('risk-gauge');
      
      expect(gaugeContainer.className).not.toContain('pulse');
    });

    test('Score 71 should have pulse animation', () => {
      const { getByTestId } = render(<RiskGauge score={71} />);
      const gaugeContainer = getByTestId('risk-gauge');
      
      expect(gaugeContainer.className).toContain('pulse');
    });

    test('Score 100 should have pulse animation', () => {
      const { getByTestId } = render(<RiskGauge score={100} />);
      const gaugeContainer = getByTestId('risk-gauge');
      
      expect(gaugeContainer.className).toContain('pulse');
    });
  });

  describe('SVG rendering', () => {
    test('Should render SVG with correct viewBox', () => {
      const { container } = render(<RiskGauge score={50} />);
      const svg = container.querySelector('svg');
      
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100');
    });

    test('Should render background circle', () => {
      const { container } = render(<RiskGauge score={50} />);
      const circles = container.querySelectorAll('circle');
      
      expect(circles.length).toBe(2);
      expect(circles[0].getAttribute('stroke')).toBe('rgba(255, 255, 255, 0.1)');
    });

    test('Should render progress circle with correct stroke-dasharray', () => {
      const { getByTestId } = render(<RiskGauge score={50} />);
      const gaugeCircle = getByTestId('gauge-circle');
      
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      const expectedProgress = (50 / 100) * circumference;
      const expectedDasharray = expectedProgress + ' ' + circumference;
      
      expect(gaugeCircle.getAttribute('stroke-dasharray')).toBe(expectedDasharray);
    });

    test('Should display numeric score in center', () => {
      const { getByTestId } = render(<RiskGauge score={75} />);
      const gaugeScore = getByTestId('gauge-score');
      
      expect(gaugeScore.textContent).toBe('75');
    });

    test('Should clamp score below 0 to 0', () => {
      const { getByTestId } = render(<RiskGauge score={-10} />);
      const gaugeScore = getByTestId('gauge-score');
      
      expect(gaugeScore.textContent).toBe('0');
    });

    test('Should clamp score above 100 to 100', () => {
      const { getByTestId } = render(<RiskGauge score={150} />);
      const gaugeScore = getByTestId('gauge-score');
      
      expect(gaugeScore.textContent).toBe('100');
    });
  });

  describe('Glow effects', () => {
    test('Low risk score should have low glow effect', () => {
      const { getByTestId } = render(<RiskGauge score={20} />);
      const gaugeCircle = getByTestId('gauge-circle');
      const style = gaugeCircle.getAttribute('style');
      
      expect(style).toContain('drop-shadow');
      expect(style).toContain(theme.riskLevels.low.glow);
    });

    test('Medium risk score should have medium glow effect', () => {
      const { getByTestId } = render(<RiskGauge score={50} />);
      const gaugeCircle = getByTestId('gauge-circle');
      const style = gaugeCircle.getAttribute('style');
      
      expect(style).toContain('drop-shadow');
      expect(style).toContain(theme.riskLevels.medium.glow);
    });

    test('High risk score should have high glow effect', () => {
      const { getByTestId } = render(<RiskGauge score={85} />);
      const gaugeCircle = getByTestId('gauge-circle');
      const style = gaugeCircle.getAttribute('style');
      
      expect(style).toContain('drop-shadow');
      expect(style).toContain(theme.riskLevels.high.glow);
    });
  });
});