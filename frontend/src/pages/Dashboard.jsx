import { useCallback, useEffect, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import { scoreTone } from '../components/ScanStatus.jsx';
import { api } from '../services/api.js';
import {
  RefreshCw,
  Trash2,
  Container,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity
} from 'lucide-react';

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
            <th>Container Image</th>
            <th>Tag</th>
            <th>Status</th>
            <th>Defense Score</th>
            <th>Critical</th>
            <th>High</th>
            <th>Total Findings</th>
            <th>Scanned Time</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr
              key={s.id}
              className="clickable"
              tabIndex={0}
              onClick={() => onOpen(s.id)}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(s.id)}
            >
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Container size={15} color="var(--accent-cyan)" />
                  <span className="mono-pill" style={{ fontWeight: 600 }}>{s.image_name}</span>
                </div>
              </td>
              <td><span className="mono-pill" style={{ opacity: 0.85 }}>{s.image_tag}</span></td>
              <td><span className={`badge status-${s.status}`}>{s.status}</span></td>
              <td>
                {s.security_score != null ? (
                  <span className={`score tone-${scoreTone(s.security_score)}`}>
                    {s.security_score}
                  </span>
                ) : (
                  <span className="muted">-</span>
                )}
              </td>
              <td>
                {s.status === 'completed' ? (
                  s.critical_count > 0 ? (
                    <span className="badge sev-critical">{s.critical_count}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>0</span>
                  )
                ) : '-'}
              </td>
              <td>
                {s.status === 'completed' ? (
                  s.high_count > 0 ? (
                    <span className="badge sev-high">{s.high_count}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>0</span>
                  )
                ) : '-'}
              </td>
              <td style={{ fontWeight: 700, color: '#f8fafc' }}>
                {s.status === 'completed' ? s.total_vulns : '-'}
              </td>
              <td className="muted" style={{ fontSize: '12px' }}>{formatDate(s.created_at)}</td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '3px 8px', fontSize: '12px', color: 'var(--accent-cyan)' }}
                    onClick={() => onOpen(s.id)}
                    title="Inspect vulnerability report"
                  >
                    Inspect
                  </button>
                  {onDelete && (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '3px 8px', fontSize: '12px', color: 'var(--sev-critical)' }}
                      onClick={() => onDelete(s.id)}
                      title="Delete scan record"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SEV = [
  ['critical', 'Critical Threat', 'sev-critical'],
  ['high', 'High Risk', 'sev-high'],
  ['medium', 'Medium Priority', 'sev-medium'],
  ['low', 'Low / Informational', 'sev-low'],
  ['unknown', 'Unknown Origin', 'sev-unknown']
];

export function Distribution({ distribution }) {
  if (!distribution) return <p className="muted">Calculating threat telemetry…</p>;
  const total = SEV.reduce((n, [k]) => n + (distribution[k] || 0), 0);
  if (total === 0) {
    return (
      <div className="empty" style={{ padding: '24px 8px' }}>
        <CheckCircle2 size={32} color="var(--accent-green)" style={{ margin: '0 auto 8px' }} />
        <p>No vulnerabilities detected across images.</p>
      </div>
    );
  }

  return (
    <div className="dist">
      {SEV.map(([k, label]) => {
        const count = distribution[k] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div className="dist-row" key={k}>
            <span className="dist-label">{label}</span>
            <div className="dist-track">
              <div
                className={`dist-fill sev-${k}`}
                style={{ width: `${pct}%` }}
                title={`${label}: ${count} (${Math.round(pct)}%)`}
              />
            </div>
            <span className="dist-count">{count}</span>
          </div>
        );
      })}
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
    const interval = setInterval(() => loadData(false), 5000);
    const handleFocus = () => loadData(false);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scan record?')) return;
    try {
      await api.deleteScan(id);
      await loadData(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all container scan telemetry?')) return;
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
      {/* 4 Top KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total Images Scanned"
          value={stats?.total_images ?? '-'}
          hint={stats ? `${stats.total_scans} scan evaluations run` : undefined}
          tone="ok"
        />
        <StatCard
          label="Total Vulnerabilities"
          value={stats?.total_vulnerabilities ?? '-'}
          hint="Tracked across all layers"
          tone={stats?.total_vulnerabilities ? 'warn' : 'default'}
        />
        <StatCard
          label="Critical Vulnerabilities"
          value={stats?.critical_vulnerabilities ?? '-'}
          hint="Immediate exploit risk"
          tone={stats?.critical_vulnerabilities ? 'bad' : 'good'}
        />
        <StatCard
          label="Cluster Security Score"
          value={avg != null ? `${avg}/100` : '-'}
          hint="Average defense benchmark"
          tone={scoreTone(avg)}
        />
      </div>

      {error && <div className="alert" role="alert">{error}</div>}

      {/* Main Grid: Recent Scans + Threat Breakdown */}
      <div className="dash-grid">
        <div className="panel">
          <div className="table-toolbar">
            <div>
              <h3 style={{ fontSize: '17px', color: '#fff' }}>Recent Container Scans</h3>
              <p className="muted" style={{ fontSize: '13px', margin: '2px 0 0' }}>
                Latest inspected image manifests and CVE vulnerability scores
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn btn-ghost"
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Refresh scan data"
                style={{ fontSize: '12px' }}
              >
                <RefreshCw size={13} className={refreshing ? 'spinner' : ''} />
                <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
              </button>
              {scans.length > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={handleClearAll}
                  style={{ color: 'var(--sev-critical)', fontSize: '12px' }}
                  title="Purge all scan history"
                >
                  Clear All
                </button>
              )}
              <button className="btn btn-primary" onClick={() => onNavigate('scan')}>
                <Container size={15} />
                <span>Docker Scanner</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '36px', justifyContent: 'center' }}>
              <div className="spinner" />
              <span className="muted">Connecting to SecureShip vulnerability telemetry…</span>
            </div>
          ) : scans.length === 0 ? (
            <div className="empty">
              <Container size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p>No container images scanned yet. Launch your first Docker scan to inspect CVEs.</p>
              <button
                className="btn btn-primary"
                onClick={() => onNavigate('scan')}
                style={{ marginTop: '12px' }}
              >
                Scan an Image Now
              </button>
            </div>
          ) : (
            <ScanRows scans={scans.slice(0, 6)} onOpen={onOpenScan} onDelete={handleDelete} />
          )}
        </div>

        {/* Severity Distribution & Insights Card */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 style={{ fontSize: '17px', color: '#fff' }}>Vulnerability Distribution</h3>
            <p className="muted" style={{ fontSize: '13px', margin: '2px 0 0' }}>
              Severity breakdown across all verified container layers
            </p>
          </div>

          {stats && <Distribution distribution={stats.severity_distribution} />}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span className="muted">Completed Scans:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{stats?.completed_scans ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span className="muted">Scanner Feed Status:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>Synchronized (Trivy DB)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span className="muted">Policy Engine:</span>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>Enforced Active</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
