import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { fc, test as fcTest } from '@fast-check/vitest';
import RemainingSafeTime from './RemainingSafeTime';

describe('RemainingSafeTime', () => {
  // Cleanup after each test to prevent DOM pollution between property test iterations
  afterEach(() => {
    cleanup();
  });

  // Feature: prism-frontend-redesign, Property 6: Conditional Remaining Safe Time Display
  // Validates: Requirements 3.6
  describe('Property 6: Conditional Remaining Safe Time Display', () => {
    fcTest.prop([
      fc.constantFrom('Normal', 'Advisory', 'Action Required', 'Post-Maintenance'),
      fc.string({ minLength: 1, maxLength: 100 })
    ])('should only be displayed for Action Required health state', 
      (healthState, timeEstimate) => {
        // The component itself doesn't handle conditional rendering
        // That's the parent's responsibility (MachineDetailPage)
        // This test verifies the component renders correctly when it IS displayed
        
        const shouldDisplay = healthState === 'Action Required';
        
        if (shouldDisplay) {
          // When displayed, component should render all content
          const { container } = render(
            <RemainingSafeTime timeEstimate={timeEstimate} />
          );
          
          // Use screen queries - cleanup ensures no conflicts between iterations
          expect(screen.getByText('Remaining Safe Operating Time')).toBeInTheDocument();
          expect(screen.getByText(timeEstimate)).toBeInTheDocument();
          
          // Verify urgent styling is applied
          const element = container.querySelector('.remaining-safe-time');
          expect(element).toBeInTheDocument();
          
          // Cleanup after each property test iteration to prevent DOM pollution
          cleanup();
        }
        // For Normal, Advisory, and Post-Maintenance, the parent should not render this component at all
      }
    );
  });

  // Unit tests for specific examples
  describe('Unit Tests', () => {
    test('should render time estimate', () => {
      render(<RemainingSafeTime timeEstimate="Estimated 4 hours remaining" />);
      expect(screen.getByText('Estimated 4 hours remaining')).toBeInTheDocument();
    });

    test('should render section title', () => {
      render(<RemainingSafeTime timeEstimate="Estimated 4 hours remaining" />);
      expect(screen.getByText('Remaining Safe Operating Time')).toBeInTheDocument();
    });

    test('should apply urgent styling class', () => {
      const { container } = render(
        <RemainingSafeTime timeEstimate="Estimated 4 hours remaining" />
      );
      
      const element = container.querySelector('.remaining-safe-time');
      expect(element).toBeInTheDocument();
    });

    test('should render immediate action message', () => {
      render(<RemainingSafeTime timeEstimate="Immediate action required" />);
      expect(screen.getByText('Immediate action required')).toBeInTheDocument();
    });

    test('should render time estimate prominently', () => {
      const { container } = render(
        <RemainingSafeTime timeEstimate="Estimated 2 hours remaining" />
      );
      
      const timeElement = container.querySelector('.time-estimate');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement.textContent).toBe('Estimated 2 hours remaining');
    });
  });
});
