import { formatRupiah } from '../App'

export default function SummaryCards({ ringkasan }) {
  if (!ringkasan) return null
  const cards = [
    { label: 'Total Penjualan', value: ringkasan.total_penjualan, sub: `${ringkasan.jumlah_penjualan} transaksi`, icon: '💰', cls: 'card-penjualan' },
    { label: 'Rata-rata Transaksi', value: ringkasan.rata_rata_transaksi, sub: 'per transaksi penjualan', icon: '📊', cls: 'card-rata-rata' },
    { label: 'Total Pengeluaran', value: ringkasan.total_pengeluaran, sub: 'bahan baku + ongkir', icon: '📦', cls: 'card-pengeluaran' },
    { label: 'Laba Kotor', value: ringkasan.laba_kotor, sub: 'penjualan - pengeluaran', icon: '🏦', cls: 'card-laba' },
  ]

  return (
    <div className="summary-grid">
      {cards.map((c, i) => (
        <div key={i} className={`summary-card ${c.cls}`} style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="card-icon">{c.icon}</div>
          <div className="card-content">
            <span className="card-label">{c.label}</span>
            <span className="card-value">{formatRupiah(c.value)}</span>
            <span className="card-sub">{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
