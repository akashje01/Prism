import React from 'react';
import './SensorReadings.css';

// Thresholds from design document
const THRESHOLDS = {
  temperature: {
    advisory: 310,
    action_required: 320
  },
  vibration: {
    advisory: 50,
    action_required: 70
  },
  torque: {
    advisory: 50,
    action_required: 60
  },
  rotational_speed: {
    advisory_low: 1200,
    advisory_high: 2800
  }
};

function SensorReadings({ readings }) {
  const getSensorStatus = (sensorName, value) => {
    switch (sensorName) {
      case 'temperature':
        if (value >= THRESHOLDS.temperature.action_required) return 'critical';
        if (value >= THRESHOLDS.temperature.advisory) return 'warning';
        return 'normal';
      
      case 'vibration':
        if (value >= THRESHOLDS.vibration.action_required) return 'critical';
        if (value >= THRESHOLDS.vibration.advisory) return 'warning';
        return 'normal';
      
      case 'torque':
        if (value >= THRESHOLDS.torque.action_required) return 'critical';
        if (value >= THRESHOLDS.torque.advisory) return 'warning';
        return 'normal';
      
      case 'rotational_speed':
        if (value < THRESHOLDS.rotational_speed.advisory_low || 
            value > THRESHOLDS.rotational_speed.advisory_high) {
          return 'warning';
        }
        return 'normal';
      
      default:
        return 'normal';
    }
  };

  const sensors = [
    {
      key: 'temperature',
      label: 'Process Temperature',
      value: readings.temperature,
      unit: 'K',
      decimals: 1
    },
    {
      key: 'air_temperature',
      label: 'Air Temperature',
      value: readings.air_temperature,
      unit: 'K',
      decimals: 1
    },
    {
      key: 'vibration',
      label: 'Vibration',
      value: readings.vibration,
      unit: 'μm',
      decimals: 1
    },
    {
      key: 'torque',
      label: 'Torque',
      value: readings.torque,
      unit: 'Nm',
      decimals: 1
    },
    {
      key: 'rotational_speed',
      label: 'Rotational Speed',
      value: readings.rotational_speed,
      unit: 'rpm',
      decimals: 0
    },
    {
      key: 'tool_wear',
      label: 'Tool Wear',
      value: readings.tool_wear,
      unit: 'min',
      decimals: 0
    }
  ];

  return (
    <div className="sensor-readings">
      <div className="sensor-grid">
        {sensors.map((sensor) => {
          const status = getSensorStatus(sensor.key, sensor.value);
          return (
            <div key={sensor.key} className={`sensor-card sensor-${status}`}>
              <div className="sensor-label">{sensor.label}</div>
              <div className="sensor-value">
                {sensor.value.toFixed(sensor.decimals)}
                <span className="sensor-unit">{sensor.unit}</span>
              </div>
              {status !== 'normal' && (
                <div className={`sensor-status status-${status}`}>
                  {status === 'critical' ? '⚠ Critical' : '⚠ Advisory'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SensorReadings;
