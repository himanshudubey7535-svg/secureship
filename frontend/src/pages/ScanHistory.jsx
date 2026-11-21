import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScanRows } from './Dashboard.jsx';
import { api } from '../services/api.js';
import { History, Search, RefreshCw, Trash2, Filter } from 'lucide-react';

export default function ScanHistory({ onOpenScan }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
    if (!window.confirm('Delete this scan record?')) return;
    try {
      await api.deleteScan(id);
      await loadScans(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to purge all scan history?')) return;
    try {
      await api.clearScans();
      await loadScans(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const matchesSearch = !searchTerm.trim() ||
        (s.image_name && s.image_name.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (s.image_tag && s.image_tag.toLowerCase().includes(searchTerm.toLowerCase().trim()));
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [scans, searchTerm, statusFilter]);

  return (
    <div className="panel">
      <div className="table-toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '18px', color: '#fff' }}>Historical Audit Log</h3>
          </div>
          <p className="muted" style={{ fontSize: '13px', margin: '2px 0 0' }}>
            Comprehensive chronological registry of all analyzed container images
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div className="quick-search-box" style={{ width: '220px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by image or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '12.5px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="SCANNING">Scanning</option>
          </select>

          <button
            className="btn btn-ghost"
            onClick={() => loadScans(true)}
            disabled={refreshing}
            title="Refresh scan history"
            style={{ fontSize: '12.5px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {scans.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={handleClearAll}
              style={{ color: 'var(--sev-critical)', fontSize: '12.5px' }}
              title="Clear all scans"
            >
              <Trash2 size={14} />
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert" role="alert">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '36px', justifyContent: 'center' }}>
          <div className="spinner" />
          <span className="muted">Loading scan audit logs…</span>
        </div>
      ) : filteredScans.length === 0 ? (
        <div className="empty">
          <History size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p>{searchTerm || statusFilter !== 'ALL' ? 'No scans match your search filter.' : 'No scans recorded yet.'}</p>
        </div>
      ) : (
        <ScanRows scans={filteredScans} onOpen={onOpenScan} onDelete={handleDelete} />
      )}
    </div>
  );
}
