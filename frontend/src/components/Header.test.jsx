import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DarkModeProvider } from '../contexts/DarkModeContext';
import Header from './Header';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to render Header with required providers
const renderHeader = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <DarkModeProvider>
        <Header />
      </DarkModeProvider>
    </MemoryRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it('renders app title', () => {
    renderHeader('/');
    
    expect(screen.getByText('PRISM Predictive Maintenance System')).toBeInTheDocument();
  });

  it('shows subtitle on dashboard page', () => {
    renderHeader('/');
    
    expect(screen.getByText('Real-time Machine Health Monitoring')).toBeInTheDocument();
  });

  it('does not show subtitle on detail page', () => {
    renderHeader('/machines/CNC-MILL-01');
    
    expect(screen.queryByText('Real-time Machine Health Monitoring')).not.toBeInTheDocument();
  });

  it('shows back button on detail page', () => {
    renderHeader('/machines/CNC-MILL-01');
    
    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('does not show back button on dashboard page', () => {
    renderHeader('/');
    
    const backButton = screen.queryByRole('button', { name: /back to dashboard/i });
    expect(backButton).not.toBeInTheDocument();
  });

  it('navigates to dashboard when back button is clicked', () => {
    renderHeader('/machines/CNC-MILL-01');
    
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to dashboard when Dashboard nav link is clicked', () => {
    renderHeader('/machines/CNC-MILL-01');
    
    // Use more specific query to get the nav link (not the back button)
    const dashboardLink = screen.getByRole('button', { name: 'Dashboard' });
    fireEvent.click(dashboardLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('marks Dashboard nav link as active on dashboard page', () => {
    renderHeader('/');
    
    const dashboardLink = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboardLink).toHaveClass('active');
  });

  it('does not mark Dashboard nav link as active on detail page', () => {
    renderHeader('/machines/CNC-MILL-01');
    
    const dashboardLink = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboardLink).not.toHaveClass('active');
  });

  it('renders dark mode toggle button', () => {
    renderHeader('/');
    
    const darkModeToggle = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(darkModeToggle).toBeInTheDocument();
  });

  it('toggles dark mode when toggle button is clicked', () => {
    renderHeader('/');
    
    const darkModeToggle = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(darkModeToggle);
    
    // After clicking, the button should now say "Switch to light mode"
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });
});
