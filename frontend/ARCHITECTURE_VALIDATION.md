# Architecture Validation Guide

## How to Verify the Fix

### 1. Machine Identity Consistency

**Test**: Open Dashboard, click any machine card, verify the name matches

**Expected Behavior**:
- Dashboard shows: "CNC Mill #1"
- Click the card
- MachineDetail shows: "CNC Mill #1" (SAME NAME)
- URL shows: `/machines/cnc-mill-1`

**Before Fix**: Would show "Machine cnc-mill-1" or "Machine 1"
**After Fix**: Shows exact name from registry

### 2. Simulation Persistence

**Test**: Start simulation on one machine, navigate away, come back

**Steps**:
1. Go to `/machines/cnc-mill-1`
2. Select "Advisory" scenario
3. Click Play
4. Navigate back to Dashboard
5. Click "CNC Mill #1" again

**Expected Behavior**:
- Simulation continues running
- Sensor values continue from where they were
- Scenario is still "Advisory"
- Play button shows "Pause"

**Before Fix**: Simulation would reset, start from scratch
**After Fix**: Simulation persists, continues seamlessly

### 3. Live Dashboard Updates

**Test**: Change scenario on MachineDetail, check Dashboard updates

**Steps**:
1. Open Dashboard in one view
2. Note "CNC Mill #1" shows "Normal" health state
3. Navigate to `/machines/cnc-mill-1`
4. Select "Action Required" scenario
5. Wait a few seconds
6. Navigate back to Dashboard

**Expected Behavior**:
- Dashboard immediately shows "CNC Mill #1" with "Action Required" badge
- Advisory/Alert sidebar updates to show the machine in alerts
- No page refresh needed

**Before Fix**: Dashboard would show stale mock data
**After Fix**: Dashboard shows live state from simulation engines

### 4. Multiple Machines Simulate Independently

**Test**: Start different scenarios on different machines

**Steps**:
1. Go to `/machines/cnc-mill-1`, select "Advisory", click Play
2. Go to `/machines/lathe-1`, select "Action Required", click Play
3. Go to `/machines/grinder-1`, select "Normal", click Play
4. Return to Dashboard

**Expected Behavior**:
- Dashboard shows:
  - CNC Mill #1: Advisory
  - Lathe #1: Action Required
  - Grinder #1: Normal
- Each machine's simulation runs independently
- Sensor values oscillate at different rates

**Before Fix**: Each machine would reset when navigating
**After Fix**: All machines maintain their independent states

### 5. No Extra Machines Appear

**Test**: Verify only 6 machines exist

**Expected Behavior**:
- Dashboard shows exactly 6 machines:
  1. CNC Mill #1
  2. CNC Mill #2
  3. Lathe #1
  4. Lathe #2
  5. Grinder #1
  6. Grinder #2
- No "Machine 7", no "Machine undefined"
- No duplicate machines

**Before Fix**: Could have inconsistent machine counts
**After Fix**: Always exactly 6 machines from registry

### 6. Invalid Machine ID Handling

**Test**: Try to access non-existent machine

**Steps**:
1. Navigate to `/machines/invalid-machine-id`

**Expected Behavior**:
- Redirects to Dashboard (/)
- No error, no crash
- Console shows: "Machine not found in registry: invalid-machine-id"

**Before Fix**: Would show "Machine invalid-machine-id" with broken state
**After Fix**: Validates machine exists, redirects if not

### 7. Scenario Switch Behavior

**Test**: Switch scenarios and verify buffer reset

**Steps**:
1. Go to `/machines/cnc-mill-1`
2. Select "Normal", click Play
3. Wait for 30+ data points to accumulate
4. Switch to "Advisory"

**Expected Behavior**:
- Buffers reset (charts start fresh)
- Simulation auto-starts
- Play button shows "Pause"
- Health state transitions to Advisory
- Sensor values oscillate with new pattern

**Before Fix**: Buffers might not reset properly
**After Fix**: Clean reset, immediate oscillation

## Console Verification

Open browser console and check for these logs:

### On App Load:
```
[SimulationManager] Initialized engines for 6 machines
```

### On MachineDetail Mount:
```
[MachineDetail] Subscribing to simulation for machine: cnc-mill-1
```

### On Scenario Change:
```
[MachineDetail] Changing scenario to: Advisory
[SimulationEngine] Resetting simulation
```

### On Play/Pause:
```
[MachineDetail] Starting simulation
[SimulationEngine] Starting simulation
```

## Key Architecture Points

### ✅ Single Source of Truth
- `MachineRegistry.js` defines all machines
- No component creates or modifies machine definitions
- Machine names are NEVER dynamic

### ✅ Simulation Ownership
- `SimulationManager.js` owns all engines
- One engine per machine, persists across navigation
- Components subscribe to engines, never own them

### ✅ Live State Updates
- Dashboard subscribes to all engines
- MachineDetail subscribes to one engine
- State updates propagate immediately via callbacks

### ✅ Routing Consistency
- Route param matches registry ID
- Machine lookup validates existence
- Invalid IDs redirect gracefully

## Common Issues (Should NOT Occur)

### ❌ Machine Name Changes
- If you see "Machine 1" instead of "CNC Mill #1" → Bug
- If name changes between views → Bug

### ❌ Simulation Resets
- If simulation restarts when navigating back → Bug
- If scenario resets unexpectedly → Bug

### ❌ Stale Dashboard Data
- If Dashboard doesn't update after scenario change → Bug
- If health states don't match MachineDetail → Bug

### ❌ Extra Machines
- If more than 6 machines appear → Bug
- If machine IDs are numbers instead of strings → Bug

## Performance Notes

- All 6 engines run simultaneously
- Each engine ticks at 500ms intervals
- Dashboard subscribes to all 6 engines
- MachineDetail subscribes to 1 engine
- Total overhead: ~12 state updates per second (6 engines × 2 Hz)

This is acceptable for a monitoring dashboard with 6 machines.
