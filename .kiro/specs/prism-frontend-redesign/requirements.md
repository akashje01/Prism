# Requirements Document: PRISM Frontend Redesign

## Introduction

The PRISM Predictive Maintenance System requires a frontend redesign to transform it from a developer-focused demo tool into a professional industrial decision-support dashboard. The redesign focuses exclusively on the frontend user experience, interaction model, and visual presentation while maintaining the existing backend API without modification.

The core objective is to create a user-centric interface that communicates machine health and operational status in clear, actionable terms without exposing simulation mechanics or technical implementation details.

## Glossary

- **System**: The PRISM frontend application (React-based web interface)
- **Dashboard**: The main page displaying an overview of all machines
- **Machine_Detail_Page**: The detailed view for a single machine showing sensors, analysis, and trends
- **Health_State**: The operational condition of a machine (Normal, Advisory, Action Required, Post-Maintenance)
- **Simulation**: The time-based progression through historical sensor data
- **Play_Button**: The control that starts automatic simulation progression
- **Scenario**: A predefined data sequence representing different machine conditions
- **Sensor_Reading**: Current numerical value from a machine sensor (temperature, vibration, etc.)
- **Trend_Chart**: A time-series visualization showing sensor value changes over time
- **Dark_Mode**: A color scheme optimized for low-light viewing conditions
- **Backend_API**: The existing REST API that provides machine data and simulation control

## Requirements

### Requirement 1: Dashboard Overview Display

**User Story:** As an operations engineer, I want to see all machines at a glance, so that I can quickly identify which machines need attention.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE System SHALL display a grid of machine cards showing machine name, health state badge, condition summary, and view details button
2. THE System SHALL display health state badges using color coding (green for Normal, yellow for Advisory, red for Action Required, blue for Post-Maintenance)
3. WHEN machines have Advisory health state, THE System SHALL display them in an advisories list in the secondary section
4. WHEN machines have Action Required health state, THE System SHALL display them in an alerts list in the secondary section
5. THE System SHALL NOT display cursor position, state window, window range, or simulation controls on the Dashboard

### Requirement 2: Automatic Time-Based Simulation

**User Story:** As a maintenance supervisor, I want the simulation to progress automatically, so that I can observe machine behavior over time without manual intervention.

#### Acceptance Criteria

1. WHEN a user clicks the Play_Button on the Machine_Detail_Page, THE System SHALL start automatic simulation progression at approximately 1-second intervals
2. WHILE simulation is playing, THE System SHALL advance the cursor by calling the backend API and re-fetch machine data after each advance
3. WHEN simulation is playing, THE Play_Button SHALL change to a Stop button
4. WHEN a user clicks the Stop button, THE System SHALL halt automatic simulation progression
5. WHEN the simulation reaches the window end, THE System SHALL automatically stop progression
6. THE System SHALL update all sensor readings, charts, and analysis sections with each simulation advance

### Requirement 3: Machine Detail Page Structure

**User Story:** As a maintenance engineer, I want to see comprehensive machine information organized logically, so that I can quickly understand the machine's condition and required actions.

#### Acceptance Criteria

1. THE Machine_Detail_Page SHALL display a header section containing machine name on the left and scenario dropdown with Play_Button on the right
2. THE Machine_Detail_Page SHALL display a Live Sensor Readings section with large numeric cards showing current values with units
3. THE Machine_Detail_Page SHALL display a Condition Analysis section with plain-language explanation of current machine condition
4. WHEN Health_State is Advisory or Action Required, THE Machine_Detail_Page SHALL display a Cause of Issue section showing affected component and mechanical cause
5. THE Machine_Detail_Page SHALL display a Recommended Action section with clear, deterministic guidance
6. WHEN Health_State is Action Required, THE Machine_Detail_Page SHALL display a Remaining Safe Operating Time section with deterministic time estimate
7. THE Machine_Detail_Page SHALL display a Sensor Trends section with charts that update during simulation

### Requirement 4: Sensor Data Visualization

**User Story:** As a reliability engineer, I want to see sensor trends over time, so that I can identify patterns and predict failures.

#### Acceptance Criteria

1. THE System SHALL display trend charts for Temperature, Vibration, Torque, Rotational Speed, and Tool Wear
2. WHEN simulation is playing, THE Trend_Chart SHALL update automatically with new data points
3. THE System SHALL display minimum 50-100 time steps in Trend_Chart to ensure visible trends
4. THE Trend_Chart SHALL display two charts per row for optimal layout
5. THE Trend_Chart SHALL include subtle threshold reference lines without dominating the visualization
6. THE System SHALL NOT display flat-line charts due to insufficient data windows

### Requirement 5: User-Centric Communication

**User Story:** As a plant manager, I want information presented in operational terms, so that I can make decisions without understanding technical implementation details.

#### Acceptance Criteria

1. THE System SHALL NOT display cursor position, state window, window range, or dataset mechanics anywhere in the interface
2. THE System SHALL present condition analysis using plain-language explanations without technical jargon
3. THE System SHALL present recommended actions using clear, action-oriented language without probabilities or vague wording
4. WHEN displaying remaining safe operating time, THE System SHALL use deterministic estimates (e.g., "Estimated X hours remaining")
5. THE System SHALL highlight Sensor_Reading values ONLY when thresholds are crossed, not continuously

### Requirement 6: Global Dark Mode

**User Story:** As a control room operator working night shifts, I want a dark mode option, so that I can reduce eye strain in low-light conditions.

#### Acceptance Criteria

1. THE System SHALL display a dark mode toggle in the header accessible from all pages
2. WHEN a user toggles dark mode, THE System SHALL apply dark theme to all components including Dashboard and Machine_Detail_Page
3. WHEN dark mode is enabled, THE System SHALL persist the preference in browser localStorage
4. WHEN the System loads, THE System SHALL restore the user's dark mode preference from localStorage
5. WHILE in dark mode, THE System SHALL maintain readability and contrast for all text and visualizations

### Requirement 7: Industrial Dashboard Aesthetics

**User Story:** As a facility director, I want the interface to look professional and industrial, so that it inspires confidence in the system's reliability.

#### Acceptance Criteria

1. THE System SHALL use clean, neutral industrial colors for the base interface
2. THE System SHALL use red, yellow, and green colors ONLY to indicate health states
3. THE System SHALL NOT display developer or debug information in any user-facing interface
4. THE System SHALL present information in a structured, organized layout appropriate for decision-support
5. THE System SHALL use typography and spacing consistent with professional industrial applications

### Requirement 8: Responsive Design

**User Story:** As a field technician, I want to access the dashboard on mobile devices, so that I can check machine status while on the factory floor.

#### Acceptance Criteria

1. WHEN the System is viewed on mobile devices, THE System SHALL display a mobile-optimized layout
2. WHEN the System is viewed on tablets, THE System SHALL display a tablet-optimized layout
3. WHEN the System is viewed on desktop, THE System SHALL display a desktop-optimized layout
4. WHEN viewport size changes, THE Trend_Chart SHALL resize appropriately while maintaining readability
5. THE System SHALL maintain full functionality across all device sizes

### Requirement 9: Backend API Integration

**User Story:** As a system architect, I want the frontend to use existing backend endpoints, so that no backend modifications are required.

#### Acceptance Criteria

1. THE System SHALL use GET /api/machines endpoint to retrieve dashboard data
2. THE System SHALL use GET /api/machines/{id} endpoint to retrieve machine detail data
3. THE System SHALL use POST /api/simulation/control endpoint to set scenario
4. THE System SHALL use POST /api/simulation/advance endpoint to advance simulation cursor
5. THE System SHALL NOT modify, extend, or create new backend API endpoints

### Requirement 10: Scenario Selection and Control

**User Story:** As a training coordinator, I want to select different scenarios, so that I can demonstrate various machine conditions to new operators.

#### Acceptance Criteria

1. THE Machine_Detail_Page SHALL display a scenario dropdown with options: Normal, Advisory, Action Required, Post-Maintenance
2. WHEN a user selects a scenario, THE System SHALL call the backend API to set the scenario
3. WHEN a scenario is changed, THE System SHALL reset the simulation to the beginning of the new scenario
4. WHEN a scenario is changed while simulation is playing, THE System SHALL stop the simulation
5. THE System SHALL display the currently selected scenario in the dropdown
