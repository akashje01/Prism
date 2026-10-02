# Implementation Plan: PRISM Frontend Redesign

## Overview

This implementation plan transforms the PRISM frontend from a developer-focused demo tool into a professional industrial decision-support dashboard. The implementation focuses on three key areas:

1. **Automatic time-based simulation** with proper interval ownership and lifecycle management
2. **User-centric communication** removing all technical implementation details from the UI
3. **Industrial dashboard aesthetics** with dark mode support and responsive design

All changes are frontend-only, maintaining complete compatibility with the existing backend API.

## Tasks

- [x] 1. Set up dark mode infrastructure and global state
  - Create DarkModeContext with provider
  - Implement localStorage persistence for dark mode preference
  - Add dark mode toggle to Header component
  - Create CSS variables for light/dark themes
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 1.1 Write property test for dark mode persistence
  - **Property 9: Dark Mode Persistence Round Trip**
  - **Validates: Requirements 6.3, 6.4**

- [x] 2. Redesign Dashboard page with machine grid and alerts
  - [x] 2.1 Create MachineCard component
    - Display machine name, health state badge, condition summary
    - Implement color-coded health state badges (green/yellow/red/blue)
    - Add "View Details" button with routing
    - Remove all simulation controls and technical data
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 2.2 Write property test for health state badge colors
    - **Property 1: Health State Badge Color Mapping**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Create MachineGrid component
    - Display grid layout of MachineCard components
    - Implement responsive grid (1 column mobile, 2-3 tablet, 3-4 desktop)
    - Fetch machines from GET /api/machines on mount
    - _Requirements: 1.1, 8.1, 8.2, 8.3_

  - [x] 2.4 Create AlertsSidebar component
    - Filter and display Action Required machines in alerts list
    - Filter and display Advisory machines in advisories list
    - Style with appropriate urgency indicators
    - _Requirements: 1.3, 1.4_

  - [x] 2.5 Write property tests for alert/advisory filtering
    - **Property 2: Advisory Machines in Advisories List**
    - **Property 3: Action Required Machines in Alerts List**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 2.6 Integrate Dashboard components
    - Compose MachineGrid and AlertsSidebar in Dashboard page
    - Implement responsive layout (sidebar below on mobile, right side on desktop)
    - Add loading and error states
    - _Requirements: 1.1, 8.1, 8.2, 8.3_

- [x] 2.7 Write unit tests for Dashboard page
  - Test machine data fetching
  - Test loading and error states
  - Test responsive layout behavior
  - _Requirements: 1.1, 9.1_

- [x] 3. Checkpoint - Verify Dashboard functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Machine Detail Page with simulation controls
  - [x] 4.1 Create MachineDetailPage component structure
    - Set up component state: machineData, isPlaying, selectedScenario, intervalId, trendBuffers
    - Implement exclusive ownership of simulation interval timer
    - Initialize trend buffers (Map<string, number[]>) with 50-100 point capacity
    - Fetch machine data from GET /api/machines/{id} on mount
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.7, 9.2_

  - [x] 4.2 Implement simulation interval lifecycle management
    - Create interval only when Play is pressed
    - Clear interval on: Stop press, scenario change, window end, unmount, API error
    - Ensure only one interval exists at a time
    - Call POST /api/simulation/advance every ~1 second during playback
    - Re-fetch machine data after each advance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.4_

  - [x] 4.3 Implement trend buffer management
    - Append new sensor values to buffers on each simulation advance
    - Remove oldest values when buffer exceeds 100 points
    - Reset buffers when scenario changes
    - Clear buffers when switching machines
    - Maintain minimum 50 points before rendering charts
    - _Requirements: 4.3, 4.6_

  - [x] 4.4 Write property test for simulation updates
    - **Property 4: Simulation Updates All Sections**
    - **Validates: Requirements 2.6**

  - [x] 4.5 Write property test for minimum trend data points
    - **Property 7: Minimum Trend Data Points**
    - **Validates: Requirements 4.3**

- [x] 5. Create simulation control components
  - [x] 5.1 Create SimulationControls component
    - Display scenario dropdown (Normal, Advisory, Action Required, Post-Maintenance)
    - Display Play/Stop button with appropriate icon
    - Call parent callbacks for scenario change and play/stop
    - Never create or manage interval timers (parent owns exclusively)
    - Disable controls during loading
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 5.2 Implement scenario change handler in MachineDetailPage
    - Call POST /api/simulation/control with new scenario
    - Clear interval timer if playing
    - Reset trend buffers
    - Re-fetch machine data
    - _Requirements: 10.2, 10.3, 10.4, 9.3_

  - [x] 5.3 Write unit tests for simulation controls
    - Test Play/Stop button behavior
    - Test scenario dropdown selection
    - Test interval lifecycle (creation, clearing)
    - Test scenario change stops simulation
    - _Requirements: 2.1, 2.3, 2.4, 10.3, 10.4_

- [x] 6. Create sensor display components
  - [x] 6.1 Create LiveSensorReadings component
    - Display sensor cards in responsive grid
    - Show sensor name, value, and unit
    - Highlight cards only when thresholdExceeded is true
    - Update values when machineData prop changes
    - _Requirements: 3.2, 5.5_

  - [x] 6.2 Write property test for sensor highlighting
    - **Property 8: Sensor Highlighting Only on Threshold Exceeded**
    - **Validates: Requirements 5.5**

  - [x] 6.3 Create SensorCard component
    - Display large numeric value with unit
    - Apply highlight styling based on thresholdExceeded prop
    - Use industrial styling (clean, readable)
    - _Requirements: 3.2, 5.5, 7.1_

- [x] 7. Create analysis and recommendation components
  - [x] 7.1 Create ConditionAnalysis component
    - Display plain-language condition explanation
    - Style based on health state
    - No technical jargon or implementation details
    - _Requirements: 3.3, 5.2_

  - [x] 7.2 Create CauseOfIssue component (conditional)
    - Display affected component and mechanical cause
    - Render only when health state is Advisory or Action Required
    - Use warning-appropriate styling
    - _Requirements: 3.4_

  - [x] 7.3 Write property test for conditional Cause of Issue display
    - **Property 5: Conditional Cause of Issue Display**
    - **Validates: Requirements 3.4**

  - [x] 7.4 Create RecommendedAction component
    - Display clear, action-oriented guidance
    - Style according to urgency (health state)
    - No probabilistic or vague wording
    - _Requirements: 3.5, 5.3_

  - [x] 7.5 Create RemainingSafeTime component (conditional)
    - Display time estimate prominently
    - Render only when health state is Action Required
    - Use urgent styling (red/warning colors)
    - Format: "Estimated X hours remaining" or "Immediate action required"
    - _Requirements: 3.6, 5.4_

  - [x] 7.6 Write property test for conditional Remaining Safe Time display
    - **Property 6: Conditional Remaining Safe Time Display**
    - **Validates: Requirements 3.6**

- [x] 8. Checkpoint - Verify Machine Detail Page core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement trend chart visualization
  - [x] 9.1 Create TrendChart component
    - Integrate charting library (Recharts or Chart.js)
    - Render line chart from rolling buffer values (not timestamps)
    - Display x-axis as time progression (index-based)
    - Display y-axis with appropriate scale
    - Show subtle threshold reference line if provided
    - Apply dark mode styling when enabled
    - Never create or manage interval timers
    - _Requirements: 3.7, 4.2, 4.5_

  - [x] 9.2 Create SensorTrends component
    - Display charts in 2-column grid layout
    - Create TrendChart for each sensor (Temperature, Vibration, Torque, Rotational Speed, Tool Wear)
    - Pass rolling buffer data from parent to each chart
    - Update charts when trendBuffers prop changes
    - Implement responsive layout (1 column mobile, 2 columns tablet/desktop)
    - _Requirements: 3.7, 4.1, 4.4, 8.1, 8.2, 8.3_

  - [x] 9.3 Write unit tests for trend charts
    - Test chart rendering with buffer data
    - Test threshold line display
    - Test dark mode styling
    - Test responsive grid layout
    - _Requirements: 4.1, 4.4, 4.5, 8.4_

- [x] 10. Implement error handling and edge cases
  - [x] 10.1 Add API error handling
    - Display user-friendly error messages (not stack traces)
    - Provide retry mechanisms for transient failures
    - Show loading indicators during API calls
    - Timeout requests after 10 seconds
    - Clear interval timer on API errors
    - _Requirements: 2.5_

  - [x] 10.2 Add simulation state error handling
    - Stop simulation automatically when atWindowEnd=true
    - Disable Play button at window end with tooltip
    - Show "Simulation complete" message
    - Ensure interval cleared on all error paths
    - _Requirements: 2.5_

  - [x] 10.3 Add data validation
    - Validate API responses against expected schema
    - Provide default values for missing optional fields
    - Display partial data with "Some information unavailable" notice
    - Log validation errors to console
    - _Requirements: 2.6_

  - [x] 10.4 Write unit tests for error handling
    - Test API error scenarios
    - Test window end behavior
    - Test malformed data handling
    - Test interval cleanup on errors
    - _Requirements: 2.5_

- [x] 11. Remove forbidden UI elements and technical data
  - [x] 11.1 Audit all components for forbidden content
    - Remove cursor position displays
    - Remove state window references
    - Remove window range displays
    - Remove dataset mechanics information
    - Remove developer/debug information
    - _Requirements: 1.5, 5.1, 7.3_

  - [x] 11.2 Write unit tests to verify absence of technical data
    - Test Dashboard doesn't contain forbidden terms
    - Test Machine Detail Page doesn't contain forbidden terms
    - Test no debug information in production builds
    - _Requirements: 1.5, 5.1, 7.3_

- [x] 12. Implement responsive design and styling
  - [x] 12.1 Create responsive layouts for all components
    - Implement mobile breakpoints (320px, 375px, 414px)
    - Implement tablet breakpoints (768px, 1024px)
    - Implement desktop breakpoints (1280px, 1920px)
    - Test chart resizing behavior
    - Test navigation menu adaptation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 12.2 Apply industrial dashboard styling
    - Use clean, neutral industrial colors for base interface
    - Use red/yellow/green/blue ONLY for health states
    - Implement professional typography and spacing
    - Create structured, organized layouts
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 12.3 Implement dark mode themes
    - Create CSS variables for light/dark color schemes
    - Apply dark theme to all components
    - Ensure readability and contrast in dark mode
    - Test chart styling in dark mode
    - _Requirements: 6.2, 6.5_

  - [x] 12.4 Write property test for dark mode contrast
    - **Property 10: Dark Mode Contrast Compliance**
    - **Validates: Requirements 6.5**

  - [x] 12.5 Write responsive design tests
    - Test mobile layout rendering
    - Test tablet layout rendering
    - Test desktop layout rendering
    - Test chart resizing at different viewports
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 13. Checkpoint - Verify complete UI redesign
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integration and final wiring
  - [x] 14.1 Set up routing between Dashboard and Machine Detail pages
    - Configure React Router routes
    - Implement navigation from MachineCard to detail page
    - Handle browser back/forward navigation
    - Clear machine state when navigating away
    - _Requirements: 1.1, 3.1_

  - [x] 14.2 Integrate all components in MachineDetailPage
    - Wire DetailHeader with SimulationControls
    - Wire LiveSensorReadings with sensor data
    - Wire ConditionAnalysis, CauseOfIssue, RecommendedAction, RemainingSafeTime
    - Wire SensorTrends with trend buffers
    - Ensure all sections update on simulation advance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 14.3 Verify no backend modifications required
    - Confirm all API endpoints match existing backend
    - Test with existing backend without changes
    - Verify API contracts maintained
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 14.4 Write end-to-end integration tests
    - Test complete user flow: Dashboard → Machine Detail → Simulation
    - Test scenario switching
    - Test dark mode across pages
    - Test responsive behavior across pages
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 6.2, 8.1, 8.2, 8.3_

- [x] 15. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation with full test coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All changes are frontend-only, maintaining backend API compatibility
- Simulation interval timer is exclusively owned by MachineDetailPage component
- Trend buffers are maintained on the frontend as rolling windows (50-100 points)
- Backend is treated as a point-in-time state provider, not a time-series store
