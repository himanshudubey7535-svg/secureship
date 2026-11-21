import { useCallback, useEffect, useRef, useState } from 'react';
import ScanStatus from '../components/ScanStatus.jsx';
import Recommendations from '../components/Recommendations.jsx';
import VulnerabilityTable from '../components/VulnerabilityTable.jsx';
import { api } from '../services/api.js';
import {
  Container,
  Radio,
  Download,
  FileJson,
  FileText,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';

const PRESETS = [
  { name: 'alpine', tag: '3.18', desc: 'Minimal footprint' },
  { name: 'nginx', tag: 'alpine', desc: 'Web server' },
  { name: 'ubuntu', tag: '18.04', desc: 'Legacy CVEs' },
  { name: 'redis', tag: '6-alpine', desc: 'In-memory DB' },
  { name: 'python', tag: '3.9-slim', desc: 'App runtime' },
];

export default function ScanImage({ scanId, onScanChange }) {
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('latest');
  const [scan, setScan] = useState(null);
  const [vulns, setVulns] = useState([]);
  const [severity, setSeverity] = useState('');
  const [scanning, setScanning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loadingVulns, setLoadingVulns] = useState(false);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  const timer = useRef(null);

  // Load an existing scan (opened from dashboard, history, or reports)
  useEffect(() => {
    if (!scanId) { setScan(null); setVulns([]); return; }
    let cancelled = false;
    setError('');
    api.getScan(scanId).then((s) => {
      if (!cancelled) {
        setScan(s);
        setSeverity('');
        setImageName(s.image_name);
        setImageTag(s.image_tag);
      }
    }).catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [scanId]);

  const loadVulns = useCallback(async () => {
    if (!scan || scan.status !== 'completed') { setVulns([]); return; }
    setLoadingVulns(true);
    try {
      setVulns(await api.getVulnerabilities(scan.id, severity));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingVulns(false);
    }
  }, [scan, severity]);

  useEffect(() => { loadVulns(); }, [loadVulns]);

  useEffect(() => {
    if (!scan || scan.status !== 'completed') { setRecs(null); return; }
    let cancelled = false;
    setLoadingRecs(true);
    api.getRecommendations(scan.id)
      .then((r) => !cancelled && setRecs(r))
      .catch(() => !cancelled && setRecs(null))
      .finally(() => !cancelled && setLoadingRecs(false));
    return () => { cancelled = true; };
  }, [scan?.id, scan?.status]);

  useEffect(() => () => clearInterval(timer.current), []);

  const handleImageNameChange = (val) => {
    setImageName(val);
    const trimmed = val.trim();
    if (trimmed && !trimmed.includes('@')) {
      const lastSlash = trimmed.lastIndexOf('/');
      const colon = trimmed.lastIndexOf(':');
      if (colon > lastSlash && colon < trimmed.length - 1) {
        setImageTag(trimmed.slice(colon + 1));
        setImageName(trimmed.slice(0, colon));
      }
    }
  };

  const applyPreset = (preset) => {
    setImageName(preset.name);
    setImageTag(preset.tag);
  };

  async function poll(id) {
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await api.getScan(id);
      if (s.status === 'completed' || s.status === 'failed') return s;
    }
    throw new Error('Scan timed out. Large images can take a while to download.');
  }

  async function startScan(e) {
    e.preventDefault();
    if (!imageName.trim()) return;
    setError('');
    setScanning(true);
    setElapsed(0);
    setScan(null);
    setVulns([]);
    setRecs(null);

    const startedAt = Date.now();
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    try {
      const created = await api.createScan(imageName.trim(), imageTag.trim() || 'latest');
      if (onScanChange) onScanChange(created.id);
      const finalScan = created.status === 'completed' || created.status === 'failed'
        ? created
        : await poll(created.id);
      setScan(finalScan);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(timer.current);
      setScanning(false);
    }
  }

  async function download(type) {
    setDownloading(type);
    try {
      await api.downloadReport(scan.id, type);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading('');
    }
  }

  return (
    <div className="scanner-container">
      {/* Futuristic Scanner Input Hero */}
      <div className="scanner-hero-card">
        <div className="scanner-headline">
          <div className="scanner-badge-icon">
            <Container size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', color: '#fff' }}>Docker Artifact Vulnerability Scanner</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '2px 0 0' }}>
              Deep-inspect container file layers, libraries, and binaries against Trivy security intelligence
            </p>
          </div>
        </div>

        <form className="scan-form" onSubmit={startScan}>
          <label className="field grow">
            <span>Container Image Repository</span>
            <input
              value={imageName}
              onChange={(e) => handleImageNameChange(e.target.value)}
              required
              placeholder="e.g. nginx:latest, alpine:3.18, or python:3.9-slim"
              disabled={scanning}
            />
          </label>

          <label className="field tag">
            <span>Tag / Version</span>
            <input
              value={imageTag}
              onChange={(e) => setImageTag(e.target.value)}
              placeholder="latest"
              disabled={scanning}
            />
          </label>

          <button
            className="btn btn-primary"
            disabled={scanning || !imageName.trim()}
            style={{ padding: '11px 22px' }}
          >
            {scanning ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                <span>Scanning Artifact…</span>
              </>
            ) : (
              <>
                <Radio size={16} />
                <span>Launch Security Scan</span>
              </>
            )}
          </button>
        </form>

        {/* Quick presets */}
        <div className="presets-container">
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Quick Presets:</span>
          {PRESETS.map((p) => (
            <button
              key={`${p.name}:${p.tag}`}
              type="button"
              className="preset-chip"
              onClick={() => applyPreset(p)}
              disabled={scanning}
              title={p.desc}
            >
              {p.name}:{p.tag}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert" role="alert">{error}</div>}

      {/* Progress or Scan Status View */}
      <ScanStatus scan={scan} scanning={scanning} elapsed={elapsed} />

      {/* Detailed Analysis View (when scan completed) */}
      {scan && scan.status === 'completed' && (
        <>
          {/* Action Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="muted" style={{ fontSize: '13px' }}>Audit Artifact:</span>
              <span className="mono-pill" style={{ color: 'var(--accent-cyan)' }}>{scan.full_reference}</span>
            </div>

            <div className="actions" style={{ margin: 0 }}>
              <button
                className="btn btn-ghost"
                onClick={() => download('json')}
                disabled={!!downloading}
                title="Download raw Trivy JSON report"
              >
                <FileJson size={15} color="var(--accent-cyan)" />
                <span>{downloading === 'json' ? 'Generating…' : 'Export JSON'}</span>
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => download('pdf')}
                disabled={!!downloading}
                title="Download formatted executive security report"
              >
                <FileText size={15} color="var(--accent-green)" />
                <span>{downloading === 'pdf' ? 'Generating…' : 'Export PDF'}</span>
              </button>
            </div>
          </div>

          <Recommendations data={recs} loading={loadingRecs} />

          <VulnerabilityTable
            vulnerabilities={vulns}
            severity={severity}
            onSeverityChange={setSeverity}
            loading={loadingVulns}
          />
        </>
      )}

      {!scan && !scanning && !error && (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Sparkles size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
          <h3 style={{ color: '#fff', fontSize: '17px' }}>Ready for Security Evaluation</h3>
          <p className="muted" style={{ maxWidth: '480px', margin: '6px auto 0', fontSize: '13.5px' }}>
            Enter any public or container image reference above to trigger real-time CVE vulnerability scanning, layer risk scoring, and remediation advisories.
          </p>
        </div>
      )}
    </div>
  );
}
