import { renderSubscriptionPage } from './pages/subscription.js'
import { durationLabel, escapeHtml, formatDate, formatRupiah, packageLabel, sectionTitle } from './utils.js'

function summaryCards(ringkasan) {
  const cards = [
    { label: 'Total Penjualan', value: ringkasan.total_penjualan, sub: `${ringkasan.jumlah_penjualan} transaksi penjualan`, icon: '💰', cls: 'card-penjualan' },
    { label: 'Total Transaksi', value: ringkasan.jumlah_transaksi, sub: 'semua sumber SmartBank', icon: '📦', cls: 'card-rata-rata', raw: true },
    { label: 'Rata-rata Penjualan', value: ringkasan.rata_rata_transaksi, sub: 'per transaksi penjualan', icon: '📊', cls: 'card-laba' },
    { label: 'Total Biaya', value: ringkasan.total_pengeluaran, sub: 'pengeluaran & operasional', icon: '🧾', cls: 'card-pengeluaran' },
  ]

  return `
    <div class="summary-grid">
      ${cards
        .map(
          (card, index) => `
            <div class="summary-card ${card.cls}" style="animation-delay:${index * 0.1}s">
              <div class="card-icon">${card.icon}</div>
              <div class="card-content">
                <span class="card-label">${escapeHtml(card.label)}</span>
                <span class="card-value">${card.raw ? escapeHtml(card.value) : formatRupiah(card.value)}</span>
                <span class="card-sub">${escapeHtml(card.sub)}</span>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `
}

function comparisonCard(comparison = {}, feeRatioPercent = 0) {
  if (!comparison.current_month) return ''

  return `
    <div class="comparison-card ${comparison.direction === 'turun' ? 'comparison-down' : 'comparison-up'}">
      <div>
        <h3>📉 Perbandingan Bulanan</h3>
        <p>${escapeHtml(comparison.summary)}</p>
      </div>
      <div class="comparison-metrics">
        <span>${escapeHtml(comparison.previous_month)} → ${escapeHtml(comparison.current_month)}</span>
        <strong>${escapeHtml(String(comparison.change_percent))}%</strong>
        <small>Fee ratio bulan ini: ${escapeHtml(String(feeRatioPercent))}%</small>
      </div>
    </div>
  `
}

function reportCard(reporting = {}) {
  if (!reporting) return ''

  return `
    <div class="report-card">
      <div class="report-card-header">
        <h3>🏦 Pelaporan ke SmartBank</h3>
        <span class="status-badge ${reporting.can_report_decline ? 'status-active' : 'status-inactive'}">
          ${reporting.can_report_decline ? 'Tersedia' : 'Terkunci'}
        </span>
      </div>
      <p>${escapeHtml(reporting.recommended_action || reporting.reason || 'Belum ada rekomendasi pelaporan.')}</p>
      ${
        reporting.can_report_decline
          ? `<button class="pricing-btn report-btn" id="report-smartbank-btn">Laporkan ke SmartBank</button>`
          : `<div class="pricing-badge">${escapeHtml(reporting.reason || 'Belum tersedia')}</div>`
      }
      <div id="report-result" class="hidden"></div>
    </div>
  `
}

function dashboardSection(analisis, subscription) {
  const insights = analisis.insights ?? []

  return `
    <section class="content-section">
      ${summaryCards(analisis.ringkasan)}
      ${comparisonCard(analisis.comparison, analisis.fee_ratio_percent)}
      <div class="charts-grid">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>📈 Tren Penjualan</h3>
            <span class="chart-badge">${escapeHtml(packageLabel(subscription.package_name || 'free'))}</span>
          </div>
          <div class="chart-container">
            <canvas id="tren-chart"></canvas>
          </div>
        </div>
        <div class="chart-card chart-medium">
          <div class="chart-header">
            <h3>📊 Sumber Transaksi</h3>
            <span class="chart-badge">Marketplace • POS • Lainnya</span>
          </div>
          <div class="chart-container">
            <canvas id="sumber-chart"></canvas>
          </div>
        </div>
      </div>
      <div class="charts-grid">
        <div class="chart-card chart-medium">
          <div class="chart-header">
            <h3>🍩 Distribusi Transaksi</h3>
            <span class="chart-badge">Read-Only</span>
          </div>
          <div class="chart-container chart-doughnut-container">
            <canvas id="distribusi-chart"></canvas>
          </div>
        </div>
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>💸 Pajak & Fee</h3>
            <span class="chart-badge">Fee breakdown</span>
          </div>
          <div class="chart-container">
            <canvas id="fee-chart"></canvas>
          </div>
        </div>
      </div>
      ${insightPanel(insights)}
      ${reportCard(analisis.reporting)}
    </section>
  `
}

function insightPanel(insights) {
  if (!insights.length) return ''

  return `
    <div class="insights-preview">
      <div class="insights-header"><h3>🧠 Insight Cerdas</h3></div>
      <div class="insights-list">
        ${insights
          .map(
            (item, index) => `
              <div class="insight-item ${escapeHtml(item.type)}" style="animation-delay:${index * 0.1}s">
                <span class="insight-icon">${escapeHtml(item.icon)}</span>
                <span>${escapeHtml(item.message)}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `
}

function analisisSection(analisis) {
  const labaColor = analisis.ringkasan.laba_kotor >= 0 ? '#2563eb' : '#dc2626'

  return `
    <section class="content-section">
      <div class="section-header">
        <h2>📈 Analisis Penjualan Detail</h2>
        <p>Semua data dibaca dari SmartBank tanpa menyimpan saldo dan tanpa CRUD transaksi.</p>
      </div>
      <div class="analisis-grid">
        <div class="analisis-card">
          <h3>📋 Ringkasan</h3>
          <table class="analisis-table">
            <thead><tr><th>Metrik</th><th>Nilai</th></tr></thead>
            <tbody>
              <tr><td>Total Penjualan</td><td class="amount-positive">${formatRupiah(analisis.ringkasan.total_penjualan)}</td></tr>
              <tr><td>Total Pengeluaran</td><td class="amount-negative">${formatRupiah(analisis.ringkasan.total_pengeluaran)}</td></tr>
              <tr><td>Laba Kotor</td><td style="color:${labaColor};font-weight:700">${formatRupiah(analisis.ringkasan.laba_kotor)}</td></tr>
              <tr><td>Rata-rata Transaksi</td><td>${formatRupiah(analisis.ringkasan.rata_rata_transaksi)}</td></tr>
              <tr><td>Jumlah Transaksi</td><td>${escapeHtml(analisis.ringkasan.jumlah_transaksi)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="analisis-card">
          <h3>🏢 Sumber Pendapatan</h3>
          <table class="analisis-table">
            <thead><tr><th>Sumber</th><th>Penjualan</th><th>Pengeluaran</th><th>Tx</th></tr></thead>
            <tbody>
              ${analisis.performa_per_sumber
                .map(
                  (item) => `
                    <tr>
                      <td><span class="source-badge">${escapeHtml(item.source_app)}</span></td>
                      <td class="amount-positive">${formatRupiah(item.total_penjualan)}</td>
                      <td class="amount-negative">${formatRupiah(item.total_pengeluaran)}</td>
                      <td>${escapeHtml(item.jumlah_transaksi)}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="analisis-card full-width">
          <h3>💰 Pajak & Fee</h3>
          <table class="analisis-table">
            <thead><tr><th>Jenis Biaya</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td>Fee Marketplace</td><td>${formatRupiah(analisis.breakdown_fee.fee_marketplace)}</td></tr>
              <tr><td>Fee POS</td><td>${formatRupiah(analisis.breakdown_fee.fee_pos)}</td></tr>
              <tr><td>Fee Supplier</td><td>${formatRupiah(analisis.breakdown_fee.fee_supplier)}</td></tr>
              <tr><td>Fee Logistik</td><td>${formatRupiah(analisis.breakdown_fee.fee_logistik)}</td></tr>
              <tr><td>Fee Bank</td><td>${formatRupiah(analisis.breakdown_fee.fee_bank)}</td></tr>
              <tr><td>Fee Gateway</td><td>${formatRupiah(analisis.breakdown_fee.fee_gateway)}</td></tr>
              <tr><td>Pajak</td><td>${formatRupiah(analisis.breakdown_fee.pajak)}</td></tr>
              <tr style="font-weight:700;border-top:2px solid var(--glass-border)">
                <td>TOTAL BIAYA</td><td style="color:#dc2626">${formatRupiah(analisis.breakdown_fee.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `
}

function transactionRows(transactions) {
  return transactions
    .map(
      (transaction) => `
        <tr>
          <td><code>${escapeHtml(transaction.id)}</code></td>
          <td>${formatDate(transaction.date)}</td>
          <td>${escapeHtml(transaction.description)}</td>
          <td><span class="source-badge">${escapeHtml(transaction.source_app)}</span></td>
          <td>${escapeHtml(transaction.type.replace('_', ' '))}</td>
          <td class="${transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}">${transaction.amount >= 0 ? '+' : ''}${formatRupiah(transaction.amount)}</td>
          <td class="${transaction.net_amount >= 0 ? 'amount-positive' : 'amount-negative'}">${formatRupiah(transaction.net_amount)}</td>
          <td><span class="status-badge">${escapeHtml(transaction.status)}</span></td>
        </tr>
      `,
    )
    .join('')
}

function transaksiSection(transactions, packageName) {
  return `
    <section class="content-section">
      <div class="section-header">
        <h2>📋 Data Transaksi</h2>
        <p>Data dibaca read-only dari SmartBank. Paket aktif: <strong>${escapeHtml(packageLabel(packageName))}</strong></p>
      </div>
      <div class="filter-bar">
        <div class="filter-group">
          <label for="source-filter">Sumber</label>
          <select id="source-filter" class="filter-select">
            <option value="all">Semua</option>
            <option value="Marketplace">Marketplace</option>
            <option value="POS">POS</option>
            <option value="SupplierHub">SupplierHub</option>
            <option value="LogistiKita">LogistiKita</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="type-filter">Tipe</label>
          <select id="type-filter" class="filter-select">
            <option value="all">Semua</option>
            <option value="penjualan">Penjualan</option>
            <option value="pembelian_bahan">Pembelian</option>
            <option value="pengiriman">Pengiriman</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div class="filter-info">Menampilkan <span id="transaction-count">${transactions.length}</span> transaksi</div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Tanggal</th><th>Deskripsi</th><th>Sumber</th><th>Tipe</th><th>Amount</th><th>Net</th><th>Status</th></tr>
          </thead>
          <tbody id="transaction-table-body">${transactionRows(transactions)}</tbody>
        </table>
      </div>
    </section>
  `
}

function insightsSection(analisis, user) {
  const subscription = user?.subscription || {}
  return `
    <section class="content-section">
      <div class="section-header">
        <h2>💡 Insight Bisnis</h2>
        <p>Insight otomatis berdasarkan transaksi SmartBank dan paket ${escapeHtml(packageLabel(subscription.package_name || 'free'))}.</p>
      </div>
      <div class="insights-full-grid">
        ${analisis.insights
          .map(
            (item) => `
              <div class="insight-card-full">
                <span class="insight-icon-large">${escapeHtml(item.icon)}</span>
                <p class="insight-message">${escapeHtml(item.message)}</p>
              </div>
            `,
          )
          .join('')}
      </div>
      <div class="subscription-info-card">
        <div class="sub-info-header">
          <h3>${escapeHtml(packageLabel(subscription.package_name || 'free'))} Plan</h3>
          <span class="sub-price">${subscription.amount_paid ? formatRupiah(subscription.amount_paid) : 'Rp 0'}</span>
        </div>
        <div class="sub-info-body">
          <div class="sub-features">
            <h4>Detail Subscription</h4>
            <ul>
              <li>✅ Status: ${escapeHtml(subscription.status || 'active')}</li>
              <li>✅ Durasi: ${escapeHtml(durationLabel(subscription.duration))}</li>
              <li>✅ Mulai: ${escapeHtml(subscription.started_at ? new Date(subscription.started_at).toLocaleDateString('id-ID') : '-')}</li>
              <li>✅ Expired: ${escapeHtml(subscription.expired_at ? new Date(subscription.expired_at).toLocaleDateString('id-ID') : '-')}</li>
            </ul>
          </div>
          <div class="sub-status-info">
            <p>Pembayaran diproses oleh <strong>SmartBank</strong>.</p>
            <p class="sub-note">UMKM Insight hanya membaca data dan status langganan, tanpa memproses uang atau menyimpan saldo.</p>
          </div>
        </div>
      </div>
    </section>
  `
}

function footer() {
  return `
    <footer class="main-footer">
      <p>📊 UMKM Insight v4.0 | Python + Flask + MySQL | SaaS Dashboard Read-Only</p>
      <p>Dosen: M. Yusril Helmi Setyawan, S.Kom., M.Kom.</p>
      <p class="footer-note">🔒 Tidak ada CRUD transaksi keuangan • Semua pembayaran hanya via SmartBank</p>
    </footer>
  `
}

function sidebar(state) {
  const section = state.activeSection
  const user = state.data?.user
  const authUser = state.user
  const subscription = user?.subscription || authUser?.subscription || {}
  const isAdmin = authUser?.role === 'admin'
  const isOperator = authUser?.role === 'operator'

  const navItems = [
    { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { key: 'analisis', icon: '📈', label: 'Analisis' },
    { key: 'transaksi', icon: '📋', label: 'Transaksi' },
    { key: 'insights', icon: '💡', label: 'Insights' },
    { key: 'subscription', icon: '💳', label: 'Langganan' },
  ]

  if (isAdmin || isOperator) {
    navItems.push({ key: 'admin', icon: '🛡️', label: 'Admin Panel' })
  }

  return `
    <aside class="sidebar ${state.sidebarOpen ? 'open' : ''}">
      <div class="sidebar-header">
        <span class="sidebar-logo">📊</span>
        <div class="sidebar-brand">
          <h2>UMKM Insight</h2>
          <span class="badge badge-readonly">READ-ONLY</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${navItems
          .map(
            (item) => `
              <a href="#" class="nav-item ${section === item.key ? 'active' : ''}" data-nav="${item.key}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-text">${item.label}</span>
              </a>
            `,
          )
          .join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">🏪</div>
          <div class="user-details">
            <span class="user-name">${escapeHtml(authUser?.nama_umkm || user?.nama || 'User')}</span>
            <span class="user-role">${escapeHtml(authUser?.role || 'user')}</span>
          </div>
        </div>
        <div class="subscription-badge">
          <span>${subscription.package_name === 'free' ? '🆓' : '⭐'}</span>
          <span>${escapeHtml(packageLabel(subscription.package_name || 'free'))} • ${escapeHtml(subscription.status || 'active')}</span>
        </div>
        <a href="#" class="logout-btn" id="logout-btn">🚪 Logout</a>
      </div>
    </aside>
  `
}

function header(section, subscription) {
  return `
    <header class="top-header">
      <div class="header-left">
        <button class="menu-toggle" id="menu-toggle" type="button">☰</button>
        <div class="header-info">
          <h1>${escapeHtml(sectionTitle(section))}</h1>
          <p class="header-subtitle">
            <span class="pulse-dot"></span>
            Data SmartBank • Paket ${escapeHtml(packageLabel(subscription.package_name || 'free'))}
          </p>
        </div>
      </div>
      <div class="header-right">
        <div class="header-badge">
          <span class="badge badge-source">📦 SmartBank</span>
          <span class="badge badge-gateway">🔗 API Gateway</span>
          <span class="badge badge-lang">🐍 Python</span>
        </div>
      </div>
    </header>
  `
}

function mainSection(state) {
  const analisis = state.data.analisis
  const user = state.data.user
  const packageName = user?.subscription?.package_name || 'free'

  if (state.activeSection === 'analisis') return analisisSection(analisis)
  if (state.activeSection === 'transaksi') return transaksiSection(state.filteredTransactions, packageName)
  if (state.activeSection === 'insights') return insightsSection(analisis, user)
  if (state.activeSection === 'subscription') return renderSubscriptionPage(user, state.availablePackages || [])
  return dashboardSection(analisis, user.subscription || {})
}

export function renderApp(root, state) {
  root.innerHTML = `
    <div class="app">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="sidebar-overlay ${state.sidebarOpen ? 'active' : ''}" id="sidebar-overlay"></div>
      ${sidebar(state)}
      <main class="main-content">
        ${header(state.activeSection, state.data.user?.subscription || {})}
        ${mainSection(state)}
        ${footer()}
      </main>
    </div>
  `
}

export function renderLoading(root, message = 'Memuat data dari SmartBank...', info = '🔒 Mode Read-Only | System Initializing') {
  root.innerHTML = `
    <div class="loading-screen">
      <div class="loading-content">
        <div class="logo-icon-wrapper"><span class="logo-icon">📊</span></div>
        <h1 class="loading-title">UMKM Insight</h1>
        <p class="loading-subtitle">${escapeHtml(message)}</p>
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
        <p class="loading-info">${escapeHtml(info)}</p>
      </div>
    </div>
  `
}

export function renderError(root) {
  root.innerHTML = `
    <div class="loading-screen">
      <div class="loading-content">
        <span class="logo-icon">⚠️</span>
        <h1 class="loading-title">Gagal Memuat Data</h1>
        <p class="loading-subtitle">Pastikan backend Python dan MySQL XAMPP berjalan dengan benar.</p>
      </div>
    </div>
  `
}

export function updateTransactionTable(transactions) {
  const tableBody = document.getElementById('transaction-table-body')
  const count = document.getElementById('transaction-count')
  if (tableBody) tableBody.innerHTML = transactionRows(transactions)
  if (count) count.textContent = String(transactions.length)
}
