import React from 'react';
import './RecommendedAction.css';

function RecommendedAction({ action, healthState }) {
  return (
    <div className={`recommended-action health-${healthState.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3 className="section-title">Recommended Action</h3>
      <p className="action-text">{action}</p>
    </div>
  );
}

export default RecommendedAction;
