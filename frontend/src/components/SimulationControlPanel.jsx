import './SimulationControlPanel.css';

const SCENARIOS = [
  'Normal',
  'Advisory',
  'Action Required',
  'Post-Maintenance'
];

function SimulationControlPanel({ 
  selectedScenario, 
  isPlaying, 
  onScenarioChange, 
  onPlayStop, 
  disabled 
}) {
  return (
    <div className="simulation-control-panel">
      <div className="control-section">
        <div className="control-group">
          <label htmlFor="scenario-select">Scenario:</label>
          <select
            id="scenario-select"
            value={selectedScenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            disabled={disabled}
            className="control-select"
          >
            {SCENARIOS.map((scenario) => (
              <option key={scenario} value={scenario}>
                {scenario}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onPlayStop}
          disabled={disabled}
          className={`control-button play-stop-button ${isPlaying ? 'playing' : 'stopped'}`}
        >
          {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
      </div>
    </div>
  );
}

export default SimulationControlPanel;
