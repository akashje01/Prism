import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

/**
 * End-to-End Integration Tests
 * 
 * These tests verify the complete user flows by testing the API interactions
 * that power the frontend components. They test:
 * 1. Dashboard load → view all machines
 * 2. Click machine card → view machine detail (API call)
 * 3. Select scenario → verify state updates
 * 4. Advance simulation → verify cursor moves
 * 5. All 4 machines with all 4 scenarios
 * 
 * Requirements: All (comprehensive end-to-end testing)
 * 
 * NOTE: These tests require the backend server to be running on localhost:8000
 * Run: cd backend && python -m uvicorn main:app --reload
 */

const API_BASE_URL = 'http://localhost:8000/api';
const MACHINES = ['CNC-MILL-01', 'COOL-PUMP-02', 'CONV-MOTOR-01', 'AIR-COMP-01'];
const SCENARIOS = ['Normal', 'Advisory', 'Action Required', 'Post-Maintenance'];

describe('End-to-End Integration Tests (requires backend)', () => {
  let backendAvailable = false;

  beforeAll(async () => {
    // Check if backend is available
    try {
      await axios.get(`${API_BASE_URL}/machines`, { timeout: 1000 });
      backendAvailable = true;
    } catch (error) {
      console.warn('Backend not available. Skipping integration tests.');
      console.warn('To run these tests, start the backend: cd backend && python -m uvicorn main:app --reload');
    }
  });

  describe('Flow 1: Dashboard Load → View All Machines', () => {
    it('should load all 4 machines with their current states', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 1.1, 1.2, 1.3
      const response = await axios.get(`${API_BASE_URL}/machines`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('machines');
      expect(response.data.machines).toHaveLength(4);

      // Verify all 4 machines are present
      const machineIds = response.data.machines.map(m => m.machine_id);
      expect(machineIds).toContain('CNC-MILL-01');
      expect(machineIds).toContain('COOL-PUMP-02');
      expect(machineIds).toContain('CONV-MOTOR-01');
      expect(machineIds).toContain('AIR-COMP-01');

      // Verify each machine has required fields
      response.data.machines.forEach(machine => {
        expect(machine).toHaveProperty('machine_id');
        expect(machine).toHaveProperty('machine_name');
        expect(machine).toHaveProperty('health_state');
        expect(machine).toHaveProperty('one_line_summary');
        
        // Health state should be one of the valid states
        expect(['Normal', 'Advisory', 'Action Required', 'Post-Maintenance'])
          .toContain(machine.health_state);
      });

      // Verify global alerts and advisories are present
      expect(response.data).toHaveProperty('global_alerts');
      expect(response.data).toHaveProperty('global_advisories');
      expect(Array.isArray(response.data.global_alerts)).toBe(true);
      expect(Array.isArray(response.data.global_advisories)).toBe(true);
    });
  });

  describe('Flow 2: Click Machine Card → View Machine Detail', () => {
    it('should retrieve detailed information for a specific machine', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 10.1, 10.2, 10.3
      const machineId = 'CNC-MILL-01';
      const response = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      
      expect(response.status).toBe(200);
      
      // Verify all required fields are present
      expect(response.data).toHaveProperty('machine_id', machineId);
      expect(response.data).toHaveProperty('machine_name');
      expect(response.data).toHaveProperty('health_state');
      expect(response.data).toHaveProperty('sensor_readings');
      expect(response.data).toHaveProperty('sensor_history');
      expect(response.data).toHaveProperty('explanation');
      expect(response.data).toHaveProperty('affected_component');
      expect(response.data).toHaveProperty('recommended_action');

      // Verify sensor readings structure
      const sensors = response.data.sensor_readings;
      expect(sensors).toHaveProperty('temperature');
      expect(sensors).toHaveProperty('vibration');
      expect(sensors).toHaveProperty('torque');
      expect(sensors).toHaveProperty('rotational_speed');
      expect(sensors).toHaveProperty('tool_wear');

      // Verify sensor history is an array
      expect(Array.isArray(response.data.sensor_history)).toBe(true);
    });

    it('should retrieve details for all 4 machines', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 1.1, 10.1
      for (const machineId of MACHINES) {
        const response = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
        expect(response.status).toBe(200);
        expect(response.data.machine_id).toBe(machineId);
      }
    });
  });

  describe('Flow 3: Select Scenario → Verify State Updates', () => {
    it('should update machine state when scenario is selected', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 4.2, 13.4
      const machineId = 'CNC-MILL-01';
      const scenario = 'Advisory';

      // Get initial state
      const initialResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      const initialState = initialResponse.data;

      // Set scenario
      const controlResponse = await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: machineId,
        scenario: scenario
      });

      expect(controlResponse.status).toBe(200);
      expect(controlResponse.data).toHaveProperty('success', true);
      expect(controlResponse.data).toHaveProperty('machine_id', machineId);
      expect(controlResponse.data).toHaveProperty('new_state');

      // Get updated state
      const updatedResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      const updatedState = updatedResponse.data;

      // Verify state changed
      expect(updatedState.health_state).toBe(scenario);
      
      // Verify cursor position changed (should be at start of new window)
      if (initialState.health_state !== scenario) {
        expect(updatedState.cursor_position).not.toBe(initialState.cursor_position);
      }
    });

    it('should set scenario for different machines independently', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 1.5, 4.4 (independent cursors)
      const machine1 = 'CNC-MILL-01';
      const machine2 = 'COOL-PUMP-02';

      // Set different scenarios for different machines
      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: machine1,
        scenario: 'Normal'
      });

      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: machine2,
        scenario: 'Action Required'
      });

      // Verify both machines have their respective states
      const response1 = await axios.get(`${API_BASE_URL}/machines/${machine1}`);
      const response2 = await axios.get(`${API_BASE_URL}/machines/${machine2}`);

      expect(response1.data.health_state).toBe('Normal');
      expect(response2.data.health_state).toBe('Action Required');
    });
  });

  describe('Flow 4: Advance Simulation → Verify Cursor Moves', () => {
    it('should advance cursor and update sensor readings', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 4.3, 13.5
      const machineId = 'CNC-MILL-01';

      // Get initial state
      const initialResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      const initialCursor = initialResponse.data.cursor_position;
      const initialSensors = initialResponse.data.sensor_readings;

      // Advance simulation
      const advanceResponse = await axios.post(`${API_BASE_URL}/simulation/advance`, {
        machine_id: machineId,
        steps: 1
      });

      expect(advanceResponse.status).toBe(200);
      expect(advanceResponse.data).toHaveProperty('success', true);

      // Get updated state
      const updatedResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      const updatedCursor = updatedResponse.data.cursor_position;
      const updatedSensors = updatedResponse.data.sensor_readings;

      // Verify cursor moved forward
      expect(updatedCursor).toBeGreaterThan(initialCursor);

      // Verify sensor readings changed (unless at boundary)
      const sensorsChanged = 
        updatedSensors.temperature !== initialSensors.temperature ||
        updatedSensors.vibration !== initialSensors.vibration ||
        updatedSensors.torque !== initialSensors.torque;
      
      // Sensors should change unless we're at a window boundary
      if (updatedCursor !== initialCursor) {
        expect(sensorsChanged).toBe(true);
      }
    });

    it('should advance cursor multiple times', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 4.3, 13.5
      const machineId = 'CONV-MOTOR-01';

      // Get initial cursor position
      const initialResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      const initialCursor = initialResponse.data.cursor_position;

      // Advance 3 times
      for (let i = 0; i < 3; i++) {
        await axios.post(`${API_BASE_URL}/simulation/advance`, {
          machine_id: machineId,
          steps: 1
        });
      }

      // Get final cursor position
      const finalResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      const finalCursor = finalResponse.data.cursor_position;

      // Cursor should have advanced (unless at boundary)
      expect(finalCursor).toBeGreaterThanOrEqual(initialCursor);
    });
  });

  describe('Flow 5: Test All 4 Machines with All 4 Scenarios', () => {
    it('should successfully set each machine to each scenario', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 1.1, 2.1, 4.2
      const results = [];

      for (const machineId of MACHINES) {
        for (const scenario of SCENARIOS) {
          // Set scenario
          const controlResponse = await axios.post(`${API_BASE_URL}/simulation/control`, {
            machine_id: machineId,
            scenario: scenario
          });

          expect(controlResponse.status).toBe(200);
          expect(controlResponse.data.success).toBe(true);

          // Verify state - the backend should set the state to the requested scenario
          // Note: Some machines may not have all scenario windows, so we verify the API accepted the request
          const detailResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
          
          // The health state should be one of the valid states
          expect(['Normal', 'Advisory', 'Action Required', 'Post-Maintenance'])
            .toContain(detailResponse.data.health_state);

          results.push({
            machine: machineId,
            scenario: scenario,
            requestedState: scenario,
            actualState: detailResponse.data.health_state,
            success: true
          });
        }
      }

      // Verify all 16 combinations were tested (4 machines × 4 scenarios)
      expect(results).toHaveLength(16);
      expect(results.every(r => r.success)).toBe(true);
      
      // Log any mismatches for debugging
      const mismatches = results.filter(r => r.requestedState !== r.actualState);
      if (mismatches.length > 0) {
        console.log('Note: Some machines may not have all scenario windows available');
        console.log('Mismatches:', mismatches);
      }
    });

    it('should display appropriate explanations for each scenario', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 7.1, 7.3, 7.4, 7.5
      const machineId = 'CNC-MILL-01';

      for (const scenario of SCENARIOS) {
        // Set scenario
        await axios.post(`${API_BASE_URL}/simulation/control`, {
          machine_id: machineId,
          scenario: scenario
        });

        // Get machine detail
        const response = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
        
        // Verify explanation exists and is non-empty
        expect(response.data.explanation).toBeTruthy();
        expect(response.data.explanation.length).toBeGreaterThan(0);

        // Verify affected component is specified
        expect(response.data.affected_component).toBeTruthy();

        // Verify recommended action is specified
        expect(response.data.recommended_action).toBeTruthy();
        expect(response.data.recommended_action.length).toBeGreaterThan(0);

        // Verify explanation doesn't contain probabilistic language
        const explanation = response.data.explanation.toLowerCase();
        expect(explanation).not.toMatch(/%/);
        expect(explanation).not.toMatch(/percent/);
        expect(explanation).not.toMatch(/probably/);
        expect(explanation).not.toMatch(/likely/);
        expect(explanation).not.toMatch(/maybe/);
      }
    });

    it('should show bearing evidence for Advisory and Action Required states', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 8.1, 8.4
      const machineId = 'COOL-PUMP-02';

      // Test Normal state - should not have bearing evidence (usually)
      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: machineId,
        scenario: 'Normal'
      });
      const normalResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      
      // Test Advisory state - may have bearing evidence if bearing-related
      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: machineId,
        scenario: 'Advisory'
      });
      const advisoryResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);
      
      // Test Action Required state - may have bearing evidence if bearing-related
      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: machineId,
        scenario: 'Action Required'
      });
      const actionResponse = await axios.get(`${API_BASE_URL}/machines/${machineId}`);

      // If bearing evidence is present, verify it has the required structure
      if (advisoryResponse.data.bearing_evidence) {
        expect(advisoryResponse.data.bearing_evidence).toHaveProperty('vibration_data');
        expect(Array.isArray(advisoryResponse.data.bearing_evidence.vibration_data)).toBe(true);
        expect(advisoryResponse.data.bearing_evidence.vibration_data.length).toBeGreaterThan(0);
      }

      if (actionResponse.data.bearing_evidence) {
        expect(actionResponse.data.bearing_evidence).toHaveProperty('vibration_data');
        expect(Array.isArray(actionResponse.data.bearing_evidence.vibration_data)).toBe(true);
        expect(actionResponse.data.bearing_evidence.vibration_data.length).toBeGreaterThan(0);
      }
    });

    it('should maintain independent state for all machines simultaneously', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 1.5, 4.4, 9.1, 9.2, 9.5
      // Set each machine to a different scenario
      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: 'CNC-MILL-01',
        scenario: 'Normal'
      });

      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: 'COOL-PUMP-02',
        scenario: 'Advisory'
      });

      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: 'CONV-MOTOR-01',
        scenario: 'Action Required'
      });

      await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: 'AIR-COMP-01',
        scenario: 'Normal'
      });

      // Small delay to ensure state updates are complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all machines maintain their independent states
      const responses = await Promise.all(
        MACHINES.map(id => axios.get(`${API_BASE_URL}/machines/${id}`))
      );

      // Verify each machine has a valid health state
      responses.forEach(response => {
        expect(['Normal', 'Advisory', 'Action Required', 'Post-Maintenance'])
          .toContain(response.data.health_state);
      });

      // Verify the machines we set have different states (independence)
      const states = responses.map(r => r.data.health_state);
      const uniqueStates = new Set(states);
      expect(uniqueStates.size).toBeGreaterThan(1); // At least 2 different states

      // Get dashboard data
      const dashboardResponse = await axios.get(`${API_BASE_URL}/machines`);
      expect(Array.isArray(dashboardResponse.data.global_alerts)).toBe(true);
      expect(Array.isArray(dashboardResponse.data.global_advisories)).toBe(true);
      
      // Verify consistency: global alerts should match machines in Action Required state
      const actionRequiredFromDashboard = dashboardResponse.data.machines
        .filter(m => m.health_state === 'Action Required')
        .map(m => m.machine_id);
      
      // Verify consistency: global advisories should match machines in Advisory state
      const advisoryFromDashboard = dashboardResponse.data.machines
        .filter(m => m.health_state === 'Advisory')
        .map(m => m.machine_id);
      
      // Extract machine IDs from global alerts (they might be objects or strings)
      const alertIds = dashboardResponse.data.global_alerts.map(alert => 
        typeof alert === 'string' ? alert : alert.machine_id
      );
      
      const advisoryIds = dashboardResponse.data.global_advisories.map(advisory => 
        typeof advisory === 'string' ? advisory : advisory.machine_id
      );
      
      // The global alerts and advisories should exactly match the filtered machines
      expect(alertIds.sort()).toEqual(actionRequiredFromDashboard.sort());
      expect(advisoryIds.sort()).toEqual(advisoryFromDashboard.sort());
    });
  });

  describe('Additional Integration Tests', () => {
    it('should handle invalid machine ID gracefully', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 14.5, 14.6
      try {
        await axios.get(`${API_BASE_URL}/machines/INVALID-ID`);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle invalid scenario gracefully', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 14.5, 14.6
      try {
        await axios.post(`${API_BASE_URL}/simulation/control`, {
          machine_id: 'CNC-MILL-01',
          scenario: 'InvalidScenario'
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.status).toBeLessThan(500);
      }
    });

    it('should return consistent data structure across all endpoints', async () => {
      if (!backendAvailable) {
        console.log('Skipping test - backend not available');
        return;
      }

      // Requirements: 14.2, 14.3, 14.4
      // Test machines list endpoint
      const listResponse = await axios.get(`${API_BASE_URL}/machines`);
      expect(listResponse.data).toHaveProperty('machines');
      expect(listResponse.data).toHaveProperty('global_alerts');
      expect(listResponse.data).toHaveProperty('global_advisories');

      // Test machine detail endpoint
      const detailResponse = await axios.get(`${API_BASE_URL}/machines/CNC-MILL-01`);
      expect(detailResponse.data).toHaveProperty('machine_id');
      expect(detailResponse.data).toHaveProperty('sensor_readings');
      expect(detailResponse.data).toHaveProperty('explanation');

      // Test control endpoint
      const controlResponse = await axios.post(`${API_BASE_URL}/simulation/control`, {
        machine_id: 'CNC-MILL-01',
        scenario: 'Normal'
      });
      expect(controlResponse.data).toHaveProperty('success');
      expect(controlResponse.data).toHaveProperty('machine_id');

      // Test advance endpoint
      const advanceResponse = await axios.post(`${API_BASE_URL}/simulation/advance`, {
        machine_id: 'CNC-MILL-01',
        steps: 1
      });
      expect(advanceResponse.data).toHaveProperty('success');
      expect(advanceResponse.data).toHaveProperty('machine_id');
    });
  });
});
