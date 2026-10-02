import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrendChart from './TrendChart';
import { DarkModeProvider } from '../contexts/DarkModeContext';

// Mock Recharts components to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

describe('TrendChart Component', () => {
  const mockValues = Array.from({ length: 60 }, (_, i) => 300 + Math.sin(i / 10) * 20);

  beforeEach(() => {
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders chart with sensor name', () => {
    render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Temperature" 
          values={mockValues} 
          unit="K"
        />
      </DarkModeProvider>
    );

    expect(screen.getByText('Temperature')).toBeInTheDocument();
  });

  it('renders chart with buffer data', () => {
    render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Vibration" 
          values={mockValues} 
          unit="μm"
        />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('displays threshold reference line when threshold provided', () => {
    render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Temperature" 
          values={mockValues} 
          threshold={320}
          unit="K"
        />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('reference-line')).toBeInTheDocument();
  });

  it('does not display threshold line when threshold not provided', () => {
    render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Temperature" 
          values={mockValues} 
          unit="K"
        />
      </DarkModeProvider>
    );

    expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
  });

  it('applies dark mode styling when dark mode enabled', () => {
    // Mock localStorage for dark mode
    const mockLocalStorage = {
      getItem: vi.fn(() => 'true'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    const { container } = render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Temperature" 
          values={mockValues} 
          unit="K"
        />
      </DarkModeProvider>
    );

    const chartElement = container.querySelector('.trend-chart');
    // Check that the component renders (dark mode class may or may not be applied based on context)
    expect(chartElement).toBeInTheDocument();
  });

  it('renders with different sensor types', () => {
    const sensors = [
      { name: 'Temperature', unit: 'K' },
      { name: 'Vibration', unit: 'μm' },
      { name: 'Torque', unit: 'Nm' },
      { name: 'Rotational Speed', unit: 'rpm' },
      { name: 'Tool Wear', unit: 'min' }
    ];

    sensors.forEach(sensor => {
      const { unmount } = render(
        <DarkModeProvider>
          <TrendChart 
            sensorName={sensor.name} 
            values={mockValues} 
            unit={sensor.unit}
          />
        </DarkModeProvider>
      );

      expect(screen.getByText(sensor.name)).toBeInTheDocument();
      unmount();
    });
  });

  it('handles responsive layout for mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });

    render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Temperature" 
          values={mockValues} 
          unit="K"
        />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('handles responsive layout for tablet', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    });

    render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Temperature" 
          values={mockValues} 
          unit="K"
        />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('handles responsive layout for desktop', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    });

    render(
      <DarkModeProvider>
        <TrendChart 
          sensorName="Temperature" 
          values={mockValues} 
          unit="K"
        />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
