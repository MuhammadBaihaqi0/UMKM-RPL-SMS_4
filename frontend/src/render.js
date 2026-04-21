import { escapeHtml, formatDate, formatRupiah, sectionTitle } from './utils.js'

function summaryCards(ringkasan) {
  const cards = [
    {
      label: 'Total Penjualan',
      value: ringkasan.total_penjualan,
      sub: `${ringkasan.jumlah_penjualan} transaksi`,
      icon: '💰',
      cls: 'card-penjualan',
    },
    {
      label: 'Rata-rata Transaksi',
      value: ringkasan.rata_rata_transaksi,
      sub: 'per transaksi penjualan',
      icon: '📊',
      cls: 'card-rata-rata',
    },
    {
      label: 'Total Pengeluaran',
      value: ringkasan.total_pengeluaran,
      sub: 'bahan baku + ongkir',
      icon: '📦',
      cls: 'card-pengeluaran',
    },
    {
      label: 'Laba Kotor',
      value: ringkasan.laba_kotor,
      sub: 'penjualan - pengeluaran',
      icon: '🏦',
      cls: 'card-laba',
    },
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
                <span class="card-value">${formatRupiah(card.value)}</span>
                <span class="card-sub">${escapeHtml(card.sub)}</span>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `
}

function dashboardSection(analisis) {
  const insights = analisis.insights ?? []

  return `
    <section class="content-section">
      ${summaryCards(analisis.ringkasan)}
      <div class="charts-grid">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>📈 Tren Penjualan Bulanan</h3>
            <span class="chart-badge">Line Chart</span>
          </div>
          <div class="chart-container">
            <canvas id="tren-chart"></canvas>
          </div>
        </div>
        <div class="chart-card chart-medium">
          <div class="chart-header">
            <h3>📊 Penjualan per Sumber</h3>
            <span class="chart-badge">Bar Chart</span>
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
            <span class="chart-badge">Doughnut</span>
          </div>
          <div class="chart-container chart-doughnut-container">
            <canvas id="distribusi-chart"></canvas>
          </div>
        </div>
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>🏦 Breakdown Biaya & Fee</h3>
            <span class="chart-badge">Horizontal Bar</span>
          </div>
          <div class="chart-container">
            <canvas id="fee-chart"></canvas>
          </div>
        </div>
      </div>
      ${insightPanel(insights)}
    </section>
  `
}

function insightPanel(insights) {
  if (!insights.length) return ''

  return `
    <div class="insights-preview">
      <div class="insights-header"><h3>💡 Insight Bisnis Otomatis</h3></div>
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
  const labaColor = analisis.ringkasan.laba_kotor >= 0 ? '#34d399' : '#f87171'

  return `
    <section class="content-section">
      <div class="section-header">
        <h2>📈 Analisis Penjualan Detail</h2>
        <p>Data diambil dari SmartBank dan diproses secara read-only</p>
      </div>
      <div class="analisis-grid">
        <div class="analisis-card">
          <h3>📋 Ringkasan Bisnis</h3>
          <table class="analisis-table">
            <thead><tr><th>Metrik</th><th>Nilai</th></tr></thead>
            <tbody>
              <tr><td>Total Penjualan</td><td class="amount-positive">${formatRupiah(analisis.ringkasan.total_penjualan)}</td></tr>
              <tr><td>Total Pengeluaran</td><td class="amount-negative">${formatRupiah(analisis.ringkasan.total_pengeluaran)}</td></tr>
              <tr><td>Laba Kotor</td><td style="color:${labaColor};font-weight:700">${formatRupiah(analisis.ringkasan.laba_kotor)}</td></tr>
              <tr><td>Rata-rata Transaksi</td><td>${formatRupiah(analisis.ringkasan.rata_rata_transaksi)}</td></tr>
              <tr><td>Jumlah Transaksi</td><td>${escapeHtml(analisis.ringkasan.jumlah_transaksi)}</td></tr>
              <tr><td>Transaksi Penjualan</td><td>${escapeHtml(analisis.ringkasan.jumlah_penjualan)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="analisis-card">
          <h3>🏢 Performa per Sumber</h3>
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
          <h3>💸 Detail Biaya Operasional (Fee & Pajak)</h3>
          <table class="analisis-table">
            <thead><tr><th>Jenis Biaya</th><th>%</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td>Fee Marketplace</td><td>2%</td><td>${formatRupiah(analisis.breakdown_fee.fee_marketplace)}</td></tr>
              <tr><td>Fee POS</td><td>1%</td><td>${formatRupiah(analisis.breakdown_fee.fee_pos)}</td></tr>
              <tr><td>Fee Supplier</td><td>3%</td><td>${formatRupiah(analisis.breakdown_fee.fee_supplier)}</td></tr>
              <tr><td>Fee Logistik</td><td>5%</td><td>${formatRupiah(analisis.breakdown_fee.fee_logistik)}</td></tr>
              <tr><td>Fee Bank</td><td>1%</td><td>${formatRupiah(analisis.breakdown_fee.fee_bank)}</td></tr>
              <tr><td>Fee Gateway</td><td>0.5%</td><td>${formatRupiah(analisis.breakdown_fee.fee_gateway)}</td></tr>
              <tr><td>Pajak Sistem</td><td>2%</td><td>${formatRupiah(analisis.breakdown_fee.pajak)}</td></tr>
              <tr style="font-weight:700;border-top:2px solid rgba(255,255,255,0.1)">
                <td>TOTAL</td><td></td><td style="color:#f87171">${formatRupiah(analisis.breakdown_fee.total)}</td>
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
          <td class="${transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}">
            ${transaction.amount >= 0 ? '+' : ''}${formatRupiah(transaction.amount)}
          </td>
          <td class="${transaction.net_amount >= 0 ? 'amount-positive' : 'amount-negative'}">
            ${formatRupiah(transaction.net_amount)}
          </td>
          <td><span class="status-badge">${escapeHtml(transaction.status)}</span></td>
        </tr>
      `,
    )
    .join('')
}

function transaksiSection(transactions) {
  return `
    <section class="content-section">
      <div class="section-header">
        <h2>📋 Data Transaksi</h2>
        <p>Data ledger dari SmartBank — Single Source of Truth (Read-Only)</p>
      </div>
      <div class="filter-bar">
        <div class="filter-group">
          <label for="source-filter">Sumber:</label>
          <select id="source-filter" class="filter-select">
            <option value="all">Semua</option>
            <option value="Marketplace">Marketplace</option>
            <option value="POS">POS</option>
            <option value="SupplierHub">SupplierHub</option>
            <option value="LogistiKita">LogistiKita</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="type-filter">Tipe:</label>
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
          <tbody id="transaction-table-body">
            ${transactionRows(transactions)}
          </tbody>
        </table>
      </div>
    </section>
  `
}

function subscriptionCard(user) {
  const subscription = user?.subscription
  const statusText =
    subscription?.status === 'premium'
      ? `Premium (aktif sampai ${escapeHtml(subscription.aktif_sampai)})`
      : 'Free Plan'
  const statusColor = subscription?.status === 'premium' ? '#fbbf24' : '#8888aa'

  return `
    <div class="subscription-info-card">
      <div class="sub-info-header">
        <h3>⭐ UMKM Insight Subscription</h3>
        <span class="sub-price">Rp10.000 / minggu</span>
      </div>
      <div class="sub-info-body">
        <div class="sub-features">
          <h4>Fitur Premium:</h4>
          <ul>
            <li>✅ Dashboard lengkap dengan semua grafik</li>
            <li>✅ Analisis tren penjualan detail</li>
            <li>✅ Insight bisnis otomatis</li>
            <li>✅ Breakdown fee & pajak</li>
            <li>✅ Export laporan (coming soon)</li>
          </ul>
        </div>
        <div class="sub-status-info">
          <p>Status: <strong style="color:${statusColor}">${statusText}</strong></p>
          <p>Pembayaran diproses melalui <strong>SmartBank</strong></p>
          <p class="sub-note">🔒 UMKM Insight hanya membaca status langganan (read-only)</p>
        </div>
      </div>
    </div>
  `
}

function insightsSection(analisis, user) {
  return `
    <section class="content-section">
      <div class="section-header">
        <h2>💡 Business Insights</h2>
        <p>Insight otomatis berdasarkan data transaksi dari SmartBank</p>
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
      ${subscriptionCard(user)}
    </section>
  `
}

function footer() {
  return `
    <footer class="main-footer">
      <p>📊 UMKM Insight v2.0 | Golang + React | Kelompok 6 - RPL 2</p>
      <p>Dosen: M. Yusril Helmi Setyawan, S.Kom., M.Kom.</p>
      <p class="footer-note">🔒 Sistem Read-Only — Data dari SmartBank via API Gateway</p>
    </footer>
  `
}

function sidebar(section, user, sidebarOpen) {
  const navItems = [
    { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { key: 'analisis', icon: '📈', label: 'Analisis' },
    { key: 'transaksi', icon: '📋', label: 'Data Transaksi' },
    { key: 'insights', icon: '💡', label: 'Insights' },
  ]

  return `
    <aside class="sidebar ${sidebarOpen ? 'open' : ''}">
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
        ${
          user
            ? `
              <div class="user-info">
                <div class="user-avatar">🏪</div>
                <div class="user-details">
                  <span class="user-name">${escapeHtml(user.nama)}</span>
                  <span class="user-role">UMKM Owner</span>
                </div>
              </div>
              <div class="subscription-badge">
                <span>⭐</span>
                <span>${user.subscription?.status === 'premium' ? '⭐ Premium' : 'Free Plan'}</span>
              </div>
            `
            : ''
        }
      </div>
    </aside>
  `
}

function header(section) {
  return `
    <header class="top-header">
      <div class="header-left">
        <button class="menu-toggle" id="menu-toggle" type="button">☰</button>
        <div class="header-info">
          <h1>${escapeHtml(sectionTitle(section))}</h1>
          <p class="header-subtitle">
            <span class="pulse-dot"></span>
            Data dari SmartBank (via API Gateway)
          </p>
        </div>
      </div>
      <div class="header-right">
        <div class="header-badge">
          <span class="badge badge-source">📦 SmartBank</span>
          <span class="badge badge-gateway">🔗 API Gateway</span>
          <span class="badge badge-lang">🐹 Golang</span>
        </div>
      </div>
    </header>
  `
}

function mainSection(section, data, transactions) {
  const analisis = data.analisis
  const user = data.user

  if (section === 'analisis') return analisisSection(analisis)
  if (section === 'transaksi') return transaksiSection(transactions)
  if (section === 'insights') return insightsSection(analisis, user)
  return dashboardSection(analisis)
}

export function renderApp(root, state) {
  root.innerHTML = `
    <div class="app">
      ${sidebar(state.activeSection, state.data?.user, state.sidebarOpen)}
      <main class="main-content">
        ${header(state.activeSection)}
        ${mainSection(state.activeSection, state.data, state.filteredTransactions)}
        ${footer()}
      </main>
    </div>
  `
}

export function renderLoading(root, message = 'Memuat data dari SmartBank...', info = '🔒 Mode Read-Only | Golang + React') {
  root.innerHTML = `
    <div class="loading-screen">
      <div class="loading-content">
        <span class="logo-icon">📊</span>
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
        <p class="loading-subtitle">Pastikan backend Golang berjalan di port 8080</p>
      </div>
    </div>
  `
}

export function updateTransactionTable(transactions) {
  const tableBody = document.getElementById('transaction-table-body')
  const count = document.getElementById('transaction-count')

  if (tableBody) {
    tableBody.innerHTML = transactionRows(transactions)
  }

  if (count) {
    count.textContent = String(transactions.length)
  }
}
