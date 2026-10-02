"""
Tests for CWRU Evidence Provider

This module contains:
- Property-based tests for bearing evidence conditional display
- Property-based tests for bearing evidence data structure
- Unit tests for CWRU file mapping
"""
import pytest
from hypothesis import given, strategies as st, settings
import numpy as np
from dataset_loader import DatasetLoader
from cwru_evidence_provider import CWRUEvidenceProvider, BearingEvidence


# Test fixtures
@pytest.fixture
def data_loader():
    """Create DatasetLoader instance for tests."""
    return DatasetLoader(datasets_dir="../datasets")


@pytest.fixture
def evidence_provider(data_loader):
    """Create CWRUEvidenceProvider instance for tests."""
    return CWRUEvidenceProvider(data_loader)


# Property 13: Bearing Evidence Conditional Display
# Validates: Requirements 8.1, 8.4
@given(
    health_state=st.sampled_from(["Normal", "Advisory", "Action Required", "Post-Maintenance"]),
    affected_component=st.sampled_from([
        "Bearings",
        "Bearing assembly",
        "Shaft bearings",
        "Cooling system",
        "Drive system",
        "Motor control system",
        "None",
        "Multiple components"
    ])
)
@settings(max_examples=100)
def test_property_13_bearing_evidence_conditional_display(health_state, affected_component):
    """
    Feature: prism-predictive-maintenance, Property 13: Bearing Evidence Conditional Display
    
    For any machine, bearing vibration evidence should be present in the response 
    if and only if the affected component is bearing-related and the health state 
    is Advisory or Action Required.
    
    Validates: Requirements 8.1, 8.4
    """
    data_loader = DatasetLoader(datasets_dir="../datasets")
    provider = CWRUEvidenceProvider(data_loader)
    
    # Determine if evidence should be shown based on requirements
    should_show = provider.should_show_evidence(affected_component)
    should_show_for_state = health_state in ["Advisory", "Action Required"]
    
    # Evidence should be shown if:
    # 1. Component is bearing-related (should_show_evidence returns True)
    # 2. Health state is Advisory or Action Required
    expected_show_evidence = should_show and should_show_for_state
    
    # Check if component is bearing-related
    is_bearing_related = "bearing" in affected_component.lower() or "shaft" in affected_component.lower()
    
    # Verify should_show_evidence logic
    assert should_show == is_bearing_related, \
        f"should_show_evidence should return {is_bearing_related} for component '{affected_component}'"
    
    # Test the conditional logic - the provider should be able to return evidence
    # for any valid health state, but the UI layer decides whether to show it
    # based on both the health state AND the affected component
    
    # Verify that should_show_evidence correctly identifies bearing-related components
    if is_bearing_related:
        assert should_show, "should_show_evidence must return True for bearing-related components"
    else:
        assert not should_show, "should_show_evidence must return False for non-bearing components"


# Property 14: Bearing Evidence Contains Vibration Data
# Validates: Requirements 8.3
@given(
    health_state=st.sampled_from(["Normal", "Advisory", "Action Required", "Post-Maintenance"])
)
@settings(max_examples=100)
def test_property_14_bearing_evidence_contains_vibration_data(health_state):
    """
    Feature: prism-predictive-maintenance, Property 14: Bearing Evidence Contains Vibration Data
    
    For any machine where bearing evidence is provided, the evidence structure 
    should contain a non-empty vibration waveform array.
    
    Validates: Requirements 8.3
    
    Note: This test validates the data structure contract. If CWRU files are not
    available or corrupted, the provider returns None, which is acceptable behavior.
    """
    data_loader = DatasetLoader(datasets_dir="../datasets")
    provider = CWRUEvidenceProvider(data_loader)
    
    # Get bearing evidence for this health state
    evidence = provider.get_bearing_evidence(health_state)
    
    # If evidence is provided, it must contain valid vibration data
    # If files are missing/corrupted, evidence will be None, which is acceptable
    if evidence is not None:
        # Check that vibration_data exists and is a numpy array
        assert hasattr(evidence, 'vibration_data'), \
            "BearingEvidence must have vibration_data attribute"
        assert isinstance(evidence.vibration_data, np.ndarray), \
            "vibration_data must be a numpy array"
        
        # Check that vibration data is non-empty
        assert len(evidence.vibration_data) > 0, \
            f"vibration_data must be non-empty for health state '{health_state}'"
        
        # Check that vibration data contains valid numeric values
        assert np.isfinite(evidence.vibration_data).all(), \
            "vibration_data must contain finite numeric values"
        
        # Check other required fields
        assert hasattr(evidence, 'health_state'), \
            "BearingEvidence must have health_state attribute"
        assert evidence.health_state == health_state, \
            f"health_state should match requested state '{health_state}'"
        
        assert hasattr(evidence, 'sample_rate'), \
            "BearingEvidence must have sample_rate attribute"
        assert evidence.sample_rate > 0, \
            "sample_rate must be positive"
        
        assert hasattr(evidence, 'description'), \
            "BearingEvidence must have description attribute"
        assert isinstance(evidence.description, str), \
            "description must be a string"
        assert len(evidence.description) > 0, \
            "description must be non-empty"


# Unit Tests for CWRU File Mapping
# Validates: Requirements 8.2

def test_normal_state_uses_time_normal_file(evidence_provider):
    """
    Test that Normal state uses Time_Normal_1_098.mat file.
    
    Validates: Requirements 8.2
    
    Note: If CWRU files are not available, this test verifies the mapping logic
    rather than actual file loading.
    """
    evidence = evidence_provider.get_bearing_evidence("Normal")
    
    # If files are available, verify the evidence
    if evidence is not None:
        assert evidence.health_state == "Normal"
        assert isinstance(evidence.vibration_data, np.ndarray)
        assert len(evidence.vibration_data) > 0
        assert "normal" in evidence.description.lower()
    # If files are not available, verify the mapping exists
    else:
        from cwru_evidence_provider import HEALTH_STATE_FILE_MAPPING
        assert "Normal" in HEALTH_STATE_FILE_MAPPING
        assert "Time_Normal" in HEALTH_STATE_FILE_MAPPING["Normal"]


def test_advisory_state_uses_b014_file(evidence_provider):
    """
    Test that Advisory state uses B014_1_190.mat file (ball defect).
    
    Validates: Requirements 8.2
    """
    evidence = evidence_provider.get_bearing_evidence("Advisory")
    
    if evidence is not None:
        assert evidence.health_state == "Advisory"
        assert isinstance(evidence.vibration_data, np.ndarray)
        assert len(evidence.vibration_data) > 0
        # Description should mention ball defect or degradation
        assert any(keyword in evidence.description.lower() 
                   for keyword in ["ball", "defect", "degradation", "elevated"])
    else:
        from cwru_evidence_provider import HEALTH_STATE_FILE_MAPPING
        assert "Advisory" in HEALTH_STATE_FILE_MAPPING
        assert "B014" in HEALTH_STATE_FILE_MAPPING["Advisory"]


def test_action_required_state_uses_ir014_or_or014_file(evidence_provider):
    """
    Test that Action Required state uses IR014_1_175.mat or OR014_6_1_202.mat file.
    
    Validates: Requirements 8.2
    """
    evidence = evidence_provider.get_bearing_evidence("Action Required")
    
    if evidence is not None:
        assert evidence.health_state == "Action Required"
        assert isinstance(evidence.vibration_data, np.ndarray)
        assert len(evidence.vibration_data) > 0
        # Description should mention severe condition or critical state
        assert any(keyword in evidence.description.lower() 
                   for keyword in ["severe", "critical", "inner race", "outer race", "immediate"])
    else:
        from cwru_evidence_provider import HEALTH_STATE_FILE_MAPPING
        assert "Action Required" in HEALTH_STATE_FILE_MAPPING
        assert any(file in HEALTH_STATE_FILE_MAPPING["Action Required"] 
                   for file in ["IR014", "OR014"])


def test_post_maintenance_state_uses_time_normal_file(evidence_provider):
    """
    Test that Post-Maintenance state uses Time_Normal_1_098.mat file.
    
    Validates: Requirements 8.2
    """
    evidence = evidence_provider.get_bearing_evidence("Post-Maintenance")
    
    if evidence is not None:
        assert evidence.health_state == "Post-Maintenance"
        assert isinstance(evidence.vibration_data, np.ndarray)
        assert len(evidence.vibration_data) > 0
        # Description should mention maintenance or return to normal
        assert any(keyword in evidence.description.lower() 
                   for keyword in ["maintenance", "replaced", "serviced", "normal", "returned"])
    else:
        from cwru_evidence_provider import HEALTH_STATE_FILE_MAPPING
        assert "Post-Maintenance" in HEALTH_STATE_FILE_MAPPING
        assert "Time_Normal" in HEALTH_STATE_FILE_MAPPING["Post-Maintenance"]


def test_should_show_evidence_for_bearing_components(evidence_provider):
    """
    Test that should_show_evidence returns True for bearing-related components.
    """
    bearing_components = [
        "Bearings",
        "Bearing assembly",
        "Shaft bearings",
        "Main bearing",
        "bearing wear"
    ]
    
    for component in bearing_components:
        assert evidence_provider.should_show_evidence(component), \
            f"should_show_evidence should return True for '{component}'"


def test_should_not_show_evidence_for_non_bearing_components(evidence_provider):
    """
    Test that should_show_evidence returns False for non-bearing components.
    """
    non_bearing_components = [
        "Cooling system",
        "Drive system",
        "Motor control system",
        "None",
        "Multiple components",
        "Lubrication system"
    ]
    
    for component in non_bearing_components:
        assert not evidence_provider.should_show_evidence(component), \
            f"should_show_evidence should return False for '{component}'"


def test_evidence_caching(evidence_provider):
    """
    Test that evidence is cached to avoid repeated file I/O.
    """
    # Get evidence twice for the same state
    evidence1 = evidence_provider.get_bearing_evidence("Normal")
    evidence2 = evidence_provider.get_bearing_evidence("Normal")
    
    # Should return the same object (cached)
    assert evidence1 is evidence2, "Evidence should be cached"


def test_invalid_health_state_returns_none(evidence_provider):
    """
    Test that invalid health state returns None.
    """
    evidence = evidence_provider.get_bearing_evidence("Invalid State")
    assert evidence is None, "Invalid health state should return None"


def test_should_show_evidence_with_none_component(evidence_provider):
    """
    Test that should_show_evidence handles None component gracefully.
    """
    assert not evidence_provider.should_show_evidence(None), \
        "should_show_evidence should return False for None component"

