"""
Integration test for ExplanationEngine with HealthClassifier

This test verifies that ExplanationEngine works correctly with
real HealthClassification objects from HealthClassifier.
"""
import pytest
import pandas as pd
import numpy as np
from explanation_engine import ExplanationEngine
from health_classifier import HealthClassifier


def test_explanation_engine_with_health_classifier():
    """
    Integration test: ExplanationEngine receives HealthClassification
    from HealthClassifier and generates valid explanations.
    """
    # Create sample sensor history
    history_data = {
        "Process temperature [K]": [300, 302, 305, 308, 312],
        "Torque [Nm]": [40, 42, 45, 48, 52],
        "Rotational speed [rpm]": [1500, 1500, 1500, 1500, 1500],
        "vibration": [35, 38, 42, 46, 51]
    }
    sensor_history = pd.DataFrame(history_data)
    
    # Current sensor readings (Advisory level)
    sensor_readings = {
        "temperature": 312.0,
        "vibration": 51.0,
        "torque": 52.0,
        "rotational_speed": 1500.0
    }
    
    # Create HealthClassifier and classify
    classifier = HealthClassifier()
    health_classification = classifier.classify(sensor_readings, sensor_history)
    
    # Verify classification is Advisory (based on thresholds)
    assert health_classification.health_state in ["Advisory", "Action Required"]
    
    # Create ExplanationEngine and generate explanation
    explainer = ExplanationEngine()
    explanation = explainer.generate_explanation(health_classification, sensor_readings)
    
    # Verify explanation structure
    assert explanation.explanation_text != ""
    assert explanation.affected_component != ""
    assert explanation.recommended_action != ""
    assert isinstance(explanation.bearing_evidence_required, bool)
    
    # Verify no probabilistic language
    text_lower = explanation.explanation_text.lower()
    assert "%" not in text_lower
    assert "probably" not in text_lower
    assert "likely" not in text_lower
    
    print(f"\nHealth State: {health_classification.health_state}")
    print(f"Explanation: {explanation.explanation_text}")
    print(f"Affected Component: {explanation.affected_component}")
    print(f"Recommendation: {explanation.recommended_action}")
    print(f"Bearing Evidence Required: {explanation.bearing_evidence_required}")


def test_explanation_engine_normal_state():
    """
    Integration test: Normal state produces appropriate explanation.
    """
    # Create sample sensor history (all normal)
    history_data = {
        "Process temperature [K]": [300, 300, 301, 300, 300],
        "Torque [Nm]": [40, 40, 41, 40, 40],
        "Rotational speed [rpm]": [1500, 1500, 1500, 1500, 1500],
        "vibration": [35, 35, 36, 35, 35]
    }
    sensor_history = pd.DataFrame(history_data)
    
    # Current sensor readings (Normal level)
    sensor_readings = {
        "temperature": 300.0,
        "vibration": 35.0,
        "torque": 40.0,
        "rotational_speed": 1500.0
    }
    
    # Create HealthClassifier and classify
    classifier = HealthClassifier()
    health_classification = classifier.classify(sensor_readings, sensor_history)
    
    # Verify classification is Normal
    assert health_classification.health_state == "Normal"
    
    # Create ExplanationEngine and generate explanation
    explainer = ExplanationEngine()
    explanation = explainer.generate_explanation(health_classification, sensor_readings)
    
    # Verify normal state explanation
    assert "normal" in explanation.explanation_text.lower()
    assert explanation.affected_component == "None"
    assert "continue" in explanation.recommended_action.lower()
    assert explanation.bearing_evidence_required == False
    
    print(f"\nNormal State Test:")
    print(f"Explanation: {explanation.explanation_text}")
    print(f"Recommendation: {explanation.recommended_action}")


def test_explanation_engine_action_required_state():
    """
    Integration test: Action Required state produces urgent recommendations.
    """
    # Create sample sensor history (critical values)
    history_data = {
        "Process temperature [K]": [315, 318, 320, 322, 325],
        "Torque [Nm]": [55, 58, 60, 62, 65],
        "Rotational speed [rpm]": [1500, 1500, 1500, 1500, 1500],
        "vibration": [65, 68, 70, 72, 75]
    }
    sensor_history = pd.DataFrame(history_data)
    
    # Current sensor readings (Action Required level)
    sensor_readings = {
        "temperature": 325.0,
        "vibration": 75.0,
        "torque": 65.0,
        "rotational_speed": 1500.0
    }
    
    # Create HealthClassifier and classify
    classifier = HealthClassifier()
    health_classification = classifier.classify(sensor_readings, sensor_history)
    
    # Verify classification is Action Required
    assert health_classification.health_state == "Action Required"
    
    # Create ExplanationEngine and generate explanation
    explainer = ExplanationEngine()
    explanation = explainer.generate_explanation(health_classification, sensor_readings)
    
    # Verify action required explanation has urgent language
    recommendation_lower = explanation.recommended_action.lower()
    urgent_keywords = ["immediate", "immediately", "urgent", "emergency", "shutdown"]
    has_urgent = any(keyword in recommendation_lower for keyword in urgent_keywords)
    
    assert has_urgent, f"Action Required recommendation should be urgent: {explanation.recommended_action}"
    
    print(f"\nAction Required State Test:")
    print(f"Explanation: {explanation.explanation_text}")
    print(f"Affected Component: {explanation.affected_component}")
    print(f"Recommendation: {explanation.recommended_action}")


if __name__ == "__main__":
    test_explanation_engine_with_health_classifier()
    test_explanation_engine_normal_state()
    test_explanation_engine_action_required_state()
    print("\n✓ All integration tests passed!")
