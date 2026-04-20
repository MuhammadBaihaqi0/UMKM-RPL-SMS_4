import { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import TrenChart from './components/TrenChart'
import SumberChart from './components/SumberChart'
import DistribusiChart from './components/DistribusiChart'
import FeeChart from './components/FeeChart'
import InsightPanel from './components/InsightPanel'
import TransactionTable from './components/TransactionTable'
import SubscriptionCard from './components/SubscriptionCard'

const USER_ID = 'UMKM001'

function App() {
  const [data, setData] = useState(null)
  const [allTx, setAllTx] = useState([])
  const [activeSection, setActiveSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [dashRes, txRes] = await Promise.all([
        axios.get(`/api/umkm_insight/dashboard?user_id=${USER_ID}`),
        axios.get(`/api/umkm_insight/ambil_data_transaksi?user_id=${USER_ID}`)
      ])
      setData(dashRes.data)
      setAllTx(txRes.data.data || [])
      setTimeout(() => setLoading(false), 1500)
    } catch (err) {
      console.error('Error:', err)
      setTimeout(() => setLoading(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <span className="logo-icon">📊</span>
          <h1 className="loading-title">UMKM Insight</h1>
          <p className="loading-subtitle">Memuat data dari SmartBank...</p>
          <div className="loading-bar"><div className="loading-bar-fill"></div></div>
          <p className="loading-info">🔒 Mode Read-Only | Golang + React</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <span className="logo-icon">⚠️</span>
          <h1 className="loading-title">Gagal Memuat Data</h1>
          <p className="loading-subtitle">Pastikan backend Golang berjalan di port 8080</p>
        </div>
      </div>
    )
  }

  const analisis = data.analisis
  const user = data.user

  return (
    <div className="app">
      <Sidebar
        active={activeSection}
        onNavigate={setActiveSection}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <Header
          title={activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        {activeSection === 'dashboard' && (
          <section className="content-section">
            <SummaryCards ringkasan={analisis.ringkasan} />
            <div className="charts-grid">
              <div className="chart-card chart-large">
                <div className="chart-header">
                  <h3>📈 Tren Penjualan Bulanan</h3>
                  <span className="chart-badge">Line Chart</span>
                </div>
                <div className="chart-container">
                  <TrenChart data={analisis.tren_bulanan} />
                </div>
              </div>
              <div className="chart-card chart-medium">
                <div className="chart-header">
                  <h3>📊 Penjualan per Sumber</h3>
                  <span className="chart-badge">Bar Chart</span>
                </div>
                <div className="chart-container">
                  <SumberChart data={analisis.performa_per_sumber} />
                </div>
              </div>
            </div>
            <div className="charts-grid">
              <div className="chart-card chart-medium">
                <div className="chart-header">
                  <h3>🍩 Distribusi Transaksi</h3>
                  <span className="chart-badge">Doughnut</span>
                </div>
                <div className="chart-container chart-doughnut-container">
                  <DistribusiChart data={analisis.distribusi_tipe} />
                </div>
              </div>
              <div className="chart-card chart-large">
                <div className="chart-header">
                  <h3>🏦 Breakdown Biaya & Fee</h3>
                  <span className="chart-badge">Horizontal Bar</span>
                </div>
                <div className="chart-container">
                  <FeeChart data={analisis.breakdown_fee} />
                </div>
              </div>
            </div>
            <InsightPanel insights={analisis.insights} />
          </section>
        )}

        {activeSection === 'analisis' && (
          <section className="content-section">
            <div className="section-header">
              <h2>📈 Analisis Penjualan Detail</h2>
              <p>Data diambil dari SmartBank dan diproses secara read-only</p>
            </div>
            <div className="analisis-grid">
              <div className="analisis-card">
                <h3>📋 Ringkasan Bisnis</h3>
                <table className="analisis-table">
                  <thead><tr><th>Metrik</th><th>Nilai</th></tr></thead>
                  <tbody>
                    <tr><td>Total Penjualan</td><td className="amount-positive">{formatRupiah(analisis.ringkasan.total_penjualan)}</td></tr>
                    <tr><td>Total Pengeluaran</td><td className="amount-negative">{formatRupiah(analisis.ringkasan.total_pengeluaran)}</td></tr>
                    <tr><td>Laba Kotor</td><td style={{color: analisis.ringkasan.laba_kotor >= 0 ? '#34d399' : '#f87171', fontWeight: 700}}>{formatRupiah(analisis.ringkasan.laba_kotor)}</td></tr>
                    <tr><td>Rata-rata Transaksi</td><td>{formatRupiah(analisis.ringkasan.rata_rata_transaksi)}</td></tr>
                    <tr><td>Jumlah Transaksi</td><td>{analisis.ringkasan.jumlah_transaksi}</td></tr>
                    <tr><td>Transaksi Penjualan</td><td>{analisis.ringkasan.jumlah_penjualan}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="analisis-card">
                <h3>🏢 Performa per Sumber</h3>
                <table className="analisis-table">
                  <thead><tr><th>Sumber</th><th>Penjualan</th><th>Pengeluaran</th><th>Tx</th></tr></thead>
                  <tbody>
                    {analisis.performa_per_sumber.map(p => (
                      <tr key={p.source_app}>
                        <td><span className="source-badge">{p.source_app}</span></td>
                        <td className="amount-positive">{formatRupiah(p.total_penjualan)}</td>
                        <td className="amount-negative">{formatRupiah(p.total_pengeluaran)}</td>
                        <td>{p.jumlah_transaksi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="analisis-card full-width">
                <h3>💸 Detail Biaya Operasional (Fee & Pajak)</h3>
                <table className="analisis-table">
                  <thead><tr><th>Jenis Biaya</th><th>%</th><th>Total</th></tr></thead>
                  <tbody>
                    <tr><td>Fee Marketplace</td><td>2%</td><td>{formatRupiah(analisis.breakdown_fee.fee_marketplace)}</td></tr>
                    <tr><td>Fee POS</td><td>1%</td><td>{formatRupiah(analisis.breakdown_fee.fee_pos)}</td></tr>
                    <tr><td>Fee Supplier</td><td>3%</td><td>{formatRupiah(analisis.breakdown_fee.fee_supplier)}</td></tr>
                    <tr><td>Fee Logistik</td><td>5%</td><td>{formatRupiah(analisis.breakdown_fee.fee_logistik)}</td></tr>
                    <tr><td>Fee Bank</td><td>1%</td><td>{formatRupiah(analisis.breakdown_fee.fee_bank)}</td></tr>
                    <tr><td>Fee Gateway</td><td>0.5%</td><td>{formatRupiah(analisis.breakdown_fee.fee_gateway)}</td></tr>
                    <tr><td>Pajak Sistem</td><td>2%</td><td>{formatRupiah(analisis.breakdown_fee.pajak)}</td></tr>
                    <tr style={{fontWeight:700, borderTop:'2px solid rgba(255,255,255,0.1)'}}>
                      <td>TOTAL</td><td></td><td style={{color:'#f87171'}}>{formatRupiah(analisis.breakdown_fee.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'transaksi' && (
          <section className="content-section">
            <div className="section-header">
              <h2>📋 Data Transaksi</h2>
              <p>Data ledger dari SmartBank — Single Source of Truth (Read-Only)</p>
            </div>
            <TransactionTable transactions={allTx} />
          </section>
        )}

        {activeSection === 'insights' && (
          <section className="content-section">
            <div className="section-header">
              <h2>💡 Business Insights</h2>
              <p>Insight otomatis berdasarkan data transaksi dari SmartBank</p>
            </div>
            <div className="insights-full-grid">
              {analisis.insights.map((ins, i) => (
                <div key={i} className="insight-card-full">
                  <span className="insight-icon-large">{ins.icon}</span>
                  <p className="insight-message">{ins.message}</p>
                </div>
              ))}
            </div>
            <SubscriptionCard user={user} />
          </section>
        )}

        <footer className="main-footer">
          <p>📊 UMKM Insight v2.0 | Golang + React | Kelompok 6 - RPL 2</p>
          <p>Dosen: M. Yusril Helmi Setyawan, S.Kom., M.Kom.</p>
          <p className="footer-note">🔒 Sistem Read-Only — Data dari SmartBank via API Gateway</p>
        </footer>
      </main>
    </div>
  )
}

export function formatRupiah(num) {
  if (num === undefined || num === null) return 'Rp 0'
  const abs = Math.abs(num)
  return (num < 0 ? '-' : '') + 'Rp ' + abs.toLocaleString('id-ID')
}

export default App
