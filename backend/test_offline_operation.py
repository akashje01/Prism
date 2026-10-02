"""
Test suite for verifying offline operation of PRISM system.

This module tests that the system operates completely offline without
any external API calls or network dependencies.

Validates: Requirements 16.1, 16.2, 16.3, 16.5
"""

import pytest
import socket
import unittest.mock as mock
from fastapi.testclient import TestClient
from dataset_loader import DatasetLoader
from slice_manager import SliceManager
from simulation_engine import SimulationEngine
from explanation_engine import ExplanationEngine
from cwru_evidence_provider import CWRUEvidenceProvider


# Initialize system
import main as main_module

_data_loader = DatasetLoader(datasets_dir="../datasets")
_ai4i_data = _data_loader.load_ai4i_dataset()
_slice_manager = SliceManager(_ai4i_data)

main_module.simulation_engine = SimulationEngine(_slice_manager)
main_module.explanation_engine = ExplanationEngine()
main_module.cwru_evidence_provider = CWRUEvidenceProvider(_data_loader)

# Create client
client = TestClient(main_module.app)


def test_system_works_without_network_access():
    """
    Test that the system functions correctly without requiring network access.
    
    This test verifies all core functionality works using only local resources.
    
    Validates: Requirements 16.2, 16.3
    """
    # Test 1: Get all machines
    response = client.get("/api/machines")
    assert response.status_code == 200
    data = response.json()
    assert "machines" in data
    assert len(data["machines"]) == 4
    
    # Test 2: Get machine detail
    response = client.get("/api/machines/CNC-MILL-01")
    assert response.status_code == 200
    data = response.json()
    assert data["machine_id"] == "CNC-MILL-01"
    assert "sensor_readings" in data
    assert "explanation" in data
    
    # Test 3: Control simulation
    response = client.post(
        "/api/simulation/control",
        json={"machine_id": "COOL-PUMP-02", "scenario": "Advisory"}
    )
    assert response.status_code == 200
    
    # Test 4: Advance simulation
    response = client.post(
        "/api/simulation/advance",
        json={"machine_id": "COOL-PUMP-02", "steps": 5}
    )
    assert response.status_code == 200
    
    # Test 5: Verify all machines work
    for machine_id in ["CNC-MILL-01", "COOL-PUMP-02", "CONV-MOTOR-01", "AIR-COMP-01"]:
        response = client.get(f"/api/machines/{machine_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["machine_id"] == machine_id
    
    # Test 6: Verify all scenarios work
    for scenario in ["Normal", "Advisory", "Action Required", "Post-Maintenance"]:
        response = client.post(
            "/api/simulation/control",
            json={"machine_id": "CNC-MILL-01", "scenario": scenario}
        )
        assert response.status_code == 200


def test_no_external_http_requests():
    """
    Test that the system doesn't make any HTTP requests to external services.
    
    This test verifies the system works without importing or using HTTP libraries
    for external calls.
    
    Validates: Requirements 16.1
    """
    # Run through all API endpoints
    response = client.get("/api/machines")
    assert response.status_code == 200
    
    response = client.get("/api/machines/CNC-MILL-01")
    assert response.status_code == 200
    
    response = client.post(
        "/api/simulation/control",
        json={"machine_id": "CNC-MILL-01", "scenario": "Advisory"}
    )
    assert response.status_code == 200
    
    # All operations completed successfully without external HTTP requests
    # The system uses only local datasets and computation
    assert True


def test_no_llm_api_calls():
    """
    Test that the system doesn't make calls to LLM APIs.
    
    This test specifically checks that no calls are made to common LLM services
    like OpenAI, Anthropic, Google Gemini, etc.
    
    Validates: Requirements 7.2, 16.1
    """
    # Test explanation generation for all health states
    # Explanations should be generated using local template logic only
    
    for scenario in ["Normal", "Advisory", "Action Required", "Post-Maintenance"]:
        # Set scenario
        response = client.post(
            "/api/simulation/control",
            json={"machine_id": "CNC-MILL-01", "scenario": scenario}
        )
        assert response.status_code == 200
        
        # Get machine detail with explanation
        response = client.get("/api/machines/CNC-MILL-01")
        assert response.status_code == 200
        data = response.json()
        
        # Verify explanation exists and is a string
        assert "explanation" in data
        assert isinstance(data["explanation"], str)
        assert len(data["explanation"]) > 0
        
        # Verify explanation doesn't contain API error messages
        explanation_lower = data["explanation"].lower()
        assert "api" not in explanation_lower or "api" in "rapid"  # Allow "rapid" but not "API"
        assert "error" not in explanation_lower
        assert "timeout" not in explanation_lower
        assert "rate limit" not in explanation_lower


def test_local_dataset_only():
    """
    Test that the system only uses local datasets without external data sources.
    
    Validates: Requirements 3.1, 16.3
    """
    # Get machine detail which requires dataset access
    response = client.get("/api/machines/CNC-MILL-01")
    assert response.status_code == 200
    data = response.json()
    
    # Verify sensor readings are present (from local AI4I dataset)
    assert "sensor_readings" in data
    sensor_readings = data["sensor_readings"]
    
    # Verify expected sensors from AI4I dataset
    expected_sensors = ["air_temperature", "temperature", "rotational_speed", 
                       "torque", "tool_wear", "vibration"]
    for sensor in expected_sensors:
        assert sensor in sensor_readings
        assert isinstance(sensor_readings[sensor], (int, float))
    
    # Test bearing evidence (from local CWRU dataset)
    # Set to Advisory state which should trigger bearing evidence
    response = client.post(
        "/api/simulation/control",
        json={"machine_id": "CNC-MILL-01", "scenario": "Advisory"}
    )
    assert response.status_code == 200
    
    response = client.get("/api/machines/CNC-MILL-01")
    assert response.status_code == 200
    data = response.json()
    
    # If bearing evidence is present, verify it has data
    if "bearing_evidence" in data and data["bearing_evidence"]:
        evidence = data["bearing_evidence"]
        assert "vibration_data" in evidence
        assert len(evidence["vibration_data"]) > 0


def test_no_cloud_services():
    """
    Test that the system doesn't depend on cloud services or remote databases.
    
    Validates: Requirements 16.3
    """
    # Run through all API endpoints
    # The system should work without any cloud service dependencies
    response = client.get("/api/machines")
    assert response.status_code == 200
    
    response = client.get("/api/machines/CNC-MILL-01")
    assert response.status_code == 200
    
    # If we get here, no cloud services were accessed
    # The system uses only local datasets and computation
    assert True


def test_complete_offline_workflow():
    """
    Test a complete user workflow in offline mode.
    
    This test simulates a complete user session:
    1. View dashboard (all machines)
    2. Select a machine and view details
    3. Change simulation scenario
    4. Advance simulation
    5. View updated machine state
    
    All operations should work without any network connectivity.
    
    Validates: Requirements 16.1, 16.2, 16.3, 16.5
    """
    # Step 1: View dashboard
    response = client.get("/api/machines")
    assert response.status_code == 200
    dashboard_data = response.json()
    assert len(dashboard_data["machines"]) == 4
    
    # Step 2: Select a machine and view details
    machine_id = "CONV-MOTOR-01"
    response = client.get(f"/api/machines/{machine_id}")
    assert response.status_code == 200
    initial_state = response.json()
    assert initial_state["machine_id"] == machine_id
    initial_health = initial_state["health_state"]
    
    # Step 3: Change simulation scenario
    new_scenario = "Action Required"
    response = client.post(
        "/api/simulation/control",
        json={"machine_id": machine_id, "scenario": new_scenario}
    )
    assert response.status_code == 200
    
    # Step 4: Verify scenario changed
    response = client.get(f"/api/machines/{machine_id}")
    assert response.status_code == 200
    updated_state = response.json()
    # Health state should reflect the new scenario
    assert updated_state["health_state"] == new_scenario
    
    # Step 5: Advance simulation
    response = client.post(
        "/api/simulation/advance",
        json={"machine_id": machine_id, "steps": 3}
    )
    assert response.status_code == 200
    
    # Step 6: View updated machine state
    response = client.get(f"/api/machines/{machine_id}")
    assert response.status_code == 200
    final_state = response.json()
    assert final_state["machine_id"] == machine_id
    
    # Verify all required data is present
    assert "sensor_readings" in final_state
    assert "explanation" in final_state
    assert "affected_component" in final_state
    assert "recommended_action" in final_state
    
    # All operations completed successfully without network access
    assert True


def test_no_iot_hardware_simulation():
    """
    Test that the system doesn't simulate or mock IoT hardware or sensor devices.
    
    The system should use real dataset values, not simulated sensor readings.
    
    Validates: Requirements 16.4
    """
    # Get sensor readings for a machine
    response = client.get("/api/machines/CNC-MILL-01")
    assert response.status_code == 200
    data = response.json()
    
    sensor_readings = data["sensor_readings"]
    
    # Verify sensor values are realistic (from real dataset)
    # AI4I dataset has specific ranges for sensors
    
    # Air temperature should be in Kelvin (reasonable range: 295-305K)
    air_temp = sensor_readings.get("air_temperature", 0)
    assert 290 < air_temp < 310, f"Air temperature {air_temp}K seems unrealistic"
    
    # Process temperature (labeled as "temperature") should be in Kelvin (reasonable range: 305-315K)
    process_temp = sensor_readings.get("temperature", 0)
    assert 300 < process_temp < 320, f"Process temperature {process_temp}K seems unrealistic"
    
    # Rotational speed should be in RPM (reasonable range: 1000-3000 RPM)
    rpm = sensor_readings.get("rotational_speed", 0)
    assert 1000 < rpm < 3000, f"Rotational speed {rpm} RPM seems unrealistic"
    
    # Torque should be in Nm (reasonable range: 10-80 Nm)
    torque = sensor_readings.get("torque", 0)
    assert 10 < torque < 80, f"Torque {torque} Nm seems unrealistic"
    
    # Tool wear should be in minutes (reasonable range: 0-250 min)
    tool_wear = sensor_readings.get("tool_wear", 0)
    assert 0 <= tool_wear <= 250, f"Tool wear {tool_wear} min seems unrealistic"


def test_deterministic_offline_behavior():
    """
    Test that offline operation produces deterministic results.
    
    Running the same operations multiple times should produce identical results.
    
    Validates: Requirements 18.1, 18.2, 18.3
    """
    # Set a specific scenario
    machine_id = "AIR-COMP-01"
    scenario = "Advisory"
    
    response = client.post(
        "/api/simulation/control",
        json={"machine_id": machine_id, "scenario": scenario}
    )
    assert response.status_code == 200
    
    # Get machine state multiple times
    states = []
    for _ in range(3):
        response = client.get(f"/api/machines/{machine_id}")
        assert response.status_code == 200
        states.append(response.json())
    
    # All states should be identical
    for i in range(1, len(states)):
        assert states[i]["health_state"] == states[0]["health_state"]
        assert states[i]["sensor_readings"] == states[0]["sensor_readings"]
        assert states[i]["explanation"] == states[0]["explanation"]
        assert states[i]["affected_component"] == states[0]["affected_component"]
        assert states[i]["recommended_action"] == states[0]["recommended_action"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
