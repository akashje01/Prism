"""
Simulation Engine for PRISM Predictive Maintenance System

This module handles:
- State-based simulation with independent cursors per machine
- Scenario selection (jumping to specific state windows)
- Cursor advancement within state windows
- Machine state retrieval with integrated classification and explanation
"""
from dataclasses import dataclass
from typing import Dict, List
from slice_manager import SliceManager, StateWindow, MACHINES
from health_classifier import HealthClassifier
from explanation_engine import ExplanationEngine


@dataclass
class MachineState:
    """
    Complete state information for a machine at a specific cursor position.
    
    Attributes:
        machine_id: Machine identifier (e.g., "CNC-MILL-01")
        machine_name: Human-readable machine name
        health_state: Current health state classification
        cursor_position: Current position within the machine's base slice
        current_window: StateWindow object for the current scenario
        sensor_readings: Dictionary of current sensor values
        one_line_summary: Brief summary of machine status
    """
    machine_id: str
    machine_name: str
    health_state: str
    cursor_position: int
    current_window: StateWindow
    sensor_readings: Dict[str, float]
    one_line_summary: str


class SimulationEngine:
    """
    Manages simulation state and cursors for all machines.
    
    Implements state-based simulation where each machine has an independent cursor
    that can jump to specific state windows (scenarios) and advance within those windows.
    """
    
    def __init__(self, slice_manager: SliceManager):
        """
        Initialize SimulationEngine with SliceManager.
        
        Sets up independent cursors for each machine, starting each in its Normal state.
        This allows users to explore different scenarios for each machine independently.
        
        Args:
            slice_manager: SliceManager instance for accessing data and state windows
        """
        self.slice_manager = slice_manager
        self.health_classifier = HealthClassifier()
        self.explanation_engine = ExplanationEngine()
        
        # Initialize independent cursors for each machine
        # Each machine maintains its own position and scenario state
        # This enables parallel exploration of different health states across machines
        self.cursors: Dict[str, int] = {}
        self.current_scenarios: Dict[str, str] = {}
        
        # Start each machine in its Normal state window
        # This provides a consistent baseline starting point for all machines
        for machine_id in MACHINES.keys():
            # Set initial scenario to Normal
            state_windows = self.slice_manager.state_windows.get(machine_id, {})
            if "Normal" in state_windows:
                # Position cursor at the start of the Normal window
                normal_window = state_windows["Normal"]
                self.cursors[machine_id] = normal_window.start_index
                self.current_scenarios[machine_id] = "Normal"
            else:
                # Fallback: start at position 0 if Normal window not found
                # This should rarely happen as SliceManager ensures all states exist
                self.cursors[machine_id] = 0
                self.current_scenarios[machine_id] = "Normal"
    
    def set_scenario(self, machine_id: str, scenario: str) -> None:
        """
        Jump cursor to the start of a specified state window.
        
        This enables users to instantly explore different health states without
        having to advance through intermediate states. Each scenario represents
        a distinct operational phase with characteristic sensor patterns.
        
        Valid scenarios: "Normal", "Advisory", "Action Required", "Post-Maintenance"
        
        Args:
            machine_id: Machine identifier
            scenario: State window name to jump to
            
        Raises:
            ValueError: If machine_id or scenario is invalid
        """
        # Validate machine_id
        if machine_id not in MACHINES:
            raise ValueError(
                f"Invalid machine_id: {machine_id}. "
                f"Valid options: {list(MACHINES.keys())}"
            )
        
        # Validate scenario name
        valid_scenarios = ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
        if scenario not in valid_scenarios:
            raise ValueError(
                f"Invalid scenario: {scenario}. "
                f"Valid options: {valid_scenarios}"
            )
        
        # Get state windows for this machine
        state_windows = self.slice_manager.state_windows.get(machine_id, {})
        
        # Verify the requested scenario exists for this machine
        if scenario not in state_windows:
            raise ValueError(
                f"Scenario '{scenario}' not found for machine {machine_id}. "
                f"Available scenarios: {list(state_windows.keys())}"
            )
        
        # Jump cursor to start of selected state window
        # This immediately positions the machine at the beginning of the new scenario
        window = state_windows[scenario]
        self.cursors[machine_id] = window.start_index
        self.current_scenarios[machine_id] = scenario
    
    def advance_cursor(self, machine_id: str, steps: int = 1) -> None:
        """
        Move cursor forward within the current state window.
        
        This simulates time progression within a scenario, allowing users to observe
        how sensor readings evolve over time within a particular health state.
        
        Implements bounds checking to prevent cursor from exceeding window boundaries.
        If cursor would exceed window end, it stops at the window end to prevent
        accidentally transitioning into a different state window.
        
        Args:
            machine_id: Machine identifier
            steps: Number of positions to advance (default: 1)
            
        Raises:
            ValueError: If machine_id is invalid or steps is negative
        """
        # Validate machine_id
        if machine_id not in MACHINES:
            raise ValueError(
                f"Invalid machine_id: {machine_id}. "
                f"Valid options: {list(MACHINES.keys())}"
            )
        
        # Validate steps parameter
        if steps < 0:
            raise ValueError(f"Steps must be non-negative, got: {steps}")
        
        # Get current scenario and window boundaries
        current_scenario = self.current_scenarios.get(machine_id, "Normal")
        state_windows = self.slice_manager.state_windows.get(machine_id, {})
        
        if current_scenario not in state_windows:
            raise ValueError(
                f"Current scenario '{current_scenario}' not found for machine {machine_id}"
            )
        
        window = state_windows[current_scenario]
        current_position = self.cursors[machine_id]
        
        # Calculate new position with bounds checking
        # We add the requested steps to the current position
        new_position = current_position + steps
        
        # Ensure cursor stays within window boundaries
        # This prevents the cursor from moving into a different state window
        # and maintains the integrity of the current scenario
        if new_position > window.end_index:
            new_position = window.end_index  # Clamp to window end
        
        # Update cursor position
        self.cursors[machine_id] = new_position
    
    def get_current_state(self, machine_id: str) -> MachineState:
        """
        Retrieve complete MachineState for one machine at its current cursor position.
        
        This is the primary integration point that combines data from multiple components:
        1. SliceManager: Provides sensor data at the cursor position
        2. HealthClassifier: Analyzes sensor data to determine health state
        3. Internal logic: Generates summary and packages all information
        
        The returned MachineState provides everything needed to display the machine's
        current condition in the UI.
        
        Args:
            machine_id: Machine identifier
            
        Returns:
            MachineState object with complete machine information
            
        Raises:
            ValueError: If machine_id is invalid
        """
        # Validate machine_id
        if machine_id not in MACHINES:
            raise ValueError(
                f"Invalid machine_id: {machine_id}. "
                f"Valid options: {list(MACHINES.keys())}"
            )
        
        # STEP 1: Get current cursor position and scenario
        cursor_position = self.cursors[machine_id]
        current_scenario = self.current_scenarios.get(machine_id, "Normal")
        state_windows = self.slice_manager.state_windows.get(machine_id, {})
        current_window = state_windows.get(current_scenario)
        
        # STEP 2: Get sensor data at cursor position
        # This retrieves the raw sensor readings from the AI4I dataset
        sensor_readings = self.slice_manager.get_sensor_data_at_position(
            machine_id, cursor_position
        )
        
        # STEP 3: Get sensor history for classification
        # We need historical context (last 50 points) to calculate trends
        # and detect patterns that indicate health state transitions
        sensor_history = self.slice_manager.get_sensor_history(
            machine_id, cursor_position, window_size=50
        )
        
        # STEP 4: Classify health state
        # The HealthClassifier analyzes current readings and historical trends
        # to determine the machine's health state using threshold-based rules
        health_classification = self.health_classifier.classify(
            sensor_readings, sensor_history
        )
        
        # STEP 5: Generate one-line summary
        # This provides a brief, human-readable status for dashboard display
        one_line_summary = self._generate_summary(
            health_classification.health_state,
            health_classification.anomalous_sensors
        )
        
        # STEP 6: Package all information into MachineState
        return MachineState(
            machine_id=machine_id,
            machine_name=MACHINES[machine_id]["name"],
            health_state=health_classification.health_state,
            cursor_position=cursor_position,
            current_window=current_window,
            sensor_readings=sensor_readings,
            one_line_summary=one_line_summary
        )
    
    def get_all_machines_state(self) -> List[MachineState]:
        """
        Retrieve current state for all 4 machines.
        
        Returns:
            List of MachineState objects, one per machine
        """
        machine_states = []
        
        for machine_id in MACHINES.keys():
            machine_state = self.get_current_state(machine_id)
            machine_states.append(machine_state)
        
        return machine_states
    
    def _generate_summary(self, health_state: str, anomalous_sensors: List[str]) -> str:
        """
        Generate a one-line summary for a machine based on its health state.
        
        Summaries are designed to be concise and informative for dashboard display.
        They provide immediate context about the machine's condition without requiring
        detailed analysis.
        
        Args:
            health_state: Current health state
            anomalous_sensors: List of anomalous sensor names
            
        Returns:
            Brief one-line summary string
        """
        if health_state == "Normal":
            return "Operating normally"
        elif health_state == "Advisory":
            if anomalous_sensors:
                # List the first 2 anomalous sensors to provide context
                # Limiting to 2 keeps the summary concise
                sensor_list = ", ".join(anomalous_sensors[:2])
                return f"Advisory: Elevated {sensor_list}"
            return "Advisory: Early degradation detected"
        elif health_state == "Action Required":
            if anomalous_sensors:
                # List the first 2 critical sensors
                sensor_list = ", ".join(anomalous_sensors[:2])
                return f"Action Required: Critical {sensor_list}"
            return "Action Required: Immediate attention needed"
        elif health_state == "Post-Maintenance":
            return "Post-Maintenance: Recovering to normal"
        else:
            # Fallback for unrecognized states
            return "Status unknown"
