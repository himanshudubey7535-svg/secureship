import { ShieldCheck, ShieldAlert, AlertTriangle, Layers, Radio } from 'lucide-react';

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
  const tone = scoreTone(score);

  return (
    <svg className={`score-ring tone-${tone}`} viewBox="0 0 120 120" role="img"
         aria-label={`Security score ${score} out of 100`}>
      <circle className="ring-track" cx="60" cy="60" r={r} />
      <circle className="ring-fill" cx="60" cy="60" r={r}
              strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
      <text x="60" y="64" textAnchor="middle" className="ring-value">{Math.round(score)}</text>
      <text x="60" y="82" textAnchor="middle" className="ring-sub">DEFENSE SCORE</text>
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
    <details className="factors" style={{ marginTop: '8px' }}>
      <summary style={{ cursor: 'pointer', color: 'var(--accent-cyan)', fontWeight: 600 }}>
        Risk Breakdown & Weight Analysis
      </summary>
      {rows.length === 0 ? (
        <p className="muted">Zero CVE findings: Risk coefficient is 0, maximum defense score 100.</p>
      ) : (
        <div className="table-wrap" style={{ marginTop: '10px' }}>
          <table className="table">
            <thead><tr><th>Severity</th><th>Findings</th><th>Weight</th><th>Risk Points</th><th>Threat Share</th></tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.severity}>
                  <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{f.severity}</td>
                  <td>{f.count}</td>
                  <td className="mono">×{f.weight}</td>
                  <td className="mono" style={{ color: 'var(--accent-cyan)' }}>{f.points}</td>
                  <td>{f.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
        Total computed risk: <b>{explanation.total_risk}</b>. Formula: <span className="mono">{explanation.formula}</span>.
      </p>
    </details>
  );
}

export default function ScanStatus({ scan, scanning, elapsed = 0 }) {
  if (scanning) {
    return (
      <div className="scanning-card">
        <div className="radar-scope">
          <div className="radar-sweep" />
          <Radio size={24} color="var(--accent-cyan)" />
        </div>
        <div className="scanning-details">
          <div className="scanning-title">Analyzing Container Artifact... ({elapsed}s)</div>
          <div className="muted" style={{ fontSize: '13px' }}>
            Trivy engine is inspecting layer manifests, OS packages, and matching against National Vulnerability Database (NVD).
          </div>
          <div className="scanning-phase-steps">
            <span style={{ color: 'var(--accent-cyan)' }}>● Pulling Layers</span>
            <span>→</span>
            <span style={{ color: elapsed > 3 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>● Scanning CVEs</span>
            <span>→</span>
            <span style={{ color: elapsed > 8 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>● Evaluating Policies</span>
          </div>
        </div>
      </div>
    );
  }

  if (!scan) return null;

  if (scan.status === 'failed') {
    return (
      <div className="panel alert" role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
          <ShieldAlert size={20} />
          <span>Scan failed for {scan.full_reference}</span>
        </div>
        <p style={{ margin: '4px 0 0', opacity: 0.9 }}>{scan.error_message || 'Image manifest could not be retrieved or scanned.'}</p>
      </div>
    );
  }

  if (scan.status !== 'completed') {
    return (
      <div className="panel">
        <strong>Scan Status: <span className={`badge status-${scan.status}`}>{scan.status}</span></strong>
      </div>
    );
  }

  const policy = scan.policy;
  return (
    <div className="panel scan-result">
      <ScoreRing score={scan.security_score} />
      <div className="scan-result-body">
        <div className="scan-result-title">
          <h2 className="mono" style={{ fontSize: '20px', color: '#fff' }}>{scan.full_reference}</h2>
          <span className={`pill tone-${scoreTone(scan.security_score)}`}>{scan.risk_category} Risk</span>
          {policy && (
            <span className={`pill ${policy.passed ? 'tone-good' : 'tone-bad'}`}>
              {policy.passed ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              Policy {policy.passed ? 'Passed' : 'Blocked'}
            </span>
          )}
        </div>
        <p className="muted">
          {scan.total_vulns === 0
            ? 'Safe for production deployment: Zero known vulnerabilities detected.'
            : `Identified ${scan.total_vulns} security vulnerabilities across container layers.`}
        </p>

        <SeverityBar scan={scan} />

        <div className="sev-legend">
          {SEVERITIES.map(([key, label, cls]) => (
            <span key={key}>
              <i className={`dot sev-${cls}`} />
              {label} <b>{scan[key]}</b>
            </span>
          ))}
        </div>

        {scan.explanation && <ScoreFactors explanation={scan.explanation} />}

        {policy && [...policy.violations, ...policy.warnings].length > 0 && (
          <ul className="policy-notes">
            {policy.violations.map((v) => <li key={v} className="violation">Violation: {v}</li>)}
            {policy.warnings.map((w) => <li key={w} className="warning">Notice: {w}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
