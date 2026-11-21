import {
  LayoutDashboard,
  Container,
  History,
  FileText,
  BarChart3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Server
} from 'lucide-react';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scan', label: 'Docker Scanner', icon: Container },
  { id: 'history', label: 'Scan History', icon: History },
  { id: 'reports', label: 'Vulnerability Reports', icon: FileText },
  { id: 'analytics', label: 'Security Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Security Policies', icon: ShieldCheck },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}) {
  return (
    <>
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} aria-hidden="true" />
      )}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand-wrapper">
          <div className="brand" onClick={() => onNavigate('dashboard')} title="SecureShip">
            <div className="brand-icon-box">
              <ShieldAlert size={22} strokeWidth={2.4} />
            </div>
            {!collapsed && (
              <div className="brand-info">
                <span className="brand-name">SecureShip</span>
                <span className="brand-sub">Cyber Defense</span>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        <nav className="nav" aria-label="Main Navigation">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-item-icon">
                  <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                </span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="sidebar-footer">
            <div className="system-status-indicator">
              <span className="status-dot-pulse" aria-hidden="true" />
              <div className="system-status-label">
                Trivy Engine: <span style={{ color: '#fff' }}>v0.69.2 Active</span>
              </div>
            </div>

            <div className="user-profile-badge">
              <div className="user-avatar">AD</div>
              <div className="user-meta">
                <span className="user-name">SecOps Admin</span>
                <span className="user-role">Cloud Sentinel Mode</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
