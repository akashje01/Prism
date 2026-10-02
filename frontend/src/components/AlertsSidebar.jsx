import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AlertsSidebar.css';

function AlertsSidebar({ machines }) {
  const navigate = useNavigate();

  // Filter machines by health state
  const actionRequiredMachines = machines.filter(
    (machine) => machine.healthState === 'Action Required'
  );
  
  const advisoryMachines = machines.filter(
    (machine) => machine.healthState === 'Advisory'
  );

  const handleMachineClick = (machineId) => {
    navigate(`/machines/${machineId}`);
  };

  return (
    <div className="alerts-sidebar">
      {/* Alerts Section - Action Required */}
      <section className="alerts-section">
        <div className="section-header alerts-header">
          <span className="section-icon alert-icon">⚠</span>
          <h2>Alerts</h2>
          {actionRequiredMachines.length > 0 && (
            <span className="count-badge alert-badge">
              {actionRequiredMachines.length}
            </span>
          )}
        </div>
        
        {actionRequiredMachines.length === 0 ? (
          <div className="empty-state">
            <p>No critical alerts. All machines are operating within acceptable parameters.</p>
          </div>
        ) : (
          <div className="machine-list">
            {actionRequiredMachines.map((machine) => (
              <div
                key={machine.id}
                className="machine-item alert-item"
                onClick={() => handleMachineClick(machine.id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMachineClick(machine.id);
                  }
                }}
              >
                <div className="machine-item-header">
                  <strong className="machine-item-name">{machine.name}</strong>
                  <span className="urgency-indicator alert-urgency">●</span>
                </div>
                <p className="machine-item-summary">{machine.conditionSummary}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Advisories Section */}
      <section className="advisories-section">
        <div className="section-header advisories-header">
          <span className="section-icon advisory-icon">⚡</span>
          <h2>Advisories</h2>
          {advisoryMachines.length > 0 && (
            <span className="count-badge advisory-badge">
              {advisoryMachines.length}
            </span>
          )}
        </div>
        
        {advisoryMachines.length === 0 ? (
          <div className="empty-state">
            <p>No active advisories.</p>
          </div>
        ) : (
          <div className="machine-list">
            {advisoryMachines.map((machine) => (
              <div
                key={machine.id}
                className="machine-item advisory-item"
                onClick={() => handleMachineClick(machine.id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMachineClick(machine.id);
                  }
                }}
              >
                <div className="machine-item-header">
                  <strong className="machine-item-name">{machine.name}</strong>
                  <span className="urgency-indicator advisory-urgency">●</span>
                </div>
                <p className="machine-item-summary">{machine.conditionSummary}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AlertsSidebar;
