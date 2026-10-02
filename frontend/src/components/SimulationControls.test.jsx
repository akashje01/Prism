import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimulationControls from './SimulationControls';

/**
 * Unit tests for SimulationControls component
 * 
 * Tests cover:
 * - Play/Stop button behavior (Requirements: 2.1, 2.3, 2.4)
 * - Scenario dropdown selection (Requirements: 10.3, 10.4)
 * - Component never creates or manages interval timers (parent owns exclusively)
 * - Disabled state handling
 */
describe('SimulationControls', () => {
  const mockOnScenarioChange = vi.fn();
  const mockOnPlayStop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Play/Stop Button Behavior', () => {
    it('should display Play button when not playing', () => {
      // Requirements: 2.1
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /play simulation/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Play');
      expect(button).toHaveClass('stopped');
    });

    it('should display Stop button when playing', () => {
      // Requirements: 2.3
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={true}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /stop simulation/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Stop');
      expect(button).toHaveClass('playing');
    });

    it('should call onPlayStop when Play button is clicked', async () => {
      // Requirements: 2.1
      const user = userEvent.setup();

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /play simulation/i });
      await user.click(button);

      expect(mockOnPlayStop).toHaveBeenCalledTimes(1);
    });

    it('should call onPlayStop when Stop button is clicked', async () => {
      // Requirements: 2.4
      const user = userEvent.setup();

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={true}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /stop simulation/i });
      await user.click(button);

      expect(mockOnPlayStop).toHaveBeenCalledTimes(1);
    });

    it('should disable Play/Stop button when disabled prop is true', () => {
      // Requirements: 10.5
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={true}
        />
      );

      const button = screen.getByRole('button', { name: /play simulation/i });
      expect(button).toBeDisabled();
    });

    it('should not call onPlayStop when disabled button is clicked', async () => {
      // Requirements: 10.5
      const user = userEvent.setup();

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={true}
        />
      );

      const button = screen.getByRole('button', { name: /play simulation/i });
      await user.click(button);

      expect(mockOnPlayStop).not.toHaveBeenCalled();
    });
  });

  describe('Scenario Dropdown Selection', () => {
    it('should display all scenario options', () => {
      // Requirements: 10.1
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const select = screen.getByLabelText(/scenario/i);
      const options = Array.from(select.querySelectorAll('option')).map(opt => opt.value);

      expect(options).toEqual([
        'Normal',
        'Advisory',
        'Action Required',
        'Post-Maintenance'
      ]);
    });

    it('should display the selected scenario', () => {
      // Requirements: 10.1
      render(
        <SimulationControls
          selectedScenario="Advisory"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const select = screen.getByLabelText(/scenario/i);
      expect(select).toHaveValue('Advisory');
    });

    it('should call onScenarioChange when scenario is selected', async () => {
      // Requirements: 10.2, 10.3
      const user = userEvent.setup();

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const select = screen.getByLabelText(/scenario/i);
      await user.selectOptions(select, 'Action Required');

      expect(mockOnScenarioChange).toHaveBeenCalledTimes(1);
      expect(mockOnScenarioChange).toHaveBeenCalledWith('Action Required');
    });

    it('should call onScenarioChange for each scenario option', async () => {
      // Requirements: 10.2, 10.3
      const user = userEvent.setup();
      const scenarios = ['Advisory', 'Action Required', 'Post-Maintenance'];

      for (const scenario of scenarios) {
        mockOnScenarioChange.mockClear();

        render(
          <SimulationControls
            selectedScenario="Normal"
            isPlaying={false}
            onScenarioChange={mockOnScenarioChange}
            onPlayStop={mockOnPlayStop}
            disabled={false}
          />
        );

        const select = screen.getByLabelText(/scenario/i);
        await user.selectOptions(select, scenario);

        expect(mockOnScenarioChange).toHaveBeenCalledWith(scenario);
      }
    });

    it('should disable scenario dropdown when disabled prop is true', () => {
      // Requirements: 10.5
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={true}
        />
      );

      const select = screen.getByLabelText(/scenario/i);
      expect(select).toBeDisabled();
    });

    it('should not call onScenarioChange when disabled dropdown is changed', async () => {
      // Requirements: 10.5
      const user = userEvent.setup();

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={true}
        />
      );

      const select = screen.getByLabelText(/scenario/i);
      await user.selectOptions(select, 'Advisory');

      expect(mockOnScenarioChange).not.toHaveBeenCalled();
    });
  });

  describe('Component Does Not Manage Timers', () => {
    it('should not create any interval timers', () => {
      // Verify component never creates interval timers (parent owns exclusively)
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      expect(setIntervalSpy).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });

    it('should not create timers when isPlaying changes to true', () => {
      // Verify component never creates interval timers even when playing state changes
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      const { rerender } = render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      rerender(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={true}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      expect(setIntervalSpy).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });

    it('should not clear any interval timers', () => {
      // Verify component never clears interval timers (parent owns exclusively)
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { rerender } = render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={true}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      rerender(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      expect(clearIntervalSpy).not.toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe('Scenario Change Behavior', () => {
    it('should allow scenario change while simulation is stopped', async () => {
      // Requirements: 10.3
      const user = userEvent.setup();

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const select = screen.getByLabelText(/scenario/i);
      await user.selectOptions(select, 'Advisory');

      expect(mockOnScenarioChange).toHaveBeenCalledWith('Advisory');
    });

    it('should allow scenario change while simulation is playing', async () => {
      // Requirements: 10.4
      // Note: The component allows the change, but the parent (MachineDetailPage)
      // is responsible for stopping the simulation when scenario changes
      const user = userEvent.setup();

      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={true}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const select = screen.getByLabelText(/scenario/i);
      await user.selectOptions(select, 'Action Required');

      expect(mockOnScenarioChange).toHaveBeenCalledWith('Action Required');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all controls', () => {
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      expect(screen.getByLabelText(/scenario/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play simulation/i })).toBeInTheDocument();
    });

    it('should have proper ARIA labels for Play button', () => {
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={false}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /play simulation/i });
      expect(button).toHaveAttribute('aria-label', 'Play simulation');
    });

    it('should have proper ARIA labels for Stop button', () => {
      render(
        <SimulationControls
          selectedScenario="Normal"
          isPlaying={true}
          onScenarioChange={mockOnScenarioChange}
          onPlayStop={mockOnPlayStop}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /stop simulation/i });
      expect(button).toHaveAttribute('aria-label', 'Stop simulation');
    });
  });
});
