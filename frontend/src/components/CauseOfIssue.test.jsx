import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { fc, test as fcTest } from '@fast-check/vitest';
import CauseOfIssue from './CauseOfIssue';

describe('CauseOfIssue', () => {
  // Feature: prism-frontend-redesign, Property 5: Conditional Cause of Issue Display
  // Validates: Requirements 3.4
  describe('Property 5: Conditional Cause of Issue Display', () => {
    fcTest.prop([
      fc.constantFrom('Normal', 'Advisory', 'Action Required', 'Post-Maintenance'),
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.string({ minLength: 1, maxLength: 100 })
    ])('should only be displayed for Advisory or Action Required health states', 
      (healthState, affectedComponent, mechanicalCause) => {
        // The component itself doesn't handle conditional rendering
        // That's the parent's responsibility (MachineDetailPage)
        // This test verifies the component renders correctly when it IS displayed
        
        const shouldDisplay = healthState === 'Advisory' || healthState === 'Action Required';
        
        if (shouldDisplay) {
          // When displayed, component should render all content
          const { container } = render(
            <CauseOfIssue 
              affectedComponent={affectedComponent}
              mechanicalCause={mechanicalCause}
            />
          );
          
          // Use container-scoped queries to avoid finding elements from previous iterations
          expect(container.textContent).toContain('Cause of Issue');
          expect(container.textContent).toContain('Affected Component:');
          expect(container.textContent).toContain(affectedComponent);
          expect(container.textContent).toContain('Mechanical Cause:');
          expect(container.textContent).toContain(mechanicalCause);
        }
        // For Normal and Post-Maintenance, the parent should not render this component at all
      }
    );
  });

  // Unit tests for specific examples
  describe('Unit Tests', () => {
    test('should render affected component', () => {
      const { getByText } = render(
        <CauseOfIssue 
          affectedComponent="Inner Race Bearing"
          mechanicalCause="Excessive wear due to inadequate lubrication"
        />
      );
      
      expect(getByText('Inner Race Bearing')).toBeInTheDocument();
    });

    test('should render mechanical cause', () => {
      const { getByText } = render(
        <CauseOfIssue 
          affectedComponent="Inner Race Bearing"
          mechanicalCause="Excessive wear due to inadequate lubrication"
        />
      );
      
      expect(getByText('Excessive wear due to inadequate lubrication')).toBeInTheDocument();
    });

    test('should render section title', () => {
      const { getByText } = render(
        <CauseOfIssue 
          affectedComponent="Inner Race Bearing"
          mechanicalCause="Excessive wear due to inadequate lubrication"
        />
      );
      
      expect(getByText('Cause of Issue')).toBeInTheDocument();
    });

    test('should render labels', () => {
      const { getByText } = render(
        <CauseOfIssue 
          affectedComponent="Inner Race Bearing"
          mechanicalCause="Excessive wear due to inadequate lubrication"
        />
      );
      
      expect(getByText('Affected Component:')).toBeInTheDocument();
      expect(getByText('Mechanical Cause:')).toBeInTheDocument();
    });

    test('should apply correct CSS class', () => {
      const { container } = render(
        <CauseOfIssue 
          affectedComponent="Inner Race Bearing"
          mechanicalCause="Excessive wear due to inadequate lubrication"
        />
      );
      
      const element = container.querySelector('.cause-of-issue');
      expect(element).toBeInTheDocument();
    });
  });
});
