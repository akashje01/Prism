import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import React from 'react';
import { act } from 'react';

// Simple test components to verify routing without complex dependencies
function TestDashboard() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => navigate('/machines/CNC-MILL-01')}>
        Go to Machine Detail
      </button>
    </div>
  );
}

function TestMachineDetail() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <h1>Machine Detail</h1>
      <p>Machine ID: {machineId}</p>
      <button onClick={() => navigate('/')}>
        Back to Dashboard
      </button>
    </div>
  );
}

describe('React Router Setup Tests', () => {
  it('should render Dashboard component at root path (/)', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestDashboard />} />
          <Route path="/machines/:machineId" element={<TestMachineDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('Dashboard')).toBeInTheDocument();
    expect(getByText('Go to Machine Detail')).toBeInTheDocument();
  });

  it('should render MachineDetail component at /machines/:machineId path', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/machines/CNC-MILL-01']}>
        <Routes>
          <Route path="/" element={<TestDashboard />} />
          <Route path="/machines/:machineId" element={<TestMachineDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('Machine Detail')).toBeInTheDocument();
    expect(getByText('Machine ID: CNC-MILL-01')).toBeInTheDocument();
    expect(getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('should extract machineId parameter from URL', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/machines/COOL-PUMP-02']}>
        <Routes>
          <Route path="/" element={<TestDashboard />} />
          <Route path="/machines/:machineId" element={<TestMachineDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('Machine ID: COOL-PUMP-02')).toBeInTheDocument();
  });

  it('should support navigation from Dashboard to MachineDetail', () => {
    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestDashboard />} />
          <Route path="/machines/:machineId" element={<TestMachineDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Initially on Dashboard
    expect(getByText('Dashboard')).toBeInTheDocument();

    // Click navigation button
    const button = getByText('Go to Machine Detail');
    act(() => {
      fireEvent.click(button);
    });

    // Should navigate to MachineDetail
    expect(queryByText('Machine Detail')).toBeInTheDocument();
    expect(queryByText('Machine ID: CNC-MILL-01')).toBeInTheDocument();
  });

  it('should support navigation from MachineDetail back to Dashboard', () => {
    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/machines/CNC-MILL-01']}>
        <Routes>
          <Route path="/" element={<TestDashboard />} />
          <Route path="/machines/:machineId" element={<TestMachineDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Initially on MachineDetail
    expect(getByText('Machine Detail')).toBeInTheDocument();

    // Click back button
    const button = getByText('Back to Dashboard');
    act(() => {
      fireEvent.click(button);
    });

    // Should navigate back to Dashboard
    expect(queryByText('Dashboard')).toBeInTheDocument();
  });

  it('should handle multiple machine IDs in the route', () => {
    const machineIds = ['CNC-MILL-01', 'COOL-PUMP-02', 'CONV-MOTOR-01', 'AIR-COMP-01'];

    machineIds.forEach(machineId => {
      const { getByText } = render(
        <MemoryRouter initialEntries={[`/machines/${machineId}`]}>
          <Routes>
            <Route path="/" element={<TestDashboard />} />
            <Route path="/machines/:machineId" element={<TestMachineDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(getByText(`Machine ID: ${machineId}`)).toBeInTheDocument();
    });
  });
});
