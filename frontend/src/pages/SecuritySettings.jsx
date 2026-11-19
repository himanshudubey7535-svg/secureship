import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

export default function SecuritySettings() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getPolicy().then((p) => { setSaved(p); setForm(p); }).catch((e) => setError(e.message));
  }, []);

  if (!form) return error ? <div className="alert" role="alert">{error}</div> : <p className="muted">Loading…</p>;

  const setNum = (k) => (e) => setForm({ ...form, [k]: e.target.value === '' ? '' : Number(e.target.value) });
  const setBool = (k) => (e) => setForm({ ...form, [k]: e.target.checked });

  async function save(e) {
    e.preventDefault();
    setError(''); setMessage(''); setBusy(true);
    try {
      const updated = await api.updatePolicy({
        ...form, max_critical: Number(form.max_critical), max_high: Number(form.max_high),
      });
      setSaved(updated); setForm(updated); setMessage('Policy saved.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="settings-grid">
      <form className="panel" onSubmit={save}>
        <h3>Deployment policy</h3>
        <p className="muted">
          A scan fails the policy when it has more vulnerabilities than the limit and blocking is
          turned on for that severity. With blocking off, exceeding the limit only shows a warning.
        </p>

        <div className="policy-row">
          <label className="field">Maximum critical
            <input type="number" min="0" required value={form.max_critical} onChange={setNum('max_critical')} />
          </label>
          <label className="check">
            <input type="checkbox" checked={form.block_on_critical} onChange={setBool('block_on_critical')} />
            Block when exceeded
          </label>
        </div>

        <div className="policy-row">
          <label className="field">Maximum high
            <input type="number" min="0" required value={form.max_high} onChange={setNum('max_high')} />
          </label>
          <label className="check">
            <input type="checkbox" checked={form.block_on_high} onChange={setBool('block_on_high')} />
            Block when exceeded
          </label>
        </div>

        {error && <div className="alert" role="alert">{error}</div>}
        {message && <div className="notice" role="status">{message}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save policy'}</button>
      </form>

      <div className="panel">
        <h3>Current policy</h3>
        <dl className="kv">
          <dt>Critical limit</dt><dd>{saved.max_critical} ({saved.block_on_critical ? 'blocks' : 'warns'})</dd>
          <dt>High limit</dt><dd>{saved.max_high} ({saved.block_on_high ? 'blocks' : 'warns'})</dd>
        </dl>
      </div>
    </div>
  );
}
