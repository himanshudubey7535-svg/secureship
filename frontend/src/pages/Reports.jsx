import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatDate } from './Dashboard.jsx';
import { scoreTone } from '../components/ScanStatus.jsx';
import {
  FileText,
  FileJson,
  Download,
  ShieldCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  Layers,
  Container
} from 'lucide-react';

export default function Reports({ onOpenScan }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadScans = useCallback(async () => {
    try {
      const data = await api.getScans();
      setScans(data.filter((s) => s.status === 'completed'));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const handleDownload = async (scanId, type) => {
    setDownloadingId(`${scanId}-${type}`);
    try {
      await api.downloadReport(scanId, type);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = scans.filter((s) =>
    !searchTerm.trim() ||
    s.image_name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    s.image_tag.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel">
        <div className="table-toolbar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '18px', color: '#fff' }}>Compliance & Vulnerability Reports</h3>
            </div>
            <p className="muted" style={{ fontSize: '13px', margin: '2px 0 0' }}>
              Download official security audit artifacts and compliance declarations
            </p>
          </div>

          <div className="quick-search-box" style={{ width: '220px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '36px', justifyContent: 'center' }}>
            <div className="spinner" />
            <span className="muted">Gathering audit records…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p>No completed vulnerability reports found. Scan a container image to generate compliance documentation.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {filtered.map((s) => {
              const policy = s.policy;
              const isDownloadingJson = downloadingId === `${s.id}-json`;
              const isDownloadingPdf = downloadingId === `${s.id}-pdf`;

              return (
                <div
                  key={s.id}
                  className="panel"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    padding: '18px 20px',
                    borderColor: 'rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Container size={18} color="var(--accent-cyan)" />
                      <div>
                        <div className="mono" style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                          {s.image_name}:{s.image_tag}
                        </div>
                        <div className="muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          Audited: {formatDate(s.completed_at || s.created_at)}
                        </div>
                      </div>
                    </div>

                    <span className={`score tone-${scoreTone(s.security_score)}`} style={{ fontSize: '14px' }}>
                      {s.security_score}/100
                    </span>
                  </div>

                  {/* Findings breakdown */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge sev-critical">{s.critical_count} Critical</span>
                    <span className="badge sev-high">{s.high_count} High</span>
                    <span className="badge sev-medium">{s.medium_count} Medium</span>
                    <span className="badge sev-low">{s.low_count} Low</span>
                  </div>

                  {/* Policy Verdict */}
                  {policy && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                      {policy.passed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-green)', fontWeight: 600 }}>
                          <ShieldCheck size={15} />
                          <span>Deployment Policy: PASSED</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--sev-critical)', fontWeight: 600 }}>
                          <ShieldAlert size={15} />
                          <span>Deployment Policy: BLOCKED ({policy.violations.length} violations)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '12px', justifyContent: 'center' }}
                      onClick={() => handleDownload(s.id, 'json')}
                      disabled={isDownloadingJson}
                    >
                      <FileJson size={14} color="var(--accent-cyan)" />
                      <span>{isDownloadingJson ? 'Exporting…' : 'JSON Report'}</span>
                    </button>

                    <button
                      className="btn btn-ghost"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '12px', justifyContent: 'center' }}
                      onClick={() => handleDownload(s.id, 'pdf')}
                      disabled={isDownloadingPdf}
                    >
                      <FileText size={14} color="var(--accent-green)" />
                      <span>{isDownloadingPdf ? 'Exporting…' : 'PDF Report'}</span>
                    </button>

                    <button
                      className="btn btn-primary"
                      style={{ padding: '7px 12px', fontSize: '12px' }}
                      onClick={() => onOpenScan(s.id)}
                      title="Inspect full vulnerability analysis"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
