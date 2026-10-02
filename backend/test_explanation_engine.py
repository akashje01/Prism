"""
Tests for ExplanationEngine

Includes:
- Property-based tests for non-probabilistic language
- Property-based tests for recommendation urgency
- Unit tests for specific explanation templates
"""
import pytest
import re
from hypothesis import given, strategies as st, settings
from explanation_engine import ExplanationEngine, Explanation
from health_classifier import HealthClassification


# Test fixtures
@pytest.fixture
def explanation_engine():
    """Create ExplanationEngine instance for testing."""
    return ExplanationEngine()


# Property-based test strategies
health_states = st.sampled_from(["Normal", "Advisory", "Action Required", "Post-Maintenance"])
sensor_names = st.sampled_from(["temperature", "vibration", "torque", "rotational_speed"])
trend_directions = st.sampled_from(["rising", "falling", "stable"])


def create_health_classification(health_state, anomalous_sensors, sensor_trends):
    """Helper to create HealthClassification for testing."""
    threshold_violations = {}
    
    # Add threshold violations for anomalous sensors
    for sensor in anomalous_sensors:
        if sensor == "temperature":
            threshold_violations[sensor] = 5.0
        elif sensor == "vibration":
            threshold_violations[sensor] = 10.0
        elif sensor == "torque":
            threshold_violations[sensor] = 8.0
    
    return HealthClassification(
        health_state=health_state,
        anomalous_sensors=anomalous_sensors,
        sensor_trends=sensor_trends,
        threshold_violations=threshold_violations
    )


# Property 12: Explanation Non-Probabilistic Language
@given(
    health_state=health_states,
    anomalous_sensors=st.lists(sensor_names, min_size=0, max_size=3, unique=True),
    sensor_trends=st.dictionaries(
        keys=sensor_names,
        values=trend_directions,
        min_size=0,
        max_size=4
    )
)
@settings(max_examples=100)
def test_property_12_explanation_non_probabilistic_language(
    health_state, anomalous_sensors, sensor_trends
):
    """
    Feature: prism-predictive-maintenance, Property 12: Explanation Non-Probabilistic Language
    
    For any machine state, the explanation text should not contain probability percentages,
    confidence scores, or probabilistic language.
    
    Validates: Requirements 7.7, 18.4
    """
    # Create ExplanationEngine instance
    explanation_engine = ExplanationEngine()
    
    # Create health classification
    health_classification = create_health_classification(
        health_state, anomalous_sensors, sensor_trends
    )
    
    # Create dummy sensor readings
    sensor_readings = {
        "temperature": 305.0,
        "vibration": 45.0,
        "torque": 42.0,
        "rotational_speed": 1500.0
    }
    
    # Generate explanation
    explanation = explanation_engine.generate_explanation(
        health_classification, sensor_readings
    )
    
    # Check explanation text for probabilistic language
    text = explanation.explanation_text.lower()
    
    # Check for percentage symbols
    assert "%" not in text, f"Explanation contains percentage symbol: {explanation.explanation_text}"
    assert "percent" not in text, f"Explanation contains 'percent': {explanation.explanation_text}"
    
    # Check for probabilistic words
    probabilistic_words = [
        "probably", "likely", "maybe", "perhaps", "possibly",
        "might", "could be", "may be", "uncertain", "confidence"
    ]
    
    for word in probabilistic_words:
        assert word not in text, f"Explanation contains probabilistic word '{word}': {explanation.explanation_text}"
    
    # Check for confidence scores (e.g., "0.95", "95%", "confidence: 0.8")
    confidence_pattern = r'\b\d+\.?\d*\s*(confidence|probability|certainty)\b'
    assert not re.search(confidence_pattern, text), \
        f"Explanation contains confidence score: {explanation.explanation_text}"


# Property 15: Recommendation Urgency Matches Health State
@given(
    health_state=health_states,
    anomalous_sensors=st.lists(sensor_names, min_size=0, max_size=3, unique=True),
    sensor_trends=st.dictionaries(
        keys=sensor_names,
        values=trend_directions,
        min_size=0,
        max_size=4
    )
)
@settings(max_examples=100)
def test_property_15_recommendation_urgency_matches_health_state(
    health_state, anomalous_sensors, sensor_trends
):
    """
    Feature: prism-predictive-maintenance, Property 15: Recommendation Urgency Matches Health State
    
    For any machine in Advisory state, the recommended action should contain monitoring or
    inspection keywords; for any machine in Action Required state, the recommended action
    should contain immediate or urgent action keywords.
    
    Validates: Requirements 12.1, 12.2, 12.5
    """
    # Create ExplanationEngine instance
    explanation_engine = ExplanationEngine()
    
    # Create health classification
    health_classification = create_health_classification(
        health_state, anomalous_sensors, sensor_trends
    )
    
    # Create dummy sensor readings
    sensor_readings = {
        "temperature": 305.0,
        "vibration": 45.0,
        "torque": 42.0,
        "rotational_speed": 1500.0
    }
    
    # Generate explanation
    explanation = explanation_engine.generate_explanation(
        health_classification, sensor_readings
    )
    
    recommendation = explanation.recommended_action.lower()
    
    # Check Advisory state recommendations
    if health_state == "Advisory":
        advisory_keywords = [
            "monitor", "inspection", "inspect", "schedule", "check",
            "within 24 hours", "within 48 hours", "closely"
        ]
        
        has_advisory_keyword = any(keyword in recommendation for keyword in advisory_keywords)
        assert has_advisory_keyword, \
            f"Advisory state recommendation missing monitoring/inspection keywords: {explanation.recommended_action}"
    
    # Check Action Required state recommendations
    elif health_state == "Action Required":
        urgent_keywords = [
            "immediate", "immediately", "urgent", "urgently", "emergency",
            "shutdown", "reduce", "do not operate", "required"
        ]
        
        has_urgent_keyword = any(keyword in recommendation for keyword in urgent_keywords)
        assert has_urgent_keyword, \
            f"Action Required state recommendation missing immediate/urgent keywords: {explanation.recommended_action}"
    
    # Check Normal state recommendations
    elif health_state == "Normal":
        normal_keywords = [
            "continue", "normal", "maintain", "regular"
        ]
        
        has_normal_keyword = any(keyword in recommendation for keyword in normal_keywords)
        assert has_normal_keyword, \
            f"Normal state recommendation missing normal operation keywords: {explanation.recommended_action}"


# Unit tests for specific explanation templates

def test_rising_vibration_explanation_contains_bearing_keywords(explanation_engine):
    """
    Test that rising vibration explanation contains bearing-related keywords.
    
    Validates: Requirements 7.3
    """
    # Create classification with rising vibration
    health_classification = HealthClassification(
        health_state="Advisory",
        anomalous_sensors=["vibration"],
        sensor_trends={"vibration": "rising"},
        threshold_violations={"vibration": 5.0}
    )
    
    sensor_readings = {
        "temperature": 300.0,
        "vibration": 55.0,
        "torque": 40.0,
        "rotational_speed": 1500.0
    }
    
    explanation = explanation_engine.generate_explanation(
        health_classification, sensor_readings
    )
    
    text = explanation.explanation_text.lower()
    
    # Check for bearing-related keywords
    bearing_keywords = ["bearing", "imbalance", "shaft"]
    has_bearing_keyword = any(keyword in text for keyword in bearing_keywords)
    
    assert has_bearing_keyword, \
        f"Rising vibration explanation missing bearing keywords: {explanation.explanation_text}"


def test_high_torque_temperature_explanation_contains_stress_keywords(explanation_engine):
    """
    Test that high torque + temperature explanation contains stress/lubrication keywords.
    
    Validates: Requirements 7.4
    """
    # Create classification with high torque and temperature
    health_classification = HealthClassification(
        health_state="Advisory",
        anomalous_sensors=["torque", "temperature"],
        sensor_trends={"torque": "stable", "temperature": "stable"},
        threshold_violations={"torque": 5.0, "temperature": 3.0}
    )
    
    sensor_readings = {
        "temperature": 313.0,
        "vibration": 40.0,
        "torque": 55.0,
        "rotational_speed": 1500.0
    }
    
    explanation = explanation_engine.generate_explanation(
        health_classification, sensor_readings
    )
    
    text = explanation.explanation_text.lower()
    
    # Check for stress/lubrication keywords
    stress_keywords = ["stress", "lubrication", "friction", "mechanical"]
    has_stress_keyword = any(keyword in text for keyword in stress_keywords)
    
    assert has_stress_keyword, \
        f"High torque+temperature explanation missing stress/lubrication keywords: {explanation.explanation_text}"


def test_normal_state_explanation_confirms_normal_operation(explanation_engine):
    """
    Test that normal state explanation confirms normal operation.
    
    Validates: Requirements 7.5
    """
    # Create classification for normal state
    health_classification = HealthClassification(
        health_state="Normal",
        anomalous_sensors=[],
        sensor_trends={"temperature": "stable", "vibration": "stable"},
        threshold_violations={}
    )
    
    sensor_readings = {
        "temperature": 300.0,
        "vibration": 35.0,
        "torque": 40.0,
        "rotational_speed": 1500.0
    }
    
    explanation = explanation_engine.generate_explanation(
        health_classification, sensor_readings
    )
    
    text = explanation.explanation_text.lower()
    
    # Check for normal operation confirmation
    normal_keywords = ["normal", "expected", "operating"]
    has_normal_keyword = any(keyword in text for keyword in normal_keywords)
    
    assert has_normal_keyword, \
        f"Normal state explanation doesn't confirm normal operation: {explanation.explanation_text}"


def test_no_external_api_calls_during_explanation_generation(explanation_engine):
    """
    Test that explanation generation doesn't make external API calls.
    
    This is a structural test - the ExplanationEngine should only use
    local template logic without any network calls.
    
    Validates: Requirements 7.2
    """
    # Create a classification
    health_classification = HealthClassification(
        health_state="Advisory",
        anomalous_sensors=["vibration"],
        sensor_trends={"vibration": "rising"},
        threshold_violations={"vibration": 5.0}
    )
    
    sensor_readings = {
        "temperature": 300.0,
        "vibration": 55.0,
        "torque": 40.0,
        "rotational_speed": 1500.0
    }
    
    # Generate explanation - should complete quickly without network calls
    # If this takes more than a few milliseconds, it might be making external calls
    import time
    start_time = time.time()
    
    explanation = explanation_engine.generate_explanation(
        health_classification, sensor_readings
    )
    
    elapsed_time = time.time() - start_time
    
    # Explanation generation should be nearly instantaneous (< 100ms)
    assert elapsed_time < 0.1, \
        f"Explanation generation took {elapsed_time}s, suggesting possible external API calls"
    
    # Verify we got a valid explanation
    assert explanation.explanation_text != ""
    assert explanation.affected_component != ""
    assert explanation.recommended_action != ""


def test_affected_component_vibration_maps_to_bearings(explanation_engine):
    """
    Test that elevated vibration maps to Bearings as affected component.
    
    Validates: Requirements 11.3
    """
    health_classification = HealthClassification(
        health_state="Advisory",
        anomalous_sensors=["vibration"],
        sensor_trends={"vibration": "rising"},
        threshold_violations={"vibration": 5.0}
    )
    
    affected_component = explanation_engine.identify_affected_component(health_classification)
    
    assert "Bearing" in affected_component, \
        f"Vibration issue should map to Bearings, got: {affected_component}"


def test_affected_component_temperature_only_maps_to_cooling(explanation_engine):
    """
    Test that elevated temperature only maps to Cooling/Lubrication systems.
    
    Validates: Requirements 11.4
    """
    health_classification = HealthClassification(
        health_state="Advisory",
        anomalous_sensors=["temperature"],
        sensor_trends={"temperature": "rising"},
        threshold_violations={"temperature": 5.0}
    )
    
    affected_component = explanation_engine.identify_affected_component(health_classification)
    
    assert "Cooling" in affected_component, \
        f"Temperature-only issue should map to Cooling system, got: {affected_component}"


def test_affected_component_normal_state_no_affected_components(explanation_engine):
    """
    Test that normal state indicates no affected components.
    
    Validates: Requirements 11.5
    """
    health_classification = HealthClassification(
        health_state="Normal",
        anomalous_sensors=[],
        sensor_trends={},
        threshold_violations={}
    )
    
    affected_component = explanation_engine.identify_affected_component(health_classification)
    
    assert affected_component == "None", \
        f"Normal state should have no affected components, got: {affected_component}"


def test_recommendation_normal_state_continued_operation(explanation_engine):
    """
    Test that normal state recommendation suggests continued normal operation.
    
    Validates: Requirements 12.3
    """
    recommendation = explanation_engine.generate_recommendation("Normal", "None")
    
    recommendation_lower = recommendation.lower()
    
    # Check for continued operation keywords
    continued_keywords = ["continue", "normal", "maintain", "regular"]
    has_continued_keyword = any(keyword in recommendation_lower for keyword in continued_keywords)
    
    assert has_continued_keyword, \
        f"Normal state recommendation should suggest continued operation: {recommendation}"


def test_recommendation_advisory_state_monitoring(explanation_engine):
    """
    Test that advisory state recommendation includes monitoring/inspection.
    
    Validates: Requirements 12.1
    """
    recommendation = explanation_engine.generate_recommendation("Advisory", "Bearings")
    
    recommendation_lower = recommendation.lower()
    
    # Check for monitoring/inspection keywords
    monitoring_keywords = ["monitor", "inspection", "inspect", "schedule", "check"]
    has_monitoring_keyword = any(keyword in recommendation_lower for keyword in monitoring_keywords)
    
    assert has_monitoring_keyword, \
        f"Advisory state recommendation should include monitoring/inspection: {recommendation}"


def test_recommendation_action_required_immediate_action(explanation_engine):
    """
    Test that action required state recommendation includes immediate action.
    
    Validates: Requirements 12.2
    """
    recommendation = explanation_engine.generate_recommendation("Action Required", "Bearings")
    
    recommendation_lower = recommendation.lower()
    
    # Check for immediate action keywords
    immediate_keywords = ["immediate", "immediately", "urgent", "emergency", "shutdown"]
    has_immediate_keyword = any(keyword in recommendation_lower for keyword in immediate_keywords)
    
    assert has_immediate_keyword, \
        f"Action Required state recommendation should include immediate action: {recommendation}"
