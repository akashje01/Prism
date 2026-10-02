import React from 'react';
import './RemainingSafeTime.css';

function RemainingSafeTime({ timeEstimate }) {
  return (
    <div className="remaining-safe-time">
      <h3 className="section-title">Remaining Safe Operating Time</h3>
      <div className="time-estimate">{timeEstimate}</div>
    </div>
  );
}

export default RemainingSafeTime;
