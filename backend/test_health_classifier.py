"""
Tests for Health Classifier

Includes both unit tests and property-based tests for health classification logic.
"""
import pytest
import pandas as pd
import numpy as np
from hypothesis import given, strategies as st, settings
from health_classifier import HealthClassifier, HealthClassification, THRESHOLDS


# Test fixtures
@pytest.fixture
def sample_normal_data():
    """Create sample normal sensor data for training."""
    return pd.DataFrame({
        "Process temperature [K]": np.random.uniform(295, 305, 100),
        "Torque [Nm]": np.random.uniform(30, 45, 100),
        "Rotational speed [rpm]": np.random.uniform(1400, 2600, 100),
        "vibration": np.random.uniform(20, 40, 100)
    })


@pytest.fixture
def classifier(sample_normal_data):
    """Create a trained HealthClassifier instance."""
    return HealthClassifier(normal_data=sample_normal_data)


# Property-Based Tests

@given(
    temperature=st.floats(min_value=280, max_value=350, allow_nan=False, allow_infinity=False),
    vibration=st.floats(min_value=0, max_value=150, allow_nan=False, allow_infinity=False),
    torque=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
    rotational_speed=st.floats(min_value=800, max_value=3200, allow_nan=False, allow_infinity=False),
    tool_wear=st.floats(min_value=0, max_value=300, allow_nan=False, allow_infinity=False)
)
@settings(max_examples=100, deadline=None)
def test_property_health_state_exclusivity(temperature, vibration, torque, rotational_speed, tool_wear):
    """
    Feature: prism-predictive-maintenance, Property 3: Health State Exclusivity
    
    **Validates: Requirements 2.1**
    
    For any machine at any cursor position, the machine should be classified into 
    exactly one health state from the set {Normal, Advisory, Action Required, Post-Maintenance}.
    """
    # Create classifier
    classifier = HealthClassifier()
    
    # Create sensor readings
    sensor_readings = {
        "temperature": temperature,
        "vibration": vibration,
        "torque": torque,
        "rotational_speed": rotational_speed,
        "tool_wear": tool_wear
    }
    
    # Create minimal sensor history (just current reading repeated)
    sensor_history = pd.DataFrame({
        "Process temperature [K]": [temperature] * 5,
        "vibration": [vibration] * 5,
        "Torque [Nm]": [torque] * 5,
        "Rotational speed [rpm]": [rotational_speed] * 5,
        "Tool wear [min]": [tool_wear] * 5
    })
    
    # Classify
    classification = classifier.classify(sensor_readings, sensor_history)
    
    # Verify health state is exactly one of the valid states
    valid_states = {"Normal", "Advisory", "Action Required", "Post-Maintenance"}
    assert classification.health_state in valid_states, (
        f"Health state '{classification.health_state}' is not in valid states: {valid_states}"
    )
    
    # Verify it's a string (not None, not empty)
    assert isinstance(classification.health_state, str)
    assert len(classification.health_state) > 0



@given(
    temperature=st.floats(min_value=280, max_value=350, allow_nan=False, allow_infinity=False),
    vibration=st.floats(min_value=0, max_value=150, allow_nan=False, allow_infinity=False),
    torque=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
    rotational_speed=st.floats(min_value=800, max_value=3200, allow_nan=False, allow_infinity=False)
)
@settings(max_examples=100, deadline=None)
def test_property_threshold_based_classification(temperature, vibration, torque, rotational_speed):
    """
    Feature: prism-predictive-maintenance, Property 18: Threshold-Based Classification
    
    **Validates: Requirements 2.2, 2.3, 2.4**
    
    For any sensor readings where temperature > 320K OR vibration > 70 OR torque > 60,
    the health state should be classified as Action Required; for readings where 
    310K < temperature ≤ 320K OR 50 < vibration ≤ 70 OR 50 < torque ≤ 60, 
    the health state should be Advisory or Action Required.
    """
    # Create classifier
    classifier = HealthClassifier()
    
    # Create sensor readings
    sensor_readings = {
        "temperature": temperature,
        "vibration": vibration,
        "torque": torque,
        "rotational_speed": rotational_speed,
        "tool_wear": 100.0
    }
    
    # Create minimal sensor history (stable readings)
    sensor_history = pd.DataFrame({
        "Process temperature [K]": [temperature] * 5,
        "vibration": [vibration] * 5,
        "Torque [Nm]": [torque] * 5,
        "Rotational speed [rpm]": [rotational_speed] * 5,
        "Tool wear [min]": [100.0] * 5
    })
    
    # Classify
    classification = classifier.classify(sensor_readings, sensor_history)
    
    # Check Action Required conditions
    action_required_condition = (
        temperature >= THRESHOLDS["temperature"]["action_required"] or
        vibration >= THRESHOLDS["vibration"]["action_required"] or
        torque >= THRESHOLDS["torque"]["action_required"]
    )
    
    if action_required_condition:
        assert classification.health_state == "Action Required", (
            f"Expected 'Action Required' for temp={temperature}, vib={vibration}, torque={torque}, "
            f"but got '{classification.health_state}'"
        )
    
    # Check Advisory conditions (when not Action Required)
    advisory_condition = (
        (THRESHOLDS["temperature"]["advisory"] <= temperature < THRESHOLDS["temperature"]["action_required"]) or
        (THRESHOLDS["vibration"]["advisory"] <= vibration < THRESHOLDS["vibration"]["action_required"]) or
        (THRESHOLDS["torque"]["advisory"] <= torque < THRESHOLDS["torque"]["action_required"])
    )
    
    if advisory_condition and not action_required_condition:
        assert classification.health_state in ["Advisory", "Action Required"], (
            f"Expected 'Advisory' or 'Action Required' for temp={temperature}, vib={vibration}, "
            f"torque={torque}, but got '{classification.health_state}'"
        )



# Unit Tests

def test_normal_sensor_readings_normal_state(classifier):
    """
    Test that normal sensor readings result in Normal health state.
    
    **Validates: Requirements 2.2**
    """
    sensor_readings = {
        "temperature": 300.0,  # Below advisory threshold (310)
        "vibration": 35.0,     # Below advisory threshold (50)
        "torque": 40.0,        # Below advisory threshold (50)
        "rotational_speed": 1500.0,
        "tool_wear": 100.0
    }
    
    sensor_history = pd.DataFrame({
        "Process temperature [K]": [300.0] * 10,
        "vibration": [35.0] * 10,
        "Torque [Nm]": [40.0] * 10,
        "Rotational speed [rpm]": [1500.0] * 10,
        "Tool wear [min]": [100.0] * 10
    })
    
    classification = classifier.classify(sensor_readings, sensor_history)
    
    assert classification.health_state == "Normal"
    assert len(classification.threshold_violations) == 0


def test_advisory_threshold_values_advisory_state(classifier):
    """
    Test that sensor readings at advisory thresholds result in Advisory state.
    
    **Validates: Requirements 2.3**
    """
    sensor_readings = {
        "temperature": 315.0,  # Above advisory (310), below action (320)
        "vibration": 55.0,     # Above advisory (50), below action (70)
        "torque": 45.0,        # Below advisory threshold
        "rotational_speed": 1500.0,
        "tool_wear": 100.0
    }
    
    sensor_history = pd.DataFrame({
        "Process temperature [K]": [315.0] * 10,
        "vibration": [55.0] * 10,
        "Torque [Nm]": [45.0] * 10,
        "Rotational speed [rpm]": [1500.0] * 10,
        "Tool wear [min]": [100.0] * 10
    })
    
    classification = classifier.classify(sensor_readings, sensor_history)
    
    assert classification.health_state == "Advisory"
    assert "temperature" in classification.threshold_violations
    assert "vibration" in classification.threshold_violations


def test_critical_threshold_values_action_required_state(classifier):
    """
    Test that sensor readings exceeding critical thresholds result in Action Required state.
    
    **Validates: Requirements 2.4**
    """
    sensor_readings = {
        "temperature": 325.0,  # Above action required threshold (320)
        "vibration": 75.0,     # Above action required threshold (70)
        "torque": 45.0,
        "rotational_speed": 1500.0,
        "tool_wear": 100.0
    }
    
    sensor_history = pd.DataFrame({
        "Process temperature [K]": [325.0] * 10,
        "vibration": [75.0] * 10,
        "Torque [Nm]": [45.0] * 10,
        "Rotational speed [rpm]": [1500.0] * 10,
        "Tool wear [min]": [100.0] * 10
    })
    
    classification = classifier.classify(sensor_readings, sensor_history)
    
    assert classification.health_state == "Action Required"
    assert "temperature" in classification.threshold_violations
    assert "vibration" in classification.threshold_violations


def test_post_maintenance_transition_pattern(classifier):
    """
    Test that transition from high values to normal with declining trends 
    results in Post-Maintenance state.
    
    **Validates: Requirements 2.5**
    """
    # Current readings are normal
    sensor_readings = {
        "temperature": 300.0,
        "vibration": 35.0,
        "torque": 40.0,
        "rotational_speed": 1500.0,
        "tool_wear": 100.0
    }
    
    # History shows declining trend from high values
    # Early values were high (advisory/action), recent values are normal
    temp_history = list(np.linspace(320, 300, 20))  # Declining from action required to normal
    vib_history = list(np.linspace(65, 35, 20))     # Declining from advisory to normal
    torque_history = list(np.linspace(55, 40, 20))  # Declining from advisory to normal
    
    sensor_history = pd.DataFrame({
        "Process temperature [K]": temp_history,
        "vibration": vib_history,
        "Torque [Nm]": torque_history,
        "Rotational speed [rpm]": [1500.0] * 20,
        "Tool wear [min]": [100.0] * 20
    })
    
    classification = classifier.classify(sensor_readings, sensor_history)
    
    assert classification.health_state == "Post-Maintenance"
    assert classification.sensor_trends["temperature"] == "falling"
    assert classification.sensor_trends["vibration"] == "falling"


def test_detect_anomalies_threshold_based():
    """Test anomaly detection using threshold-based logic."""
    classifier = HealthClassifier()
    
    # Normal readings - no anomalies
    normal_readings = {
        "temperature": 300.0,
        "vibration": 35.0,
        "torque": 40.0,
        "rotational_speed": 1500.0
    }
    anomalies = classifier.detect_anomalies(normal_readings)
    assert len(anomalies) == 0
    
    # High temperature - should detect anomaly
    high_temp_readings = {
        "temperature": 315.0,
        "vibration": 35.0,
        "torque": 40.0,
        "rotational_speed": 1500.0
    }
    anomalies = classifier.detect_anomalies(high_temp_readings)
    assert "temperature" in anomalies
    
    # High vibration - should detect anomaly
    high_vib_readings = {
        "temperature": 300.0,
        "vibration": 65.0,
        "torque": 40.0,
        "rotational_speed": 1500.0
    }
    anomalies = classifier.detect_anomalies(high_vib_readings)
    assert "vibration" in anomalies


def test_calculate_trends():
    """Test trend calculation using linear regression."""
    classifier = HealthClassifier()
    
    # Rising trend
    rising_history = pd.DataFrame({
        "Process temperature [K]": list(range(300, 320)),
        "vibration": [35.0] * 20,
        "Torque [Nm]": [40.0] * 20
    })
    trends = classifier.calculate_trends(rising_history)
    assert trends["temperature"] == "rising"
    assert trends["vibration"] == "stable"
    assert trends["torque"] == "stable"
    
    # Falling trend
    falling_history = pd.DataFrame({
        "Process temperature [K]": list(range(320, 300, -1)),
        "vibration": list(range(70, 50, -1)),
        "Torque [Nm]": [40.0] * 20
    })
    trends = classifier.calculate_trends(falling_history)
    assert trends["temperature"] == "falling"
    assert trends["vibration"] == "falling"
    assert trends["torque"] == "stable"
