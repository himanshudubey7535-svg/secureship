export default function Header({ title, subtitle }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted" style={{ marginTop: '4px' }}>{subtitle}</p>}
      </div>
      <div className="header-status-badge">
        <span style={{ fontSize: '10px' }}>●</span>
        <span>Secure Guard Active</span>
      </div>
    </header>
  );
}
