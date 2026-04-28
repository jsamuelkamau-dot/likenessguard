/**
 * Property-Based Tests for RiskGauge Component
 * Feature: interpose-saas-platform
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { RiskGauge } from '../components/RiskGauge';
import { theme } from '../styles/theme';

describe('RiskGauge Property Tests', () => {
  afterEach(() => {
    cleanup();
  });

  // Feature: interpose-saas-platform, Property 24: Risk Gauge Color Mapping - Low Risk
  // Validates: Requirements 12.2
  test('Property 24: Low risk scores (0-30) should display green color', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        (score) => {
          const { getByTestId, unmount } = render(<RiskGauge score={score} />);
          const gaugeCircle = getByTestId('gauge-circle');
          const gaugeScore = getByTestId('gauge-score');
          
          expect(gaugeCircle.getAttribute('stroke')).toBe(theme.colors.accent.green);
          expect(gaugeScore.getAttribute('fill')).toBe(theme.colors.accent.green);
          
          const gaugeContainer = getByTestId('risk-gauge');
          expect(gaugeContainer.className).not.toContain('pulse');
          
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: interpose-saas-platform, Property 25: Risk Gauge Color Mapping - Medium Risk
  // Validates: Requirements 12.3
  test('Property 25: Medium risk scores (31-70) should display yellow color', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 31, max: 70 }),
        (score) => {
          const { getByTestId, unmount } = render(<RiskGauge score={score} />);
          const gaugeCircle = getByTestId('gauge-circle');
          const gaugeScore = getByTestId('gauge-score');
          
          expect(gaugeCircle.getAttribute('stroke')).toBe(theme.colors.accent.yellow);
          expect(gaugeScore.getAttribute('fill')).toBe(theme.colors.accent.yellow);
          
          const gaugeContainer = getByTestId('risk-gauge');
          expect(gaugeContainer.className).not.toContain('pulse');
          
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: interpose-saas-platform, Property 26: Risk Gauge Color Mapping - High Risk
  // Validates: Requirements 12.4, 12.5
  test('Property 26: High risk scores (>70) should display red color with pulse animation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 71, max: 100 }),
        (score) => {
          const { getByTestId, unmount } = render(<RiskGauge score={score} />);
          const gaugeCircle = getByTestId('gauge-circle');
          const gaugeScore = getByTestId('gauge-score');
          
          expect(gaugeCircle.getAttribute('stroke')).toBe(theme.colors.accent.red);
          expect(gaugeScore.getAttribute('fill')).toBe(theme.colors.accent.red);
          
          const gaugeContainer = getByTestId('risk-gauge');
          expect(gaugeContainer.className).toContain('pulse');
          
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});