import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import { scoreTone } from '../components/ScanStatus.jsx';
import { api } from '../services/api.js';

export function formatDate(iso) {
  if (!iso) return '-';
  // The API returns naive UTC timestamps; add Z so the browser converts to local time.
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function ScanRows({ scans, onOpen }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Image</th><th>Tag</th><th>Status</th><th>Score</th><th>Critical</th><th>High</th><th>Total</th><th>Scanned</th></tr>
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
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getScans(), api.getStats()])
      .then(([sc, st]) => { setScans(sc); setStats(st); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
            <button className="btn btn-primary" onClick={() => onNavigate('scan')}>Quick scan</button>
          </div>
          {loading ? <p className="muted">Loading…</p>
            : scans.length === 0 ? (
              <p className="empty">No scans yet. Scan your first image to see its security score here.</p>
            ) : <ScanRows scans={scans.slice(0, 5)} onOpen={onOpenScan} />}
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
