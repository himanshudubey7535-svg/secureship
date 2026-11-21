import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { scoreTone } from '../components/ScanStatus.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Boxes,
  Activity,
  Layers
} from 'lucide-react';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [scans, setScans] = useState([]);
  const [topPackages, setTopPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    try {
      const [st, sc] = await Promise.all([api.getStats(), api.getScans()]);
      setStats(st);
      setScans(sc);

      // Extract top vulnerable packages from recent completed scan recommendations
      const completedScans = sc.filter((s) => s.status === 'completed');
      if (completedScans.length > 0) {
        const pkgMap = {};
        for (const scan of completedScans.slice(0, 5)) {
          try {
            const rec = await api.getRecommendations(scan.id);
            if (rec && rec.recommendations) {
              for (const r of rec.recommendations) {
                pkgMap[r.package_name] = (pkgMap[r.package_name] || 0) + (r.fixes || 1);
              }
            }
          } catch {
            // ignore partial recommendation errors
          }
        }
        const sorted = Object.entries(pkgMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setTopPackages(sorted);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const sevDist = stats?.severity_distribution || {};
  const totalVulns = stats?.total_vulnerabilities || 0;

  const sevStats = [
    { label: 'Critical Threat', count: sevDist.critical || 0, color: 'var(--sev-critical)' },
    { label: 'High Priority', count: sevDist.high || 0, color: 'var(--sev-high)' },
    { label: 'Medium Priority', count: sevDist.medium || 0, color: 'var(--sev-medium)' },
    { label: 'Low / Info', count: sevDist.low || 0, color: 'var(--sev-low)' },
    { label: 'Unknown Severity', count: sevDist.unknown || 0, color: 'var(--sev-unknown)' },
  ];

  const maxPackageCount = topPackages.length > 0 ? Math.max(...topPackages.map((p) => p.count)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label="Cluster Images Analyzed"
          value={stats?.total_images ?? '-'}
          hint="Unique repositories"
          tone="ok"
        />
        <StatCard
          label="Evaluated Vulnerabilities"
          value={stats?.total_vulnerabilities ?? '-'}
          hint="Tracked CVE instances"
          tone={stats?.total_vulnerabilities ? 'warn' : 'default'}
        />
        <StatCard
          label="Critical Exploits Detected"
          value={stats?.critical_vulnerabilities ?? '-'}
          hint="Immediate patch needed"
          tone={stats?.critical_vulnerabilities ? 'bad' : 'good'}
        />
        <StatCard
          label="Overall Defense Score"
          value={stats?.average_score != null ? `${stats.average_score}/100` : '-'}
          hint="Cluster health posture"
          tone={scoreTone(stats?.average_score)}
        />
      </div>

      {error && <div className="alert" role="alert">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '40px', justifyContent: 'center' }}>
          <div className="spinner" />
          <span className="muted">Compiling telemetry charts and threat intelligence…</span>
        </div>
      ) : (
        <div className="analytics-grid">
          {/* Threat Distribution Chart */}
          <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Flame size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '17px', color: '#fff' }}>Severity Distribution Telemetry</h3>
            </div>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '18px' }}>
              Proportional distribution of identified security vulnerabilities by threat impact
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sevStats.map((item) => {
                const pct = totalVulns > 0 ? Math.round((item.count / totalVulns) * 100) : 0;
                return (
                  <div key={item.label} className="metric-bar-item">
                    <div className="metric-bar-header">
                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 700 }}>
                        {item.count} findings ({pct}%)
                      </span>
                    </div>
                    <div className="metric-bar-track">
                      <div
                        className="metric-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: item.color,
                          boxShadow: `0 0 10px ${item.color}`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Vulnerable Packages */}
          <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Layers size={18} color="var(--accent-green)" />
              <h3 style={{ fontSize: '17px', color: '#fff' }}>Most Vulnerable Base Packages</h3>
            </div>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '18px' }}>
              Top operating system and application dependencies generating CVE alerts
            </p>

            {topPackages.length === 0 ? (
              <div className="empty" style={{ padding: '24px' }}>
                <ShieldCheck size={32} color="var(--accent-green)" style={{ margin: '0 auto 8px' }} />
                <p>No vulnerable package concentrations detected.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topPackages.map((pkg) => {
                  const pct = Math.round((pkg.count / maxPackageCount) * 100);
                  return (
                    <div key={pkg.name} className="metric-bar-item">
                      <div className="metric-bar-header">
                        <span className="mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {pkg.name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                          {pkg.count} CVE impact
                        </span>
                      </div>
                      <div className="metric-bar-track">
                        <div
                          className="metric-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: 'var(--grad-cyan-green)'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Image Defense Scores Breakdown */}
          <div className="panel" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Activity size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '17px', color: '#fff' }}>Image Security Score Benchmarks</h3>
            </div>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '18px' }}>
              Evaluated security rating per container image artifact
            </p>

            {scans.length === 0 ? (
              <div className="empty">No image evaluations to display.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Image Target</th>
                      <th>Tag</th>
                      <th>Security Score</th>
                      <th>Risk Classification</th>
                      <th>Critical Findings</th>
                      <th>Total CVEs</th>
                      <th>Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.slice(0, 10).map((s) => (
                      <tr key={s.id}>
                        <td>
                          <span className="mono-pill" style={{ fontWeight: 600 }}>{s.image_name}</span>
                        </td>
                        <td><span className="mono-pill">{s.image_tag}</span></td>
                        <td>
                          {s.security_score != null ? (
                            <span className={`score tone-${scoreTone(s.security_score)}`}>
                              {s.security_score}/100
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`pill tone-${scoreTone(s.security_score)}`}>
                            {s.risk_category || 'Unclassified'}
                          </span>
                        </td>
                        <td>
                          {s.critical_count > 0 ? (
                            <span className="badge sev-critical">{s.critical_count}</span>
                          ) : (
                            <span className="muted">0</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{s.total_vulns}</td>
                        <td>
                          {s.policy ? (
                            <span className={`badge ${s.policy.passed ? 'status-completed' : 'status-failed'}`}>
                              {s.policy.passed ? 'Compliant' : 'Blocked'}
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
