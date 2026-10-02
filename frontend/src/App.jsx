import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { DarkModeProvider } from './contexts/DarkModeContext'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import MachineDetail from './components/MachineDetail'

function App() {
  return (
    <DarkModeProvider>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/machines/:machineId" element={<MachineDetail />} />
        </Routes>
      </div>
    </DarkModeProvider>
  )
}

export default App
