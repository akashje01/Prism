import React from 'react';
import MachineCard from './MachineCard';
import { getAllMachines } from '../data/MachineRegistry';
import './MachineGrid.css';

/**
 * MachineGrid Component
 * 
 * Displays grid of machine cards.
 * Reads machine list ONLY from MachineRegistry.
 * Receives live state from Dashboard via props.
 */

function MachineGrid({ machineStates }) {
  const machines = getAllMachines();

  if (machines.length === 0) {
    return (
      <div className="machine-grid-container">
        <div className="empty-message">No machines available.</div>
      </div>
    );
  }

  // Map machines to their current states (preserving MachineRegistry order)
  const machinesWithState = machines.map((machine) => {
    return machineStates.get(machine.id) || {
      id: machine.id,
      name: machine.name,
      healthState: 'Normal',
      conditionSummary: 'Initializing...'
    };
  });

  return (
    <div className="machine-grid-container">
      <div className="machine-grid">
        {machinesWithState.map((machine) => (
          <MachineCard key={machine.id} machine={machine} />
        ))}
      </div>
    </div>
  );
}

export default MachineGrid;
