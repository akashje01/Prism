"""
Test CPU-only environment operation for PRISM system.

This test verifies that:
1. All ML models work correctly without GPU
2. Performance is acceptable on CPU
3. No GPU dependencies are present
4. System operates correctly in CPU-only environment

Validates: Requirements 15.5
"""

import pytest
import time
import sys
import numpy as np
import pandas as pd
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from dataset_loader import DatasetLoader
from slice_manager import SliceManager
from health_classifier import HealthClassifier
from simulation_engine import SimulationEngine
from explanation_engine import ExplanationEngine
from cwru_evidence_provider import CWRUEvidenceProvider


class TestCPUOnlyOperation:
    """Test suite for CPU-only environment operation."""
    
    @pytest.fixture(scope="class")
    def setup_system(self):
        """Set up the complete system for testing."""
        # Load datasets
        loader = DatasetLoader("datasets")
        ai4i_data = loader.load_ai4i_dataset("ai4i2020.csv")
        
        # Initialize components
        slice_manager = SliceManager(ai4i_data)
        sim_engine = SimulationEngine(slice_manager)
        cwru_provider = CWRUEvidenceProvider(loader)
        
        return {
            "sim_engine": sim_engine,
            "slice_manager": slice_manager,
            "health_classifier": sim_engine.health_classifier,
            "explanation_engine": sim_engine.explanation_engine,
            "cwru_provider": cwru_provider
        }
    
    def test_no_gpu_dependencies(self):
        """Verify no GPU-related dependencies are imported."""
        # Check that GPU libraries are not imported
        gpu_modules = ['torch', 'tensorflow', 'cupy', 'cuda']
        
        for module_name in gpu_modules:
            assert module_name not in sys.modules, f"GPU module {module_name} should not be imported"
        
        print("✓ No GPU dependencies detected")
    
    def test_sklearn_cpu_only(self):
        """Verify sklearn models use CPU only."""
        from sklearn.ensemble import IsolationForest
        from sklearn.linear_model import LinearRegression
        
        # Create test models
        iso_forest = IsolationForest(random_state=42, n_estimators=10)
        lin_reg = LinearRegression()
        
        # Test data
        X_train = np.random.randn(100, 5)
        y_train = np.random.randn(100)
        X_test = np.random.randn(10, 5)
        
        # Fit and predict (should work on CPU)
        iso_forest.fit(X_train)
        predictions = iso_forest.predict(X_test)
        assert len(predictions) == 10
        
        lin_reg.fit(X_train, y_train)
        predictions = lin_reg.predict(X_test)
        assert len(predictions) == 10
        
        print("✓ Sklearn models work correctly on CPU")
    
    def test_isolation_forest_performance(self, setup_system):
        """Test IsolationForest performance on CPU."""
        health_classifier = setup_system["health_classifier"]
        
        # Create test sensor readings
        test_readings = {
            "temperature": 305.0,
            "vibration": 45.0,
            "torque": 40.0,
            "rotational_speed": 1500,
            "tool_wear": 100
        }
        
        # Create test history
        history_data = []
        for i in range(50):
            history_data.append({
                "temperature": 300 + i * 0.1,
                "vibration": 40 + i * 0.2,
                "torque": 35 + i * 0.1,
                "rotational_speed": 1500,
                "tool_wear": 100 + i
            })
        history_df = pd.DataFrame(history_data)
        
        # Measure classification time
        start_time = time.time()
        classification = health_classifier.classify(test_readings, history_df)
        elapsed_time = time.time() - start_time
        
        # Verify classification works
        assert classification.health_state in ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
        
        # Verify performance is acceptable (should be < 1 second)
        assert elapsed_time < 1.0, f"Classification took {elapsed_time:.3f}s, expected < 1.0s"
        
        print(f"✓ IsolationForest classification completed in {elapsed_time:.3f}s")
    
    def test_linear_regression_performance(self, setup_system):
        """Test LinearRegression performance on CPU."""
        health_classifier = setup_system["health_classifier"]
        
        # Create test history with clear trend
        history_data = []
        for i in range(50):
            history_data.append({
                "temperature": 300 + i * 0.5,  # Rising trend
                "vibration": 40 + i * 0.3,     # Rising trend
                "torque": 35 + i * 0.2,        # Rising trend
                "rotational_speed": 1500,
                "tool_wear": 100 + i
            })
        history_df = pd.DataFrame(history_data)
        
        # Measure trend calculation time
        start_time = time.time()
        trends = health_classifier.calculate_trends(history_df)
        elapsed_time = time.time() - start_time
        
        # Verify trends are calculated
        assert "temperature" in trends
        assert "vibration" in trends
        assert "torque" in trends
        
        # Verify performance is acceptable (should be < 0.5 seconds)
        assert elapsed_time < 0.5, f"Trend calculation took {elapsed_time:.3f}s, expected < 0.5s"
        
        print(f"✓ LinearRegression trend calculation completed in {elapsed_time:.3f}s")
    
    def test_full_simulation_cycle_performance(self, setup_system):
        """Test full simulation cycle performance on CPU."""
        sim_engine = setup_system["sim_engine"]
        
        machine_id = "CNC-MILL-01"
        
        # Measure time for scenario selection
        start_time = time.time()
        sim_engine.set_scenario(machine_id, "Advisory")
        scenario_time = time.time() - start_time
        
        # Measure time for getting current state
        start_time = time.time()
        state = sim_engine.get_current_state(machine_id)
        state_time = time.time() - start_time
        
        # Measure time for advancing cursor
        start_time = time.time()
        sim_engine.advance_cursor(machine_id, steps=5)
        advance_time = time.time() - start_time
        
        # Verify operations completed
        assert state.machine_id == machine_id
        assert state.health_state in ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
        
        # Verify performance is acceptable
        assert scenario_time < 0.5, f"Scenario selection took {scenario_time:.3f}s, expected < 0.5s"
        assert state_time < 1.0, f"Get state took {state_time:.3f}s, expected < 1.0s"
        assert advance_time < 0.5, f"Advance cursor took {advance_time:.3f}s, expected < 0.5s"
        
        print(f"✓ Full simulation cycle performance:")
        print(f"  - Scenario selection: {scenario_time:.3f}s")
        print(f"  - Get state: {state_time:.3f}s")
        print(f"  - Advance cursor: {advance_time:.3f}s")
    
    def test_all_machines_all_scenarios(self, setup_system):
        """Test all machines with all scenarios on CPU."""
        sim_engine = setup_system["sim_engine"]
        
        machines = ["CNC-MILL-01", "COOL-PUMP-02", "CONV-MOTOR-01", "AIR-COMP-01"]
        scenarios = ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
        
        total_start = time.time()
        
        for machine_id in machines:
            for scenario in scenarios:
                # Set scenario
                sim_engine.set_scenario(machine_id, scenario)
                
                # Get state
                state = sim_engine.get_current_state(machine_id)
                
                # Verify state is valid
                assert state.machine_id == machine_id
                assert state.health_state in scenarios
                assert state.sensor_readings is not None
                assert state.one_line_summary is not None
        
        total_time = time.time() - total_start
        
        # Verify total time is acceptable (16 operations should be < 20 seconds)
        assert total_time < 20.0, f"All operations took {total_time:.3f}s, expected < 20.0s"
        
        print(f"✓ All machines/scenarios tested in {total_time:.3f}s")
        print(f"  - Average per operation: {total_time/16:.3f}s")
    
    def test_cwru_data_loading_performance(self, setup_system):
        """Test CWRU bearing data loading performance on CPU."""
        cwru_provider = setup_system["cwru_provider"]
        
        # Test loading different bearing conditions
        conditions = ["Normal", "Advisory", "Action Required"]
        
        for condition in conditions:
            start_time = time.time()
            evidence = cwru_provider.get_bearing_evidence(condition)
            elapsed_time = time.time() - start_time
            
            if evidence:
                # Verify data is loaded
                assert evidence.vibration_data is not None
                assert len(evidence.vibration_data) > 0
                
                # Verify performance is acceptable (should be < 2 seconds)
                assert elapsed_time < 2.0, f"CWRU loading took {elapsed_time:.3f}s, expected < 2.0s"
                
                print(f"✓ CWRU {condition} data loaded in {elapsed_time:.3f}s")
    
    def test_memory_usage_cpu_only(self, setup_system):
        """Test that memory usage is reasonable on CPU."""
        try:
            import psutil
        except ImportError:
            pytest.skip("psutil not installed - skipping memory test")
        
        import os
        
        process = psutil.Process(os.getpid())
        
        # Get initial memory
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform multiple operations
        sim_engine = setup_system["sim_engine"]
        
        for _ in range(10):
            for machine_id in ["CNC-MILL-01", "COOL-PUMP-02", "CONV-MOTOR-01", "AIR-COMP-01"]:
                sim_engine.set_scenario(machine_id, "Advisory")
                state = sim_engine.get_current_state(machine_id)
                sim_engine.advance_cursor(machine_id, steps=5)
        
        # Get final memory
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Verify memory increase is reasonable (should be < 100 MB)
        assert memory_increase < 100, f"Memory increased by {memory_increase:.1f}MB, expected < 100MB"
        
        print(f"✓ Memory usage: {initial_memory:.1f}MB → {final_memory:.1f}MB (Δ{memory_increase:.1f}MB)")
    
    def test_deterministic_cpu_behavior(self, setup_system):
        """Test that CPU-only execution is deterministic."""
        sim_engine = setup_system["sim_engine"]
        
        machine_id = "CNC-MILL-01"
        
        # Set scenario and get state multiple times
        results = []
        for _ in range(3):
            sim_engine.set_scenario(machine_id, "Advisory")
            state = sim_engine.get_current_state(machine_id)
            results.append({
                "health_state": state.health_state,
                "sensor_readings": state.sensor_readings.copy(),
                "one_line_summary": state.one_line_summary,
                "cursor_position": state.cursor_position
            })
        
        # Verify all results are identical
        for i in range(1, len(results)):
            assert results[i]["health_state"] == results[0]["health_state"]
            assert results[i]["sensor_readings"] == results[0]["sensor_readings"]
            assert results[i]["one_line_summary"] == results[0]["one_line_summary"]
            assert results[i]["cursor_position"] == results[0]["cursor_position"]
        
        print("✓ CPU-only execution is deterministic")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])
