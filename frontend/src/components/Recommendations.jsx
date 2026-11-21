import { Wrench, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function Recommendations({ data, loading }) {
  if (loading) {
    return (
      <div className="panel" style={{ marginTop: '20px' }}>
        <p className="muted">Evaluating package upgrade recommendations…</p>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="panel" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '16px', color: '#fff' }}>Remediation & Fix Recommendations</h3>
        </div>
        <span className="cloud-status-pill" style={{ fontSize: '11px' }}>
          {data.fixable} Available Fixes
        </span>
      </div>

      <p className="muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
        {data.fixable} of {data.total_vulnerabilities} findings can be remediated by upgrading base packages
        {data.unfixable > 0 ? `; ${data.unfixable} findings currently have no upstream fix available.` : '.'}
      </p>

      {data.recommendations.length === 0 ? (
        <div className="empty" style={{ padding: '20px' }}>
          {data.total_vulnerabilities === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-green)' }}>
              <CheckCircle2 size={18} />
              <span>Zero vulnerabilities detected. No package updates required.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="var(--sev-medium)" />
              <span>No upstream patch versions available yet. Monitor package vendor for updates.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Package Name</th>
                <th>Upgrade Target</th>
                <th>Resolved CVEs</th>
                <th>Worst Severity</th>
              </tr>
            </thead>
            <tbody>
              {data.recommendations.slice(0, 15).map((r) => (
                <tr key={`${r.package_name}-${r.installed_version}`}>
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>{r.package_name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono-pill">{r.installed_version}</span>
                      <ArrowRight size={13} color="var(--accent-cyan)" />
                      <span className="mono-pill" style={{ borderColor: 'rgba(0, 245, 160, 0.4)', color: 'var(--accent-green)' }}>
                        {r.upgrade_to}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{r.fixes} CVE{r.fixes === 1 ? '' : 's'}</span>
                  </td>
                  <td>
                    <span className={`badge sev-${r.worst_severity.toLowerCase()}`}>
                      {r.worst_severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recommendations.length > 15 && (
            <p className="muted" style={{ padding: '8px 14px', fontSize: '12px' }}>
              Displaying 15 of {data.recommendations.length} packages with available fixes. Export JSON report for full inventory.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
