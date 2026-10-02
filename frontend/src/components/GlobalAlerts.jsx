import React from 'react';
import './GlobalAlerts.css';

function GlobalAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <section className="global-alerts empty">
        <div className="alert-header">
          <span className="alert-icon">✓</span>
          <h2>Global Alerts</h2>
        </div>
        <p className="empty-message">No critical alerts. All machines are operating within acceptable parameters.</p>
      </section>
    );
  }

  return (
    <section className="global-alerts active">
      <div className="alert-header">
        <span className="alert-icon">⚠</span>
        <h2>Global Alerts</h2>
        <span className="alert-count">{alerts.length}</span>
      </div>
      <div className="alert-list">
        {alerts.map((machine) => (
          <div key={machine.machine_id} className="alert-item">
            <div className="alert-item-header">
              <strong>{machine.machine_name}</strong>
              <span className="machine-id-badge">{machine.machine_id}</span>
            </div>
            <p className="alert-summary">{machine.one_line_summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default GlobalAlerts;
