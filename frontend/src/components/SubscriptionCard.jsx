export default function SubscriptionCard({ user }) {
  const sub = user?.subscription
  return (
    <div className="subscription-info-card">
      <div className="sub-info-header">
        <h3>⭐ UMKM Insight Subscription</h3>
        <span className="sub-price">Rp10.000 / minggu</span>
      </div>
      <div className="sub-info-body">
        <div className="sub-features">
          <h4>Fitur Premium:</h4>
          <ul>
            <li>✅ Dashboard lengkap dengan semua grafik</li>
            <li>✅ Analisis tren penjualan detail</li>
            <li>✅ Insight bisnis otomatis</li>
            <li>✅ Breakdown fee & pajak</li>
            <li>✅ Export laporan (coming soon)</li>
          </ul>
        </div>
        <div className="sub-status-info">
          <p>Status: <strong style={{ color: sub?.status === 'premium' ? '#fbbf24' : '#8888aa' }}>
            {sub?.status === 'premium' ? `Premium (aktif sampai ${sub.aktif_sampai})` : 'Free Plan'}
          </strong></p>
          <p>Pembayaran diproses melalui <strong>SmartBank</strong></p>
          <p className="sub-note">🔒 UMKM Insight hanya membaca status langganan (read-only)</p>
        </div>
      </div>
    </div>
  )
}
