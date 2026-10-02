import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import SimulationControlPanel from './SimulationControlPanel';

// Mock axios
vi.mock('axios');

describe('SimulationControlPanel Integration Tests', () => {
  const mockOnSimulationChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for fetching current state
    axios.get.mockResolvedValue({
      data: {
        cursor_position: 100,
        health_state: 'Normal',
        current_window: {
          state: 'Normal',
          start_index: 0,
          end_index: 500
        }
      }
    });
  });

  describe('Scenario Selection Updates Machine State', () => {
    it('should update machine state when scenario is selected and set', async () => {
      // Requirements: 13.4
      const user = userEvent.setup();

      // Mock successful scenario change
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          machine_id: 'CNC-MILL-01',
          new_state: {
            cursor_position: 250,
            health_state: 'Advisory',
            current_window: {
              state: 'Advisory',
              start_index: 200,
              end_index: 400
            }
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial state to load
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Select Advisory scenario
      const scenarioSelect = screen.getByLabelText('Select Scenario:');
      await user.selectOptions(scenarioSelect, 'Advisory');

      // Click Set Scenario button
      const setScenarioButton = screen.getByRole('button', { name: /set scenario/i });
      await user.click(setScenarioButton);

      // Verify API was called with correct parameters
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/simulation/control',
          {
            machine_id: 'CNC-MILL-01',
            scenario: 'Advisory'
          }
        );
      });

      // Verify success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Scenario set to "Advisory"/i)).toBeInTheDocument();
      });

      // Verify onSimulationChange callback was called
      expect(mockOnSimulationChange).toHaveBeenCalledTimes(1);

      // Verify state was updated in the UI
      await waitFor(() => {
        expect(screen.getByText('250')).toBeInTheDocument(); // cursor position
      });
    });

    it('should update state for different machines', async () => {
      // Requirements: 13.4
      const user = userEvent.setup();

      // Mock successful scenario change for different machine
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          machine_id: 'COOL-PUMP-02',
          new_state: {
            cursor_position: 150,
            health_state: 'Action Required',
            current_window: {}
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Select different machine
      const machineSelect = screen.getByLabelText('Select Machine:');
      await user.selectOptions(machineSelect, 'COOL-PUMP-02');

      // Wait for state to update for new machine
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          'http://localhost:8000/api/machines/COOL-PUMP-02'
        );
      });

      // Select Action Required scenario
      const scenarioSelect = screen.getByLabelText('Select Scenario:');
      await user.selectOptions(scenarioSelect, 'Action Required');

      // Click Set Scenario button
      const setScenarioButton = screen.getByRole('button', { name: /set scenario/i });
      await user.click(setScenarioButton);

      // Verify API was called with correct machine
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/simulation/control',
          {
            machine_id: 'COOL-PUMP-02',
            scenario: 'Action Required'
          }
        );
      });

      // Verify callback was called
      expect(mockOnSimulationChange).toHaveBeenCalled();
    });

    it('should handle errors when setting scenario', async () => {
      // Requirements: 13.4
      const user = userEvent.setup();

      // Mock error response
      axios.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Invalid scenario'
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Click Set Scenario button
      const setScenarioButton = screen.getByRole('button', { name: /set scenario/i });
      await user.click(setScenarioButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Invalid scenario/i)).toBeInTheDocument();
      });

      // Verify callback was NOT called on error
      expect(mockOnSimulationChange).not.toHaveBeenCalled();
    });
  });

  describe('Advance Button Moves Cursor Forward', () => {
    it('should advance cursor when advance button is clicked', async () => {
      // Requirements: 13.5
      const user = userEvent.setup();

      // Mock successful advance
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          machine_id: 'CNC-MILL-01',
          new_state: {
            cursor_position: 101,
            health_state: 'Normal',
            current_window: {}
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial state to load
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // initial cursor position
      });

      // Click Advance Simulation button
      const advanceButton = screen.getByRole('button', { name: /advance simulation/i });
      await user.click(advanceButton);

      // Verify API was called with correct parameters
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/simulation/advance',
          {
            machine_id: 'CNC-MILL-01',
            steps: 1
          }
        );
      });

      // Verify success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Advanced simulation/i)).toBeInTheDocument();
      });

      // Verify onSimulationChange callback was called
      expect(mockOnSimulationChange).toHaveBeenCalledTimes(1);

      // Verify cursor position was updated
      await waitFor(() => {
        expect(screen.getByText('101')).toBeInTheDocument();
      });
    });

    it('should advance cursor multiple times', async () => {
      // Requirements: 13.5
      const user = userEvent.setup();

      // Mock multiple successful advances
      axios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            machine_id: 'CNC-MILL-01',
            new_state: {
              cursor_position: 101,
              health_state: 'Normal',
              current_window: {}
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            machine_id: 'CNC-MILL-01',
            new_state: {
              cursor_position: 102,
              health_state: 'Normal',
              current_window: {}
            }
          }
        });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial state
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Click advance button first time
      const advanceButton = screen.getByRole('button', { name: /advance simulation/i });
      await user.click(advanceButton);

      // Wait for first advance to complete
      await waitFor(() => {
        expect(screen.getByText('101')).toBeInTheDocument();
      });

      // Click advance button second time
      await user.click(advanceButton);

      // Wait for second advance to complete
      await waitFor(() => {
        expect(screen.getByText('102')).toBeInTheDocument();
      });

      // Verify callback was called twice
      expect(mockOnSimulationChange).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when advancing simulation', async () => {
      // Requirements: 13.5
      const user = userEvent.setup();

      // Mock error response
      axios.post.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Cursor at window boundary'
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Click Advance Simulation button
      const advanceButton = screen.getByRole('button', { name: /advance simulation/i });
      await user.click(advanceButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Cursor at window boundary/i)).toBeInTheDocument();
      });

      // Verify callback was NOT called on error
      expect(mockOnSimulationChange).not.toHaveBeenCalled();
    });
  });

  describe('UI Updates After Simulation Changes', () => {
    it('should display updated health state after scenario change', async () => {
      // Requirements: 13.4, 13.5
      const user = userEvent.setup();

      // Mock scenario change that updates health state
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          machine_id: 'CNC-MILL-01',
          new_state: {
            cursor_position: 300,
            health_state: 'Action Required',
            current_window: {
              state: 'Action Required',
              start_index: 250,
              end_index: 450
            }
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial state
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Select Action Required scenario
      const scenarioSelect = screen.getByLabelText('Select Scenario:');
      await user.selectOptions(scenarioSelect, 'Action Required');

      // Click Set Scenario button
      const setScenarioButton = screen.getByRole('button', { name: /set scenario/i });
      await user.click(setScenarioButton);

      // Verify health state badge is updated
      await waitFor(() => {
        const healthBadges = screen.getAllByText('Action Required');
        expect(healthBadges.length).toBeGreaterThan(0);
      });

      // Verify cursor position is updated
      expect(screen.getByText('300')).toBeInTheDocument();

      // Note: Window information is only displayed if current_window has start_index
      // In this test, the mock doesn't include start_index, so window range won't be shown
    });

    it('should display current state information correctly', async () => {
      // Requirements: 13.4, 13.5
      axios.get.mockResolvedValue({
        data: {
          cursor_position: 200,
          health_state: 'Advisory',
          current_window: {
            state: 'Advisory',
            start_index: 150,
            end_index: 350
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for state to load
      await waitFor(() => {
        expect(screen.getByText('Advisory')).toBeInTheDocument();
      });

      // Verify all state information is displayed
      const stateInfoSection = screen.getByText('Current State Information').closest('.state-info-section');
      expect(within(stateInfoSection).getByText('CNC Milling Machine')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      // Window range text may be split across elements
      expect(within(stateInfoSection).getByText(/150/)).toBeInTheDocument();
      expect(within(stateInfoSection).getByText(/350/)).toBeInTheDocument();
    });

    it('should disable controls while loading', async () => {
      // Requirements: 13.4, 13.5
      const user = userEvent.setup();

      // Mock slow API response
      axios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            success: true,
            machine_id: 'CNC-MILL-01',
            new_state: {
              cursor_position: 101,
              health_state: 'Normal',
              current_window: {}
            }
          }
        }), 100))
      );

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Click advance button
      const advanceButton = screen.getByRole('button', { name: /advance simulation/i });
      await user.click(advanceButton);

      // Verify button shows loading state
      expect(screen.getByRole('button', { name: /advancing/i })).toBeInTheDocument();

      // Verify selects are disabled
      const machineSelect = screen.getByLabelText('Select Machine:');
      const scenarioSelect = screen.getByLabelText('Select Scenario:');
      expect(machineSelect).toBeDisabled();
      expect(scenarioSelect).toBeDisabled();

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /advance simulation/i })).toBeInTheDocument();
      });

      // Verify controls are re-enabled
      expect(machineSelect).not.toBeDisabled();
      expect(scenarioSelect).not.toBeDisabled();
    });

    it('should clear success message after timeout', async () => {
      // Requirements: 13.4, 13.5
      const user = userEvent.setup();

      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          machine_id: 'CNC-MILL-01',
          new_state: {
            cursor_position: 101,
            health_state: 'Normal',
            current_window: {}
          }
        }
      });

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Click advance button
      const advanceButton = screen.getByRole('button', { name: /advance simulation/i });
      await user.click(advanceButton);

      // Verify success message appears
      await waitFor(() => {
        expect(screen.getByText(/Advanced simulation/i)).toBeInTheDocument();
      });

      // Wait for the message to disappear (3 second timeout in component)
      await waitFor(() => {
        expect(screen.queryByText(/Advanced simulation/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should update when machine selection changes', async () => {
      // Requirements: 13.4
      const user = userEvent.setup();

      render(<SimulationControlPanel onSimulationChange={mockOnSimulationChange} />);

      // Wait for initial state
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });

      // Mock different state for different machine
      axios.get.mockResolvedValueOnce({
        data: {
          cursor_position: 250,
          health_state: 'Advisory',
          current_window: {
            state: 'Advisory',
            start_index: 200,
            end_index: 400
          }
        }
      });

      // Change machine selection
      const machineSelect = screen.getByLabelText('Select Machine:');
      await user.selectOptions(machineSelect, 'COOL-PUMP-02');

      // Verify new machine state is fetched and displayed
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          'http://localhost:8000/api/machines/COOL-PUMP-02'
        );
      });

      await waitFor(() => {
        const healthBadge = screen.getByText((content, element) => {
          return element.classList.contains('health-badge') && content === 'Advisory';
        });
        expect(healthBadge).toBeInTheDocument();
        expect(screen.getByText('250')).toBeInTheDocument();
      });
    });
  });
});
