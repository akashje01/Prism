import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MachineCard.css';

function MachineCard({ machine }) {
  const navigate = useNavigate();
  const { id, name, healthState, conditionSummary } = machine;

  // Determine CSS class based on health state
  const getHealthStateClass = (state) => {
    switch (state) {
      case 'Normal':
        return 'health-normal';
      case 'Advisory':
        return 'health-advisory';
      case 'Action Required':
        return 'health-action-required';
      case 'Post-Maintenance':
        return 'health-post-maintenance';
      default:
        return 'health-unknown';
    }
  };

  const healthStateClass = getHealthStateClass(healthState);

  const handleClick = () => {
    navigate(`/machines/${id}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div 
      className={`machine-card ${healthStateClass}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={handleKeyPress}
      aria-label={`View details for ${name}`}
    >
      <div className="machine-card-header">
        <h3 className="machine-name">{name}</h3>
      </div>
      
      <div className={`health-state-badge ${healthStateClass}`}>
        {healthState}
      </div>
      
      <p className="condition-summary">{conditionSummary}</p>
      
      <button className="view-details-button" onClick={handleClick} aria-label={`View details for ${name}`}>
        View Details
      </button>
    </div>
  );
}

export default MachineCard;
