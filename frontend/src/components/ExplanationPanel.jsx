import React from 'react';
import './ExplanationPanel.css';

function ExplanationPanel({ explanation, affectedComponent, recommendedAction, healthState }) {
  const getUrgencyClass = (healthState) => {
    switch (healthState) {
      case 'Action Required':
        return 'urgency-critical';
      case 'Advisory':
        return 'urgency-warning';
      case 'Post-Maintenance':
        return 'urgency-info';
      default:
        return 'urgency-normal';
    }
  };

  const getUrgencyIcon = (healthState) => {
    switch (healthState) {
      case 'Action Required':
        return '🚨';
      case 'Advisory':
        return '⚠️';
      case 'Post-Maintenance':
        return '🔧';
      default:
        return '✓';
    }
  };

  return (
    <div className="explanation-panel">
      <div className="explanation-text">
        <h3>Condition Analysis</h3>
        <p>{explanation}</p>
      </div>

      <div className="explanation-details">
        <div className="detail-item">
          <div className="detail-label">Affected Component</div>
          <div className="detail-value component-value">
            {affectedComponent}
          </div>
        </div>

        <div className={`detail-item recommendation-item ${getUrgencyClass(healthState)}`}>
          <div className="detail-label">
            {getUrgencyIcon(healthState)} Recommended Action
          </div>
          <div className="detail-value recommendation-value">
            {recommendedAction}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplanationPanel;
