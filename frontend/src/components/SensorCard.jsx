import React from 'react';
import './SensorCard.css';

function SensorCard({ sensor }) {
  const { name, value, unit, thresholdExceeded } = sensor;

  return (
    <div className={`sensor-card ${thresholdExceeded ? 'threshold-exceeded' : ''}`}>
      <div className="sensor-name">{name}</div>
      <div className="sensor-value">
        {typeof value === 'number' ? value.toFixed(2) : value}
        <span className="sensor-unit">{unit}</span>
      </div>
    </div>
  );
}

export default SensorCard;
