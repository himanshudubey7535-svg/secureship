import { useCallback, useEffect, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import { scoreTone } from '../components/ScanStatus.jsx';
import { api } from '../services/api.js';

export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function ScanRows({ scans, onOpen, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Tag</th>
            <th>Status</th>
            <th>Score</th>
            <th>Critical</th>
            <th>High</th>
            <th>Total</th>
            <th>Scanned</th>
            {onDelete && <th style={{ textAlign: 'right' }}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr key={s.id} className="clickable" tabIndex={0}
                onClick={() => onOpen(s.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(s.id)}>
              <td className="mono">{s.image_name}</td>
              <td className="mono">{s.image_tag}</td>
              <td><span className={`badge status-${s.status}`}>{s.status}</span></td>
              <td>{s.security_score != null
                ? <span className={`score tone-${scoreTone(s.security_score)}`}>{s.security_score}</span> : '-'}</td>
              <td>{s.status === 'completed' ? s.critical_count : '-'}</td>
              <td>{s.status === 'completed' ? s.high_count : '-'}</td>
              <td>{s.status === 'completed' ? s.total_vulns : '-'}</td>
              <td>{formatDate(s.created_at)}</td>
              {onDelete && (
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '2px 8px', fontSize: '12px', color: 'var(--danger-red)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    title="Delete scan"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SEV = [['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['unknown', 'Unknown']];

export function Distribution({ distribution }) {
  const total = SEV.reduce((n, [k]) => n + (distribution[k] || 0), 0);
  if (total === 0) return <p className="empty">No vulnerabilities recorded yet.</p>;
  return (
    <div className="dist">
      {SEV.map(([k, label]) => (
        <div className="dist-row" key={k}>
          <span className="dist-label">{label}</span>
          <div className="dist-track">
            <div className={`dist-fill sev-${k}`} style={{ width: `${(distribution[k] / total) * 100}%` }} />
          </div>
          <span className="dist-count">{distribution[k]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ onNavigate, onOpenScan }) {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [sc, st] = await Promise.all([api.getScans(), api.getStats()]);
      setScans(sc);
      setStats(st);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 5 seconds so all devices stay in sync
    const interval = setInterval(() => loadData(false), 5000);
    const handleFocus = () => loadData(false);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scan?')) return;
    try {
      await api.deleteScan(id);
      await loadData(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all scan history?')) return;
    try {
      await api.clearScans();
      await loadData(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const avg = stats?.average_score;
  return (
    <>
      <div className="stat-grid">
        <StatCard label="Images scanned" value={stats?.total_images ?? '-'} hint={stats ? `${stats.total_scans} scans` : undefined} />
        <StatCard label="Total vulnerabilities" value={stats?.total_vulnerabilities ?? '-'} />
        <StatCard label="Critical vulnerabilities" value={stats?.critical_vulnerabilities ?? '-'}
                  tone={stats?.critical_vulnerabilities ? 'bad' : 'default'} />
        <StatCard label="Average score" value={avg ?? '-'} tone={scoreTone(avg)} hint="Out of 100" />
      </div>

      {error && <div className="alert" role="alert">{error}</div>}

      <div className="dash-grid">
        <div className="panel">
          <div className="table-toolbar">
            <h3>Recent scans</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn btn-ghost"
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Refresh dashboard data"
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
              <button className="btn btn-primary" onClick={() => onNavigate('scan')}>Quick scan</button>
            </div>
          </div>
          {loading ? <p className="muted">Loading…</p>
            : scans.length === 0 ? (
              <p className="empty">No scans yet. Scan your first image to see its security score here.</p>
            ) : <ScanRows scans={scans.slice(0, 5)} onOpen={onOpenScan} onDelete={handleDelete} />}
        </div>
        <div className="panel">
          <h3>Severity distribution</h3>
          <p className="muted">Across all completed scans</p>
          {stats && <Distribution distribution={stats.severity_distribution} />}
        </div>
      </div>
    </>
  );
}
