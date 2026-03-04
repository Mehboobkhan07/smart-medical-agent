import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AIAssistant from './pages/AIAssistant';
import Patients from './pages/Patients';
import Prescriptions from './pages/Prescriptions';
import Inventory from './pages/Inventory';
import Appointments from './pages/Appointments';

const navItems = [
  { path: '/', icon: '⚡', label: 'Dashboard', section: 'OVERVIEW' },
  { path: '/assistant', icon: '🤖', label: 'AI Assistant', section: 'AI AGENT' },
  { path: '/patients', icon: '👤', label: 'Patients', section: 'MANAGEMENT' },
  { path: '/prescriptions', icon: '💊', label: 'Prescriptions', section: 'MANAGEMENT' },
  { path: '/inventory', icon: '📦', label: 'Inventory', section: 'MANAGEMENT' },
  { path: '/appointments', icon: '📅', label: 'Appointments', section: 'MANAGEMENT' },
];

function Sidebar({ isOpen, onClose }) {
  let currentSection = '';
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo-mark">
            <div className="logo-icon">🏥</div>
            <div className="logo-text">
              <h2>MediAssist</h2>
              <span>AI Agent v1.0</span>
            </div>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="sidebar-close"
            style={{
              background: 'none', border: 'none',
              color: '#64748b', fontSize: 20,
              cursor: 'pointer', padding: 4,
            }}
          >✕</button>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const showSection = item.section !== currentSection;
          if (showSection) currentSection = item.section;
          return (
            <div key={item.path}>
              {showSection && <div className="nav-section-label">{item.section}</div>}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="ai-status">
          <div className="status-dot" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>AI Agent Online</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Groq LLaMA 3.3</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const location = useLocation();
  const titles = {
    '/': 'Dashboard',
    '/assistant': 'AI Medical Assistant',
    '/patients': 'Patient Management',
    '/prescriptions': 'Prescriptions',
    '/inventory': 'Medicine Inventory',
    '/appointments': 'Appointments',
  };
  return (
    <div className="topbar">
      <div className="page-title">{titles[location.pathname] || 'MediAssist AI'}</div>
      <div className="topbar-right">
        <span className="topbar-badge">🔒 HIPAA Compliant</span>
        <span className="topbar-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
          ✓ LangGraph Active
        </span>
      </div>
    </div>
  );
}
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* Overlay when sidebar open on mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 998,
              display: 'none',
            }}
            className="sidebar-overlay"
          />
        )}

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="main-content">
          <Topbar onMenuClick={() => setSidebarOpen(v => !v)} />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assistant" element={<AIAssistant />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/prescriptions" element={<Prescriptions />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/appointments" element={<Appointments />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}