import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { fc, test as fcTest } from '@fast-check/vitest';
import MachineCard from './MachineCard';

// Helper to wrap component with Router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MachineCard', () => {
  // Feature: prism-frontend-redesign, Property 1: Health State Badge Color Mapping
  // Validates: Requirements 1.2
  describe('Property 1: Health State Badge Color Mapping', () => {
    fcTest.prop([
      fc.constantFrom('Normal', 'Advisory', 'Action Required', 'Post-Maintenance')
    ])('should display correct color class for any health state', (healthState) => {
      const mockMachine = {
        machine_id: 'test-machine-1',
        machine_name: 'Test Machine',
        health_state: healthState,
        one_line_summary: 'Test summary'
      };

      const { container } = renderWithRouter(<MachineCard machine={mockMachine} />);
      
      // Get the health state badge element
      const badge = container.querySelector('.health-state-badge');
      expect(badge).toBeTruthy();
      
      // Verify correct CSS class based on health state
      const expectedClass = getExpectedHealthClass(healthState);
      expect(badge.classList.contains(expectedClass)).toBe(true);
      
      // Verify badge displays the health state text
      expect(badge.textContent).toBe(healthState);
    });
  });

  // Unit tests for specific examples
  describe('Unit Tests', () => {
    test('should render machine name', () => {
      const mockMachine = {
        machine_id: 'machine-1',
        machine_name: 'CNC Mill 01',
        health_state: 'Normal',
        one_line_summary: 'Operating normally'
      };

      renderWithRouter(<MachineCard machine={mockMachine} />);
      expect(screen.getByText('CNC Mill 01')).toBeInTheDocument();
    });

    test('should render condition summary', () => {
      const mockMachine = {
        machine_id: 'machine-1',
        machine_name: 'CNC Mill 01',
        health_state: 'Normal',
        one_line_summary: 'Operating normally'
      };

      renderWithRouter(<MachineCard machine={mockMachine} />);
      expect(screen.getByText('Operating normally')).toBeInTheDocument();
    });

    test('should render View Details button', () => {
      const mockMachine = {
        machine_id: 'machine-1',
        machine_name: 'CNC Mill 01',
        health_state: 'Normal',
        one_line_summary: 'Operating normally'
      };

      renderWithRouter(<MachineCard machine={mockMachine} />);
      const buttons = screen.getAllByText('View Details');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should not display machine_id (technical data)', () => {
      const mockMachine = {
        machine_id: 'machine-1',
        machine_name: 'CNC Mill 01',
        health_state: 'Normal',
        one_line_summary: 'Operating normally'
      };

      const { container } = renderWithRouter(<MachineCard machine={mockMachine} />);
      
      // Verify machine_id is not displayed anywhere
      expect(container.textContent).not.toContain('machine-1');
    });

    test('should apply correct border color for Normal state', () => {
      const mockMachine = {
        machine_id: 'machine-1',
        machine_name: 'CNC Mill 01',
        health_state: 'Normal',
        one_line_summary: 'Operating normally'
      };

      const { container } = renderWithRouter(<MachineCard machine={mockMachine} />);
      const card = container.querySelector('.machine-card');
      expect(card.classList.contains('health-normal')).toBe(true);
    });

    test('should apply correct border color for Advisory state', () => {
      const mockMachine = {
        machine_id: 'machine-2',
        machine_name: 'CNC Mill 02',
        health_state: 'Advisory',
        one_line_summary: 'Elevated vibration detected'
      };

      const { container } = renderWithRouter(<MachineCard machine={mockMachine} />);
      const card = container.querySelector('.machine-card');
      expect(card.classList.contains('health-advisory')).toBe(true);
    });

    test('should apply correct border color for Action Required state', () => {
      const mockMachine = {
        machine_id: 'machine-3',
        machine_name: 'CNC Mill 03',
        health_state: 'Action Required',
        one_line_summary: 'Critical bearing failure imminent'
      };

      const { container } = renderWithRouter(<MachineCard machine={mockMachine} />);
      const card = container.querySelector('.machine-card');
      expect(card.classList.contains('health-action-required')).toBe(true);
    });

    test('should apply correct border color for Post-Maintenance state', () => {
      const mockMachine = {
        machine_id: 'machine-4',
        machine_name: 'CNC Mill 04',
        health_state: 'Post-Maintenance',
        one_line_summary: 'Recently serviced, monitoring performance'
      };

      const { container } = renderWithRouter(<MachineCard machine={mockMachine} />);
      const card = container.querySelector('.machine-card');
      expect(card.classList.contains('health-post-maintenance')).toBe(true);
    });
  });
});

// Helper function to get expected CSS class for health state
function getExpectedHealthClass(healthState) {
  switch (healthState) {
    case 'Normal':
      return 'health-normal';
    case 'Advisory':
      return 'health-advisory';
    case 'Action Required':
      return 'health-action-required';
    case 'Post-Maintenance':
      return 'health-post-maintenance';
    default:
      return 'health-unknown';
  }
}
