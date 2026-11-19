const ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scan', label: 'Scan image' },
  { id: 'history', label: 'Scan history' },
  { id: 'settings', label: 'Security settings' },
];

export default function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        SecureShip
      </div>
      <nav className="nav" aria-label="Main">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            aria-current={currentPage === item.id ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
