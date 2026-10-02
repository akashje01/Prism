/**
 * SimulationEngine - Continuous, Oscillating Industrial Simulation
 * 
 * This engine generates synthetic sensor data in real-time without relying on
 * finite dataset playback. It simulates natural degradation and recovery cycles
 * by oscillating between forward (degradation) and backward (recovery) directions.
 * 
 * CORE PRINCIPLES:
 * - Simulation NEVER stops or completes
 * - No cursor, window index, or dataset exhaustion
 * - Oscillates indefinitely: forward → backward → forward
 * - Scenario selection switches behavior profile, not dataset
 * - All data is synthetically generated using statistical models
 */

// Sensor configuration with base values and bounds
const SENSOR_CONFIG = {
  'Temperature': {
    baseMean: 300,
    min: 290,
    max: 330,
    threshold: 310,
    unit: 'K'
  },
  'Air Temperature': {
    baseMean: 298,
    min: 290,
    max: 320,
    threshold: 308,
    unit: 'K'
  },
  'Vibration': {
    baseMean: 40,
    min: 20,
    max: 200,
    threshold: 100,
    unit: 'μm'
  },
  'Torque': {
    baseMean: 35,
    min: 10,
    max: 70,
    threshold: 50,
    unit: 'Nm'
  },
  'Rotational Speed': {
    baseMean: 1500,
    min: 1000,
    max: 2500,
    threshold: 2000,
    unit: 'rpm'
  },
  'Tool Wear': {
    baseMean: 100,
    min: 0,
    max: 250,
    threshold: 200,
    unit: 'min'
  }
};

// Scenario behavior profiles
const SCENARIO_PROFILES = {
  'Normal': {
    driftRate: 0.1,
    variance: 2,
    thresholdBias: -0.3, // Stay well below thresholds
    description: 'Stable operation with minimal variance'
  },
  'Advisory': {
    driftRate: 0.5,
    variance: 5,
    thresholdBias: 0.1, // Hover near thresholds
    description: 'Gradual drift with occasional spikes'
  },
  'Action Required': {
    driftRate: 1.0,
    variance: 8,
    thresholdBias: 0.4, // Sustained threshold violations
    description: 'Critical degradation requiring intervention'
  },
  'Post-Maintenance': {
    driftRate: -0.8, // Negative drift = recovery
    variance: 3,
    thresholdBias: -0.5, // Strong recovery toward normal
    description: 'Recovery trend after maintenance'
  }
};

// Recovery duration for Post-Maintenance scenario (in ticks)
const RECOVERY_DURATION = 15;

class SimulationEngine {
  constructor() {
    this.currentValues = new Map();
    this.rollingBuffers = new Map();
    this.direction = 1; // 1 = forward (degradation), -1 = backward (recovery)
    this.scenario = 'Normal';
    this.isRunning = false;
    this.intervalId = null;
    this.tickCallback = null;
    this.recoveryTicks = 0; // Track recovery progress for Post-Maintenance
    
    // Initialize with base values
    this.reset();
  }

  /**
   * Reset simulation state and buffers
   */
  reset() {
    console.log('[SimulationEngine] Resetting simulation');
    this.currentValues.clear();
    this.rollingBuffers.clear();
    this.direction = 1;
    this.recoveryTicks = 0; // Reset recovery tracking
    
    // Initialize current values at base means
    Object.entries(SENSOR_CONFIG).forEach(([sensorName, config]) => {
      this.currentValues.set(sensorName, config.baseMean);
      // Pre-populate buffer with 20 initial points for immediate chart rendering
      const initialBuffer = [];
      for (let i = 0; i < 20; i++) {
        // Add small random variation to initial values
        const variance = SCENARIO_PROFILES[this.scenario].variance;
        const noise = (Math.random() - 0.5) * variance * 0.5;
        initialBuffer.push(config.baseMean + noise);
      }
      this.rollingBuffers.set(sensorName, initialBuffer);
    });
  }

  /**
   * Set scenario and reset simulation
   */
  setScenario(scenario) {
    if (!SCENARIO_PROFILES[scenario]) {
      console.error('[SimulationEngine] Invalid scenario:', scenario);
      return;
    }
    
    console.log('[SimulationEngine] Changing scenario to:', scenario);
    
    // Pause if running
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.pause();
    }
    
    this.scenario = scenario;
    this.reset();
    
    // Always auto-start simulation on scenario change
    this.start();
  }

  /**
   * Generate next sensor value using synthetic model
   */
  generateNextValue(sensorName, currentValue) {
    const config = SENSOR_CONFIG[sensorName];
    const profile = SCENARIO_PROFILES[this.scenario];
    
    if (!config || !profile) {
      return currentValue;
    }
    
    // For Normal scenario, clamp values to safe operating range
    if (this.scenario === 'Normal') {
      // Keep values well below thresholds (70-85% of threshold)
      const safeMax = config.threshold * 0.85;
      const safeMin = config.baseMean * 0.9;
      
      // Calculate drift based on direction and scenario
      const drift = profile.driftRate * this.direction;
      
      // Add bounded noise
      const noise = (Math.random() - 0.5) * profile.variance;
      
      // Combine factors
      let nextValue = currentValue + drift + noise;
      
      // Enforce safe bounds for Normal scenario
      nextValue = Math.max(safeMin, Math.min(safeMax, nextValue));
      
      return nextValue;
    }
    
    // For Post-Maintenance scenario during recovery window, force recovery
    if (this.scenario === 'Post-Maintenance' && this.recoveryTicks < RECOVERY_DURATION) {
      // Strong pull toward base mean
      const targetValue = config.baseMean;
      const recoveryRate = 0.15; // 15% movement toward target per tick
      const drift = (targetValue - currentValue) * recoveryRate;
      
      // Small noise during recovery
      const noise = (Math.random() - 0.5) * profile.variance * 0.5;
      
      let nextValue = currentValue + drift + noise;
      
      // Enforce bounds
      nextValue = Math.max(config.min, Math.min(config.max, nextValue));
      
      return nextValue;
    }
    
    // For Post-Maintenance after recovery window, behave like Normal
    if (this.scenario === 'Post-Maintenance' && this.recoveryTicks >= RECOVERY_DURATION) {
      // Keep values in safe range like Normal scenario
      const safeMax = config.threshold * 0.85;
      const safeMin = config.baseMean * 0.9;
      
      const drift = 0.1 * this.direction; // Minimal drift
      const noise = (Math.random() - 0.5) * 2; // Low variance
      
      let nextValue = currentValue + drift + noise;
      nextValue = Math.max(safeMin, Math.min(safeMax, nextValue));
      
      return nextValue;
    }
    
    // For Advisory and Action Required scenarios, use standard logic
    // Calculate drift based on direction and scenario
    const drift = profile.driftRate * this.direction;
    
    // Add bounded noise
    const noise = (Math.random() - 0.5) * profile.variance;
    
    // Calculate threshold bias (pushes values toward or away from threshold)
    const thresholdDistance = config.threshold - currentValue;
    const thresholdPull = thresholdDistance * profile.thresholdBias * 0.01;
    
    // Combine all factors
    let nextValue = currentValue + drift + noise + thresholdPull;
    
    // Enforce hard bounds
    nextValue = Math.max(config.min, Math.min(config.max, nextValue));
    
    // Check for direction reversal at bounds
    if (nextValue >= config.max * 0.95 && this.direction > 0) {
      console.log(`[SimulationEngine] ${sensorName} approaching upper bound, reversing direction`);
      this.direction = -1;
    } else if (nextValue <= config.min * 1.05 && this.direction < 0) {
      console.log(`[SimulationEngine] ${sensorName} approaching lower bound, reversing direction`);
      this.direction = 1;
    }
    
    return nextValue;
  }

  /**
   * Advance simulation by one tick
   */
  tick() {
    // Increment recovery ticks if in Post-Maintenance scenario
    if (this.scenario === 'Post-Maintenance') {
      this.recoveryTicks++;
    }
    
    // Generate next values for all sensors
    const newValues = new Map();
    
    this.currentValues.forEach((currentValue, sensorName) => {
      const nextValue = this.generateNextValue(sensorName, currentValue);
      newValues.set(sensorName, nextValue);
      
      // Update rolling buffer (FIFO with max 60 points)
      const buffer = this.rollingBuffers.get(sensorName) || [];
      buffer.push(nextValue);
      if (buffer.length > 60) {
        buffer.shift();
      }
      this.rollingBuffers.set(sensorName, buffer);
    });
    
    this.currentValues = newValues;
    
    // Trigger callback if registered
    if (this.tickCallback) {
      this.tickCallback(this.getState());
    }
  }

  /**
   * Get current simulation state
   */
  getState() {
    const sensorReadings = [];
    
    this.currentValues.forEach((value, sensorName) => {
      const config = SENSOR_CONFIG[sensorName];
      sensorReadings.push({
        name: sensorName,
        value: Math.round(value * 100) / 100, // Round to 2 decimals
        unit: config.unit,
        thresholdExceeded: value > config.threshold
      });
    });
    
    // Derive health state from sensor readings
    const healthState = this.deriveHealthState(sensorReadings);
    
    return {
      sensorReadings,
      rollingBuffers: new Map(this.rollingBuffers),
      healthState,
      scenario: this.scenario,
      direction: this.direction,
      isRunning: this.isRunning
    };
  }

  /**
   * Derive health state using TWO-LAYER SYSTEM:
   * 
   * LAYER A - Scenario Override (evaluated FIRST):
   * Scenario has authority over health state classification.
   * This ensures deterministic, predictable state transitions.
   * 
   * LAYER B - Sensor-based Classification (fallback):
   * Only used for Advisory scenario or as fallback.
   */
  deriveHealthState(sensorReadings) {
    // LAYER A: Scenario Override (highest priority)
    
    // Normal scenario ALWAYS forces Normal state
    if (this.scenario === 'Normal') {
      return 'Normal';
    }
    
    // Post-Maintenance scenario logic
    if (this.scenario === 'Post-Maintenance') {
      if (this.recoveryTicks < RECOVERY_DURATION) {
        // During recovery window, show Post-Maintenance
        return 'Post-Maintenance';
      } else {
        // After recovery window, transition to Normal
        return 'Normal';
      }
    }
    
    // Action Required scenario ALWAYS forces Action Required state
    if (this.scenario === 'Action Required') {
      return 'Action Required';
    }
    
    // LAYER B: Sensor-based Classification (for Advisory scenario)
    
    // Count sensors exceeding critical threshold
    const criticalCount = sensorReadings.filter(s => s.thresholdExceeded).length;
    
    // Count sensors in advisory range (90-100% of threshold)
    const advisoryCount = sensorReadings.filter(sensor => {
      const config = SENSOR_CONFIG[sensor.name];
      if (!config) return false;
      return !sensor.thresholdExceeded && sensor.value > config.threshold * 0.9;
    }).length;
    
    // Sensor-based derivation for Advisory scenario
    if (criticalCount >= 2) {
      return 'Action Required';
    } else if (criticalCount === 1) {
      return 'Action Required';
    } else if (advisoryCount >= 1 || criticalCount > 0) {
      return 'Advisory';
    } else {
      return 'Normal';
    }
  }

  /**
   * Start continuous simulation
   */
  start() {
    if (this.isRunning) {
      console.log('[SimulationEngine] Already running');
      return;
    }
    
    console.log('[SimulationEngine] Starting simulation');
    this.isRunning = true;
    
    // Run tick every 1 second
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  /**
   * Pause simulation (does not reset state)
   */
  pause() {
    if (!this.isRunning) {
      return;
    }
    
    console.log('[SimulationEngine] Pausing simulation');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Register callback for tick events
   */
  onTick(callback) {
    this.tickCallback = callback;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.pause();
    this.tickCallback = null;
  }
}

export default SimulationEngine;
