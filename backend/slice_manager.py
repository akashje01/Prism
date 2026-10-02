"""
Slice Manager for PRISM Predictive Maintenance System

This module handles:
- Partitioning AI4I dataset into machine-specific base slices
- Identifying state windows within each slice
- Retrieving sensor data at specific cursor positions
- Providing rolling window sensor history
"""
from dataclasses import dataclass
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest


@dataclass
class StateWindow:
    """
    Represents a contiguous segment within a base slice for a specific health state.
    
    Attributes:
        state: Health state name (Normal, Advisory, Action Required, Post-Maintenance)
        start_index: Starting row index in the base slice
        end_index: Ending row index in the base slice (inclusive)
        machine_id: Machine identifier this window belongs to
    """
    state: str
    start_index: int
    end_index: int
    machine_id: str


# Machine configuration mapping
MACHINES = {
    "CNC-MILL-01": {
        "name": "CNC Milling Machine",
    },
    "COOL-PUMP-02": {
        "name": "Industrial Cooling Pump",
    },
    "CONV-MOTOR-01": {
        "name": "Conveyor Drive Motor",
    },
    "AIR-COMP-01": {
        "name": "Air Compressor Unit",
    }
}

# Sensor thresholds for classification
THRESHOLDS = {
    "temperature": {
        "advisory": 310,  # Kelvin
        "action_required": 320
    },
    "vibration": {
        "advisory": 50,  # μm (simulated from torque/speed)
        "action_required": 70
    },
    "torque": {
        "advisory": 50,  # Nm
        "action_required": 60
    },
}


class SliceManager:
    """
    Manages partitioning of AI4I dataset into machine-specific slices
    and identifies state windows within each slice.
    """
    
    def __init__(self, ai4i_data: pd.DataFrame):
        """
        Initialize SliceManager with full AI4I dataset.
        
        Args:
            ai4i_data: Complete AI4I dataset as DataFrame
        """
        self.ai4i_data = ai4i_data.copy()
        self.base_slices: Dict[str, pd.DataFrame] = {}
        self.state_windows: Dict[str, Dict[str, StateWindow]] = {}
        
        # Create base slices on initialization
        self.create_base_slices()
        
        # Identify state windows for each machine
        for machine_id in MACHINES.keys():
            self.state_windows[machine_id] = self.identify_state_windows(machine_id)
    
    def create_base_slices(self) -> Dict[str, pd.DataFrame]:
        """
        Partition AI4I dataset into 4 equal base slices, one per machine.
        
        Returns:
            Dictionary mapping machine_id to DataFrame slice
        """
        total_rows = len(self.ai4i_data)
        slice_size = total_rows // 4
        
        machine_ids = list(MACHINES.keys())
        
        for i, machine_id in enumerate(machine_ids):
            start_idx = i * slice_size
            
            # Last slice gets any remaining rows
            if i == len(machine_ids) - 1:
                end_idx = total_rows
            else:
                end_idx = (i + 1) * slice_size
            
            # Extract slice and reset index to start from 0
            slice_df = self.ai4i_data.iloc[start_idx:end_idx].copy()
            slice_df.reset_index(drop=True, inplace=True)
            
            self.base_slices[machine_id] = slice_df
        
        return self.base_slices
    
    def identify_state_windows(self, machine_id: str) -> Dict[str, StateWindow]:
        """
        Identify state windows within a machine's base slice using statistical
        analysis and Isolation Forest.
        
        Detects:
        - Normal windows: Low variance, values in normal ranges
        - Advisory windows: Increasing trends, approaching thresholds
        - Action Required windows: Values exceeding critical thresholds
        - Post-Maintenance windows: Transition from high to normal values
        
        Args:
            machine_id: Machine identifier
            
        Returns:
            Dictionary mapping state name to StateWindow object
        """
        if machine_id not in self.base_slices:
            raise ValueError(f"Invalid machine_id: {machine_id}")
        
        base_slice = self.base_slices[machine_id]
        
        # Extract key sensor columns from AI4I dataset
        temp_col = "Process temperature [K]"
        torque_col = "Torque [Nm]"
        speed_col = "Rotational speed [rpm]"
        
        # Calculate derived vibration metric from torque and speed
        # AI4I dataset doesn't include direct vibration measurements,
        # so we simulate vibration as a function of torque (higher torque = higher vibration)
        # The 1.5 multiplier scales torque values to approximate vibration in μm
        vibration = (base_slice[torque_col] * 1.5).values
        
        # Prepare features for anomaly detection
        # We use temperature, torque, and speed as the primary indicators
        features = base_slice[[temp_col, torque_col, speed_col]].values
        
        # Use Isolation Forest for anomaly detection
        # contamination=0.1 means we expect ~10% of data points to be anomalies
        # random_state=42 ensures reproducible results across runs
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        anomaly_scores = iso_forest.fit_predict(features)
        
        # STEP 1: Classify each row based on threshold rules
        # This creates a preliminary classification for every data point in the slice
        # We use a hierarchical threshold approach: Action Required > Advisory > Normal
        classifications = []
        for idx, row in base_slice.iterrows():
            temp = row[temp_col]
            torque = row[torque_col]
            vib = vibration[idx]
            
            # Check for Action Required conditions (highest priority)
            # ANY sensor exceeding critical threshold triggers Action Required
            if (temp >= THRESHOLDS["temperature"]["action_required"] or
                torque >= THRESHOLDS["torque"]["action_required"] or
                vib >= THRESHOLDS["vibration"]["action_required"]):
                classifications.append("Action Required")
            # Check for Advisory conditions (medium priority)
            # ANY sensor exceeding advisory threshold triggers Advisory
            elif (temp >= THRESHOLDS["temperature"]["advisory"] or
                  torque >= THRESHOLDS["torque"]["advisory"] or
                  vib >= THRESHOLDS["vibration"]["advisory"]):
                classifications.append("Advisory")
            else:
                # All sensors within normal ranges
                classifications.append("Normal")
        
        # STEP 2: Identify contiguous windows for each state
        # We scan through the classifications to find continuous segments of each state
        # This creates non-overlapping windows that represent distinct operational phases
        windows = {}
        
        # Find Normal window (first contiguous normal segment)
        # We look for the first continuous block of "Normal" classifications
        # This typically represents the machine's baseline healthy operation
        normal_start = None
        for i, cls in enumerate(classifications):
            if cls == "Normal":
                if normal_start is None:
                    normal_start = i  # Mark the start of normal segment
            elif normal_start is not None:
                # Found end of normal window (hit a non-normal classification)
                windows["Normal"] = StateWindow(
                    state="Normal",
                    start_index=normal_start,
                    end_index=i - 1,  # End at the last normal index
                    machine_id=machine_id
                )
                break
        
        # If no break found, use entire normal segment
        # This handles the case where Normal extends to the end of the slice
        if "Normal" not in windows and normal_start is not None:
            # Find last normal index
            last_normal = normal_start
            for i in range(normal_start, len(classifications)):
                if classifications[i] == "Normal":
                    last_normal = i
                else:
                    break
            windows["Normal"] = StateWindow(
                state="Normal",
                start_index=normal_start,
                end_index=last_normal,
                machine_id=machine_id
            )
        
        # Find Advisory window (first contiguous advisory segment)
        # Advisory represents early degradation - sensors approaching but not exceeding critical thresholds
        advisory_start = None
        for i, cls in enumerate(classifications):
            if cls == "Advisory":
                if advisory_start is None:
                    advisory_start = i  # Mark start of advisory segment
            elif advisory_start is not None and cls != "Advisory":
                # Found end of advisory window
                windows["Advisory"] = StateWindow(
                    state="Advisory",
                    start_index=advisory_start,
                    end_index=i - 1,
                    machine_id=machine_id
                )
                break
        
        # Handle case where Advisory extends to end of slice
        if "Advisory" not in windows and advisory_start is not None:
            last_advisory = advisory_start
            for i in range(advisory_start, len(classifications)):
                if classifications[i] == "Advisory":
                    last_advisory = i
                else:
                    break
            windows["Advisory"] = StateWindow(
                state="Advisory",
                start_index=advisory_start,
                end_index=last_advisory,
                machine_id=machine_id
            )
        
        # Find Action Required window (first contiguous critical segment)
        # Action Required represents critical conditions requiring immediate intervention
        action_start = None
        for i, cls in enumerate(classifications):
            if cls == "Action Required":
                if action_start is None:
                    action_start = i  # Mark start of critical segment
            elif action_start is not None and cls != "Action Required":
                # Found end of action required window
                windows["Action Required"] = StateWindow(
                    state="Action Required",
                    start_index=action_start,
                    end_index=i - 1,
                    machine_id=machine_id
                )
                break
        
        # Handle case where Action Required extends to end of slice
        if "Action Required" not in windows and action_start is not None:
            last_action = action_start
            for i in range(action_start, len(classifications)):
                if classifications[i] == "Action Required":
                    last_action = i
                else:
                    break
            windows["Action Required"] = StateWindow(
                state="Action Required",
                start_index=action_start,
                end_index=last_action,
                machine_id=machine_id
            )
        
        # STEP 3: Create Post-Maintenance window (transition from high to normal)
        # Post-Maintenance represents recovery after intervention - sensors returning to normal
        # We look for a segment AFTER Action Required that returns to normal values
        # This must be distinct from the main Normal window (different time period)
        if "Action Required" in windows:
            action_end = windows["Action Required"].end_index
            normal_range = (windows["Normal"].start_index, windows["Normal"].end_index) if "Normal" in windows else None
            
            # Look for normal values after action required window ends
            # This represents the machine recovering after maintenance intervention
            post_maint_start = None
            for i in range(action_end + 1, len(classifications)):
                if classifications[i] == "Normal":
                    if post_maint_start is None:
                        post_maint_start = i  # Found start of recovery period
                elif post_maint_start is not None:
                    # Check if this segment overlaps with the main Normal window
                    # We want Post-Maintenance to be a SEPARATE recovery period, not the original Normal
                    if normal_range and not (i - 1 < normal_range[0] or post_maint_start > normal_range[1]):
                        # This overlaps with Normal window, skip it
                        post_maint_start = None
                        continue
                    
                    # Found a valid Post-Maintenance window
                    windows["Post-Maintenance"] = StateWindow(
                        state="Post-Maintenance",
                        start_index=post_maint_start,
                        end_index=i - 1,
                        machine_id=machine_id
                    )
                    break
            
            # If we found a start but no break, check if it's valid and create a window
            if "Post-Maintenance" not in windows and post_maint_start is not None:
                # Use a reasonable window size (50 points) for post-maintenance observation
                end_idx = min(post_maint_start + 50, len(classifications) - 1)
                # Check if this would overlap with Normal window
                if normal_range and not (end_idx < normal_range[0] or post_maint_start > normal_range[1]):
                    # Would overlap, don't create it here
                    post_maint_start = None
                else:
                    windows["Post-Maintenance"] = StateWindow(
                        state="Post-Maintenance",
                        start_index=post_maint_start,
                        end_index=end_idx,
                        machine_id=machine_id
                    )
        
        # STEP 4: Ensure no overlaps by adjusting windows
        # Windows must be non-overlapping for clean simulation scenarios
        # If windows overlap, we adjust the earlier window to end before the later one starts
        
        # Collect all existing windows and sort by start index
        window_list = [(name, win) for name, win in windows.items()]
        window_list.sort(key=lambda x: x[1].start_index)
        
        # Check for and fix overlaps
        for i in range(len(window_list) - 1):
            curr_name, curr_win = window_list[i]
            next_name, next_win = window_list[i + 1]
            
            # If current window overlaps with next, adjust current to end before next
            if curr_win.end_index >= next_win.start_index:
                # Only adjust if there's room (start < next start)
                if curr_win.start_index < next_win.start_index:
                    windows[curr_name] = StateWindow(
                        state=curr_win.state,
                        start_index=curr_win.start_index,
                        end_index=next_win.start_index - 1,  # End just before next window
                        machine_id=machine_id
                    )
        
        # STEP 5: Ensure all 4 states have windows (create synthetic if needed)
        # The system requires all 4 health states to be available for simulation
        # If natural data doesn't provide all states, we create synthetic windows in available gaps
        
        # First, collect all valid existing windows (where end >= start)
        valid_windows = {}
        for name, win in windows.items():
            if win.end_index >= win.start_index:
                valid_windows[name] = win
        
        # Create missing windows by finding gaps in the data
        missing_states = []
        for state in ["Normal", "Advisory", "Action Required", "Post-Maintenance"]:
            if state not in valid_windows:
                missing_states.append(state)
        
        # If we have missing states, create them in non-overlapping positions
        if missing_states:
            # Get all occupied ranges (from valid_windows, not windows!)
            occupied = [(w.start_index, w.end_index) for w in valid_windows.values()]
            occupied.sort()
            
            # Find available gaps between occupied windows
            available_gaps = []
            
            # Gap before first occupied range
            if not occupied or occupied[0][0] > 0:
                gap_start = 0
                gap_end = occupied[0][0] - 1 if occupied else len(base_slice) - 1
                if gap_end - gap_start + 1 >= 50:  # Minimum 50 points for a meaningful window
                    available_gaps.append((gap_start, gap_end))
            
            # Gaps between occupied ranges
            for i in range(len(occupied) - 1):
                gap_start = occupied[i][1] + 1
                gap_end = occupied[i + 1][0] - 1
                if gap_end - gap_start + 1 >= 50:
                    available_gaps.append((gap_start, gap_end))
            
            # Gap after last occupied range
            if occupied:
                gap_start = occupied[-1][1] + 1
                gap_end = len(base_slice) - 1
                if gap_end - gap_start + 1 >= 50:
                    available_gaps.append((gap_start, gap_end))
            
            # If no occupied ranges, use the whole slice
            if not occupied:
                available_gaps.append((0, len(base_slice) - 1))
            
            # Assign missing states to available gaps
            for i, state in enumerate(missing_states):
                if i < len(available_gaps):
                    gap_start, gap_end = available_gaps[i]
                    # Use appropriate window size: 100 for most states, 50 for Post-Maintenance
                    window_size = 100 if state != "Post-Maintenance" else 50
                    windows[state] = StateWindow(
                        state=state,
                        start_index=gap_start,
                        end_index=min(gap_start + window_size, gap_end),
                        machine_id=machine_id
                    )
                    # Add this window to occupied ranges for next iteration
                    occupied.append((windows[state].start_index, windows[state].end_index))
                    occupied.sort()
                else:
                    # Not enough gaps, create a minimal window at the end
                    # This is a fallback for edge cases with very limited data
                    start = len(base_slice) - (len(missing_states) - i) * 10
                    windows[state] = StateWindow(
                        state=state,
                        start_index=max(0, start),
                        end_index=min(start + 5, len(base_slice) - 1),
                        machine_id=machine_id
                    )
        
        return windows
    
    def get_sensor_data_at_position(self, machine_id: str, position: int) -> Dict[str, float]:
        """
        Retrieve sensor readings at a specific cursor position within a machine's slice.
        
        Data is returned without modification from the source dataset.
        
        Args:
            machine_id: Machine identifier
            position: Row index within the machine's base slice
            
        Returns:
            Dictionary mapping sensor names to values
            
        Raises:
            ValueError: If machine_id is invalid or position is out of bounds
        """
        if machine_id not in self.base_slices:
            raise ValueError(f"Invalid machine_id: {machine_id}")
        
        base_slice = self.base_slices[machine_id]
        
        if position < 0 or position >= len(base_slice):
            raise ValueError(
                f"Position {position} out of bounds for machine {machine_id} "
                f"(valid range: 0-{len(base_slice) - 1})"
            )
        
        row = base_slice.iloc[position]
        
        # Extract sensor readings
        sensor_data = {
            "temperature": float(row["Process temperature [K]"]),
            "air_temperature": float(row["Air temperature [K]"]),
            "rotational_speed": float(row["Rotational speed [rpm]"]),
            "torque": float(row["Torque [Nm]"]),
            "tool_wear": float(row["Tool wear [min]"]),
            # Calculate derived vibration metric
            "vibration": float(row["Torque [Nm]"] * 1.5),
        }
        
        return sensor_data
    
    def get_sensor_history(self, machine_id: str, position: int, 
                          window_size: int = 50) -> pd.DataFrame:
        """
        Retrieve rolling window of sensor history for trend visualization.
        
        Returns the last `window_size` rows up to and including the current position.
        
        Args:
            machine_id: Machine identifier
            position: Current cursor position
            window_size: Number of historical rows to return (default: 50)
            
        Returns:
            DataFrame with sensor history
            
        Raises:
            ValueError: If machine_id is invalid or position is out of bounds
        """
        if machine_id not in self.base_slices:
            raise ValueError(f"Invalid machine_id: {machine_id}")
        
        base_slice = self.base_slices[machine_id]
        
        if position < 0 or position >= len(base_slice):
            raise ValueError(
                f"Position {position} out of bounds for machine {machine_id} "
                f"(valid range: 0-{len(base_slice) - 1})"
            )
        
        # Calculate window start (ensure it doesn't go below 0)
        start_idx = max(0, position - window_size + 1)
        end_idx = position + 1
        
        # Extract history window
        history = base_slice.iloc[start_idx:end_idx].copy()
        
        # Add derived vibration column
        history["vibration"] = history["Torque [Nm]"] * 1.5
        
        # Select relevant columns for history
        history_cols = [
            "Process temperature [K]",
            "Air temperature [K]",
            "Rotational speed [rpm]",
            "Torque [Nm]",
            "Tool wear [min]",
            "vibration"
        ]
        
        return history[history_cols]
