import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Dashboard from './Dashboard';
import MachineDetail from './MachineDetail';
import BearingEvidencePanel from './BearingEvidencePanel';

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock axios
vi.mock('axios');

// Mock useParams for MachineDetail
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ machineId: 'CNC-MILL-01' })
  };
});

describe('Forbidden Content Tests - Requirements 1.5, 5.1, 7.3', () => {
  const forbiddenTerms = [
    'cursor position',
    'cursor_position',
    'state window',
    'window range',
    'window_range',
    'dataset mechanics',
    'CWRU',
    'Case Western Reserve',
    'debug',
    'DEBUG'
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard - No Forbidden Terms', () => {
    it('should not display cursor position, state window, or dataset mechanics', async () => {
      // Mock API response
      axios.get.mockResolvedValueOnce({
        data: {
          machines: [
            {
              id: 'CNC-MILL-01',
              name: 'CNC Mill 01',
              healthState: 'Normal',
              conditionSummary: 'Operating normally'
            },
            {
              id: 'CONV-MOTOR-01',
              name: 'Conveyor Motor 01',
              healthState: 'Advisory',
              conditionSummary: 'Minor vibration detected'
            }
          ]
        }
      });

      const { container } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading dashboard/i)).not.toBeInTheDocument();
      });

      // Get all text content from the component
      const textContent = container.textContent.toLowerCase();

      // Verify no forbidden terms are present
      forbiddenTerms.forEach(term => {
        expect(textContent).not.toContain(term.toLowerCase());
      });
    });

    it('should not display window range or technical implementation details', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          machines: [
            {
              id: 'TEST-01',
              name: 'Test Machine',
              healthState: 'Action Required',
              conditionSummary: 'Immediate attention needed'
            }
          ]
        }
      });

      const { container } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading dashboard/i)).not.toBeInTheDocument();
      });

      const textContent = container.textContent;

      // Specifically check for window-related terms
      expect(textContent).not.toMatch(/window\s+range/i);
      expect(textContent).not.toMatch(/state\s+window/i);
      expect(textContent).not.toMatch(/cursor/i);
    });
  });

  describe('Machine Detail Page - No Forbidden Terms', () => {
    it('should not display cursor position or state window information', async () => {
      // Mock machine detail API response
      axios.get.mockResolvedValueOnce({
        data: {
          machine_name: 'CNC Mill 01',
          health_state: 'Normal',
          sensor_readings: [
            { name: 'Temperature', value: 298.5, unit: 'K', thresholdExceeded: false },
            { name: 'Vibration', value: 45.2, unit: 'μm', thresholdExceeded: false }
          ],
          sensor_history: {},
          explanation: 'Machine is operating normally',
          recommended_action: 'Continue monitoring',
          at_window_end: false
        }
      });

      const { container } = render(
        <BrowserRouter>
          <MachineDetail />
        </BrowserRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading machine details/i)).not.toBeInTheDocument();
      });

      const textContent = container.textContent.toLowerCase();

      // Verify no forbidden terms are present
      forbiddenTerms.forEach(term => {
        expect(textContent).not.toContain(term.toLowerCase());
      });
    });

    it('should not display dataset mechanics or technical jargon', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          machine_name: 'Test Machine',
          health_state: 'Advisory',
          sensor_readings: [],
          sensor_history: {},
          explanation: 'Early signs of wear detected',
          recommended_action: 'Schedule inspection',
          at_window_end: false
        }
      });

      const { container } = render(
        <BrowserRouter>
          <MachineDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading machine details/i)).not.toBeInTheDocument();
      });

      const textContent = container.textContent;

      // Check for dataset-related terms
      expect(textContent).not.toMatch(/dataset/i);
      expect(textContent).not.toMatch(/CWRU/i);
      expect(textContent).not.toMatch(/Case Western/i);
    });
  });

  describe('Bearing Evidence Panel - No Dataset References', () => {
    it('should not reference CWRU or Case Western Reserve University dataset', () => {
      const mockEvidence = {
        health_state: 'Normal',
        description: 'Normal bearing vibration pattern',
        sample_rate: 12000,
        vibration_data: [0.1, 0.2, 0.15, 0.18, 0.12]
      };

      const { container } = render(<BearingEvidencePanel evidence={mockEvidence} />);

      const textContent = container.textContent;

      // Verify no dataset references
      expect(textContent).not.toMatch(/CWRU/i);
      expect(textContent).not.toMatch(/Case Western Reserve/i);
      expect(textContent).not.toMatch(/University/i);
    });

    it('should use user-friendly language without technical dataset details', () => {
      const mockEvidence = {
        health_state: 'Advisory',
        description: 'Early bearing degradation detected',
        sample_rate: 12000,
        vibration_data: [0.2, 0.3, 0.25, 0.28, 0.22]
      };

      const { container } = render(<BearingEvidencePanel evidence={mockEvidence} />);

      const textContent = container.textContent;

      // Should contain user-friendly terms
      expect(textContent).toMatch(/vibration/i);
      expect(textContent).toMatch(/bearing/i);

      // Should not contain dataset mechanics
      expect(textContent).not.toMatch(/dataset/i);
    });
  });

  describe('No Debug Information in Production', () => {
    it('Dashboard should not render debug information in DOM', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          machines: [
            { id: 'TEST-01', name: 'Test', healthState: 'Normal', conditionSummary: 'OK' }
          ]
        }
      });

      const { container } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading dashboard/i)).not.toBeInTheDocument();
      });

      const textContent = container.textContent.toLowerCase();

      // Should not contain debug-related terms in visible UI
      expect(textContent).not.toContain('debug');
      expect(textContent).not.toContain('console');
      expect(textContent).not.toContain('stack trace');
    });

    it('Machine Detail should not render debug information in DOM', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          machine_name: 'Test',
          health_state: 'Normal',
          sensor_readings: [],
          sensor_history: {},
          explanation: 'Normal',
          recommended_action: 'Monitor',
          at_window_end: false
        }
      });

      const { container } = render(
        <BrowserRouter>
          <MachineDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading machine details/i)).not.toBeInTheDocument();
      });

      const textContent = container.textContent.toLowerCase();

      // Should not contain debug-related terms in visible UI
      expect(textContent).not.toContain('debug');
      expect(textContent).not.toContain('console');
      expect(textContent).not.toContain('stack trace');
    });
  });

  describe('User-Centric Communication - Requirement 5.1', () => {
    it('should present information in operational terms without technical jargon', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          machine_name: 'CNC Mill 01',
          health_state: 'Advisory',
          sensor_readings: [
            { name: 'Temperature', value: 305.0, unit: 'K', thresholdExceeded: true }
          ],
          sensor_history: {
            Temperature: { timestamps: [1, 2, 3], values: [298, 302, 305] }
          },
          explanation: 'Temperature is elevated. Early signs of wear detected.',
          recommended_action: 'Schedule inspection within 48 hours',
          at_window_end: false
        }
      });

      const { container } = render(
        <BrowserRouter>
          <MachineDetail />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading machine details/i)).not.toBeInTheDocument();
      });

      const textContent = container.textContent;

      // Should not contain implementation details
      expect(textContent).not.toMatch(/cursor/i);
      expect(textContent).not.toMatch(/state\s+window/i);
      expect(textContent).not.toMatch(/window\s+range/i);
      expect(textContent).not.toMatch(/dataset/i);
    });
  });
});
