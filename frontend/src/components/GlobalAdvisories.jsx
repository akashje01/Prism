import React from 'react';
import './GlobalAdvisories.css';

function GlobalAdvisories({ advisories }) {
  if (!advisories || advisories.length === 0) {
    return (
      <section className="global-advisories empty">
        <div className="advisory-header">
          <span className="advisory-icon">✓</span>
          <h2>Global Advisories</h2>
        </div>
        <p className="empty-message">No active advisories. All machines are operating normally or require immediate action.</p>
      </section>
    );
  }

  return (
    <section className="global-advisories active">
      <div className="advisory-header">
        <span className="advisory-icon">⚡</span>
        <h2>Global Advisories</h2>
        <span className="advisory-count">{advisories.length}</span>
      </div>
      <div className="advisory-list">
        {advisories.map((machine) => (
          <div key={machine.machine_id} className="advisory-item">
            <div className="advisory-item-header">
              <strong>{machine.machine_name}</strong>
              <span className="machine-id-badge">{machine.machine_id}</span>
            </div>
            <p className="advisory-summary">{machine.one_line_summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default GlobalAdvisories;
