import React from 'react';
import './CauseOfIssue.css';

function CauseOfIssue({ affectedComponent, mechanicalCause }) {
  return (
    <div className="cause-of-issue">
      <h3 className="section-title">Cause of Issue</h3>
      <div className="cause-content">
        <div className="affected-component">
          <span className="label">Affected Component:</span>
          <span className="value">{affectedComponent}</span>
        </div>
        <div className="mechanical-cause">
          <span className="label">Mechanical Cause:</span>
          <span className="value">{mechanicalCause}</span>
        </div>
      </div>
    </div>
  );
}

export default CauseOfIssue;
