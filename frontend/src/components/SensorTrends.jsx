import React from 'react';
import TrendChart from './TrendChart';
import './SensorTrends.css';

/**
 * SensorTrends Component
 * 
 * Displays time-series charts for all sensors in a 2-column grid layout.
 * Updates charts when trendBuffers prop changes.
 * Never creates or manages interval timers (owned exclusively by MachineDetailPage).
 * 
 * @param {Map<string, number[]>} trendBuffers - Rolling buffers from parent (50-100 points per sensor)
 * @param {Map<string, number>} thresholds - Threshold values per sensor
 */
function SensorTrends({ trendBuffers, thresholds = new Map() }) {
  // Sensor configuration with display names and units
  // These must match the SENSOR_NAME_MAP in MachineDetail.jsx
  const sensorConfig = [
    { key: 'Temperature', name: 'Temperature', unit: 'K' },
    { key: 'Air Temperature', name: 'Air Temperature', unit: 'K' },
    { key: 'Rotational Speed', name: 'Rotational Speed', unit: 'rpm' },
    { key: 'Torque', name: 'Torque', unit: 'Nm' },
    { key: 'Tool Wear', name: 'Tool Wear', unit: 'min' },
    { key: 'Vibration', name: 'Vibration', unit: 'μm' }
  ];

  // Check if we have data to render charts
  const hasData = trendBuffers && trendBuffers.size > 0;
  
  if (!hasData) {
    return (
      <div className="sensor-trends">
        <div className="no-data-message">
          <p>Loading sensor trend data...</p>
          <p>Charts will appear once data is available.</p>
        </div>
      </div>
    );
  }

  // Log buffer status for debugging
  const bufferLengths = Array.from(trendBuffers.values()).map(buf => buf.length);
  const minDataPoints = bufferLengths.length > 0 ? Math.min(...bufferLengths) : 0;
  const maxDataPoints = bufferLengths.length > 0 ? Math.max(...bufferLengths) : 0;
  console.log('[SensorTrends] Rendering charts - min:', minDataPoints, 'max:', maxDataPoints, 'data points');

  return (
    <div className="sensor-trends">
      <div className="trends-grid">
        {sensorConfig.map(sensor => {
          const values = trendBuffers.get(sensor.key);
          const threshold = thresholds.get(sensor.key);
          
          // Only render if we have data for this sensor
          if (!values || values.length === 0) {
            console.warn(`[SensorTrends] No data for sensor: ${sensor.key}`);
            return (
              <div key={sensor.key} className="trend-chart-placeholder">
                <h3>{sensor.name}</h3>
                <p>No data available</p>
              </div>
            );
          }

          return (
            <TrendChart
              key={sensor.key}
              sensorName={sensor.name}
              values={values}
              threshold={threshold}
              unit={sensor.unit}
            />
          );
        })}
      </div>
    </div>
  );
}

export default SensorTrends;
