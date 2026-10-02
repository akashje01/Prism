/**
 * SimulationManager.js
 * 
 * Manages simulation engines for all machines.
 * Each machine has exactly ONE SimulationEngine instance that persists across navigation.
 * 
 * Responsibilities:
 * - Create and store simulation engines per machine
 * - Provide access to engines by machine ID
 * - Manage engine lifecycle
 * - Enable subscription to engine state changes
 */

import SimulationEngine from '../utils/SimulationEngine';
import { getAllMachines } from '../data/MachineRegistry';

class SimulationManager {
  constructor() {
    // Map<machineId, SimulationEngine>
    this.engines = new Map();
    
    // Map<machineId, Set<callback>>
    this.subscribers = new Map();
    
    // Initialize engines for all machines
    this._initializeEngines();
  }

  /**
   * Initialize simulation engines for all registered machines
   * @private
   */
  _initializeEngines() {
    const machines = getAllMachines();
    
    machines.forEach(machine => {
      const engine = new SimulationEngine();
      
      // Register tick callback to notify subscribers
      engine.onTick((state) => {
        this._notifySubscribers(machine.id, state);
      });
      
      this.engines.set(machine.id, engine);
      this.subscribers.set(machine.id, new Set());
    });
    
    console.log('[SimulationManager] Initialized engines for', this.engines.size, 'machines');
  }

  /**
   * Get the simulation engine for a specific machine
   * @param {string} machineId - The machine ID
   * @returns {SimulationEngine|null} The engine or null if not found
   */
  getEngine(machineId) {
    return this.engines.get(machineId) || null;
  }

  /**
   * Get current state for a specific machine
   * @param {string} machineId - The machine ID
   * @returns {Object|null} Current state or null if engine not found
   */
  getState(machineId) {
    const engine = this.engines.get(machineId);
    return engine ? engine.getState() : null;
  }

  /**
   * Subscribe to state changes for a specific machine
   * @param {string} machineId - The machine ID
   * @param {Function} callback - Callback function(state)
   * @returns {Function} Unsubscribe function
   */
  subscribe(machineId, callback) {
    const subscriberSet = this.subscribers.get(machineId);
    
    if (!subscriberSet) {
      console.warn('[SimulationManager] No subscribers set for machine:', machineId);
      return () => {};
    }
    
    subscriberSet.add(callback);
    
    // Immediately call with current state
    const engine = this.engines.get(machineId);
    if (engine) {
      callback(engine.getState());
    }
    
    // Return unsubscribe function
    return () => {
      subscriberSet.delete(callback);
    };
  }

  /**
   * Notify all subscribers for a machine
   * @private
   * @param {string} machineId - The machine ID
   * @param {Object} state - The new state
   */
  _notifySubscribers(machineId, state) {
    const subscriberSet = this.subscribers.get(machineId);
    
    if (subscriberSet) {
      subscriberSet.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('[SimulationManager] Error in subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Set scenario for a specific machine
   * @param {string} machineId - The machine ID
   * @param {string} scenario - The scenario name
   */
  setScenario(machineId, scenario) {
    const engine = this.engines.get(machineId);
    
    if (engine) {
      engine.setScenario(scenario);
    } else {
      console.warn('[SimulationManager] Engine not found for machine:', machineId);
    }
  }

  /**
   * Start simulation for a specific machine
   * @param {string} machineId - The machine ID
   */
  start(machineId) {
    const engine = this.engines.get(machineId);
    
    if (engine) {
      engine.start();
    } else {
      console.warn('[SimulationManager] Engine not found for machine:', machineId);
    }
  }

  /**
   * Pause simulation for a specific machine
   * @param {string} machineId - The machine ID
   */
  pause(machineId) {
    const engine = this.engines.get(machineId);
    
    if (engine) {
      engine.pause();
    } else {
      console.warn('[SimulationManager] Engine not found for machine:', machineId);
    }
  }

  /**
   * Check if a machine's simulation is running
   * @param {string} machineId - The machine ID
   * @returns {boolean} True if running
   */
  isRunning(machineId) {
    const engine = this.engines.get(machineId);
    return engine ? engine.isRunning : false;
  }

  /**
   * Destroy all engines (cleanup)
   */
  destroy() {
    this.engines.forEach(engine => {
      engine.destroy();
    });
    
    this.engines.clear();
    this.subscribers.clear();
    
    console.log('[SimulationManager] All engines destroyed');
  }
}

// Create singleton instance
const simulationManager = new SimulationManager();

export default simulationManager;
