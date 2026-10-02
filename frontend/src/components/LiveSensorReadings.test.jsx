import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveSensorReadings from './LiveSensorReadings';

describe('LiveSensorReadings', () => {
  describe('Unit Tests', () => {
    test('should render section title', () => {
      const sensors = [
        { name: 'Temperature', value: 350, unit: 'K', thresholdExceeded: false }
      ];

      render(<LiveSensorReadings sensors={sensors} />);
      expect(screen.getByText('Live Sensor Readings')).toBeInTheDocument();
    });

    test('should render all sensor cards', () => {
      const sensors = [
        { name: 'Temperature', value: 350, unit: 'K', thresholdExceeded: false },
        { name: 'Vibration', value: 45, unit: 'μm', thresholdExceeded: false },
        { name: 'Torque', value: 120, unit: 'Nm', thresholdExceeded: true }
      ];

      const { container } = render(<LiveSensorReadings sensors={sensors} />);
      const cards = container.querySelectorAll('.sensor-card');
      expect(cards.length).toBe(3);
    });

    test('should display message when no sensors provided', () => {
      render(<LiveSensorReadings sensors={[]} />);
      expect(screen.getByText('No sensor data available')).toBeInTheDocument();
    });

    test('should display message when sensors is null', () => {
      render(<LiveSensorReadings sensors={null} />);
      expect(screen.getByText('No sensor data available')).toBeInTheDocument();
    });

    test('should display message when sensors is undefined', () => {
      render(<LiveSensorReadings sensors={undefined} />);
      expect(screen.getByText('No sensor data available')).toBeInTheDocument();
    });

    test('should render sensor grid with correct class', () => {
      const sensors = [
        { name: 'Temperature', value: 350, unit: 'K', thresholdExceeded: false }
      ];

      const { container } = render(<LiveSensorReadings sensors={sensors} />);
      const grid = container.querySelector('.sensor-grid');
      expect(grid).toBeTruthy();
    });

    test('should update when sensors prop changes', () => {
      const initialSensors = [
        { name: 'Temperature', value: 350, unit: 'K', thresholdExceeded: false }
      ];

      const { container, rerender } = render(<LiveSensorReadings sensors={initialSensors} />);
      expect(container.querySelectorAll('.sensor-card').length).toBe(1);

      const updatedSensors = [
        { name: 'Temperature', value: 350, unit: 'K', thresholdExceeded: false },
        { name: 'Vibration', value: 45, unit: 'μm', thresholdExceeded: false }
      ];

      rerender(<LiveSensorReadings sensors={updatedSensors} />);
      expect(container.querySelectorAll('.sensor-card').length).toBe(2);
    });

    test('should render sensors in responsive grid layout', () => {
      const sensors = [
        { name: 'Temperature', value: 350, unit: 'K', thresholdExceeded: false },
        { name: 'Vibration', value: 45, unit: 'μm', thresholdExceeded: false },
        { name: 'Torque', value: 120, unit: 'Nm', thresholdExceeded: false },
        { name: 'Rotational Speed', value: 1500, unit: 'rpm', thresholdExceeded: false },
        { name: 'Tool Wear', value: 200, unit: 'min', thresholdExceeded: false }
      ];

      const { container } = render(<LiveSensorReadings sensors={sensors} />);
      const grid = container.querySelector('.sensor-grid');
      expect(grid).toBeTruthy();
      
      const cards = container.querySelectorAll('.sensor-card');
      expect(cards.length).toBe(5);
    });
  });
});
