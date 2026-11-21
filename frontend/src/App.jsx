import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import SnowEffect from './components/SnowEffect.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ScanImage from './pages/ScanImage.jsx';
import ScanHistory from './pages/ScanHistory.jsx';
import Reports from './pages/Reports.jsx';
import Analytics from './pages/Analytics.jsx';
import SecuritySettings from './pages/SecuritySettings.jsx';

const TITLES = {
  dashboard: ['SecureShip Command Center', 'Real-time container vulnerability and layer security telemetry'],
  scan: ['SecureShip Docker Scanner', 'Deep-inspect container file layers, libraries, and CVE databases'],
  history: ['SecureShip Scan History', 'Chronological registry of all analyzed container images'],
  reports: ['SecureShip Compliance Reports', 'Official security audit artifacts and compliance declarations'],
  analytics: ['SecureShip Security Analytics', 'Threat postures, vulnerability trends, and risk distributions'],
  settings: ['SecureShip Policy Gate', 'Configure automated admission thresholds for production deployments'],
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('secureship-theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('secureship-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const navigate = (page) => {
    if (page === 'scan') setSelectedScanId(null);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openScan = (id) => {
    setSelectedScanId(id);
    setCurrentPage('scan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [title, subtitle] = TITLES[currentPage] || ['SecureShip', 'Container Security Platform'];

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`} data-theme={theme}>
      {snowEnabled && <SnowEffect />}

      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="main">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenMobile={() => setMobileOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          snowEnabled={snowEnabled}
          onToggleSnow={() => setSnowEnabled(!snowEnabled)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {currentPage === 'dashboard' && (
          <Dashboard onNavigate={navigate} onOpenScan={openScan} />
        )}
        {currentPage === 'scan' && (
          <ScanImage scanId={selectedScanId} onScanChange={setSelectedScanId} />
        )}
        {currentPage === 'history' && (
          <ScanHistory onOpenScan={openScan} />
        )}
        {currentPage === 'reports' && (
          <Reports onOpenScan={openScan} />
        )}
        {currentPage === 'analytics' && (
          <Analytics />
        )}
        {currentPage === 'settings' && (
          <SecuritySettings />
        )}
      </main>
    </div>
  );
}
