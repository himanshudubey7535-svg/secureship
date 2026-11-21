import { Search, Bell, Shield, Menu, Snowflake, Sun, Moon } from 'lucide-react';

export default function Header({
  title,
  subtitle,
  onOpenMobile,
  searchQuery = '',
  onSearchChange,
  snowEnabled = true,
  onToggleSnow,
  theme = 'dark',
  onToggleTheme
}) {
  return (
    <header className="page-header">
      <div className="header-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '2px' }}>
          <span>SecureShip Cyber Platform</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenMobile && (
            <button
              className="header-btn"
              onClick={onOpenMobile}
              aria-label="Open navigation menu"
              style={{ display: 'none' }}
              id="mobile-menu-btn"
            >
              <Menu size={18} />
            </button>
          )}
          <h1>{title}</h1>
        </div>
        {subtitle && <p className="muted" style={{ marginTop: '2px' }}>{subtitle}</p>}
      </div>

      <div className="header-right">
        {onSearchChange && (
          <div className="quick-search-box">
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search images or CVEs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {onToggleTheme && (
          <button
            className="header-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Default Mode (Light/Off-White)' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme Mode"
            style={{ color: theme === 'dark' ? '#fbbf24' : '#6366f1' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {onToggleSnow && (
          <button
            className="header-btn"
            onClick={onToggleSnow}
            title={snowEnabled ? 'Disable winter snowfall' : 'Enable winter snowfall'}
            aria-label="Toggle Winter Snow"
            style={{ color: snowEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
          >
            <Snowflake size={16} />
          </button>
        )}

        <button className="header-btn" title="Threat Alerts" aria-label="Notifications">
          <Bell size={17} />
          <span className="notification-badge-dot" />
        </button>

        <div className="cloud-status-pill">
          <Shield size={13} />
          <span>Active Sentinel</span>
        </div>
      </div>
    </header>
  );
}
