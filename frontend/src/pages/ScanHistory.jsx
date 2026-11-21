import { useCallback, useEffect, useState } from 'react';
import { ScanRows } from './Dashboard.jsx';
import { api } from '../services/api.js';

export default function ScanHistory({ onOpenScan }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadScans = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.getScans();
      setScans(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadScans();
    const interval = setInterval(() => loadScans(false), 5000);
    const handleFocus = () => loadScans(false);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadScans]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scan?')) return;
    try {
      await api.deleteScan(id);
      await loadScans(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all scan history?')) return;
    try {
      await api.clearScans();
      await loadScans(false);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="panel">
      <div className="table-toolbar">
        <div>
          <h3>Scan history</h3>
          <p className="muted" style={{ margin: 0 }}>Every image you have scanned.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={() => loadScans(true)}
            disabled={refreshing}
            title="Refresh history"
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          {scans.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={handleClearAll}
              style={{ color: 'var(--danger-red)' }}
              title="Clear all scans"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : scans.length === 0 ? (
        <p className="empty">Your scans will be listed here.</p>
      ) : (
        <ScanRows scans={scans} onOpen={onOpenScan} onDelete={handleDelete} />
      )}
    </div>
  );
}
