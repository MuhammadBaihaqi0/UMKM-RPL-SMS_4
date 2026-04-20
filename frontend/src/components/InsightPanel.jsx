export default function InsightPanel({ insights }) {
  if (!insights || insights.length === 0) return null
  return (
    <div className="insights-preview">
      <div className="insights-header"><h3>💡 Insight Bisnis Otomatis</h3></div>
      <div className="insights-list">
        {insights.map((ins, i) => (
          <div key={i} className={`insight-item ${ins.type}`} style={{ animationDelay: `${i * 0.1}s` }}>
            <span className="insight-icon">{ins.icon}</span>
            <span>{ins.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
