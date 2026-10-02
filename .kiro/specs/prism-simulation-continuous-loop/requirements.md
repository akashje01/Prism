# Requirements Document

## Introduction

This specification defines the requirements for transforming the PRISM frontend simulation from a finite, static playback system into a continuous, real-time industrial predictive maintenance simulation. The system must behave as a live monitoring dashboard that runs indefinitely, oscillating between degradation and recovery cycles to simulate realistic industrial equipment behavior.

## Glossary

- **Simulation_Engine**: The frontend component responsible for generating synthetic sensor data and managing simulation state
- **Time_Window**: The visible range of time steps displayed in charts and visualizations
- **Oscillation**: Bidirectional movement pattern where simulation alternates between forward (degradation) and backward (recovery) directions
- **Scenario**: A predefined behavioral profile that determines data generation characteristics (Normal, Advisory, Action Required, Post-Maintenance)
- **Rolling_Buffer**: A fixed-size FIFO data structure that maintains the most recent N time steps
- **Health_State**: The current operational status of a machine (Normal, Advisory, Action Required)
- **Dashboard**: The main overview page displaying all machines and their current health states
- **Machine_Detail_Page**: The detailed view showing sensor trends, charts, and simulation controls for a single machine
- **Synthetic_Data**: Dynamically generated sensor values based on statistical models rather than pre-recorded datasets

## Requirements

### Requirement 1: Continuous Simulation Loop

**User Story:** As a demo presenter, I want the simulation to run continuously without stopping, so that I can demonstrate the system's real-time monitoring capabilities indefinitely.

#### Acceptance Criteria

1. WHEN the simulation starts, THE Simulation_Engine SHALL run indefinitely without termination
2. THE Simulation_Engine SHALL NOT have any completion state or end condition
3. WHEN the simulation reaches the upper time bound, THE Simulation_Engine SHALL reverse direction and continue
4. WHEN the simulation reaches the lower time bound, THE Simulation_Engine SHALL reverse direction and continue
5. THE Simulation_Engine SHALL oscillate between forward and backward directions continuously

### Requirement 2: Bidirectional Oscillation

**User Story:** As a system operator, I want the simulation to oscillate between degradation and recovery cycles, so that I can observe realistic equipment behavior patterns.

#### Acceptance Criteria

1. WHEN the simulation direction is forward, THE Simulation_Engine SHALL simulate equipment degradation
2. WHEN the simulation direction is backward, THE Simulation_Engine SHALL simulate equipment recovery
3. WHEN the upper bound is reached, THE Simulation_Engine SHALL set direction to backward
4. WHEN the lower bound is reached, THE Simulation_Engine SHALL set direction to forward
5. THE Simulation_Engine SHALL maintain direction state across all simulation ticks

### Requirement 3: Time Window Management

**User Story:** As a user viewing sensor trends, I want to see at least 15 time steps at all times, so that I can observe meaningful patterns in the data.

#### Acceptance Criteria

1. THE Time_Window SHALL display a minimum of 15 visible time steps
2. THE Time_Window SHALL target 30-60 rolling time steps for optimal visualization
3. THE Time_Window SHALL NOT have a maximum duration limit
4. WHEN new data is generated, THE Rolling_Buffer SHALL remove the oldest data point if at capacity
5. THE Time_Window SHALL scroll continuously as new data arrives

### Requirement 4: Scenario Selection Behavior

**User Story:** As a demo presenter, I want to switch between scenarios instantly, so that I can demonstrate different equipment conditions without interruption.

#### Acceptance Criteria

1. WHEN a scenario is selected, THE Simulation_Engine SHALL reset all data buffers immediately
2. WHEN a scenario is selected, THE Simulation_Engine SHALL switch the data generation profile
3. WHEN a scenario is selected, THE Simulation_Engine SHALL start the infinite simulation loop
4. WHEN a scenario is selected, THE Simulation_Engine SHALL update sensor values, charts, dashboard state, and alerts
5. THE Simulation_Engine SHALL NOT terminate or pause when scenarios are switched

### Requirement 5: Synthetic Data Generation

**User Story:** As a system architect, I want data to be generated dynamically from statistical models, so that the simulation can run indefinitely without dataset limitations.

#### Acceptance Criteria

1. THE Simulation_Engine SHALL generate sensor values dynamically using statistical parameters
2. THE Simulation_Engine SHALL use datasets as statistical seeds, not as finite data sources
3. WHEN generating values, THE Simulation_Engine SHALL apply base mean, variance, directional drift, and bounded noise
4. THE Simulation_Engine SHALL produce a new synthetic state on every simulation tick
5. THE Simulation_Engine SHALL ensure generated values remain within realistic sensor bounds

### Requirement 6: Continuous Chart Rendering

**User Story:** As a user monitoring equipment, I want charts to scroll continuously and animate, so that I can observe real-time trends.

#### Acceptance Criteria

1. WHEN new data arrives, THE charts SHALL scroll continuously
2. THE charts SHALL animate transitions between data points
3. THE charts SHALL NOT render as static or single-point displays
4. THE charts SHALL use a Rolling_Buffer to maintain data
5. THE charts SHALL maintain at least 15 visible data points at all times

### Requirement 7: Playback Control Simplification

**User Story:** As a user, I want simple playback controls that start the simulation, so that I'm not confused by unnecessary stop or complete states.

#### Acceptance Criteria

1. THE simulation controls SHALL provide only a Play button
2. THE simulation controls SHALL NOT include a Stop button
3. THE simulation controls SHALL NOT display "simulation complete" messages
4. WHEN the Play button is clicked, THE Simulation_Engine SHALL toggle between running and paused states
5. WHEN a scenario is selected, THE Simulation_Engine SHALL auto-start

### Requirement 8: State Ownership and Single Source of Truth

**User Story:** As a system architect, I want clear state ownership, so that the simulation behaves predictably and consistently.

#### Acceptance Criteria

1. THE Machine_Detail_Page SHALL own the simulation clock, direction, buffers, and scenario state
2. THE Dashboard SHALL derive machine health states from live simulation data
3. WHEN a machine's health changes to Advisory, THE Dashboard SHALL display it in the Advisory list
4. WHEN a machine's health changes to Action Required, THE Dashboard SHALL display it in the Alerts list
5. THE Dashboard SHALL NOT cache initial health values

### Requirement 9: Dynamic Dashboard Updates

**User Story:** As a facility manager, I want the dashboard to reflect live machine states, so that I can monitor all equipment in real-time.

#### Acceptance Criteria

1. WHEN a machine's Health_State changes, THE Dashboard SHALL update immediately
2. THE Dashboard SHALL display machines in the correct health category (Normal, Advisory, Action Required)
3. WHEN a machine transitions from Normal to Advisory, THE Dashboard SHALL move it to the Advisory panel
4. WHEN a machine transitions from Advisory to Action Required, THE Dashboard SHALL move it to the Alerts panel
5. THE Dashboard SHALL reflect the current simulation state, not historical or cached values

### Requirement 10: Scenario-Specific Behavior Profiles

**User Story:** As a demo presenter, I want each scenario to exhibit distinct behavior patterns, so that I can demonstrate different equipment conditions clearly.

#### Acceptance Criteria

1. WHEN the Normal scenario is active, THE Simulation_Engine SHALL generate stable values with small noise
2. WHEN the Advisory scenario is active, THE Simulation_Engine SHALL generate gradual drift with periodic spikes
3. WHEN the Action Required scenario is active, THE Simulation_Engine SHALL generate sustained threshold breaches
4. WHEN the Post-Maintenance scenario is active, THE Simulation_Engine SHALL generate recovery trends toward normal
5. THE Simulation_Engine SHALL maintain scenario-specific behavior throughout the oscillation cycle

### Requirement 11: White Theme Readability

**User Story:** As a user in white theme mode, I want header text to be readable, so that I can navigate the application effectively.

#### Acceptance Criteria

1. WHEN white theme is active, THE header title text SHALL be white
2. WHEN white theme is active, THE subtitle text SHALL remain readable
3. WHEN white theme is active, THE header icons SHALL invert correctly
4. THE header SHALL maintain sufficient contrast in both light and dark themes
5. THE header text SHALL be visible against the header background in all theme modes

### Requirement 12: Debug UI Removal

**User Story:** As an end user, I want a clean interface without developer debug elements, so that I can focus on the simulation data.

#### Acceptance Criteria

1. THE user interface SHALL NOT display cursor position indicators
2. THE user interface SHALL NOT display window index counters
3. THE user interface SHALL NOT display time step counters
4. THE user interface SHALL NOT display "simulation complete" banners
5. THE user interface SHALL NOT display developer or debug labels

### Requirement 13: No Backend Dependencies

**User Story:** As a developer, I want all simulation changes to be frontend-only, so that I can deploy updates without backend coordination.

#### Acceptance Criteria

1. THE simulation changes SHALL NOT require backend API modifications
2. THE simulation changes SHALL NOT require new backend endpoints
3. THE simulation changes SHALL NOT require backend dataset modifications
4. THE Simulation_Engine SHALL operate entirely within the frontend
5. THE Simulation_Engine SHALL use existing backend APIs without modification
