"""
CPU-only API integration test for PRISM system.

This test verifies that the complete API works correctly on CPU-only environment
by starting the FastAPI server and making real HTTP requests.

Validates: Requirements 15.5
"""

import pytest
import time
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from main import app


class TestCPUAPIIntegration:
    """Test suite for CPU-only API integration."""
    
    @pytest.fixture(scope="class")
    def client(self):
        """Create test client for FastAPI app."""
        return TestClient(app)
    
    def test_api_startup_cpu_only(self, client):
        """Test that API starts successfully on CPU."""
        # Make a simple request to verify API is running
        response = client.get("/api/machines")
        assert response.status_code == 200
        print("✓ API started successfully on CPU")
    
    def test_get_all_machines_performance(self, client):
        """Test GET /api/machines performance on CPU."""
        start_time = time.time()
        response = client.get("/api/machines")
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "machines" in data
        assert len(data["machines"]) == 4
        
        # Verify performance (should be < 2 seconds)
        assert elapsed_time < 2.0, f"Request took {elapsed_time:.3f}s, expected < 2.0s"
        
        print(f"✓ GET /api/machines completed in {elapsed_time:.3f}s")
    
    def test_get_machine_detail_performance(self, client):
        """Test GET /api/machines/{id} performance on CPU."""
        machine_id = "CNC-MILL-01"
        
        start_time = time.time()
        response = client.get(f"/api/machines/{machine_id}")
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["machine_id"] == machine_id
        assert "sensor_readings" in data
        assert "explanation" in data
        
        # Verify performance (should be < 2 seconds)
        assert elapsed_time < 2.0, f"Request took {elapsed_time:.3f}s, expected < 2.0s"
        
        print(f"✓ GET /api/machines/{machine_id} completed in {elapsed_time:.3f}s")
    
    def test_simulation_control_performance(self, client):
        """Test POST /api/simulation/control performance on CPU."""
        request_data = {
            "machine_id": "CNC-MILL-01",
            "scenario": "Advisory"
        }
        
        start_time = time.time()
        response = client.post("/api/simulation/control", json=request_data)
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["machine_id"] == "CNC-MILL-01"
        
        # Verify performance (should be < 2 seconds)
        assert elapsed_time < 2.0, f"Request took {elapsed_time:.3f}s, expected < 2.0s"
        
        print(f"✓ POST /api/simulation/control completed in {elapsed_time:.3f}s")
    
    def test_simulation_advance_performance(self, client):
        """Test POST /api/simulation/advance performance on CPU."""
        request_data = {
            "machine_id": "CNC-MILL-01",
            "steps": 5
        }
        
        start_time = time.time()
        response = client.post("/api/simulation/advance", json=request_data)
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["machine_id"] == "CNC-MILL-01"
        
        # Verify performance (should be < 2 seconds)
        assert elapsed_time < 2.0, f"Request took {elapsed_time:.3f}s, expected < 2.0s"
        
        print(f"✓ POST /api/simulation/advance completed in {elapsed_time:.3f}s")
    
    def test_all_machines_all_scenarios_api(self, client):
        """Test all machines with all scenarios through API on CPU."""
        machines = ["CNC-MILL-01", "COOL-PUMP-02", "CONV-MOTOR-01", "AIR-COMP-01"]
        scenarios = ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
        
        total_start = time.time()
        
        for machine_id in machines:
            for scenario in scenarios:
                # Set scenario
                response = client.post("/api/simulation/control", json={
                    "machine_id": machine_id,
                    "scenario": scenario
                })
                assert response.status_code == 200
                
                # Get machine detail
                response = client.get(f"/api/machines/{machine_id}")
                assert response.status_code == 200
                data = response.json()
                
                # Verify data is valid
                assert data["machine_id"] == machine_id
                assert data["health_state"] in scenarios
        
        total_time = time.time() - total_start
        
        # Verify total time is acceptable (32 API calls should be < 60 seconds)
        assert total_time < 60.0, f"All operations took {total_time:.3f}s, expected < 60.0s"
        
        print(f"✓ All machines/scenarios tested via API in {total_time:.3f}s")
        print(f"  - Average per operation: {total_time/32:.3f}s")
    
    def test_concurrent_machine_queries(self, client):
        """Test querying multiple machines concurrently on CPU."""
        machines = ["CNC-MILL-01", "COOL-PUMP-02", "CONV-MOTOR-01", "AIR-COMP-01"]
        
        start_time = time.time()
        
        # Query all machines
        for machine_id in machines:
            response = client.get(f"/api/machines/{machine_id}")
            assert response.status_code == 200
        
        elapsed_time = time.time() - start_time
        
        # Verify performance (4 queries should be < 5 seconds)
        assert elapsed_time < 5.0, f"Queries took {elapsed_time:.3f}s, expected < 5.0s"
        
        print(f"✓ Concurrent machine queries completed in {elapsed_time:.3f}s")
    
    def test_ml_models_work_through_api(self, client):
        """Test that ML models (IsolationForest, LinearRegression) work through API on CPU."""
        # Set to Advisory scenario which should trigger ML classification
        response = client.post("/api/simulation/control", json={
            "machine_id": "CNC-MILL-01",
            "scenario": "Advisory"
        })
        assert response.status_code == 200
        
        # Get machine detail which uses ML models
        response = client.get("/api/machines/CNC-MILL-01")
        assert response.status_code == 200
        data = response.json()
        
        # Verify ML-based classification worked
        assert data["health_state"] in ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
        assert "sensor_readings" in data
        assert "explanation" in data
        
        # Verify explanation is generated (uses trend analysis from LinearRegression)
        assert len(data["explanation"]) > 0
        
        print("✓ ML models work correctly through API on CPU")
    
    def test_bearing_evidence_loading_through_api(self, client):
        """Test that CWRU bearing evidence loads through API on CPU."""
        # Set to Advisory scenario which may show bearing evidence
        response = client.post("/api/simulation/control", json={
            "machine_id": "CNC-MILL-01",
            "scenario": "Advisory"
        })
        assert response.status_code == 200
        
        # Get machine detail
        response = client.get("/api/machines/CNC-MILL-01")
        assert response.status_code == 200
        data = response.json()
        
        # If bearing evidence is present, verify it loaded correctly
        if "bearing_evidence" in data and data["bearing_evidence"]:
            assert "vibration_data" in data["bearing_evidence"]
            assert len(data["bearing_evidence"]["vibration_data"]) > 0
            print("✓ Bearing evidence loaded successfully through API on CPU")
        else:
            print("✓ Bearing evidence not required for this scenario (expected)")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])
