import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMachineById } from '../data/MachineRegistry';
import simulationManager from '../managers/SimulationManager';
import SimulationControls from './SimulationControls';
import LiveSensorReadings from './LiveSensorReadings';
import ConditionAnalysis from './ConditionAnalysis';
import CauseOfIssue from './CauseOfIssue';
import RecommendedAction from './RecommendedAction';
import RemainingSafeTime from './RemainingSafeTime';
import SensorTrends from './SensorTrends';
import './MachineDetail.css';

// Sensor thresholds for visualization
const SENSOR_THRESHOLDS = {
  'Temperature': 310,
  'Air Temperature': 308,
  'Vibration': 100,
  'Torque': 50,
  'Rotational Speed': 2000,
  'Tool Wear': 200
};

// Derive mechanical cause from health state
const deriveMechanicalCause = (healthState, sensorReadings) => {
  if (healthState === 'Normal' || healthState === 'Post-Maintenance') {
    return undefined;
  }
  
  // Identify which sensors are problematic
  const problematicSensors = sensorReadings.filter(s => s.thresholdExceeded);
  
  if (problematicSensors.length === 0) {
    return 'Sensors approaching threshold limits';
  }
  
  // Map sensor issues to mechanical causes
  const sensorNames = problematicSensors.map(s => s.name);
  
  if (sensorNames.includes('Vibration')) {
    return 'Excessive vibration indicates bearing wear or misalignment';
  } else if (sensorNames.includes('Temperature')) {
    return 'Elevated temperature suggests spindle bearing degradation';
  } else if (sensorNames.includes('Tool Wear')) {
    return 'Increased tool wear rate indicates cutting edge deterioration';
  } else if (sensorNames.includes('Torque')) {
    return 'Torque fluctuations suggest motor or drive system issues';
  } else {
    return 'Multiple systems showing signs of degradation';
  }
};

// Derive remaining safe time estimate
const deriveRemainingSafeTime = (sensorReadings) => {
  const criticalSensors = sensorReadings.filter(s => {
    const threshold = SENSOR_THRESHOLDS[s.name];
    return threshold && s.value > threshold * 1.2; // 20% over threshold
  });
  
  if (criticalSensors.length >= 2) {
    return 'Immediate action required';
  } else if (criticalSensors.length === 1) {
    return 'Estimated 2-4 hours remaining';
  } else {
    return 'Estimated 4-8 hours remaining';
  }
};

// Generate explanation text based on health state
const generateExplanation = (healthState, sensorReadings) => {
  const exceededSensors = sensorReadings.filter(s => s.thresholdExceeded);
  
  switch (healthState) {
    case 'Normal':
      return 'All sensors operating within normal parameters. Machine is functioning optimally with no detected anomalies.';
    
    case 'Advisory':
      if (exceededSensors.length > 0) {
        const sensorList = exceededSensors.map(s => s.name).join(', ');
        return `${sensorList} ${exceededSensors.length > 1 ? 'are' : 'is'} approaching or exceeding threshold limits. Increased monitoring recommended.`;
      }
      return 'Sensors showing early warning signs. Values approaching threshold limits. Schedule inspection during next maintenance window.';
    
    case 'Action Required':
      const criticalList = exceededSensors.map(s => s.name).join(', ');
      return `Critical: ${criticalList} ${exceededSensors.length > 1 ? 'have' : 'has'} exceeded safe operating thresholds. Immediate intervention required to prevent equipment damage.`;
    
    case 'Post-Maintenance':
      return 'Machine recently serviced. Sensors showing recovery trend toward normal operating parameters. Continue monitoring for stability.';
    
    default:
      return 'Monitoring machine health status.';
  }
};

// Generate recommended action based on health state
const generateRecommendedAction = (healthState) => {
  switch (healthState) {
    case 'Normal':
      return 'Continue normal operation. Maintain regular monitoring schedule.';
    
    case 'Advisory':
      return 'Schedule inspection during next maintenance window. Increase monitoring frequency.';
    
    case 'Action Required':
      return 'Stop machine immediately. Perform emergency maintenance. Inspect bearings, cooling system, and mechanical components.';
    
    case 'Post-Maintenance':
      return 'Monitor recovery progress. Verify all systems return to normal parameters.';
    
    default:
      return 'Continue monitoring';
  }
};

function MachineDetail() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  
  // Look up machine from registry
  const machine = getMachineById(machineId);
  
  // Component state
  const [machineData, setMachineData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('Normal');
  const [loading, setLoading] = useState(true);

  // Validate machine exists
  useEffect(() => {
    if (!machine) {
      console.error('[MachineDetail] Machine not found in registry:', machineId);
      navigate('/');
      return;
    }
  }, [machine, machineId, navigate]);

  // Subscribe to simulation engine
  useEffect(() => {
    if (!machine) return;
    
    console.log('[MachineDetail] Subscribing to simulation for machine:', machineId);
    
    // Get engine from SimulationManager
    const engine = simulationManager.getEngine(machineId);
    
    if (!engine) {
      console.error('[MachineDetail] No engine found for machine:', machineId);
      setLoading(false);
      return;
    }
    
    // Subscribe to state updates
    const unsubscribe = simulationManager.subscribe(machineId, (state) => {
      setMachineData({
        machine_id: machine.id,
        machine_name: machine.name,
        health_state: state.healthState,
        sensor_readings: state.sensorReadings,
        rollingBuffers: state.rollingBuffers,
        explanation: generateExplanation(state.healthState, state.sensorReadings),
        mechanical_cause: deriveMechanicalCause(state.healthState, state.sensorReadings),
        recommended_action: generateRecommendedAction(state.healthState),
        remaining_safe_time: state.healthState === 'Action Required' 
          ? deriveRemainingSafeTime(state.sensorReadings) 
          : undefined
      });
    });
    
    // Sync isPlaying state
    setIsPlaying(simulationManager.isRunning(machineId));
    
    setLoading(false);
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [machine, machineId]);

  // Handle Play/Pause button
  const handlePlayPause = () => {
    if (isPlaying) {
      console.log('[MachineDetail] Pausing simulation');
      simulationManager.pause(machineId);
      setIsPlaying(false);
    } else {
      console.log('[MachineDetail] Starting simulation');
      simulationManager.start(machineId);
      setIsPlaying(true);
    }
  };

  // Handle scenario change
  const handleScenarioChange = (scenario) => {
    console.log('[MachineDetail] Changing scenario to:', scenario);
    setSelectedScenario(scenario);
    simulationManager.setScenario(machineId, scenario);
    // Engine auto-starts, so sync component state
    setIsPlaying(simulationManager.isRunning(machineId));
  };

  const getHealthStateClass = (healthState) => {
    switch (healthState) {
      case 'Normal':
        return 'health-normal';
      case 'Advisory':
        return 'health-advisory';
      case 'Action Required':
        return 'health-action-required';
      case 'Post-Maintenance':
        return 'health-post-maintenance';
      default:
        return '';
    }
  };

  if (!machine) {
    return null; // Will redirect in useEffect
  }

  if (loading || !machineData) {
    return (
      <div className="machine-detail">
        <div className="loading-container">
          <div className="loading-message">Initializing simulation...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="machine-detail">
      <div className="machine-detail-header">
        <div className="machine-title">
          <h1>{machineData.machine_name}</h1>
          <span className={`health-badge ${getHealthStateClass(machineData.health_state)}`}>
            {machineData.health_state}
          </span>
        </div>
        <SimulationControls 
          selectedScenario={selectedScenario}
          isPlaying={isPlaying}
          onScenarioChange={handleScenarioChange}
          onPlayPause={handlePlayPause}
          disabled={loading}
        />
      </div>

      <div className="machine-detail-content">
        <section className="sensor-section">
          <LiveSensorReadings sensors={machineData.sensor_readings} />
        </section>

        <section className="analysis-section">
          <ConditionAnalysis 
            analysis={machineData.explanation}
            healthState={machineData.health_state}
          />
          
          {(machineData.health_state === 'Advisory' || machineData.health_state === 'Action Required') && 
           machineData.mechanical_cause && (
            <CauseOfIssue 
              affectedComponent="System"
              mechanicalCause={machineData.mechanical_cause}
            />
          )}
          
          <RecommendedAction 
            action={machineData.recommended_action}
            healthState={machineData.health_state}
          />
          
          {machineData.health_state === 'Action Required' && machineData.remaining_safe_time && (
            <RemainingSafeTime timeEstimate={machineData.remaining_safe_time} />
          )}
        </section>

        <section className="trends-section">
          <h2>Sensor Trends</h2>
          <SensorTrends 
            trendBuffers={machineData.rollingBuffers}
            thresholds={new Map(Object.entries(SENSOR_THRESHOLDS))}
          />
        </section>
      </div>
    </div>
  );
}

export default MachineDetail;
