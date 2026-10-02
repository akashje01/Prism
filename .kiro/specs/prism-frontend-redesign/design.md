# Design Document: PRISM Frontend Redesign

## Overview

This design transforms the PRISM Predictive Maintenance System frontend from a developer-focused demo tool into a professional industrial decision-support dashboard. The redesign focuses on three core principles:

1. **User-Centric Communication**: Present machine health and operational status in clear, actionable terms without exposing simulation mechanics
2. **Automatic Time-Based Simulation**: Replace manual controls with automatic progression for natural observation of machine behavior
3. **Industrial Dashboard Aesthetics**: Create a professional interface that inspires confidence and supports critical decision-making

The design maintains complete compatibility with the existing backend API, requiring no backend modifications. All changes are confined to the React frontend application.

## Architecture

### Component Hierarchy

```
App
├── Header (with dark mode toggle)
├── Router
│   ├── Dashboard
│   │   ├── MachineGrid
│   │   │   └── MachineCard (multiple instances)
│   │   └── AlertsSidebar
│   │       ├── AlertsList
│   │       └── AdvisoriesList
│   └── MachineDetailPage
│       ├── DetailHeader
│       │   ├── MachineName
│       │   └── SimulationControls
│       │       ├── ScenarioDropdown
│       │       └── PlayStopButton
│       ├── LiveSensorReadings
│       │   └── SensorCard (multiple instances)
│       ├── ConditionAnalysis
│       ├── CauseOfIssue (conditional)
│       ├── RecommendedAction
│       ├── RemainingSafeTime (conditional)
│       └── SensorTrends
│           └── TrendChart (multiple instances)
```

### State Management

**Global State (React Context)**:
- `darkMode`: boolean - persisted to localStorage
- `machines`: array - cached dashboard data

**MachineDetailPage Component State** (Single Owner):
- `machineData`: MachineDetail | null - current machine detail data
- `isPlaying`: boolean - simulation playback status
- `selectedScenario`: string - current scenario selection
- `intervalId`: number | null - reference to simulation interval timer (OWNED EXCLUSIVELY by MachineDetailPage)
- `trendBuffers`: Map<string, number[]> - rolling buffers per sensor (50-100 points minimum)

**Simulation Interval Ownership**:
- The MachineDetailPage component is the **single owner** of the simulation interval timer
- Child components (SimulationControls, TrendChart, LiveSensorReadings) **must never** create or manage timers
- Only **one interval may exist at a time** per Machine Detail view
- The interval is created only when Play is pressed
- The interval is cleared when:
  - Stop is pressed
  - Scenario changes
  - Window end is reached
  - Component unmounts
  - API error occurs

**Trend Buffer Management**:
- The frontend maintains a **rolling trend buffer** per sensor in MachineDetailPage state
- Buffer length: minimum 50-100 points, maximum 100 points
- On each simulation advance:
  - Append newest sensor value to buffer
  - Remove oldest value if buffer exceeds max length
- Trend buffers are:
  - Reset when scenario changes
  - Preserved while simulation is playing
  - Cleared when switching machines
- The backend is treated as a **point-in-time state provider**, not a time-series store
- Charts render **only from the rolling buffer**, never from a single snapshot

### Data Flow

1. **Dashboard Load**: Fetch all machines → Display grid + alerts/advisories
2. **Machine Selection**: Navigate to detail page → Fetch machine data → Initialize trend buffers → Display all sections
3. **Scenario Change**: Call simulation/control API → Reset to start → Clear trend buffers → Fetch updated data → Re-initialize buffers
4. **Play Simulation**: 
   - MachineDetailPage creates interval timer (exclusive ownership)
   - Every ~1s: Call POST /api/simulation/advance → Re-fetch machine state → Append to trend buffers → Update all UI sections
   - Backend provides point-in-time state, frontend maintains trend history
5. **Stop Simulation**: MachineDetailPage clears interval timer → Halt progression → Preserve trend buffers
6. **Dark Mode Toggle**: Update context → Persist to localStorage → Re-render with theme

## Components and Interfaces

### Header Component

**Purpose**: Provide global navigation and dark mode control

**Props**: None (uses context)

**State**:
- `darkMode`: boolean (from context)

**Interface**:
```typescript
interface HeaderProps {}

interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}
```

**Behavior**:
- Display application title/logo on left
- Display dark mode toggle button on right
- Toggle updates context and localStorage
- Apply appropriate icon (sun/moon) based on current mode

### Dashboard Component

**Purpose**: Display overview of all machines with alerts and advisories

**Props**: None

**State**:
- `machines`: Machine[] (from API)
- `loading`: boolean
- `error`: string | null

**Interface**:
```typescript
interface Machine {
  id: string;
  name: string;
  healthState: 'Normal' | 'Advisory' | 'Action Required' | 'Post-Maintenance';
  conditionSummary: string;
}

interface DashboardProps {}
```

**Behavior**:
- Fetch machines on mount using GET /api/machines
- Filter machines by health state for alerts/advisories lists
- Display machine grid as primary content
- Display alerts/advisories sidebar as secondary content
- No simulation controls or technical data visible

### MachineCard Component

**Purpose**: Display summary information for a single machine

**Props**:
```typescript
interface MachineCardProps {
  machine: Machine;
}
```

**Behavior**:
- Display machine name prominently
- Display health state badge with appropriate color
- Display one-line condition summary
- Provide "View Details" button linking to detail page
- Apply hover effects for interactivity

### MachineDetailPage Component

**Purpose**: Display comprehensive machine information with simulation controls

**Props**: None (uses route params)

**State**:
- `machineData`: MachineDetail | null
- `isPlaying`: boolean
- `selectedScenario`: string
- `intervalId`: number | null (EXCLUSIVE OWNER - no child components may create timers)
- `trendBuffers`: Map<string, number[]> (rolling buffers per sensor, 50-100 points)
- `loading`: boolean
- `error`: string | null

**Interface**:
```typescript
interface SensorReading {
  name: string;
  value: number;
  unit: string;
  thresholdExceeded: boolean;
}

interface MachineDetail {
  id: string;
  name: string;
  healthState: 'Normal' | 'Advisory' | 'Action Required' | 'Post-Maintenance';
  sensors: SensorReading[];
  conditionAnalysis: string;
  affectedComponent?: string;
  mechanicalCause?: string;
  recommendedAction: string;
  remainingSafeTime?: string;
  trendData: TrendDataset[];
  isAtWindowEnd: boolean;
}

interface TrendDataset {
  sensorName: string;
  timestamps: number[];
  values: number[];
  threshold?: number;
}
```

**Behavior**:
- Fetch machine data on mount
- Initialize trend buffers with initial sensor values
- **Exclusive owner of simulation interval timer**:
  - Create interval only when Play is pressed
  - Clear interval when: Stop pressed, scenario changes, window end reached, component unmounts, API error occurs
  - Ensure only one interval exists at a time
- On each simulation advance:
  - Call POST /api/simulation/advance
  - Re-fetch machine state
  - Append new sensor values to trend buffers
  - Remove oldest values if buffers exceed max length (100 points)
  - Update all child components with new data
- Manage trend buffer lifecycle:
  - Reset buffers when scenario changes
  - Preserve buffers while simulation is playing
  - Clear buffers when switching machines
- Pass trend buffer data (not raw API data) to TrendChart components
- Conditionally render Cause of Issue and Remaining Safe Time based on health state
- Stop simulation automatically at window end

### SimulationControls Component

**Purpose**: Provide scenario selection and playback control

**Props**:
```typescript
interface SimulationControlsProps {
  selectedScenario: string;
  isPlaying: boolean;
  onScenarioChange: (scenario: string) => void;
  onPlayStop: () => void;
  disabled: boolean;
}
```

**Behavior**:
- Display scenario dropdown with four options
- Display Play button (▶) when stopped, Stop button (■) when playing
- Call onScenarioChange when scenario selected (parent handles interval clearing and buffer reset)
- Call onPlayStop when button clicked (parent handles interval creation/clearing)
- **Must never create or manage interval timers** (owned exclusively by MachineDetailPage)
- Disable controls during loading states

### LiveSensorReadings Component

**Purpose**: Display current sensor values in large, readable format

**Props**:
```typescript
interface LiveSensorReadingsProps {
  sensors: SensorReading[];
}
```

**Behavior**:
- Display each sensor as a large numeric card
- Show sensor name, current value, and unit
- Highlight card (border or background) ONLY when threshold exceeded
- Use grid layout for responsive arrangement
- Update values smoothly when data changes

### ConditionAnalysis Component

**Purpose**: Explain current machine condition in plain language

**Props**:
```typescript
interface ConditionAnalysisProps {
  analysis: string;
  healthState: string;
}
```

**Behavior**:
- Display analysis text in readable paragraph format
- Use appropriate styling based on health state
- No technical jargon or implementation details
- Clear, concise language

### CauseOfIssue Component

**Purpose**: Explain what component is affected and why (conditional display)

**Props**:
```typescript
interface CauseOfIssueProps {
  affectedComponent: string;
  mechanicalCause: string;
}
```

**Behavior**:
- Display affected component prominently
- Display mechanical cause explanation
- Only rendered when health state is Advisory or Action Required
- Use warning-appropriate styling

### RecommendedAction Component

**Purpose**: Provide clear, actionable guidance

**Props**:
```typescript
interface RecommendedActionProps {
  action: string;
  healthState: string;
}
```

**Behavior**:
- Display action text prominently
- Use action-oriented language
- Style according to urgency (health state)
- No probabilistic or vague wording

### RemainingSafeTime Component

**Purpose**: Display time estimate for Action Required machines (conditional display)

**Props**:
```typescript
interface RemainingSafeTimeProps {
  timeEstimate: string;
}
```

**Behavior**:
- Display time estimate prominently
- Use urgent styling (red/warning colors)
- Only rendered when health state is Action Required
- Format: "Estimated X hours remaining" or "Immediate action required"

### SensorTrends Component

**Purpose**: Display time-series charts for all sensors

**Props**:
```typescript
interface SensorTrendsProps {
  trendBuffers: Map<string, number[]>;  // Rolling buffers from MachineDetailPage
  thresholds: Map<string, number>;      // Threshold values per sensor
}
```

**Behavior**:
- Display charts in 2-column grid layout
- Each chart shows one sensor over time using data from rolling buffer
- Include subtle threshold reference lines
- Charts update automatically when trendBuffers prop changes (parent manages buffering)
- **Must never create or manage interval timers** (owned exclusively by MachineDetailPage)
- Ensure charts render with minimum 50 data points (enforced by parent's buffer management)
- Use responsive sizing for different viewports
- **Flat or near-flat charts are a design violation** - prevented by parent maintaining sufficient buffer length

### TrendChart Component

**Purpose**: Render a single time-series chart from rolling buffer data

**Props**:
```typescript
interface TrendChartProps {
  sensorName: string;
  values: number[];           // Rolling buffer from parent (50-100 points)
  threshold?: number;
  darkMode: boolean;
}
```

**Behavior**:
- Render line chart using charting library (e.g., Recharts, Chart.js)
- Display x-axis as time progression (index-based, not absolute timestamps)
- Display y-axis with appropriate scale and units
- Show threshold as subtle horizontal line if provided
- Apply dark mode styling when enabled
- **Must never create or manage interval timers** (owned exclusively by MachineDetailPage)
- Render from rolling buffer provided by parent (backend is point-in-time state provider)
- Chart updates automatically when values prop changes
- **Must never render with fewer than 50 data points** (enforced by parent's buffer management)

## Data Models

### Machine (Dashboard)

```typescript
interface Machine {
  id: string;                    // Unique machine identifier
  name: string;                  // Display name (e.g., "CNC Mill 01")
  healthState: HealthState;      // Current operational state
  conditionSummary: string;      // One-line status description
}

type HealthState = 'Normal' | 'Advisory' | 'Action Required' | 'Post-Maintenance';
```

### MachineDetail (Detail Page)

```typescript
interface MachineDetail {
  id: string;
  name: string;
  healthState: HealthState;
  sensors: SensorReading[];
  conditionAnalysis: string;
  affectedComponent?: string;        // Present if Advisory or Action Required
  mechanicalCause?: string;          // Present if Advisory or Action Required
  recommendedAction: string;
  remainingSafeTime?: string;        // Present if Action Required
  trendData: TrendDataset[];
  isAtWindowEnd: boolean;            // True when simulation cannot advance further
}

interface SensorReading {
  name: string;                      // e.g., "Temperature", "Vibration"
  value: number;                     // Current numeric value
  unit: string;                      // e.g., "K", "μm", "Nm", "rpm"
  thresholdExceeded: boolean;        // True if value crosses threshold
}

interface TrendDataset {
  sensorName: string;
  timestamps: number[];              // Time points (relative or absolute)
  values: number[];                  // Sensor values at each time point
  threshold?: number;                // Optional threshold value for reference line
}
```

### SimulationState

```typescript
interface SimulationState {
  isPlaying: boolean;
  selectedScenario: string;
  intervalId: number | null;
  currentMachineId: string | null;
}
```

### DarkModeContext

```typescript
interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}
```

### API Response Types

```typescript
// GET /api/machines
interface MachinesResponse {
  machines: Machine[];
}

// GET /api/machines/{id}
interface MachineDetailResponse {
  machine: MachineDetail;
}

// POST /api/simulation/control
interface SimulationControlRequest {
  machineId: string;
  scenario: string;
}

interface SimulationControlResponse {
  success: boolean;
  message: string;
}

// POST /api/simulation/advance
interface SimulationAdvanceRequest {
  machineId: string;
}

interface SimulationAdvanceResponse {
  success: boolean;
  atWindowEnd: boolean;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Health State Badge Color Mapping

*For any* health state value (Normal, Advisory, Action Required, Post-Maintenance), the system should display the correct color coding: green for Normal, yellow for Advisory, red for Action Required, and blue for Post-Maintenance.

**Validates: Requirements 1.2**

### Property 2: Advisory Machines in Advisories List

*For any* set of machines, all machines with Advisory health state should appear in the advisories list, and no machines with other health states should appear in that list.

**Validates: Requirements 1.3**

### Property 3: Action Required Machines in Alerts List

*For any* set of machines, all machines with Action Required health state should appear in the alerts list, and no machines with other health states should appear in that list.

**Validates: Requirements 1.4**

### Property 4: Simulation Updates All Sections

*For any* simulation advance, all sensor readings, charts, and analysis sections should receive and display updated data from the new machine state.

**Validates: Requirements 2.6**

### Property 5: Conditional Cause of Issue Display

*For any* machine with health state of Advisory or Action Required, the Cause of Issue section should be displayed; for any machine with health state of Normal or Post-Maintenance, the section should not be displayed.

**Validates: Requirements 3.4**

### Property 6: Conditional Remaining Safe Time Display

*For any* machine with health state of Action Required, the Remaining Safe Operating Time section should be displayed; for any machine with other health states, the section should not be displayed.

**Validates: Requirements 3.6**

### Property 7: Minimum Trend Data Points

*For any* trend chart, the rolling buffer maintained by MachineDetailPage should contain a minimum of 50 data points before rendering, ensuring visible trends and preventing flat-line charts.

**Validates: Requirements 4.3**

### Property 8: Sensor Highlighting Only on Threshold Exceeded

*For any* sensor reading, visual highlighting should be applied if and only if the thresholdExceeded flag is true; sensors with thresholdExceeded=false should not be highlighted.

**Validates: Requirements 5.5**

### Property 9: Dark Mode Persistence Round Trip

*For any* dark mode preference (enabled or disabled), when the preference is set, it should be persisted to localStorage, and when the system reloads, the preference should be restored to the same state.

**Validates: Requirements 6.3, 6.4**

### Property 10: Dark Mode Contrast Compliance

*For any* text element in dark mode, the contrast ratio between text and background should meet WCAG AA standards (minimum 4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 6.5**

## Error Handling

### API Communication Errors

**Scenario**: Backend API is unavailable or returns error responses

**Handling Strategy**:
- Display user-friendly error messages (not technical stack traces)
- Provide retry mechanisms for transient failures
- Maintain last known good state when possible
- Show loading indicators during API calls
- Timeout requests after reasonable duration (e.g., 10 seconds)

**User Experience**:
- Dashboard: Show error banner with "Unable to load machines. Retry?" button
- Machine Detail: Show error message with "Refresh" button
- Simulation: Stop playback and show "Simulation error. Please try again."

### Simulation State Errors

**Scenario**: Simulation reaches unexpected state or window end

**Handling Strategy**:
- Automatically stop simulation when atWindowEnd=true
- MachineDetailPage clears interval timer to prevent memory leaks (exclusive ownership)
- Disable Play button when at window end
- Show informative message: "Simulation complete. Select a new scenario to continue."
- Ensure interval is cleared on:
  - Stop button press
  - Scenario change
  - Window end reached
  - Component unmount
  - API error

**User Experience**:
- Play button becomes disabled with tooltip explaining why
- User can select new scenario to reset and continue
- No duplicate timers or conflicting playback behavior

### Data Validation Errors

**Scenario**: API returns malformed or incomplete data

**Handling Strategy**:
- Validate API responses against expected schema
- Provide default values for missing optional fields
- Log validation errors to console for debugging
- Display partial data when possible with indicators for missing information
- Show error message for critical missing data

**User Experience**:
- Display available data with "Some information unavailable" notice
- Gracefully degrade functionality rather than complete failure

### Dark Mode Persistence Errors

**Scenario**: localStorage is unavailable or quota exceeded

**Handling Strategy**:
- Catch localStorage exceptions
- Fall back to session-only dark mode (not persisted)
- Log warning to console
- Continue normal operation without persistence

**User Experience**:
- Dark mode still works but doesn't persist across sessions
- No error message shown to user (graceful degradation)

### Chart Rendering Errors

**Scenario**: Chart library fails to render or data is invalid

**Handling Strategy**:
- Wrap chart components in error boundaries
- Display fallback message: "Chart unavailable"
- Log error details to console
- Continue rendering other charts

**User Experience**:
- Other charts continue to work
- Failed chart shows placeholder with message
- User can still access other machine information

## Testing Strategy

### Dual Testing Approach

This feature requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Specific UI interactions (button clicks, dropdown selections)
- API integration with mocked responses
- Component rendering with specific props
- Error boundary behavior
- Responsive layout at specific breakpoints

**Property Tests**: Verify universal properties across all inputs
- Health state color mapping for all possible states
- Conditional rendering logic for all health state combinations
- Dark mode persistence round-trip for all preference values
- Sensor highlighting logic for all threshold states
- Alert/advisory filtering for all machine combinations

### Property-Based Testing Configuration

**Library Selection**: Use `@fast-check/jest` for JavaScript/React property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `// Feature: prism-frontend-redesign, Property {number}: {property_text}`

**Example Property Test Structure**:
```javascript
// Feature: prism-frontend-redesign, Property 1: Health State Badge Color Mapping
test('health state badges display correct colors for all states', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('Normal', 'Advisory', 'Action Required', 'Post-Maintenance'),
      (healthState) => {
        const { container } = render(<MachineCard machine={{ healthState, ...mockData }} />);
        const badge = container.querySelector('.health-badge');
        const expectedColor = getExpectedColor(healthState);
        expect(badge).toHaveClass(expectedColor);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Strategy

**Component Tests**:
- Test each component in isolation with React Testing Library
- Mock child components to focus on component logic
- Test user interactions with fireEvent or userEvent
- Verify DOM structure and content
- Test conditional rendering with different props

**Integration Tests**:
- Test component interactions (parent-child communication)
- Test routing between Dashboard and Machine Detail pages
- Test API integration with MSW (Mock Service Worker)
- Test simulation playback flow end-to-end
- Test dark mode toggle affecting multiple components

**Responsive Tests**:
- Test layout at mobile breakpoint (320px, 375px, 414px)
- Test layout at tablet breakpoint (768px, 1024px)
- Test layout at desktop breakpoint (1280px, 1920px)
- Verify chart resizing behavior
- Verify navigation menu adaptation

**Accessibility Tests**:
- Test keyboard navigation
- Test screen reader compatibility with jest-axe
- Test ARIA labels and roles
- Test focus management
- Test color contrast ratios in both light and dark modes

### Test Coverage Goals

- **Line Coverage**: Minimum 80%
- **Branch Coverage**: Minimum 75%
- **Function Coverage**: Minimum 85%
- **Property Tests**: One test per correctness property (10 tests)
- **Unit Tests**: Comprehensive coverage of examples and edge cases

### Testing Tools

- **Test Runner**: Jest
- **React Testing**: React Testing Library
- **Property Testing**: @fast-check/jest
- **API Mocking**: MSW (Mock Service Worker)
- **Accessibility**: jest-axe
- **Coverage**: Jest built-in coverage reporter

### Continuous Integration

- Run all tests on every commit
- Fail build if coverage drops below thresholds
- Run property tests with increased iterations (500+) in CI
- Generate and publish coverage reports
- Run accessibility tests as part of CI pipeline
