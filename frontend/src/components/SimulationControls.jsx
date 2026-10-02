import './SimulationControls.css';

const SCENARIOS = [
  'Normal',
  'Advisory',
  'Action Required',
  'Post-Maintenance'
];

/**
 * SimulationControls Component
 * 
 * Provides scenario selection and play/pause control for continuous simulation.
 * No stop button, no completion states, no window end detection.
 * 
 * Requirements: Continuous simulation with play/pause toggle only
 */
function SimulationControls({ 
  selectedScenario, 
  isPlaying, 
  onScenarioChange, 
  onPlayPause, 
  disabled
}) {
  return (
    <div className="simulation-controls">
      <div className="scenario-control">
        <label htmlFor="scenario-select">Scenario</label>
        <select
          id="scenario-select"
          value={selectedScenario}
          onChange={(e) => onScenarioChange(e.target.value)}
          disabled={disabled}
          className="scenario-select"
        >
          {SCENARIOS.map((scenario) => (
            <option key={scenario} value={scenario}>
              {scenario}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onPlayPause}
        disabled={disabled}
        className={`play-pause-button ${isPlaying ? 'playing' : 'paused'}`}
        aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
      >
        <span className="button-icon">{isPlaying ? '⏸' : '▶'}</span>
        <span className="button-text">{isPlaying ? 'Pause' : 'Play'}</span>
      </button>
    </div>
  );
}

export default SimulationControls;
