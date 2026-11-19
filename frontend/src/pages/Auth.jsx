import { useState } from 'react';
import { api } from '../services/api.js';

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = mode === 'login'
        ? await api.login(form.email, form.password)
        : await api.register(form.username, form.email, form.password);
      onAuthenticated(data.token, data.username || form.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="brand"><span className="brand-mark" aria-hidden="true" />SecureShip</div>
        <h1>{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
        <p className="muted">Secure every container before deployment.</p>

        {mode === 'register' && (
          <label className="field">Username
            <input value={form.username} onChange={set('username')} required minLength={3} maxLength={50}
                   autoComplete="username" />
          </label>
        )}
        <label className="field">Email
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label className="field">Password
          <input type="password" value={form.password} onChange={set('password')} required minLength={8}
                 autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {mode === 'register' && <small className="muted">At least 8 characters.</small>}
        </label>

        {error && <div className="alert" role="alert">{error}</div>}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <button type="button" className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  );
}
