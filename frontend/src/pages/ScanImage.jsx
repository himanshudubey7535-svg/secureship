import { useCallback, useEffect, useRef, useState } from 'react';
import ScanStatus from '../components/ScanStatus.jsx';
import Recommendations from '../components/Recommendations.jsx';
import VulnerabilityTable from '../components/VulnerabilityTable.jsx';
import { api } from '../services/api.js';

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

  // Load an existing scan (opened from the dashboard or history).
  useEffect(() => {
    if (!scanId) { setScan(null); setVulns([]); return; }
    let cancelled = false;
    setError('');
    api.getScan(scanId).then((s) => { if (!cancelled) { setScan(s); setSeverity(''); } })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [scanId]);

  const loadVulns = useCallback(async () => {
    if (!scan || scan.status !== 'completed') { setVulns([]); return; }
    setLoadingVulns(true);
    try { setVulns(await api.getVulnerabilities(scan.id, severity)); }
    catch (e) { setError(e.message); }
    finally { setLoadingVulns(false); }
  }, [scan, severity]);

  useEffect(() => { loadVulns(); }, [loadVulns]);

  useEffect(() => {
    if (!scan || scan.status !== 'completed') { setRecs(null); return; }
    let cancelled = false;
    setLoadingRecs(true);
    api.getRecommendations(scan.id).then((r) => !cancelled && setRecs(r))
      .catch(() => !cancelled && setRecs(null))
      .finally(() => !cancelled && setLoadingRecs(false));
    return () => { cancelled = true; };
  }, [scan?.id, scan?.status]);
  useEffect(() => () => clearInterval(timer.current), []);

  async function startScan(e) {
    e.preventDefault();
    setError('');
    setScan(null);
    setVulns([]);
    setSeverity('');
    setScanning(true);
    setElapsed(0);
    timer.current = setInterval(() => setElapsed((n) => n + 1), 1000);
    try {
      const result = await api.createScan(imageName.trim(), imageTag.trim() || 'latest');
      setScan(result);
      onScanChange?.(result.id);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(timer.current);
      setScanning(false);
    }
  }

  async function download(type) {
    setDownloading(type);
    try { await api.downloadReport(scan.id, type); }
    catch (e) { setError(e.message); }
    finally { setDownloading(''); }
  }

  return (
    <>
      <form className="panel scan-form" onSubmit={startScan}>
        <label className="field grow">Image name
          <input value={imageName} onChange={(e) => setImageName(e.target.value)} required
                 placeholder="nginx or ghcr.io/org/app" disabled={scanning} />
        </label>
        <label className="field tag">Tag
          <input value={imageTag} onChange={(e) => setImageTag(e.target.value)} placeholder="latest" disabled={scanning} />
        </label>
        <button className="btn btn-primary" disabled={scanning || !imageName.trim()}>
          {scanning ? 'Scanning…' : 'Scan image'}
        </button>
      </form>

      {error && <div className="alert" role="alert">{error}</div>}

      <ScanStatus scan={scan} scanning={scanning} elapsed={elapsed} />

      {scan && scan.status === 'completed' && (
        <>
          <div className="actions">
            <button className="btn" onClick={() => download('json')} disabled={!!downloading}>
              {downloading === 'json' ? 'Preparing…' : 'Download JSON'}
            </button>
            <button className="btn" onClick={() => download('pdf')} disabled={!!downloading}>
              {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
          <Recommendations data={recs} loading={loadingRecs} />
          <VulnerabilityTable vulnerabilities={vulns} severity={severity}
                              onSeverityChange={setSeverity} loading={loadingVulns} />
        </>
      )}

      {!scan && !scanning && !error && (
        <p className="empty">Enter an image above to check it for known vulnerabilities.</p>
      )}
    </>
  );
}
