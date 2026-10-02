import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './BearingEvidencePanel.css';

function BearingEvidencePanel({ evidence }) {
  if (!evidence || !evidence.vibration_data || evidence.vibration_data.length === 0) {
    return null;
  }

  // Prepare data for chart
  const chartData = evidence.vibration_data.map((value, index) => ({
    index: index,
    vibration: value
  }));

  const getHealthStateLabel = (healthState) => {
    switch (healthState) {
      case 'Normal':
        return 'Normal Bearing Condition';
      case 'Advisory':
        return 'Early Bearing Degradation Detected';
      case 'Action Required':
        return 'Significant Bearing Defect Detected';
      default:
        return 'Bearing Condition';
    }
  };

  const getHealthStateClass = (healthState) => {
    switch (healthState) {
      case 'Normal':
        return 'evidence-normal';
      case 'Advisory':
        return 'evidence-advisory';
      case 'Action Required':
        return 'evidence-critical';
      default:
        return '';
    }
  };

  return (
    <div className={`bearing-evidence-panel ${getHealthStateClass(evidence.health_state)}`}>
      <div className="evidence-header">
        <h3>{getHealthStateLabel(evidence.health_state)}</h3>
        <p className="evidence-description">{evidence.description}</p>
        <div className="evidence-metadata">
          <span>Sample Rate: {evidence.sample_rate} Hz</span>
          <span>Data Points: {evidence.vibration_data.length}</span>
        </div>
      </div>

      <div className="evidence-chart">
        <h4>Vibration Waveform (Time Domain)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="index" 
              label={{ value: 'Sample Index', position: 'insideBottom', offset: -5 }}
              stroke="#6c757d"
            />
            <YAxis 
              label={{ value: 'Acceleration', angle: -90, position: 'insideLeft' }}
              stroke="#6c757d"
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              labelFormatter={(value) => `Sample: ${value}`}
              formatter={(value) => [value.toFixed(4), 'Acceleration']}
            />
            <Line 
              type="monotone" 
              dataKey="vibration" 
              stroke="#6610f2" 
              strokeWidth={1}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="evidence-info">
        <div className="info-box">
          <strong>About This Evidence:</strong>
          <p>
            This vibration waveform shows the characteristic pattern for the current bearing condition.
            The data represents actual bearing vibration signatures captured from the machine's sensors.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BearingEvidencePanel;
