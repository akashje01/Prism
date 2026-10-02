# Requirements Document: PRISM Predictive Maintenance System

## Introduction

PRISM (Predictive Reliability & Intelligent Systems for Maintenance) is an AI-driven predictive maintenance system for manufacturing plants. The system monitors multiple machines, detects early degradation patterns, classifies machine health states, and provides human-readable explanations using explainable AI techniques. The system operates entirely on local datasets without external APIs or hardware dependencies, using deterministic state-based simulation for demo purposes.

## Glossary

- **System**: The PRISM predictive maintenance application
- **Machine**: A monitored manufacturing equipment unit (CNC Mill, Cooling Pump, Conveyor Motor, or Air Compressor)
- **Health_State**: Classification of machine condition (Normal, Advisory, Action Required, Post-Maintenance)
- **Base_Slice**: A subset of AI4I dataset assigned to a specific machine
- **State_Window**: A contiguous segment within a base slice representing a specific health state
- **Simulation_Cursor**: Current position within a state window during simulation
- **Sensor_Reading**: Numerical measurement from AI4I dataset (temperature, vibration, torque, etc.)
- **Bearing_Evidence**: CWRU dataset vibration data mapped to health states
- **Explanation_Engine**: Deterministic logic that converts sensor trends into human-readable text
- **Dashboard**: Main UI showing all machines and global alerts
- **Machine_Detail_Page**: UI showing detailed information for a single machine
- **Simulation_Control_Panel**: UI component for selecting machine and scenario to control simulation state

## Requirements

### Requirement 1: Machine Monitoring

**User Story:** As a maintenance engineer, I want to monitor multiple manufacturing machines simultaneously, so that I can track the health of all equipment from a single interface.

#### Acceptance Criteria

1. THE System SHALL monitor exactly four machines: CNC-MILL-01, COOL-PUMP-02, CONV-MOTOR-01, and AIR-COMP-01
2. WHEN the Dashboard loads, THE System SHALL display the current health state for all four machines
3. WHEN the Dashboard loads, THE System SHALL display a one-line summary for each machine
4. THE System SHALL update machine health states based on current simulation cursor position
5. THE System SHALL maintain independent simulation cursors for each machine

### Requirement 2: Health State Classification

**User Story:** As a maintenance engineer, I want machines classified into clear health states, so that I can prioritize maintenance actions appropriately.

#### Acceptance Criteria

1. THE System SHALL classify each machine into exactly one of four health states: Normal, Advisory, Action Required, or Post-Maintenance
2. WHEN sensor readings indicate normal operation, THE System SHALL classify the machine as Normal
3. WHEN sensor readings show early degradation patterns, THE System SHALL classify the machine as Advisory
4. WHEN sensor readings exceed critical thresholds, THE System SHALL classify the machine as Action Required
5. WHEN a machine transitions from Action Required to normal operation, THE System SHALL classify the machine as Post-Maintenance
6. THE System SHALL determine health state using deterministic threshold-based logic or lightweight ML models

### Requirement 3: Dataset Management

**User Story:** As a system operator, I want the system to use local datasets exclusively, so that the system operates without external dependencies or network requirements.

#### Acceptance Criteria

1. THE System SHALL load all data from the datasets/ folder in the local filesystem
2. THE System SHALL use ai4i2020.csv for machine-level operational sensor data
3. THE System SHALL use CWRU bearing dataset files (Time_Normal_1_098.mat, B014_1_190.mat, IR014_1_175.mat, OR014_6_1_202.mat, feature_time_48k_2048_load_1.csv) for bearing vibration evidence
4. WHEN the System starts, THE System SHALL partition ai4i2020.csv into four base slices, one per machine
5. WHEN the System starts, THE System SHALL identify state windows within each base slice corresponding to Normal, Advisory, Action Required, and Post-Maintenance states
6. THE System SHALL NOT generate synthetic data or use random data generation

### Requirement 4: State-Based Simulation

**User Story:** As a system demonstrator, I want to control simulation scenarios deterministically, so that I can showcase specific machine conditions reliably.

#### Acceptance Criteria

1. THE System SHALL implement a state-based simulation engine that does NOT use linear replay
2. WHEN a user selects a machine and scenario in the Simulation_Control_Panel, THE System SHALL move the simulation cursor to the start of the corresponding state window
3. WHEN the simulation advances, THE Simulation_Cursor SHALL progress only within the currently selected state window
4. THE System SHALL maintain independent simulation cursors for each of the four machines
5. WHEN the simulation cursor reaches the end of a state window, THE System SHALL stop progression or loop within that window
6. THE System SHALL provide deterministic and repeatable simulation behavior for any given machine and scenario selection

### Requirement 5: Sensor Data Display

**User Story:** As a maintenance engineer, I want to view current sensor readings for each machine, so that I can understand the operational parameters.

#### Acceptance Criteria

1. WHEN viewing the Machine_Detail_Page, THE System SHALL display all sensor readings from the current AI4I base slice row
2. THE System SHALL display sensor values including temperature, vibration, torque, rotational speed, and tool wear
3. WHEN the simulation cursor advances, THE System SHALL update displayed sensor values to reflect the new cursor position
4. THE System SHALL display sensor values with appropriate units and precision
5. THE System SHALL retrieve sensor values directly from the AI4I dataset without modification

### Requirement 6: Trend Visualization

**User Story:** As a maintenance engineer, I want to see sensor trends over time, so that I can identify degradation patterns visually.

#### Acceptance Criteria

1. WHEN viewing the Machine_Detail_Page, THE System SHALL display time-series charts for key sensor readings
2. THE System SHALL use a rolling window approach to display recent sensor history
3. WHEN the simulation cursor advances, THE System SHALL update trend charts to include the new data point
4. THE System SHALL display trends for at least temperature, vibration, and torque sensors
5. THE System SHALL render charts using a JavaScript charting library suitable for time-series data

### Requirement 7: Explainable AI Logic

**User Story:** As a maintenance engineer, I want clear explanations of machine issues in plain language, so that I can understand problems without interpreting raw sensor data.

#### Acceptance Criteria

1. THE Explanation_Engine SHALL generate human-readable explanations using deterministic template-based logic
2. THE Explanation_Engine SHALL NOT use LLM APIs, chatbots, or external AI services
3. WHEN sensor trends indicate rising vibration, THE Explanation_Engine SHALL generate explanations referencing bearing wear or imbalance
4. WHEN sensor trends indicate high torque combined with high temperature, THE Explanation_Engine SHALL generate explanations referencing mechanical stress or lubrication issues
5. WHEN a machine is in Normal state, THE Explanation_Engine SHALL generate a brief confirmation or remain silent
6. THE Explanation_Engine SHALL map sensor patterns to mechanical meanings using predefined rules
7. THE Explanation_Engine SHALL produce calm, actionable, non-probabilistic explanations

### Requirement 8: Bearing Vibration Evidence

**User Story:** As a maintenance engineer, I want to see bearing vibration evidence when relevant, so that I can validate bearing-related diagnoses.

#### Acceptance Criteria

1. WHEN a machine health state is Advisory or Action Required due to bearing issues, THE System SHALL display bearing vibration evidence from the CWRU dataset
2. THE System SHALL map health states to CWRU files: Normal maps to Time_Normal_1_098.mat, Advisory maps to B014_1_190.mat, Action Required maps to IR014_1_175.mat or OR014_6_1_202.mat
3. WHEN bearing evidence is displayed, THE System SHALL show vibration waveform (time-domain) and optionally frequency spectrum data
4. WHEN bearing issues are not the primary concern, THE System SHALL NOT display bearing evidence
5. THE System SHALL load CWRU .mat files using appropriate Python libraries (scipy.io)

### Requirement 9: Global Alerts and Advisories

**User Story:** As a maintenance supervisor, I want to see all critical alerts and advisories at a glance, so that I can prioritize urgent issues across all machines.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE System SHALL display a Global Alerts section showing all machines in Action Required state
2. WHEN the Dashboard loads, THE System SHALL display a Global Advisories section showing all machines in Advisory state
3. WHEN no machines are in Action Required state, THE Global Alerts section SHALL indicate no active alerts
4. WHEN no machines are in Advisory state, THE Global Advisories section SHALL indicate no active advisories
5. THE System SHALL update Global Alerts and Global Advisories in real-time as simulation progresses

### Requirement 10: Machine Detail Navigation

**User Story:** As a maintenance engineer, I want to navigate from the dashboard to detailed machine views, so that I can investigate specific machines in depth.

#### Acceptance Criteria

1. WHEN a user clicks on a machine card in the Dashboard, THE System SHALL navigate to the Machine_Detail_Page for that machine
2. THE Machine_Detail_Page SHALL display the machine name and current health state
3. THE Machine_Detail_Page SHALL display current sensor readings, trend charts, explanation text, affected component, and recommended action
4. WHEN viewing the Machine_Detail_Page, THE System SHALL provide a way to return to the Dashboard
5. THE System SHALL maintain simulation state when navigating between Dashboard and Machine_Detail_Page

### Requirement 11: Affected Component Identification

**User Story:** As a maintenance engineer, I want to know which component is affected when issues arise, so that I can focus maintenance efforts efficiently.

#### Acceptance Criteria

1. WHEN a machine is in Advisory or Action Required state, THE System SHALL identify the affected component (e.g., bearing, motor, cooling system)
2. THE System SHALL determine affected components using deterministic rules based on sensor patterns
3. WHEN vibration is elevated, THE System SHALL identify bearings or rotating components as affected
4. WHEN temperature is elevated without vibration issues, THE System SHALL identify cooling or lubrication systems as affected
5. WHEN a machine is in Normal state, THE System SHALL indicate no affected components or indicate all components are operating normally

### Requirement 12: Recommended Actions

**User Story:** As a maintenance engineer, I want specific recommended actions for each issue, so that I know what steps to take.

#### Acceptance Criteria

1. WHEN a machine is in Advisory state, THE System SHALL recommend monitoring or inspection actions
2. WHEN a machine is in Action Required state, THE System SHALL recommend immediate maintenance or shutdown actions
3. WHEN a machine is in Normal state, THE System SHALL recommend continued normal operation
4. THE System SHALL generate recommended actions using deterministic template-based logic
5. THE System SHALL provide actionable, specific recommendations rather than vague guidance

### Requirement 13: Simulation Control Interface

**User Story:** As a system demonstrator, I want an intuitive control panel to select scenarios, so that I can demonstrate different machine conditions easily.

#### Acceptance Criteria

1. THE System SHALL provide a Simulation_Control_Panel UI component
2. THE Simulation_Control_Panel SHALL allow selection of one of the four machines
3. THE Simulation_Control_Panel SHALL allow selection of a scenario (Normal, Advisory, Action Required, Post-Maintenance)
4. WHEN a user selects a machine and scenario, THE System SHALL immediately update the simulation cursor to the start of the corresponding state window
5. THE Simulation_Control_Panel SHALL provide controls to advance the simulation cursor forward within the current state window

### Requirement 14: Backend API

**User Story:** As a frontend developer, I want a well-defined REST API, so that I can build the UI independently of backend implementation details.

#### Acceptance Criteria

1. THE System SHALL provide a REST API using FastAPI
2. THE System SHALL provide an endpoint to retrieve current state for all machines
3. THE System SHALL provide an endpoint to retrieve detailed information for a specific machine
4. THE System SHALL provide an endpoint to control simulation (select machine, select scenario, advance cursor)
5. THE System SHALL return JSON responses with appropriate HTTP status codes
6. THE System SHALL handle errors gracefully and return meaningful error messages

### Requirement 15: Lightweight Machine Learning

**User Story:** As a system architect, I want to use lightweight, explainable ML models, so that the system remains transparent and avoids black-box complexity.

#### Acceptance Criteria

1. WHERE machine learning is used, THE System SHALL use lightweight models such as Isolation Forest for anomaly detection or linear regression for trend analysis
2. THE System SHALL NOT use deep learning, neural networks, or black-box models
3. WHERE ML models are used, THE System SHALL provide explainable outputs that can be mapped to deterministic explanations
4. THE System SHALL prioritize threshold-based logic and statistical methods over complex ML when possible
5. THE System SHALL ensure all ML models can run locally without GPU requirements

### Requirement 16: No External Dependencies

**User Story:** As a system operator, I want the system to run completely offline, so that it can operate in secure or network-restricted environments.

#### Acceptance Criteria

1. THE System SHALL NOT make API calls to external services including LLM APIs (Gemini, GPT, Claude, etc.)
2. THE System SHALL NOT require internet connectivity for any functionality
3. THE System SHALL NOT depend on cloud services or remote databases
4. THE System SHALL NOT simulate or mock IoT hardware or sensor devices
5. THE System SHALL operate entirely using local datasets and local computation

### Requirement 17: User Interface Technology

**User Story:** As a frontend developer, I want to use modern React patterns, so that the UI is maintainable and performant.

#### Acceptance Criteria

1. THE System SHALL implement the frontend using React
2. THE System SHALL use functional components and React hooks
3. THE System SHALL use a charting library suitable for time-series visualization (e.g., Recharts, Chart.js, or similar)
4. THE System SHALL implement responsive design principles for different screen sizes
5. THE System SHALL maintain clean separation between UI components and API integration logic

### Requirement 18: Deterministic Behavior

**User Story:** As a system demonstrator, I want completely deterministic behavior, so that demonstrations are reliable and reproducible.

#### Acceptance Criteria

1. THE System SHALL produce identical results for identical inputs and simulation states
2. THE System SHALL NOT introduce randomness in explanations, classifications, or recommendations
3. WHEN the simulation cursor is at a specific position, THE System SHALL always display the same sensor values, health state, and explanation
4. THE System SHALL NOT use probabilistic language or confidence percentages in the UI
5. THE System SHALL ensure all ML models produce deterministic outputs for the same input data
