export default function Sidebar({ active, onNavigate, user, isOpen, onClose }) {
  const navItems = [
    { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { key: 'analisis', icon: '📈', label: 'Analisis' },
    { key: 'transaksi', icon: '📋', label: 'Data Transaksi' },
    { key: 'insights', icon: '💡', label: 'Insights' },
  ]

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">📊</span>
        <div className="sidebar-brand">
          <h2>UMKM Insight</h2>
          <span className="badge badge-readonly">READ-ONLY</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <a key={item.key} href="#" className={`nav-item ${active === item.key ? 'active' : ''}`}
            onClick={e => { e.preventDefault(); onNavigate(item.key); onClose(); }}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <>
            <div className="user-info">
              <div className="user-avatar">🏪</div>
              <div className="user-details">
                <span className="user-name">{user.nama}</span>
                <span className="user-role">UMKM Owner</span>
              </div>
            </div>
            <div className="subscription-badge">
              <span>⭐</span>
              <span>{user.subscription?.status === 'premium' ? '⭐ Premium' : 'Free Plan'}</span>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
