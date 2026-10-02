import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fc } from '@fast-check/vitest';
import { DarkModeProvider, useDarkMode } from './DarkModeContext';

// Test component to access context
function TestComponent() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  return (
    <div>
      <div data-testid="dark-mode-status">{darkMode ? 'dark' : 'light'}</div>
      <button onClick={toggleDarkMode} data-testid="toggle-button">
        Toggle
      </button>
    </div>
  );
}

describe('DarkModeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Remove dark-mode class from document
    document.documentElement.classList.remove('dark-mode');
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  // Feature: prism-frontend-redesign, Property 9: Dark Mode Persistence Round Trip
  // Validates: Requirements 6.3, 6.4
  it('should persist dark mode preference to localStorage and restore it on reload', () => {
    fc.assert(
      fc.property(fc.boolean(), (initialDarkMode) => {
        // Set initial preference in localStorage
        localStorage.setItem('darkMode', JSON.stringify(initialDarkMode));

        // Render component (simulating app load)
        const { unmount } = render(
          <DarkModeProvider>
            <TestComponent />
          </DarkModeProvider>
        );

        // Verify the preference was restored from localStorage
        const statusElement = screen.getByTestId('dark-mode-status');
        expect(statusElement.textContent).toBe(initialDarkMode ? 'dark' : 'light');

        // Verify localStorage contains the correct value
        const storedValue = localStorage.getItem('darkMode');
        expect(JSON.parse(storedValue)).toBe(initialDarkMode);

        // Verify document class is applied correctly
        if (initialDarkMode) {
          expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
        } else {
          expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
        }

        // Clean up
        unmount();
        localStorage.clear();
        document.documentElement.classList.remove('dark-mode');
      }),
      { numRuns: 100 }
    );
  });

  it('should persist toggled dark mode preference', () => {
    fc.assert(
      fc.property(fc.boolean(), (initialDarkMode) => {
        // Set initial preference
        localStorage.setItem('darkMode', JSON.stringify(initialDarkMode));

        // Render component
        const { unmount } = render(
          <DarkModeProvider>
            <TestComponent />
          </DarkModeProvider>
        );

        // Toggle dark mode
        const toggleButton = screen.getByTestId('toggle-button');
        act(() => {
          toggleButton.click();
        });

        // Verify the preference was toggled and persisted
        const expectedValue = !initialDarkMode;
        const statusElement = screen.getByTestId('dark-mode-status');
        expect(statusElement.textContent).toBe(expectedValue ? 'dark' : 'light');

        // Verify localStorage was updated
        const storedValue = localStorage.getItem('darkMode');
        expect(JSON.parse(storedValue)).toBe(expectedValue);

        // Verify document class is updated correctly
        if (expectedValue) {
          expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
        } else {
          expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
        }

        // Clean up
        unmount();
        localStorage.clear();
        document.documentElement.classList.remove('dark-mode');
      }),
      { numRuns: 100 }
    );
  });

  it('should default to light mode when no preference is stored', () => {
    // Ensure localStorage is empty
    localStorage.clear();

    // Render component
    const { unmount } = render(
      <DarkModeProvider>
        <TestComponent />
      </DarkModeProvider>
    );

    // Verify default is light mode
    const statusElement = screen.getByTestId('dark-mode-status');
    expect(statusElement.textContent).toBe('light');

    // Verify localStorage was initialized
    const storedValue = localStorage.getItem('darkMode');
    expect(JSON.parse(storedValue)).toBe(false);

    // Verify no dark-mode class on document
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);

    // Clean up
    unmount();
    localStorage.clear();
  });
});
