import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useDarkMode } from '../contexts/DarkModeContext';
import './TrendChart.css';

/**
 * TrendChart Component
 * 
 * Renders a single time-series chart from rolling buffer data.
 * Never creates or manages interval timers (owned exclusively by MachineDetailPage).
 * 
 * @param {string} sensorName - Name of the sensor (e.g., "Temperature", "Vibration")
 * @param {number[]} values - Rolling buffer from parent (50-100 points)
 * @param {number} [threshold] - Optional threshold value for reference line
 * @param {string} unit - Unit of measurement (e.g., "K", "μm", "Nm", "rpm")
 */
function TrendChart({ sensorName, values, threshold, unit }) {
  const { darkMode } = useDarkMode();

  // Convert values array to chart data format (index-based x-axis)
  const chartData = values.map((value, index) => ({
    index,
    value
  }));

  // Responsive chart height based on viewport
  const getChartHeight = () => {
    if (window.innerWidth < 480) return 200;
    if (window.innerWidth < 768) return 220;
    return 250;
  };

  const [chartHeight, setChartHeight] = React.useState(getChartHeight());

  React.useEffect(() => {
    const handleResize = () => {
      setChartHeight(getChartHeight());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dark mode color scheme
  const colors = darkMode ? {
    background: '#1e1e1e',
    text: '#e0e0e0',
    grid: '#404040',
    line: '#4a9eff',
    threshold: '#ff6b6b',
    tooltip: '#2d2d2d',
    tooltipBorder: '#555'
  } : {
    background: '#f8f9fa',
    text: '#2c3e50',
    grid: '#e0e0e0',
    line: '#007bff',
    threshold: '#dc3545',
    tooltip: '#fff',
    tooltipBorder: '#ccc'
  };

  // Sensor-specific line colors
  const sensorColors = {
    'Temperature': darkMode ? '#ff6b6b' : '#dc3545',
    'Vibration': darkMode ? '#a78bfa' : '#6610f2',
    'Torque': darkMode ? '#34d399' : '#20c997',
    'Rotational Speed': darkMode ? '#60a5fa' : '#007bff',
    'Tool Wear': darkMode ? '#fbbf24' : '#ffc107'
  };

  const lineColor = sensorColors[sensorName] || colors.line;

  return (
    <div className={`trend-chart ${darkMode ? 'dark-mode' : ''}`}>
      <h3 className="chart-title">{sensorName}</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis 
            dataKey="index" 
            label={{ 
              value: 'Time Progression', 
              position: 'insideBottom', 
              offset: -5,
              style: { fill: colors.text }
            }}
            stroke={colors.text}
            tick={{ fontSize: window.innerWidth < 768 ? 11 : 12, fill: colors.text }}
          />
          <YAxis 
            label={{ 
              value: `${sensorName} (${unit})`, 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: colors.text }
            }}
            stroke={colors.text}
            tick={{ fontSize: window.innerWidth < 768 ? 11 : 12, fill: colors.text }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: colors.tooltip, 
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: '4px',
              color: colors.text
            }}
            labelFormatter={(value) => `Time: ${value}`}
            formatter={(value) => [`${value.toFixed(2)} ${unit}`, sensorName]}
          />
          {threshold !== undefined && (
            <ReferenceLine 
              y={threshold} 
              stroke={colors.threshold} 
              strokeDasharray="5 5"
              strokeWidth={1}
              opacity={0.6}
              label={{ 
                value: 'Threshold', 
                position: 'right',
                style: { fill: colors.threshold, fontSize: 11 }
              }}
            />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;
