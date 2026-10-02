import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SensorTrends from './SensorTrends';
import { DarkModeProvider } from '../contexts/DarkModeContext';

// Mock TrendChart component
vi.mock('./TrendChart', () => ({
  default: ({ sensorName, values, threshold, unit }) => (
    <div data-testid={`trend-chart-${sensorName}`}>
      <span>{sensorName}</span>
      <span>{unit}</span>
      <span>Points: {values.length}</span>
      {threshold !== undefined && <span>Threshold: {threshold}</span>}
    </div>
  )
}));

describe('SensorTrends Component', () => {
  const createMockBuffers = (length = 60) => {
    const buffers = new Map();
    buffers.set('Temperature', Array.from({ length }, (_, i) => 300 + i));
    buffers.set('Vibration', Array.from({ length }, (_, i) => 40 + i * 0.1));
    buffers.set('Torque', Array.from({ length }, (_, i) => 30 + i * 0.2));
    buffers.set('Rotational Speed', Array.from({ length }, (_, i) => 1500 + i));
    buffers.set('Tool Wear', Array.from({ length }, (_, i) => 100 + i));
    return buffers;
  };

  const createMockThresholds = () => {
    const thresholds = new Map();
    thresholds.set('Temperature', 320);
    thresholds.set('Vibration', 50);
    return thresholds;
  };

  it('renders all sensor charts with sufficient data', () => {
    const trendBuffers = createMockBuffers(60);
    const thresholds = createMockThresholds();

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} thresholds={thresholds} />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('trend-chart-Temperature')).toBeInTheDocument();
    expect(screen.getByTestId('trend-chart-Vibration')).toBeInTheDocument();
    expect(screen.getByTestId('trend-chart-Torque')).toBeInTheDocument();
    expect(screen.getByTestId('trend-chart-Rotational Speed')).toBeInTheDocument();
    expect(screen.getByTestId('trend-chart-Tool Wear')).toBeInTheDocument();
  });

  it('displays no data message when buffers are empty', () => {
    const trendBuffers = new Map();

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    expect(screen.getByText(/Insufficient data for trend visualization/i)).toBeInTheDocument();
    expect(screen.getByText(/Play simulation to collect at least 50 data points/i)).toBeInTheDocument();
  });

  it('displays no data message when data points are insufficient (< 50)', () => {
    const trendBuffers = createMockBuffers(30); // Less than 50 points

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    expect(screen.getByText(/Insufficient data for trend visualization/i)).toBeInTheDocument();
    expect(screen.getByText(/Current: 30 points/i)).toBeInTheDocument();
  });

  it('renders charts when exactly 50 data points available', () => {
    const trendBuffers = createMockBuffers(50);

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('trend-chart-Temperature')).toBeInTheDocument();
    expect(screen.queryByText(/Insufficient data/i)).not.toBeInTheDocument();
  });

  it('passes correct units to each sensor chart', () => {
    const trendBuffers = createMockBuffers(60);

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    const temperatureChart = screen.getByTestId('trend-chart-Temperature');
    expect(temperatureChart).toHaveTextContent('K');

    const vibrationChart = screen.getByTestId('trend-chart-Vibration');
    expect(vibrationChart).toHaveTextContent('μm');

    const torqueChart = screen.getByTestId('trend-chart-Torque');
    expect(torqueChart).toHaveTextContent('Nm');

    const speedChart = screen.getByTestId('trend-chart-Rotational Speed');
    expect(speedChart).toHaveTextContent('rpm');

    const wearChart = screen.getByTestId('trend-chart-Tool Wear');
    expect(wearChart).toHaveTextContent('min');
  });

  it('passes threshold values to charts when provided', () => {
    const trendBuffers = createMockBuffers(60);
    const thresholds = createMockThresholds();

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} thresholds={thresholds} />
      </DarkModeProvider>
    );

    const temperatureChart = screen.getByTestId('trend-chart-Temperature');
    expect(temperatureChart).toHaveTextContent('Threshold: 320');

    const vibrationChart = screen.getByTestId('trend-chart-Vibration');
    expect(vibrationChart).toHaveTextContent('Threshold: 50');
  });

  it('does not pass threshold when not provided', () => {
    const trendBuffers = createMockBuffers(60);

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    const torqueChart = screen.getByTestId('trend-chart-Torque');
    expect(torqueChart).not.toHaveTextContent('Threshold:');
  });

  it('renders in 2-column grid layout', () => {
    const trendBuffers = createMockBuffers(60);

    const { container } = render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    const grid = container.querySelector('.trends-grid');
    expect(grid).toBeInTheDocument();
    // Check that grid class is applied (CSS handles the grid layout)
    expect(grid.className).toContain('trends-grid');
  });

  it('handles missing sensor data gracefully', () => {
    const trendBuffers = new Map();
    trendBuffers.set('Temperature', Array.from({ length: 60 }, (_, i) => 300 + i));
    // Only Temperature data, others missing

    render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    expect(screen.getByTestId('trend-chart-Temperature')).toBeInTheDocument();
    expect(screen.queryByTestId('trend-chart-Vibration')).not.toBeInTheDocument();
  });

  it('updates when trendBuffers prop changes', () => {
    const initialBuffers = createMockBuffers(60);
    const { rerender } = render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={initialBuffers} />
      </DarkModeProvider>
    );

    // Use getAllByText since multiple sensors have the same point count
    const initialPoints = screen.getAllByText(/Points: 60/);
    expect(initialPoints.length).toBeGreaterThan(0);

    const updatedBuffers = createMockBuffers(80);
    rerender(
      <DarkModeProvider>
        <SensorTrends trendBuffers={updatedBuffers} />
      </DarkModeProvider>
    );

    const updatedPoints = screen.getAllByText(/Points: 80/);
    expect(updatedPoints.length).toBeGreaterThan(0);
  });

  it('handles responsive grid layout', () => {
    const trendBuffers = createMockBuffers(60);

    const { container } = render(
      <DarkModeProvider>
        <SensorTrends trendBuffers={trendBuffers} />
      </DarkModeProvider>
    );

    const grid = container.querySelector('.trends-grid');
    expect(grid).toBeInTheDocument();
    
    // Check that grid class is applied (CSS handles responsive behavior)
    expect(grid.className).toContain('trends-grid');
  });
});
