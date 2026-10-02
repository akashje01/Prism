# Implementation Plan: PRISM Predictive Maintenance System

## Overview

This implementation plan breaks down the PRISM system into incremental coding tasks. The system will be built in layers: data layer first (dataset loading and slicing), then simulation and analysis layer (state-based simulation, health classification, explanation generation), and finally the API and UI layer. Each task builds on previous work, with testing integrated throughout to validate functionality early.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create backend/ and frontend/ directories
  - Set up Python virtual environment for backend
  - Install core dependencies: FastAPI, pandas, numpy, scipy, scikit-learn, uvicorn, hypothesis (for property testing)
  - Set up React project in frontend/ using create-react-app or Vite
  - Install frontend dependencies: axios, recharts (for time-series charts)
  - Create datasets/ folder and document expected dataset files
  - _Requirements: 3.1, 14.1, 17.1_

- [x] 2. Implement Dataset Loader
  - [x] 2.1 Create DatasetLoader class with methods to load AI4I CSV and CWRU .mat files
    - Implement load_ai4i_dataset() using pandas
    - Implement load_cwru_mat_file() using scipy.io.loadmat
    - Implement load_cwru_features() for CSV feature file
    - Add file existence validation and error handling
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 2.2 Write unit tests for DatasetLoader
    - Test successful loading of ai4i2020.csv
    - Test successful loading of CWRU .mat files
    - Test error handling for missing files
    - Test error handling for corrupted files
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Implement Slice Manager
  - [x] 3.1 Create SliceManager class to partition AI4I dataset into machine-specific slices
    - Implement create_base_slices() to partition dataset into 4 equal slices
    - Assign each slice to a machine ID (CNC-MILL-01, COOL-PUMP-02, CONV-MOTOR-01, AIR-COMP-01)
    - Store machine configuration with slice ranges
    - _Requirements: 1.1, 3.4_
  
  - [x] 3.2 Implement state window detection logic
    - Implement identify_state_windows() using statistical analysis and Isolation Forest
    - Detect Normal windows (low variance, values in normal ranges)
    - Detect Advisory windows (increasing trends, approaching thresholds)
    - Detect Action Required windows (values exceeding critical thresholds)
    - Detect Post-Maintenance windows (transition from high to normal values)
    - Store StateWindow objects with start/end indices
    - _Requirements: 3.5_
  
  - [x] 3.3 Implement sensor data retrieval methods
    - Implement get_sensor_data_at_position() to retrieve sensor readings at cursor position
    - Implement get_sensor_history() to retrieve rolling window of sensor history
    - Ensure data is returned without modification from source dataset
    - _Requirements: 5.1, 5.5, 6.1, 6.2_
  
  - [x] 3.4 Write property test for state window coverage
    - **Property 17: State Window Coverage**
    - **Validates: Requirements 3.5**
  
  - [x] 3.5 Write property test for data source integrity
    - **Property 7: Data Source Integrity**
    - **Validates: Requirements 3.6, 5.5**

- [x] 4. Implement Health Classifier
  - [x] 4.1 Create HealthClassifier class with threshold-based classification logic
    - Define sensor thresholds (temperature, vibration, torque, rotational speed)
    - Implement classify() method using threshold rules
    - Implement detect_anomalies() to identify anomalous sensors
    - Implement calculate_trends() using linear regression on rolling window
    - Return HealthClassification dataclass with health state, anomalous sensors, trends, and threshold violations
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 4.2 Integrate Isolation Forest for anomaly detection
    - Train Isolation Forest model on normal data during initialization
    - Use model as secondary signal for classification
    - Ensure model produces deterministic outputs (set random_state)
    - _Requirements: 15.1, 15.5_
  
  - [x] 4.3 Write property test for health state exclusivity
    - **Property 3: Health State Exclusivity**
    - **Validates: Requirements 2.1**
  
  - [x] 4.4 Write property test for threshold-based classification
    - **Property 18: Threshold-Based Classification**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  
  - [x] 4.5 Write unit tests for specific classification scenarios
    - Test normal sensor readings → Normal state
    - Test advisory threshold values → Advisory state
    - Test critical threshold values → Action Required state
    - Test post-maintenance transition pattern
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 5. Implement Explanation Engine
  - [x] 5.1 Create ExplanationEngine class with template-based explanation logic
    - Define explanation templates for different sensor patterns
    - Implement generate_explanation() using rule-based template selection
    - Map rising vibration → bearing wear explanations
    - Map high torque + temperature → mechanical stress explanations
    - Map normal state → normal operation confirmation
    - Ensure explanations are calm, actionable, and non-probabilistic
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.7_
  
  - [x] 5.2 Implement affected component identification
    - Implement identify_affected_component() using sensor pattern rules
    - Map elevated vibration → Bearings
    - Map elevated temperature only → Cooling/Lubrication systems
    - Map normal state → No affected components
    - _Requirements: 11.1, 11.3, 11.4, 11.5_
  
  - [x] 5.3 Implement recommendation generation
    - Implement generate_recommendation() using state-based templates
    - Advisory state → monitoring/inspection recommendations
    - Action Required state → immediate maintenance/shutdown recommendations
    - Normal state → continued normal operation recommendations
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 5.4 Write property test for non-probabilistic language
    - **Property 12: Explanation Non-Probabilistic Language**
    - **Validates: Requirements 7.7, 18.4**
  
  - [x] 5.5 Write property test for recommendation urgency
    - **Property 15: Recommendation Urgency Matches Health State**
    - **Validates: Requirements 12.1, 12.2, 12.5**
  
  - [x] 5.6 Write unit tests for specific explanation templates
    - Test rising vibration explanation contains bearing keywords
    - Test high torque + temperature explanation contains stress/lubrication keywords
    - Test normal state explanation confirms normal operation
    - Test no external API calls during explanation generation
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 6. Implement CWRU Evidence Provider
  - [x] 6.1 Create CWRUEvidenceProvider class to provide bearing vibration evidence
    - Implement get_bearing_evidence() with health state to file mapping
    - Map Normal → Time_Normal_1_098.mat
    - Map Advisory → B014_1_190.mat
    - Map Action Required → IR014_1_175.mat or OR014_6_1_202.mat
    - Implement should_show_evidence() to check if bearing-related
    - Extract vibration waveform from .mat files
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 6.2 Write property test for bearing evidence conditional display
    - **Property 13: Bearing Evidence Conditional Display**
    - **Validates: Requirements 8.1, 8.4**
  
  - [x] 6.3 Write property test for bearing evidence data structure
    - **Property 14: Bearing Evidence Contains Vibration Data**
    - **Validates: Requirements 8.3**
  
  - [x] 6.4 Write unit tests for CWRU file mapping
    - Test Normal state uses Time_Normal file
    - Test Advisory state uses B014 file
    - Test Action Required state uses IR014 or OR014 file
    - _Requirements: 8.2_

- [x] 7. Implement Simulation Engine
  - [x] 7.1 Create SimulationEngine class to manage simulation state and cursors
    - Initialize with SliceManager
    - Maintain independent cursor for each of 4 machines
    - Implement set_scenario() to jump cursor to state window start
    - Implement advance_cursor() to move cursor within current window
    - Implement bounds checking to prevent cursor overflow
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 7.2 Implement machine state retrieval methods
    - Implement get_current_state() to retrieve MachineState for one machine
    - Integrate SliceManager to get sensor data at cursor position
    - Integrate HealthClassifier to classify health state
    - Generate one-line summary for machine
    - Implement get_all_machines_state() to retrieve state for all 4 machines
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 7.3 Write property test for deterministic simulation behavior
    - **Property 1: Deterministic Simulation Behavior**
    - **Validates: Requirements 4.6, 18.1, 18.2, 18.3, 18.5**
  
  - [x] 7.4 Write property test for independent machine cursors
    - **Property 2: Independent Machine Cursors**
    - **Validates: Requirements 1.5, 4.4**
  
  - [x] 7.5 Write property test for cursor advancement updates state
    - **Property 4: Cursor Advancement Updates State**
    - **Validates: Requirements 1.4, 5.3, 6.3**
  
  - [x] 7.6 Write property test for scenario selection jumps to window start
    - **Property 5: Scenario Selection Jumps to Window Start**
    - **Validates: Requirements 4.2, 13.4**
  
  - [x] 7.7 Write property test for cursor bounds enforcement
    - **Property 6: Cursor Bounds Enforcement**
    - **Validates: Requirements 4.3**
  
  - [x] 7.8 Write unit tests for simulation control
    - Test cursor stops at window end
    - Test scenario selection for all 4 scenarios
    - Test cursor advancement with different step sizes
    - _Requirements: 4.5_

- [x] 8. Checkpoint - Ensure core backend logic tests pass
  - Run all unit tests and property tests for data layer, simulation, classification, and explanation
  - Verify all property tests run with minimum 100 iterations
  - Fix any failing tests before proceeding to API layer
  - Ask the user if questions arise

- [x] 9. Implement FastAPI Backend
  - [x] 9.1 Create FastAPI application with CORS configuration
    - Set up FastAPI app instance
    - Configure CORS for local development
    - Define error response format
    - _Requirements: 14.1_
  
  - [x] 9.2 Implement GET /api/machines endpoint
    - Return list of all 4 machines with current state
    - Include machine_id, machine_name, health_state, one_line_summary
    - Calculate global_alerts (machines in Action Required state)
    - Calculate global_advisories (machines in Advisory state)
    - _Requirements: 1.2, 1.3, 9.1, 9.2, 14.2_
  
  - [x] 9.3 Implement GET /api/machines/{machine_id} endpoint
    - Return detailed information for specified machine
    - Include sensor_readings, sensor_history, explanation, affected_component, recommended_action
    - Include bearing_evidence if relevant
    - Return 404 for invalid machine_id
    - _Requirements: 5.1, 5.2, 10.2, 10.3, 14.3_
  
  - [x] 9.4 Implement POST /api/simulation/control endpoint
    - Accept machine_id and scenario in request body
    - Call SimulationEngine.set_scenario()
    - Return updated machine state
    - Handle invalid machine_id and scenario with 400 errors
    - _Requirements: 13.2, 13.3, 14.4_
  
  - [x] 9.5 Implement POST /api/simulation/advance endpoint
    - Accept machine_id and steps in request body
    - Call SimulationEngine.advance_cursor()
    - Return updated machine state
    - Handle invalid requests with 400 errors
    - _Requirements: 13.5, 14.4_
  
  - [x] 9.6 Implement error handling middleware
    - Catch exceptions and return appropriate HTTP status codes
    - Return JSON error responses with error message
    - Log detailed errors server-side
    - _Requirements: 14.5, 14.6_
  
  - [x] 9.7 Write property test for global alerts matching machine states
    - **Property 8: Global Alerts Match Machine States**
    - **Validates: Requirements 9.1, 9.2, 9.5**
  
  - [x] 9.8 Write property test for all machines have required data
    - **Property 9: All Machines Have Required Data**
    - **Validates: Requirements 1.2, 1.3**
  
  - [x] 9.9 Write property test for machine detail completeness
    - **Property 10: Machine Detail Completeness**
    - **Validates: Requirements 5.1, 5.2, 10.2, 10.3**
  
  - [x] 9.10 Write property test for sensor history rolling window
    - **Property 11: Sensor History Rolling Window**
    - **Validates: Requirements 6.1, 6.2**
  
  - [x] 9.11 Write property test for API error handling
    - **Property 16: API Error Handling**
    - **Validates: Requirements 14.5, 14.6**
  
  - [x] 9.12 Write property test for navigation preserves simulation state
    - **Property 19: Navigation Preserves Simulation State**
    - **Validates: Requirements 10.5**
  
  - [x] 9.13 Write unit tests for API endpoints
    - Test GET /api/machines returns 4 machines
    - Test GET /api/machines/{machine_id} for valid and invalid IDs
    - Test POST /api/simulation/control with valid and invalid inputs
    - Test POST /api/simulation/advance
    - Test empty alerts and advisories when all machines normal
    - Test offline operation (no external API calls)
    - _Requirements: 1.1, 9.3, 9.4, 14.2, 14.3, 14.4, 16.1, 16.2_

- [x] 10. Implement React Frontend - Dashboard
  - [x] 10.1 Create Dashboard component
    - Fetch data from GET /api/machines on component mount
    - Display GlobalAlerts section showing machines in Action Required state
    - Display GlobalAdvisories section showing machines in Advisory state
    - Display machine grid with cards for all 4 machines
    - Show machine name, health state, and one-line summary on each card
    - Add click handler to navigate to machine detail page
    - _Requirements: 1.2, 1.3, 9.1, 9.2, 10.1_
  
  - [x] 10.2 Create MachineCard component
    - Display machine name and health state with color coding
    - Display one-line summary
    - Apply styling based on health state (green for Normal, yellow for Advisory, red for Action Required)
    - _Requirements: 1.2, 1.3_
  
  - [x] 10.3 Create GlobalAlerts and GlobalAdvisories components
    - Display list of machines in critical states
    - Show empty state message when no alerts/advisories
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 11. Implement React Frontend - Machine Detail Page
  - [x] 11.1 Create MachineDetail component
    - Fetch data from GET /api/machines/{machine_id} on component mount
    - Display machine name and health state header
    - Display current sensor readings (temperature, vibration, torque, rotational speed, tool wear)
    - Display explanation text, affected component, and recommended action
    - Conditionally display bearing evidence if present
    - Add navigation back to Dashboard
    - _Requirements: 5.1, 5.2, 10.2, 10.3, 10.4_
  
  - [x] 11.2 Create SensorReadings component
    - Display sensor values in a grid or table format
    - Show sensor names with units
    - Apply color coding for values exceeding thresholds
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 11.3 Create TrendCharts component using Recharts
    - Display line charts for temperature, vibration, and torque trends
    - Use sensor_history data from API
    - Show multiple sensors on same chart with different colors
    - Add axis labels and legend
    - _Requirements: 6.1, 6.4_
  
  - [x] 11.4 Create ExplanationPanel component
    - Display explanation text prominently
    - Display affected component
    - Display recommended action with appropriate urgency styling
    - _Requirements: 7.1, 11.1, 12.1, 12.2_
  
  - [x] 11.5 Create BearingEvidencePanel component
    - Display bearing vibration waveform chart
    - Show bearing condition description
    - Only render when bearing evidence is present in API response
    - _Requirements: 8.1, 8.3_

- [x] 12. Implement React Frontend - Simulation Control Panel
  - [x] 12.1 Create SimulationControlPanel component
    - Add dropdown to select machine (4 options)
    - Add dropdown to select scenario (Normal, Advisory, Action Required, Post-Maintenance)
    - Add "Set Scenario" button to call POST /api/simulation/control
    - Add "Advance Simulation" button to call POST /api/simulation/advance
    - Display current cursor position and state window info
    - Update Dashboard and Machine Detail views after simulation changes
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 12.2 Write integration tests for simulation control
    - Test scenario selection updates machine state
    - Test advance button moves cursor forward
    - Test UI updates after simulation changes
    - _Requirements: 13.4, 13.5_

- [x] 13. Implement routing and navigation
  - [x] 13.1 Set up React Router
    - Create route for Dashboard (/)
    - Create route for Machine Detail (/machines/:machineId)
    - Implement navigation between routes
    - _Requirements: 10.1, 10.4_
  
  - [x] 13.2 Add navigation components
    - Create header with app title and navigation links
    - Add back button on Machine Detail page
    - _Requirements: 10.4_

- [x] 14. Styling and responsive design
  - [x] 14.1 Apply CSS styling to all components
    - Use CSS modules or styled-components
    - Implement color scheme for health states (green, yellow, red)
    - Add spacing, padding, and layout styling
    - _Requirements: 17.4_
  
  - [x] 14.2 Implement responsive design
    - Ensure Dashboard grid adapts to different screen sizes
    - Make charts responsive
    - Test on mobile, tablet, and desktop viewports
    - _Requirements: 17.4_

- [x] 15. Final integration and testing
  - [x] 15.1 Run full backend test suite
    - Execute all unit tests
    - Execute all property tests with 100+ iterations
    - Verify test coverage meets 80% goal
    - Fix any failing tests
    - _Requirements: All_
  
  - [x] 15.2 Test end-to-end user flows
    - Test Dashboard load → view all machines
    - Test click machine card → view machine detail
    - Test select scenario → verify state updates
    - Test advance simulation → verify cursor moves
    - Test all 4 machines with all 4 scenarios
    - _Requirements: All_
  
  - [x] 15.3 Verify offline operation
    - Disconnect network
    - Start backend and frontend
    - Verify all functionality works without internet
    - Verify no external API calls are made
    - _Requirements: 16.1, 16.2, 16.3, 16.5_
  
  - [x] 15.4 Test on CPU-only environment
    - Run system without GPU
    - Verify ML models work correctly
    - Verify performance is acceptable
    - _Requirements: 15.5_

- [x] 16. Documentation and deployment preparation
  - [x] 16.1 Create README.md with setup instructions
    - Document dataset requirements and placement
    - Document Python and Node.js version requirements
    - Document installation steps for backend and frontend
    - Document how to run backend server and frontend dev server
    - Document API endpoints
    - _Requirements: All_
  
  - [x] 16.2 Create requirements.txt for Python dependencies
    - List all Python packages with versions
    - _Requirements: All_
  
  - [x] 16.3 Create package.json for frontend dependencies
    - List all npm packages with versions
    - _Requirements: All_
  
  - [x] 16.4 Add inline code comments and docstrings
    - Document all classes and methods
    - Explain complex logic (state window detection, classification rules)
    - _Requirements: All_

- [x] 17. Final checkpoint - Complete system validation
  - Ensure all tests pass (unit tests and property tests)
  - Verify all 4 machines work with all 4 scenarios
  - Verify deterministic behavior (same inputs → same outputs)
  - Verify no external dependencies or API calls
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across many inputs
- Unit tests validate specific examples, edge cases, and integration points
- Checkpoints ensure incremental validation at key milestones
- The implementation follows a bottom-up approach: data layer → simulation layer → API layer → UI layer
- All property tests must run with minimum 100 iterations and include tags referencing design properties
