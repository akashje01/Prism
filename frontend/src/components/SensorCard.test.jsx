import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { fc, test as fcTest } from '@fast-check/vitest';
import SensorCard from './SensorCard';

describe('SensorCard', () => {
  // Feature: prism-frontend-redesign, Property 8: Sensor Highlighting Only on Threshold Exceeded
  // Validates: Requirements 5.5
  describe('Property 8: Sensor Highlighting Only on Threshold Exceeded', () => {
    fcTest.prop([
      fc.record({
        name: fc.constantFrom('Temperature', 'Vibration', 'Torque', 'Rotational Speed', 'Tool Wear'),
        value: fc.double({ min: 0, max: 1000, noNaN: true }),
        unit: fc.constantFrom('K', 'μm', 'Nm', 'rpm', 'min'),
        thresholdExceeded: fc.boolean()
      })
    ])('should highlight if and only if thresholdExceeded is true', (sensor) => {
      const { container } = render(<SensorCard sensor={sensor} />);
      
      const card = container.querySelector('.sensor-card');
      expect(card).toBeTruthy();
      
      const hasHighlight = card.classList.contains('threshold-exceeded');
      
      // Verify highlighting matches thresholdExceeded flag exactly
      expect(hasHighlight).toBe(sensor.thresholdExceeded);
    });
  });

  // Unit tests for specific examples
  describe('Unit Tests', () => {
    test('should render sensor name', () => {
      const sensor = {
        name: 'Temperature',
        value: 350.5,
        unit: 'K',
        thresholdExceeded: false
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      expect(container.textContent).toContain('Temperature');
    });

    test('should render sensor value with 2 decimal places', () => {
      const sensor = {
        name: 'Vibration',
        value: 45.678,
        unit: 'μm',
        thresholdExceeded: false
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      expect(container.textContent).toContain('45.68');
    });

    test('should render sensor unit', () => {
      const sensor = {
        name: 'Torque',
        value: 120.5,
        unit: 'Nm',
        thresholdExceeded: false
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      expect(container.textContent).toContain('Nm');
    });

    test('should NOT highlight when thresholdExceeded is false', () => {
      const sensor = {
        name: 'Temperature',
        value: 300,
        unit: 'K',
        thresholdExceeded: false
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      const card = container.querySelector('.sensor-card');
      expect(card.classList.contains('threshold-exceeded')).toBe(false);
    });

    test('should highlight when thresholdExceeded is true', () => {
      const sensor = {
        name: 'Temperature',
        value: 400,
        unit: 'K',
        thresholdExceeded: true
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      const card = container.querySelector('.sensor-card');
      expect(card.classList.contains('threshold-exceeded')).toBe(true);
    });

    test('should display large numeric value prominently', () => {
      const sensor = {
        name: 'Rotational Speed',
        value: 1500,
        unit: 'rpm',
        thresholdExceeded: false
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      const valueElement = container.querySelector('.sensor-value');
      expect(valueElement).toBeTruthy();
      expect(valueElement.textContent).toContain('1500.00');
    });

    test('should handle zero value', () => {
      const sensor = {
        name: 'Tool Wear',
        value: 0,
        unit: 'min',
        thresholdExceeded: false
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      expect(container.textContent).toContain('0.00');
    });

    test('should handle very large values', () => {
      const sensor = {
        name: 'Vibration',
        value: 999999.99,
        unit: 'μm',
        thresholdExceeded: true
      };

      const { container } = render(<SensorCard sensor={sensor} />);
      expect(container.textContent).toContain('999999.99');
    });
  });
});
