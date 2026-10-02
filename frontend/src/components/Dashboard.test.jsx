import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Dashboard from './Dashboard';

// Mock axios
vi.mock('axios');

// Mock child components to isolate Dashboard testing
vi.mock('./MachineGrid', () => ({
  default: () => <div data-testid="machine-grid">MachineGrid Component</div>
}));

vi.mock('./AlertsSidebar', () => ({
  default: ({ machines }) => (
    <div data-testid="alerts-sidebar">
      AlertsSidebar Component - {machines.length} machines
    </div>
  )
}));

// Helper to wrap component with Router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Dashboard', () => {
  const mockMachinesData = {
    machines: [
      {
        machine_id: 'machine-1',
        machine_name: 'CNC Mill 01',
        health_state: 'Normal',
        one_line_summary: 'Operating normally'
      },
      {
        machine_id: 'machine-2',
        machine_name: 'CNC Mill 02',
        health_state: 'Advisory',
        one_line_summary: 'Elevated vibration detected'
      },
      {
        machine_id: 'machine-3',
        machine_name: 'CNC Mill 03',
        health_state: 'Action Required',
        one_line_summary: 'Critical bearing failure imminent'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Machine Data Fetching', () => {
    test('should fetch machines on mount', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          'http://localhost:8000/api/machines',
          { timeout: 10000 }
        );
      });
    });

    test('should display MachineGrid after successful fetch', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('machine-grid')).toBeInTheDocument();
      });
    });

    test('should display AlertsSidebar after successful fetch', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('alerts-sidebar')).toBeInTheDocument();
      });
    });

    test('should pass machines data to AlertsSidebar', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        const sidebar = screen.getByTestId('alerts-sidebar');
        expect(sidebar.textContent).toContain('3 machines');
      });
    });
  });

  describe('Loading State', () => {
    test('should display loading message initially', () => {
      axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<Dashboard />);

      expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();
    });

    test('should not display MachineGrid while loading', () => {
      axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<Dashboard />);

      expect(screen.queryByTestId('machine-grid')).not.toBeInTheDocument();
    });

    test('should not display AlertsSidebar while loading', () => {
      axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<Dashboard />);

      expect(screen.queryByTestId('alerts-sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('should display error message on fetch failure', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to load machines/i)).toBeInTheDocument();
      });
    });

    test('should display retry button on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      });
    });

    test('should retry fetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to load machines/i)).toBeInTheDocument();
      });

      // Second call succeeds
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('machine-grid')).toBeInTheDocument();
      });

      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('should not display MachineGrid on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to load machines/i)).toBeInTheDocument();
      });

      expect(screen.queryByTestId('machine-grid')).not.toBeInTheDocument();
    });

    test('should not display AlertsSidebar on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to load machines/i)).toBeInTheDocument();
      });

      expect(screen.queryByTestId('alerts-sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    test('should render dashboard layout container', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      const { container } = renderWithRouter(<Dashboard />);

      await waitFor(() => {
        const layout = container.querySelector('.dashboard-layout');
        expect(layout).toBeInTheDocument();
      });
    });

    test('should render main content area', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      const { container } = renderWithRouter(<Dashboard />);

      await waitFor(() => {
        const main = container.querySelector('.dashboard-main');
        expect(main).toBeInTheDocument();
      });
    });

    test('should render sidebar area', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      const { container } = renderWithRouter(<Dashboard />);

      await waitFor(() => {
        const sidebar = container.querySelector('.dashboard-sidebar');
        expect(sidebar).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    test('should handle empty machines array', async () => {
      axios.get.mockResolvedValueOnce({ data: { machines: [] } });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('machine-grid')).toBeInTheDocument();
      });
    });

    test('should pass empty array to AlertsSidebar when no machines', async () => {
      axios.get.mockResolvedValueOnce({ data: { machines: [] } });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        const sidebar = screen.getByTestId('alerts-sidebar');
        expect(sidebar.textContent).toContain('0 machines');
      });
    });
  });

  describe('API Timeout', () => {
    test('should set timeout of 10 seconds for API call', async () => {
      axios.get.mockResolvedValueOnce({ data: mockMachinesData });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ timeout: 10000 })
        );
      });
    });
  });
});
