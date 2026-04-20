export default function Header({ title, onMenuClick }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuClick}>☰</button>
        <div className="header-info">
          <h1>{title}</h1>
          <p className="header-subtitle">
            <span className="pulse-dot"></span>
            Data dari SmartBank (via API Gateway)
          </p>
        </div>
      </div>
      <div className="header-right">
        <div className="header-badge">
          <span className="badge badge-source">📦 SmartBank</span>
          <span className="badge badge-gateway">🔗 API Gateway</span>
          <span className="badge badge-lang">🐹 Golang</span>
        </div>
      </div>
    </header>
  )
}
