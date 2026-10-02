import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './TrendCharts.css';

function TrendCharts({ history, trendBuffers }) {
  // Use trendBuffers if available and has sufficient data, otherwise fall back to history
  const useTrendBuffers = trendBuffers && trendBuffers.size > 0;
  
  let chartData = [];
  
  if (useTrendBuffers) {
    // Convert trendBuffers Map to chart data format
    const bufferLength = Math.max(...Array.from(trendBuffers.values()).map(buf => buf.length));
    chartData = Array.from({ length: bufferLength }, (_, index) => {
      const dataPoint = { index };
      trendBuffers.forEach((values, sensorName) => {
        // Map sensor names to expected keys
        const key = sensorName.toLowerCase().replace(/\s+/g, '_');
        dataPoint[key] = values[index] !== undefined ? values[index] : null;
      });
      return dataPoint;
    });
  } else if (history && history.length > 0) {
    // Fall back to history data
    chartData = history.map((record, index) => ({
      index: index,
      temperature: record.temperature,
      air_temperature: record.air_temperature,
      vibration: record.vibration,
      torque: record.torque,
      rotational_speed: record.rotational_speed,
      tool_wear: record.tool_wear
    }));
  }

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

  // Don't render if insufficient data
  if (chartData.length < 2) {
    return (
      <div className="trend-charts">
        <p className="no-data-message">Insufficient data for trend visualization. Play simulation to collect data points.</p>
      </div>
    );
  }

  return (
    <div className="trend-charts">
      {/* Temperature Chart */}
      <div className="chart-container">
        <h3 className="chart-title">Temperature Trends</h3>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="index" 
              label={{ value: 'Time Steps', position: 'insideBottom', offset: -5 }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <YAxis 
              label={{ value: 'Temperature (K)', angle: -90, position: 'insideLeft' }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => `Step: ${value}`}
            />
            <Legend wrapperStyle={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }} />
            <Line 
              type="monotone" 
              dataKey="temperature" 
              stroke="#dc3545" 
              name="Process Temp"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="air_temperature" 
              stroke="#fd7e14" 
              name="Air Temp"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Vibration Chart */}
      <div className="chart-container">
        <h3 className="chart-title">Vibration Trends</h3>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="index" 
              label={{ value: 'Time Steps', position: 'insideBottom', offset: -5 }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <YAxis 
              label={{ value: 'Vibration (μm)', angle: -90, position: 'insideLeft' }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => `Step: ${value}`}
            />
            <Legend wrapperStyle={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }} />
            <Line 
              type="monotone" 
              dataKey="vibration" 
              stroke="#6610f2" 
              name="Vibration"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Torque Chart */}
      <div className="chart-container">
        <h3 className="chart-title">Torque Trends</h3>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="index" 
              label={{ value: 'Time Steps', position: 'insideBottom', offset: -5 }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <YAxis 
              label={{ value: 'Torque (Nm)', angle: -90, position: 'insideLeft' }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => `Step: ${value}`}
            />
            <Legend wrapperStyle={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }} />
            <Line 
              type="monotone" 
              dataKey="torque" 
              stroke="#20c997" 
              name="Torque"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rotational Speed Chart */}
      <div className="chart-container">
        <h3 className="chart-title">Rotational Speed Trends</h3>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="index" 
              label={{ value: 'Time Steps', position: 'insideBottom', offset: -5 }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <YAxis 
              label={{ value: 'Speed (rpm)', angle: -90, position: 'insideLeft' }}
              stroke="#6c757d"
              tick={{ fontSize: window.innerWidth < 768 ? 11 : 12 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => `Step: ${value}`}
            />
            <Legend wrapperStyle={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }} />
            <Line 
              type="monotone" 
              dataKey="rotational_speed" 
              stroke="#007bff" 
              name="Rotational Speed"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendCharts;
