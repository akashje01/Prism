import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const isDetailPage = location.pathname.startsWith('/machines/');

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <header className="app-header">
      <div className="header-content">
        {isDetailPage && (
          <button 
            onClick={handleBackToDashboard} 
            className="back-button"
            aria-label="Back to Dashboard"
          >
            ← Back
          </button>
        )}
        <div className="header-title">
          <h1>PRISM Predictive Maintenance System</h1>
          {!isDetailPage && (
            <p className="subtitle">Real-time Machine Health Monitoring</p>
          )}
        </div>
        <nav className="header-nav">
          <button 
            onClick={handleBackToDashboard}
            className={`nav-link ${!isDetailPage ? 'active' : ''}`}
            aria-label="Dashboard"
          >
            Dashboard
          </button>
          <button
            onClick={toggleDarkMode}
            className="dark-mode-toggle"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
