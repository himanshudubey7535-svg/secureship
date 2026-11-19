import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ScanImage from './pages/ScanImage.jsx';
import ScanHistory from './pages/ScanHistory.jsx';
import SecuritySettings from './pages/SecuritySettings.jsx';

const TITLES = {
  dashboard: ['Dashboard', 'Your container security at a glance'],
  scan: ['Scan image', 'Check an image for known vulnerabilities before you deploy it'],
  history: ['Scan history', 'Every image you have scanned'],
  settings: ['Security settings', 'Decide what counts as safe to deploy'],
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedScanId, setSelectedScanId] = useState(null);

  const navigate = (page) => {
    if (page === 'scan') setSelectedScanId(null);
    setCurrentPage(page);
  };
  const openScan = (id) => { setSelectedScanId(id); setCurrentPage('scan'); };

  const [title, subtitle] = TITLES[currentPage];
  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={navigate} />
      <main className="main">
        <Header title={title} subtitle={subtitle} />
        {currentPage === 'dashboard' && <Dashboard onNavigate={navigate} onOpenScan={openScan} />}
        {currentPage === 'scan' && <ScanImage scanId={selectedScanId} onScanChange={setSelectedScanId} />}
        {currentPage === 'history' && <ScanHistory onOpenScan={openScan} />}
        {currentPage === 'settings' && <SecuritySettings />}
      </main>
    </div>
  );
}
