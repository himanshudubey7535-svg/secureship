import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { ShieldCheck, Sliders, Lock, CheckCircle2, AlertTriangle, Save } from 'lucide-react';

export default function SecuritySettings() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getPolicy().then((p) => { setSaved(p); setForm(p); }).catch((e) => setError(e.message));
  }, []);

  if (!form) {
    return error ? (
      <div className="alert" role="alert">{error}</div>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '30px' }}>
        <div className="spinner" />
        <span className="muted">Retrieving policy configuration…</span>
      </div>
    );
  }

  const setNum = (k) => (e) => setForm({ ...form, [k]: e.target.value === '' ? '' : Number(e.target.value) });
  const setBool = (k) => (e) => setForm({ ...form, [k]: e.target.checked });

  async function save(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const updated = await api.updatePolicy({
        ...form,
        max_critical: Number(form.max_critical),
        max_high: Number(form.max_high),
      });
      setSaved(updated);
      setForm(updated);
      setMessage('Policy successfully synchronized.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-grid">
      <form className="panel" onSubmit={save}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Sliders size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '18px', color: '#fff' }}>Deployment Gate Policies</h3>
        </div>
        <p className="muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>
          Set admission thresholds for container releases. Scans exceeding these vulnerability limits will trigger policy violations and block CI/CD rollout.
        </p>

        <div className="policy-row" style={{ marginTop: '12px' }}>
          <label className="field">
            <span>Max Critical Findings</span>
            <input
              type="number"
              min="0"
              required
              value={form.max_critical}
              onChange={setNum('max_critical')}
            />
          </label>
          <label className="check" style={{ paddingBottom: '10px' }}>
            <input
              type="checkbox"
              checked={form.block_on_critical}
              onChange={setBool('block_on_critical')}
            />
            <span>Block deployment if exceeded</span>
          </label>
        </div>

        <div className="policy-row">
          <label className="field">
            <span>Max High Findings</span>
            <input
              type="number"
              min="0"
              required
              value={form.max_high}
              onChange={setNum('max_high')}
            />
          </label>
          <label className="check" style={{ paddingBottom: '10px' }}>
            <input
              type="checkbox"
              checked={form.block_on_high}
              onChange={setBool('block_on_high')}
            />
            <span>Block deployment if exceeded</span>
          </label>
        </div>

        {error && <div className="alert" role="alert">{error}</div>}
        {message && <div className="notice" role="status">{message}</div>}

        <button className="btn btn-primary" disabled={busy} style={{ width: 'fit-content', marginTop: '8px' }}>
          <Save size={15} />
          <span>{busy ? 'Applying Policy…' : 'Save Policy Changes'}</span>
        </button>
      </form>

      <div className="panel" style={{ height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="var(--accent-green)" />
          <h3 style={{ fontSize: '17px', color: '#fff' }}>Enforced Policy Profile</h3>
        </div>
        <p className="muted" style={{ fontSize: '12.5px', margin: 0 }}>
          Active security gate rules evaluated on every scanned image
        </p>

        <dl className="kv">
          <dt>Critical Threshold</dt>
          <dd style={{ color: saved.block_on_critical ? 'var(--sev-critical)' : 'var(--accent-green)' }}>
            Max {saved.max_critical} ({saved.block_on_critical ? 'Blocks' : 'Warns only'})
          </dd>

          <dt>High Threshold</dt>
          <dd style={{ color: saved.block_on_high ? 'var(--sev-high)' : 'var(--accent-green)' }}>
            Max {saved.max_high} ({saved.block_on_high ? 'Blocks' : 'Warns only'})
          </dd>

          <dt>Evaluation Engine</dt>
          <dd style={{ color: 'var(--accent-cyan)' }}>Automated Static Analysis</dd>
        </dl>
      </div>
    </div>
  );
}
