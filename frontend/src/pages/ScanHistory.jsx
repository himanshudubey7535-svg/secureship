import { useEffect, useState } from 'react';
import { ScanRows } from './Dashboard.jsx';
import { api } from '../services/api.js';

export default function ScanHistory({ onOpenScan }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getScans().then(setScans).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel">
      {error && <div className="alert" role="alert">{error}</div>}
      {loading ? <p className="muted">Loading…</p>
        : scans.length === 0 ? <p className="empty">Your scans will be listed here.</p>
        : (
          <>
            <p className="muted">Select a scan to see its vulnerabilities and download reports.</p>
            <ScanRows scans={scans} onOpen={onOpenScan} />
          </>
        )}
    </div>
  );
}
