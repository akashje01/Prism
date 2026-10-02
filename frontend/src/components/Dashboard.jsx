import React, { useState, useEffect } from 'react';
import MachineGrid from './MachineGrid';
import AlertsSidebar from './AlertsSidebar';
import { getAllMachines } from '../data/MachineRegistry';
import simulationManager from '../managers/SimulationManager';
import './Dashboard.css';

/**
 * Dashboard Component
 * 
 * Displays overview of all machines with live health states.
 * Subscribes to SimulationManager for real-time state updates.
 * No mock data, no cached state - all state is derived live from engines.
 */

function Dashboard() {
  const [machineStates, setMachineStates] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const machines = getAllMachines();
    const unsubscribers = [];

    // Subscribe to each machine's simulation engine
    machines.forEach(machine => {
      const unsubscribe = simulationManager.subscribe(machine.id, (state) => {
        setMachineStates(prev => {
          const next = new Map(prev);
          next.set(machine.id, {
            id: machine.id,
            name: machine.name,
            healthState: state.healthState,
            conditionSummary: getConditionSummary(state.healthState)
          });
          return next;
        });
      });
      
      unsubscribers.push(unsubscribe);
    });

    setLoading(false);

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Generate condition summary from health state
  const getConditionSummary = (healthState) => {
    switch (healthState) {
      case 'Normal':
        return 'Operating normally';
      case 'Advisory':
        return 'Monitoring recommended';
      case 'Action Required':
        return 'Immediate attention required';
      case 'Post-Maintenance':
        return 'Recovery in progress';
      default:
        return 'Status unknown';
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-message">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Convert Map to Array for child components
  const machinesArray = Array.from(machineStates.values());

  return (
    <div className="dashboard">
      <div className="dashboard-layout">
        <main className="dashboard-main">
          <MachineGrid machineStates={machineStates} />
        </main>
        <aside className="dashboard-sidebar">
          <AlertsSidebar machines={machinesArray} />
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
