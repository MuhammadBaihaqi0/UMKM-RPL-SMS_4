import { useState } from 'react'
import { formatRupiah } from '../App'

export default function TransactionTable({ transactions }) {
  const [sourceFilter, setSourceFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  let filtered = [...transactions]
  if (sourceFilter !== 'all') filtered = filtered.filter(t => t.source_app === sourceFilter)
  if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter)
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date))

  const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <>
      <div className="filter-bar">
        <div className="filter-group">
          <label>Sumber:</label>
          <select className="filter-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            <option value="all">Semua</option>
            <option value="Marketplace">Marketplace</option>
            <option value="POS">POS</option>
            <option value="SupplierHub">SupplierHub</option>
            <option value="LogistiKita">LogistiKita</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Tipe:</label>
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Semua</option>
            <option value="penjualan">Penjualan</option>
            <option value="pembelian_bahan">Pembelian</option>
            <option value="pengiriman">Pengiriman</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div className="filter-info">Menampilkan {filtered.length} transaksi</div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Tanggal</th><th>Deskripsi</th><th>Sumber</th><th>Tipe</th><th>Amount</th><th>Net</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td><code>{t.id}</code></td>
                <td>{formatDate(t.date)}</td>
                <td>{t.description}</td>
                <td><span className="source-badge">{t.source_app}</span></td>
                <td>{t.type.replace('_', ' ')}</td>
                <td className={t.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                  {t.amount >= 0 ? '+' : ''}{formatRupiah(t.amount)}
                </td>
                <td className={t.net_amount >= 0 ? 'amount-positive' : 'amount-negative'}>{formatRupiah(t.net_amount)}</td>
                <td><span className="status-badge">{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
