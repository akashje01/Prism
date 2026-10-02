import React from 'react';
import SensorCard from './SensorCard';
import './LiveSensorReadings.css';

function LiveSensorReadings({ sensors }) {
  if (!sensors || sensors.length === 0) {
    return (
      <div className="live-sensor-readings">
        <div className="no-sensors-message">No sensor data available</div>
      </div>
    );
  }

  return (
    <div className="live-sensor-readings">
      <h2 className="section-title">Live Sensor Readings</h2>
      <div className="sensor-grid">
        {sensors.map((sensor, index) => (
          <SensorCard key={sensor.name || index} sensor={sensor} />
        ))}
      </div>
    </div>
  );
}

export default LiveSensorReadings;
