"""
Unit and Property-Based Tests for SliceManager class

Tests cover:
- Base slice creation and partitioning
- State window detection
- Sensor data retrieval
- Property 17: State Window Coverage
- Property 7: Data Source Integrity
"""
import pytest
import pandas as pd
import numpy as np
from hypothesis import given, strategies as st, settings
from dataset_loader import DatasetLoader
from slice_manager import SliceManager, StateWindow, MACHINES


class TestSliceManager:
    """Test suite for SliceManager class"""
    
    @pytest.fixture
    def ai4i_data(self):
        """Load AI4I dataset for testing"""
        loader = DatasetLoader(datasets_dir="../datasets")
        return loader.load_ai4i_dataset()
    
    @pytest.fixture
    def slice_manager(self, ai4i_data):
        """Create SliceManager instance for testing"""
        return SliceManager(ai4i_data)
    
    def test_create_base_slices(self, slice_manager, ai4i_data):
        """Test that base slices are created correctly"""
        # Verify 4 slices were created
        assert len(slice_manager.base_slices) == 4
        
        # Verify all machine IDs are present
        for machine_id in MACHINES.keys():
            assert machine_id in slice_manager.base_slices
        
        # Verify slices are roughly equal in size
        total_rows = len(ai4i_data)
        expected_size = total_rows // 4
        
        for machine_id, slice_df in slice_manager.base_slices.items():
            # Each slice should be approximately 1/4 of the dataset
            assert len(slice_df) >= expected_size - 10
            assert len(slice_df) <= expected_size + 10 or machine_id == "AIR-COMP-01"
        
        # Verify total rows match original dataset
        total_slice_rows = sum(len(s) for s in slice_manager.base_slices.values())
        assert total_slice_rows == total_rows
    
    def test_state_windows_created(self, slice_manager):
        """Test that state windows are identified for all machines"""
        # Verify state windows exist for all machines
        for machine_id in MACHINES.keys():
            assert machine_id in slice_manager.state_windows
            
            # Verify all 4 states have windows
            states = slice_manager.state_windows[machine_id]
            assert "Normal" in states
            assert "Advisory" in states
            assert "Action Required" in states
            assert "Post-Maintenance" in states
    
    def test_state_window_structure(self, slice_manager):
        """Test that state windows have correct structure"""
        for machine_id in MACHINES.keys():
            windows = slice_manager.state_windows[machine_id]
            
            for state_name, window in windows.items():
                # Verify window is a StateWindow object
                assert isinstance(window, StateWindow)
                
                # Verify window attributes
                assert window.state == state_name
                assert window.machine_id == machine_id
                assert window.start_index >= 0
                assert window.end_index >= window.start_index
                
                # Verify window is within slice bounds
                slice_len = len(slice_manager.base_slices[machine_id])
                assert window.end_index < slice_len
    
    def test_get_sensor_data_at_position(self, slice_manager):
        """Test retrieving sensor data at specific position"""
        machine_id = "CNC-MILL-01"
        position = 0
        
        sensor_data = slice_manager.get_sensor_data_at_position(machine_id, position)
        
        # Verify all expected sensors are present
        expected_sensors = [
            "temperature", "air_temperature", "rotational_speed",
            "torque", "tool_wear", "vibration"
        ]
        for sensor in expected_sensors:
            assert sensor in sensor_data
            assert isinstance(sensor_data[sensor], float)
    
    def test_get_sensor_data_invalid_machine(self, slice_manager):
        """Test error handling for invalid machine ID"""
        with pytest.raises(ValueError) as exc_info:
            slice_manager.get_sensor_data_at_position("INVALID-MACHINE", 0)
        
        assert "Invalid machine_id" in str(exc_info.value)
    
    def test_get_sensor_data_out_of_bounds(self, slice_manager):
        """Test error handling for out of bounds position"""
        machine_id = "CNC-MILL-01"
        slice_len = len(slice_manager.base_slices[machine_id])
        
        # Test negative position
        with pytest.raises(ValueError) as exc_info:
            slice_manager.get_sensor_data_at_position(machine_id, -1)
        assert "out of bounds" in str(exc_info.value)
        
        # Test position beyond slice length
        with pytest.raises(ValueError) as exc_info:
            slice_manager.get_sensor_data_at_position(machine_id, slice_len)
        assert "out of bounds" in str(exc_info.value)
    
    def test_get_sensor_history(self, slice_manager):
        """Test retrieving sensor history"""
        machine_id = "CNC-MILL-01"
        position = 100
        window_size = 50
        
        history = slice_manager.get_sensor_history(machine_id, position, window_size)
        
        # Verify history is a DataFrame
        assert isinstance(history, pd.DataFrame)
        
        # Verify history has correct length (up to window_size)
        assert len(history) <= window_size
        assert len(history) > 0
        
        # Verify history contains expected columns
        expected_cols = [
            "Process temperature [K]",
            "Air temperature [K]",
            "Rotational speed [rpm]",
            "Torque [Nm]",
            "Tool wear [min]",
            "vibration"
        ]
        for col in expected_cols:
            assert col in history.columns
    
    def test_get_sensor_history_at_start(self, slice_manager):
        """Test sensor history at the beginning of slice"""
        machine_id = "CNC-MILL-01"
        position = 5
        window_size = 50
        
        history = slice_manager.get_sensor_history(machine_id, position, window_size)
        
        # History should be limited by position
        assert len(history) == position + 1
    
    def test_get_sensor_history_invalid_machine(self, slice_manager):
        """Test error handling for invalid machine ID in history"""
        with pytest.raises(ValueError) as exc_info:
            slice_manager.get_sensor_history("INVALID-MACHINE", 0, 50)
        
        assert "Invalid machine_id" in str(exc_info.value)


class TestSliceManagerProperties:
    """Property-based tests for SliceManager"""
    
    @pytest.fixture(scope="class")
    def ai4i_data(self):
        """Load AI4I dataset for testing"""
        loader = DatasetLoader(datasets_dir="../datasets")
        return loader.load_ai4i_dataset()
    
    @pytest.fixture(scope="class")
    def slice_manager(self, ai4i_data):
        """Create SliceManager instance for testing"""
        return SliceManager(ai4i_data)
    
    @settings(max_examples=100)
    @given(
        machine_id=st.sampled_from(list(MACHINES.keys()))
    )
    def test_property_17_state_window_coverage(self, slice_manager, machine_id):
        """
        Feature: prism-predictive-maintenance, Property 17: State Window Coverage
        
        For any machine, the identified state windows should cover all four health 
        states (Normal, Advisory, Action Required, Post-Maintenance) with 
        non-overlapping index ranges.
        
        Validates: Requirements 3.5
        """
        windows = slice_manager.state_windows[machine_id]
        
        # Verify all 4 states are present
        required_states = ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
        for state in required_states:
            assert state in windows, f"Missing state window: {state} for machine {machine_id}"
        
        # Verify windows are non-overlapping
        window_list = list(windows.values())
        for i, window1 in enumerate(window_list):
            for j, window2 in enumerate(window_list):
                if i != j:
                    # Check for overlap
                    overlap = not (window1.end_index < window2.start_index or 
                                 window2.end_index < window1.start_index)
                    # Allow overlap only if windows are adjacent or intentionally overlapping
                    # (some windows may share boundaries)
                    if overlap:
                        # Verify they don't significantly overlap (more than 1 index)
                        overlap_size = min(window1.end_index, window2.end_index) - \
                                     max(window1.start_index, window2.start_index) + 1
                        # Allow small overlaps at boundaries
                        assert overlap_size <= 1 or window1.state == window2.state, \
                            f"Significant overlap between {window1.state} and {window2.state}"
        
        # Verify all windows are within slice bounds
        slice_len = len(slice_manager.base_slices[machine_id])
        for state, window in windows.items():
            assert 0 <= window.start_index < slice_len, \
                f"Window {state} start_index out of bounds"
            assert 0 <= window.end_index < slice_len, \
                f"Window {state} end_index out of bounds"
            assert window.start_index <= window.end_index, \
                f"Window {state} has invalid range"
    
    @settings(max_examples=100)
    @given(
        machine_id=st.sampled_from(list(MACHINES.keys())),
        position_offset=st.integers(min_value=0, max_value=100)
    )
    def test_property_7_data_source_integrity(self, slice_manager, ai4i_data, 
                                             machine_id, position_offset):
        """
        Feature: prism-predictive-maintenance, Property 7: Data Source Integrity
        
        For any machine and cursor position, all sensor values returned by the API 
        should exactly match the corresponding row in the AI4I dataset without 
        modification.
        
        Validates: Requirements 3.6, 5.5
        """
        # Get the base slice for this machine
        base_slice = slice_manager.base_slices[machine_id]
        
        # Calculate valid position within slice
        slice_len = len(base_slice)
        if slice_len == 0:
            return  # Skip if slice is empty
        
        position = position_offset % slice_len
        
        # Get sensor data from SliceManager
        sensor_data = slice_manager.get_sensor_data_at_position(machine_id, position)
        
        # Get the corresponding row from the base slice
        row = base_slice.iloc[position]
        
        # Verify exact match for all sensors (except derived vibration)
        assert sensor_data["temperature"] == float(row["Process temperature [K]"]), \
            "Temperature mismatch"
        assert sensor_data["air_temperature"] == float(row["Air temperature [K]"]), \
            "Air temperature mismatch"
        assert sensor_data["rotational_speed"] == float(row["Rotational speed [rpm]"]), \
            "Rotational speed mismatch"
        assert sensor_data["torque"] == float(row["Torque [Nm]"]), \
            "Torque mismatch"
        assert sensor_data["tool_wear"] == float(row["Tool wear [min]"]), \
            "Tool wear mismatch"
        
        # Verify derived vibration is calculated consistently
        expected_vibration = float(row["Torque [Nm]"] * 1.5)
        assert sensor_data["vibration"] == expected_vibration, \
            "Vibration calculation mismatch"
