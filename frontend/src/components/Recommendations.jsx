export default function Recommendations({ data, loading }) {
  if (loading) return <div className="panel"><p className="muted">Loading recommendations…</p></div>;
  if (!data) return null;
  return (
    <div className="panel">
      <h3>Recommended fixes</h3>
      <p className="muted">
        {data.fixable} of {data.total_vulnerabilities} findings have a fixed version available
        {data.unfixable > 0 ? `; ${data.unfixable} have no upstream fix yet.` : '.'}
      </p>
      {data.recommendations.length === 0 ? (
        <p className="empty">
          {data.total_vulnerabilities === 0 ? 'Nothing to fix.' : 'No fixes are available yet. Check again after the base image updates.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Package</th><th>Upgrade</th><th>Fixes</th><th>Worst severity</th></tr></thead>
            <tbody>
              {data.recommendations.slice(0, 15).map((r) => (
                <tr key={`${r.package_name}-${r.installed_version}`}>
                  <td>{r.package_name}</td>
                  <td className="mono">{r.installed_version} → {r.upgrade_to}</td>
                  <td>{r.fixes} CVE{r.fixes === 1 ? '' : 's'}</td>
                  <td><span className={`badge sev-${r.worst_severity.toLowerCase()}`}>{r.worst_severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recommendations.length > 15 && (
            <p className="muted">Showing 15 of {data.recommendations.length} packages. Download the JSON report for all.</p>
          )}
        </div>
      )}
    </div>
  );
}
