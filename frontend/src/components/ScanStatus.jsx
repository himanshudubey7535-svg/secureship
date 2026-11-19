const SEVERITIES = [
  ['critical_count', 'Critical', 'critical'],
  ['high_count', 'High', 'high'],
  ['medium_count', 'Medium', 'medium'],
  ['low_count', 'Low', 'low'],
  ['unknown_count', 'Unknown', 'unknown'],
];

export function scoreTone(score) {
  if (score == null) return 'muted';
  if (score >= 90) return 'good';
  if (score >= 70) return 'ok';
  if (score >= 40) return 'warn';
  return 'bad';
}

function ScoreRing({ score }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <svg className={`score-ring tone-${scoreTone(score)}`} viewBox="0 0 120 120" role="img"
         aria-label={`Security score ${score} out of 100`}>
      <circle className="ring-track" cx="60" cy="60" r={r} />
      <circle className="ring-fill" cx="60" cy="60" r={r}
              strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
      <text x="60" y="64" textAnchor="middle" className="ring-value">{Math.round(score)}</text>
      <text x="60" y="82" textAnchor="middle" className="ring-sub">/ 100</text>
    </svg>
  );
}

export function SeverityBar({ scan }) {
  const total = SEVERITIES.reduce((n, [k]) => n + (scan[k] || 0), 0);
  if (total === 0) return null;
  return (
    <div className="sev-bar" role="img" aria-label="Severity distribution">
      {SEVERITIES.map(([key, label, cls]) =>
        scan[key] > 0 ? (
          <span key={key} className={`sev-seg sev-${cls}`} title={`${label}: ${scan[key]}`}
                style={{ flexGrow: scan[key] }} />
        ) : null
      )}
    </div>
  );
}

export function ScoreFactors({ explanation }) {
  const rows = explanation.factors.filter((f) => f.count > 0);
  return (
    <details className="factors">
      <summary>How this score was calculated</summary>
      {rows.length === 0 ? (
        <p className="muted">No vulnerabilities, so the risk is 0 and the score is 100.</p>
      ) : (
        <table className="table compact">
          <thead><tr><th>Severity</th><th>Count</th><th>Weight</th><th>Risk points</th><th>Share</th></tr></thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.severity}>
                <td style={{ textTransform: 'capitalize' }}>{f.severity}</td>
                <td>{f.count}</td><td>×{f.weight}</td><td>{f.points}</td><td>{f.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">
        Total risk {explanation.total_risk}. <span className="mono">{explanation.formula}</span>.
        This is a project-defined heuristic, not an industry-standard rating.
      </p>
    </details>
  );
}

export default function ScanStatus({ scan, scanning, elapsed = 0 }) {
  if (scanning) {
    return (
      <div className="panel scan-status">
        <div className="spinner" aria-hidden="true" />
        <div>
          <strong>Scanning image…</strong>
          <p className="muted">
            Pulling the image and checking it against the vulnerability database ({elapsed}s). The
            first scan can take a few minutes.
          </p>
        </div>
      </div>
    );
  }
  if (!scan) return null;

  if (scan.status === 'failed') {
    return (
      <div className="panel scan-failed" role="alert">
        <strong>Scan failed for {scan.full_reference}</strong>
        <p>{scan.error_message || 'The scan did not complete.'}</p>
      </div>
    );
  }
  if (scan.status !== 'completed') {
    return (
      <div className="panel"><strong>Scan {scan.status}</strong></div>
    );
  }

  const policy = scan.policy;
  return (
    <div className="panel scan-result">
      <ScoreRing score={scan.security_score} />
      <div className="scan-result-body">
        <div className="scan-result-title">
          <h2>{scan.full_reference}</h2>
          <span className={`pill tone-${scoreTone(scan.security_score)}`}>{scan.risk_category}</span>
          {policy && (
            <span className={`pill ${policy.passed ? 'tone-good' : 'tone-bad'}`}>
              Policy {policy.passed ? 'passed' : 'failed'}
            </span>
          )}
        </div>
        <p className="muted">
          {scan.total_vulns === 0
            ? 'No known vulnerabilities found.'
            : `${scan.total_vulns} vulnerabilities found.`}
        </p>
        <SeverityBar scan={scan} />
        <div className="sev-legend">
          {SEVERITIES.map(([key, label, cls]) => (
            <span key={key}><i className={`dot sev-${cls}`} />{label} <b>{scan[key]}</b></span>
          ))}
        </div>
        {scan.explanation && <ScoreFactors explanation={scan.explanation} />}
        {policy && [...policy.violations, ...policy.warnings].length > 0 && (
          <ul className="policy-notes">
            {policy.violations.map((v) => <li key={v} className="violation">Blocked: {v}</li>)}
            {policy.warnings.map((w) => <li key={w} className="warning">Warning: {w}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
