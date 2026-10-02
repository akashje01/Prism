import React from 'react';
import './ConditionAnalysis.css';

function ConditionAnalysis({ analysis, healthState }) {
  return (
    <div className={`condition-analysis health-${healthState.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3 className="section-title">Condition Analysis</h3>
      <p className="analysis-text">{analysis}</p>
    </div>
  );
}

export default ConditionAnalysis;
