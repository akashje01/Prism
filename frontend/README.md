# PRISM Frontend

React-based frontend for the PRISM Predictive Maintenance System.

## Features

- **Dashboard**: Overview of all 4 machines with real-time health monitoring
- **Global Alerts**: Critical machines requiring immediate action
- **Global Advisories**: Machines showing early degradation patterns
- **Machine Cards**: Color-coded cards showing machine status at a glance
  - Green: Normal operation
  - Yellow: Advisory state (early degradation)
  - Red: Action Required (critical state)
  - Blue: Post-Maintenance

## Setup

1. Install dependencies:
```bash
npm install
```

## Running the Development Server

**Important**: Ensure the backend is running first on http://localhost:8000

```bash
npm run dev
```

The application will be available at http://localhost:5173

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Components

- `Dashboard.jsx`: Main dashboard component with machine grid
- `MachineCard.jsx`: Individual machine card with health state
- `GlobalAlerts.jsx`: Critical alerts section
- `GlobalAdvisories.jsx`: Advisory warnings section
