import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { fc, test as fcTest } from '@fast-check/vitest';
import AlertsSidebar from './AlertsSidebar';

// Helper to wrap component with Router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Arbitrary generator for machine objects
const machineArbitrary = (healthState) => {
  return fc.record({
    machine_id: fc.string({ minLength: 1, maxLength: 20 }),
    machine_name: fc.string({ minLength: 1, maxLength: 50 }),
    health_state: fc.constant(healthState),
    one_line_summary: fc.string({ minLength: 1, maxLength: 100 })
  });
};

describe('AlertsSidebar', () => {
  // Feature: prism-frontend-redesign, Property 2: Advisory Machines in Advisories List
  // Validates: Requirements 1.3
  describe('Property 2: Advisory Machines in Advisories List', () => {
    fcTest.prop([
      fc.array(machineArbitrary('Advisory'), { minLength: 0, maxLength: 10 }),
      fc.array(
        fc.oneof(
          machineArbitrary('Normal'),
          machineArbitrary('Action Required'),
          machineArbitrary('Post-Maintenance')
        ),
        { minLength: 0, maxLength: 10 }
      )
    ])('should display all and only Advisory machines in advisories list', (advisoryMachines, otherMachines) => {
      const allMachines = [...advisoryMachines, ...otherMachines];
      
      const { container } = renderWithRouter(<AlertsSidebar machines={allMachines} />);
      
      // Get the advisories section
      const advisoriesSection = container.querySelector('.advisories-section');
      expect(advisoriesSection).toBeTruthy();
      
      // Get all advisory items
      const advisoryItems = container.querySelectorAll('.advisory-item');
      
      // Verify count matches Advisory machines
      expect(advisoryItems.length).toBe(advisoryMachines.length);
      
      // Verify each Advisory machine appears in the list
      advisoryMachines.forEach((machine) => {
        const advisorySection = container.querySelector('.advisories-section');
        expect(advisorySection.textContent).toContain(machine.machine_name);
      });
      
      // Verify no non-Advisory machines appear in advisory items
      otherMachines.forEach((machine) => {
        const advisoryItemsText = Array.from(advisoryItems)
          .map(item => item.textContent)
          .join(' ');
        
        // Only check if the machine name is unique enough to not cause false positives
        if (machine.machine_name.length > 3) {
          const appearsInAdvisoryItems = advisoryItemsText.includes(machine.machine_name);
          expect(appearsInAdvisoryItems).toBe(false);
        }
      });
    });
  });

  // Feature: prism-frontend-redesign, Property 3: Action Required Machines in Alerts List
  // Validates: Requirements 1.4
  describe('Property 3: Action Required Machines in Alerts List', () => {
    fcTest.prop([
      fc.array(machineArbitrary('Action Required'), { minLength: 0, maxLength: 10 }),
      fc.array(
        fc.oneof(
          machineArbitrary('Normal'),
          machineArbitrary('Advisory'),
          machineArbitrary('Post-Maintenance')
        ),
        { minLength: 0, maxLength: 10 }
      )
    ])('should display all and only Action Required machines in alerts list', (actionRequiredMachines, otherMachines) => {
      const allMachines = [...actionRequiredMachines, ...otherMachines];
      
      const { container } = renderWithRouter(<AlertsSidebar machines={allMachines} />);
      
      // Get the alerts section
      const alertsSection = container.querySelector('.alerts-section');
      expect(alertsSection).toBeTruthy();
      
      // Get all alert items
      const alertItems = container.querySelectorAll('.alert-item');
      
      // Verify count matches Action Required machines
      expect(alertItems.length).toBe(actionRequiredMachines.length);
      
      // Verify each Action Required machine appears in the list
      actionRequiredMachines.forEach((machine) => {
        const alertSection = container.querySelector('.alerts-section');
        expect(alertSection.textContent).toContain(machine.machine_name);
      });
      
      // Verify no non-Action Required machines appear in alert items
      otherMachines.forEach((machine) => {
        const alertItemsText = Array.from(alertItems)
          .map(item => item.textContent)
          .join(' ');
        
        // Only check if the machine name is unique enough to not cause false positives
        if (machine.machine_name.length > 3) {
          const appearsInAlertItems = alertItemsText.includes(machine.machine_name);
          expect(appearsInAlertItems).toBe(false);
        }
      });
    });
  });

  // Unit tests for specific examples
  describe('Unit Tests', () => {
    test('should display empty state when no alerts', () => {
      const machines = [
        {
          machine_id: 'machine-1',
          machine_name: 'CNC Mill 01',
          health_state: 'Normal',
          one_line_summary: 'Operating normally'
        }
      ];

      renderWithRouter(<AlertsSidebar machines={machines} />);
      expect(screen.getByText(/No critical alerts/i)).toBeInTheDocument();
    });

    test('should display empty state when no advisories', () => {
      const machines = [
        {
          machine_id: 'machine-1',
          machine_name: 'CNC Mill 01',
          health_state: 'Normal',
          one_line_summary: 'Operating normally'
        }
      ];

      renderWithRouter(<AlertsSidebar machines={machines} />);
      expect(screen.getByText(/No active advisories/i)).toBeInTheDocument();
    });

    test('should display Action Required machines in alerts section', () => {
      const machines = [
        {
          machine_id: 'machine-1',
          machine_name: 'CNC Mill 01',
          health_state: 'Action Required',
          one_line_summary: 'Critical bearing failure imminent'
        }
      ];

      renderWithRouter(<AlertsSidebar machines={machines} />);
      
      const alertsSection = screen.getByText('Alerts').closest('.alerts-section');
      expect(alertsSection.textContent).toContain('CNC Mill 01');
      expect(alertsSection.textContent).toContain('Critical bearing failure imminent');
    });

    test('should display Advisory machines in advisories section', () => {
      const machines = [
        {
          machine_id: 'machine-2',
          machine_name: 'CNC Mill 02',
          health_state: 'Advisory',
          one_line_summary: 'Elevated vibration detected'
        }
      ];

      renderWithRouter(<AlertsSidebar machines={machines} />);
      
      const advisoriesSection = screen.getByText('Advisories').closest('.advisories-section');
      expect(advisoriesSection.textContent).toContain('CNC Mill 02');
      expect(advisoriesSection.textContent).toContain('Elevated vibration detected');
    });

    test('should display count badges for alerts and advisories', () => {
      const machines = [
        {
          machine_id: 'machine-1',
          machine_name: 'CNC Mill 01',
          health_state: 'Action Required',
          one_line_summary: 'Critical issue'
        },
        {
          machine_id: 'machine-2',
          machine_name: 'CNC Mill 02',
          health_state: 'Action Required',
          one_line_summary: 'Critical issue'
        },
        {
          machine_id: 'machine-3',
          machine_name: 'CNC Mill 03',
          health_state: 'Advisory',
          one_line_summary: 'Warning'
        }
      ];

      const { container } = renderWithRouter(<AlertsSidebar machines={machines} />);
      
      const alertBadge = container.querySelector('.alert-badge');
      expect(alertBadge.textContent).toBe('2');
      
      const advisoryBadge = container.querySelector('.advisory-badge');
      expect(advisoryBadge.textContent).toBe('1');
    });

    test('should not display Normal machines in either section', () => {
      const machines = [
        {
          machine_id: 'machine-1',
          machine_name: 'CNC Mill 01',
          health_state: 'Normal',
          one_line_summary: 'Operating normally'
        },
        {
          machine_id: 'machine-2',
          machine_name: 'CNC Mill 02',
          health_state: 'Action Required',
          one_line_summary: 'Critical issue'
        }
      ];

      const { container } = renderWithRouter(<AlertsSidebar machines={machines} />);
      
      const alertItems = container.querySelectorAll('.alert-item');
      const advisoryItems = container.querySelectorAll('.advisory-item');
      
      const allItemsText = [...alertItems, ...advisoryItems]
        .map(item => item.textContent)
        .join(' ');
      
      expect(allItemsText).not.toContain('CNC Mill 01');
      expect(allItemsText).toContain('CNC Mill 02');
    });

    test('should not display Post-Maintenance machines in either section', () => {
      const machines = [
        {
          machine_id: 'machine-1',
          machine_name: 'CNC Mill 01',
          health_state: 'Post-Maintenance',
          one_line_summary: 'Recently serviced'
        },
        {
          machine_id: 'machine-2',
          machine_name: 'CNC Mill 02',
          health_state: 'Advisory',
          one_line_summary: 'Warning'
        }
      ];

      const { container } = renderWithRouter(<AlertsSidebar machines={machines} />);
      
      const alertItems = container.querySelectorAll('.alert-item');
      const advisoryItems = container.querySelectorAll('.advisory-item');
      
      const allItemsText = [...alertItems, ...advisoryItems]
        .map(item => item.textContent)
        .join(' ');
      
      expect(allItemsText).not.toContain('CNC Mill 01');
      expect(allItemsText).toContain('CNC Mill 02');
    });
  });
});
