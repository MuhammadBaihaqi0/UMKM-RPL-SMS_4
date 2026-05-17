import { escapeHtml } from '../utils.js'

const API_ENDPOINTS = [
  {
    category: 'Autentikasi',
    icon: '🔐',
    description: 'Endpoint untuk registrasi, login, dan verifikasi profil pengguna.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/register',
        title: 'Register User',
        description: 'Mendaftarkan pengguna baru ke sistem UMKM Insight.',
        auth: false,
        params: [],
        body: {
          nama_umkm: 'Warung Berkah Jaya',
          email: 'berkah@umkm.local',
          password: 'umkm123',
          role: 'user',
        },
        response: {
          status: 'success',
          message: 'Registrasi berhasil! Silakan login.',
          user: { id: 'uuid', nama_umkm: 'Warung Berkah Jaya', email: 'berkah@umkm.local', umkm_id: 'UMKM001', role: 'user' },
        },
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        title: 'Login User',
        description: 'Autentikasi pengguna dan mendapatkan JWT token.',
        auth: false,
        params: [],
        body: { email: 'berkah@umkm.local', password: 'umkm123' },
        response: {
          status: 'success',
          message: 'Login berhasil!',
          token: 'eyJhbGciOiJIUzI1...',
          user: { id: 'uuid', nama_umkm: 'Warung Berkah Jaya', email: 'berkah@umkm.local', role: 'user', umkm_id: 'UMKM001' },
        },
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        title: 'Get Profile',
        description: 'Mengambil profil pengguna yang sedang login beserta status subscription.',
        auth: true,
        params: [],
        body: null,
        response: {
          status: 'success',
          user: { id: 'uuid', nama_umkm: 'Warung Berkah Jaya', email: 'berkah@umkm.local', role: 'user', umkm_id: 'UMKM001', subscription: { status: 'active', package_name: 'pro' } },
        },
      },
    ],
  },
  {
    category: 'UMKM Insight (Dashboard)',
    icon: '📊',
    description: 'Endpoint utama untuk analitik dashboard, transaksi, dan insight bisnis. Semua data bersifat read-only dari SmartBank.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/umkm_insight/dashboard',
        title: 'Dashboard',
        description: 'Mendapatkan data dashboard lengkap: ringkasan, analisis, tren bulanan, dan transaksi terbaru.',
        auth: true,
        params: [{ name: 'user_id', type: 'string', required: true, example: 'UMKM001', description: 'ID UMKM dari SmartBank' }],
        body: null,
        response: {
          status: 'success',
          endpoint: '/umkm_insight/dashboard',
          source: 'SmartBank (via API Gateway)',
          mode: 'READ-ONLY',
          package_name: 'pro',
          user: { user_id: 'UMKM001', nama: 'Warung Berkah Jaya', subscription: { status: 'active', package_name: 'pro' } },
          analisis: { ringkasan: { total_penjualan: 15000000, jumlah_transaksi: 45 } },
        },
      },
      {
        method: 'GET',
        path: '/api/umkm_insight/ambil_data_transaksi',
        title: 'Ambil Data Transaksi',
        description: 'Mengambil daftar transaksi UMKM dari SmartBank. Jumlah transaksi tergantung paket langganan.',
        auth: true,
        params: [{ name: 'user_id', type: 'string', required: true, example: 'UMKM001', description: 'ID UMKM dari SmartBank' }],
        body: null,
        response: {
          status: 'success',
          endpoint: '/umkm_insight/ambil_data_transaksi',
          source: 'SmartBank (via API Gateway)',
          mode: 'READ-ONLY',
          total_records: 20,
          data: ['...array of transactions...'],
        },
      },
      {
        method: 'GET',
        path: '/api/umkm_insight/analisis_penjualan',
        title: 'Analisis Penjualan',
        description: 'Mendapatkan analisis penjualan lengkap: ringkasan, tren, performa per sumber, distribusi tipe, dan breakdown fee.',
        auth: true,
        params: [{ name: 'user_id', type: 'string', required: true, example: 'UMKM001', description: 'ID UMKM dari SmartBank' }],
        body: null,
        response: {
          status: 'success',
          endpoint: '/umkm_insight/analisis_penjualan',
          analisis: { ringkasan: {}, tren_bulanan: [], performa_per_sumber: [], breakdown_fee: {}, insights: [] },
        },
      },
      {
        method: 'GET',
        path: '/api/umkm_insight/biaya_akses_analytics',
        title: 'Biaya Akses Analytics',
        description: 'Menampilkan informasi biaya akses analitik dan daftar paket langganan yang tersedia.',
        auth: true,
        params: [{ name: 'user_id', type: 'string', required: false, example: 'UMKM001', description: 'ID UMKM (opsional)' }],
        body: null,
        response: {
          status: 'success',
          endpoint: '/umkm_insight/biaya_akses_analytics',
          mode: 'READ-ONLY (Simulasi SaaS)',
          subscription: { status: 'active', package_name: 'pro' },
          packages: ['...daftar paket...'],
        },
      },
      {
        method: 'GET',
        path: '/api/umkm_insight/user_profile',
        title: 'User Profile (SmartBank)',
        description: 'Mengambil profil UMKM dari data SmartBank (read-only).',
        auth: true,
        params: [{ name: 'user_id', type: 'string', required: true, example: 'UMKM001', description: 'ID UMKM dari SmartBank' }],
        body: null,
        response: {
          status: 'success',
          source: 'SmartBank (via API Gateway)',
          mode: 'READ-ONLY',
          data: { nama: 'Warung Berkah Jaya', jenis_usaha: 'Kuliner' },
        },
      },
    ],
  },
  {
    category: 'Subscription & Pembayaran',
    icon: '💳',
    description: 'Endpoint untuk manajemen langganan dan pembayaran melalui SmartBank.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/subscriptions/packages',
        title: 'Daftar Paket',
        description: 'Mendapatkan katalog paket langganan yang tersedia (Free, Basic, Pro, Enterprise).',
        auth: true,
        params: [],
        body: null,
        response: {
          status: 'success',
          packages: [
            { code: 'free', label: 'Free', prices: { mingguan: 0 } },
            { code: 'basic', label: 'Basic', prices: { mingguan: 10000 } },
            { code: 'pro', label: 'Pro', prices: { mingguan: 20000 } },
            { code: 'enterprise', label: 'Enterprise', prices: { mingguan: 35000 } },
          ],
        },
      },
      {
        method: 'GET',
        path: '/api/smartbank/pay',
        title: 'Pembayaran (SmartBank)',
        description: 'Simulasi pembayaran upgrade paket melalui SmartBank. Otomatis memperbarui status langganan.',
        auth: true,
        params: [
          { name: 'user_id', type: 'string', required: false, example: 'UMKM001', description: 'ID UMKM' },
          { name: 'package', type: 'string', required: true, example: 'pro', description: 'Nama paket (basic/pro/enterprise)' },
          { name: 'duration', type: 'string', required: true, example: 'bulanan', description: 'Durasi (mingguan/bulanan/tahunan)' },
        ],
        body: null,
        response: {
          status: 'success',
          message: 'Pembayaran berhasil!',
          smartbank_response: { ref: 'SB-XXXXXXXXXXXX', amount: 75000 },
        },
      },
      {
        method: 'POST',
        path: '/api/smartbank/report-decline',
        title: 'Lapor Penurunan Performa',
        description: 'Mengirim laporan penurunan performa UMKM ke SmartBank. Tersedia untuk paket Pro dan Enterprise.',
        auth: true,
        params: [],
        body: {
          umkm_id: 'UMKM001',
          title: 'Laporkan penurunan performa ke SmartBank',
          detail: 'Penjualan turun 15% dibanding bulan lalu.',
          metric_snapshot: { comparison: {}, fee_ratio: 12.5 },
        },
        response: {
          status: 'success',
          message: 'Laporan berhasil dikirim ke SmartBank.',
          smartbank_response: { ref: 'SB-REPORT-XXXXXXXXXX', report_type: 'performance_decline' },
        },
      },
    ],
  },
  {
    category: 'Admin Panel',
    icon: '🛡️',
    description: 'Endpoint untuk admin dan operator. Memerlukan role admin atau operator.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/users',
        title: 'Daftar Users',
        description: 'Mendapatkan semua user beserta status subscription dan aktivitas terakhir.',
        auth: true,
        authNote: 'Hanya admin/operator',
        params: [
          { name: 'status', type: 'string', required: false, example: 'active', description: 'Filter status subscription' },
          { name: 'package', type: 'string', required: false, example: 'pro', description: 'Filter paket' },
        ],
        body: null,
        response: {
          status: 'success',
          total: 4,
          data: [{ id: 'uuid', nama_umkm: 'Warung Berkah Jaya', email: 'berkah@umkm.local', role: 'user', subscription: { package_name: 'pro', status: 'active' } }],
        },
      },
      {
        method: 'GET',
        path: '/api/admin/stats',
        title: 'Statistik Platform',
        description: 'Mendapatkan statistik platform: total user, revenue, breakdown paket, dan aktivitas terbaru.',
        auth: true,
        authNote: 'Hanya admin/operator',
        params: [],
        body: null,
        response: {
          status: 'success',
          stats: { total_users: 10, total_admins: 1, total_active_subscriptions: 8, total_revenue: 500000, package_breakdown: [] },
          recent_activities: [],
        },
      },
    ],
  },
  {
    category: 'Informasi Server',
    icon: '🌐',
    description: 'Endpoint informasi umum tentang server dan status aplikasi.',
    endpoints: [
      {
        method: 'GET',
        path: '/api',
        title: 'API Info',
        description: 'Menampilkan informasi umum aplikasi, versi, database, dan daftar semua endpoint yang tersedia.',
        auth: false,
        params: [],
        body: null,
        response: {
          status: 'success',
          application: 'UMKM Insight',
          version: '4.0.0',
          language: 'Python (Flask Framework)',
          database: 'MySQL (XAMPP)',
          mode: 'READ-ONLY',
        },
      },
    ],
  },
]

function methodBadge(method) {
  const cls = method === 'GET' ? 'api-method-get' : method === 'POST' ? 'api-method-post' : method === 'PUT' ? 'api-method-put' : 'api-method-delete'
  return `<span class="api-method-badge ${cls}">${escapeHtml(method)}</span>`
}

function renderParamsTable(params) {
  if (!params || params.length === 0) return ''
  return `
    <div class="api-params-section">
      <h5>📋 Parameters</h5>
      <table class="api-params-table">
        <thead><tr><th>Nama</th><th>Tipe</th><th>Wajib</th><th>Contoh</th><th>Deskripsi</th></tr></thead>
        <tbody>
          ${params
            .map(
              (p) => `
              <tr>
                <td><code>${escapeHtml(p.name)}</code></td>
                <td><span class="api-type-badge">${escapeHtml(p.type)}</span></td>
                <td>${p.required ? '<span class="api-required">Ya</span>' : '<span class="api-optional">Tidak</span>'}</td>
                <td><code>${escapeHtml(p.example)}</code></td>
                <td>${escapeHtml(p.description)}</td>
              </tr>
            `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderBodyExample(body) {
  if (!body) return ''
  return `
    <div class="api-body-section">
      <h5>📝 Request Body (JSON)</h5>
      <pre class="api-code-block"><code>${escapeHtml(JSON.stringify(body, null, 2))}</code></pre>
    </div>
  `
}

function renderResponseExample(response) {
  if (!response) return ''
  return `
    <div class="api-response-section">
      <h5>📤 Contoh Response</h5>
      <pre class="api-code-block api-response-block"><code>${escapeHtml(JSON.stringify(response, null, 2))}</code></pre>
    </div>
  `
}

function renderEndpointCard(endpoint, categoryIndex, endpointIndex) {
  const id = `api-endpoint-${categoryIndex}-${endpointIndex}`
  const testId = `api-test-${categoryIndex}-${endpointIndex}`

  return `
    <div class="api-endpoint-card" id="${id}">
      <div class="api-endpoint-header" data-toggle="${id}-details">
        <div class="api-endpoint-title-row">
          ${methodBadge(endpoint.method)}
          <code class="api-path">${escapeHtml(endpoint.path)}</code>
          ${endpoint.auth ? `<span class="api-auth-badge" title="${escapeHtml(endpoint.authNote || 'Memerlukan JWT Token')}">🔒 Auth</span>` : '<span class="api-no-auth-badge">🌐 Public</span>'}
        </div>
        <div class="api-endpoint-meta">
          <span class="api-endpoint-name">${escapeHtml(endpoint.title)}</span>
          <span class="api-toggle-icon">▼</span>
        </div>
      </div>
      <div class="api-endpoint-details" id="${id}-details" style="display:none;">
        <p class="api-endpoint-desc">${escapeHtml(endpoint.description)}</p>
        ${renderParamsTable(endpoint.params)}
        ${renderBodyExample(endpoint.body)}
        ${renderResponseExample(endpoint.response)}
        <div class="api-test-section">
          <button class="api-test-btn" id="${testId}-btn" data-method="${escapeHtml(endpoint.method)}" data-path="${escapeHtml(endpoint.path)}" data-body='${endpoint.body ? escapeHtml(JSON.stringify(endpoint.body)) : ''}' data-result="${testId}-result">
            ⚡ Test Endpoint
          </button>
          <div class="api-test-result" id="${testId}-result" style="display:none;">
            <div class="api-test-result-header">
              <span class="api-test-status" id="${testId}-status"></span>
              <span class="api-test-time" id="${testId}-time"></span>
            </div>
            <pre class="api-code-block api-live-response"><code id="${testId}-body">Loading...</code></pre>
          </div>
        </div>
      </div>
    </div>
  `
}

export function renderApiDocsPage() {
  const totalEndpoints = API_ENDPOINTS.reduce((sum, cat) => sum + cat.endpoints.length, 0)
  const publicCount = API_ENDPOINTS.reduce((sum, cat) => sum + cat.endpoints.filter((e) => !e.auth).length, 0)
  const protectedCount = totalEndpoints - publicCount

  return `
    <section class="content-section">
      <div class="section-header">
        <h2>🔗 API Documentation</h2>
        <p>Dokumentasi interaktif semua endpoint REST API UMKM Insight. Anda bisa menguji endpoint langsung dari halaman ini.</p>
      </div>

      <div class="api-stats-grid">
        <div class="api-stat-card">
          <span class="api-stat-icon">📡</span>
          <span class="api-stat-value">${totalEndpoints}</span>
          <span class="api-stat-label">Total Endpoints</span>
        </div>
        <div class="api-stat-card">
          <span class="api-stat-icon">🔒</span>
          <span class="api-stat-value">${protectedCount}</span>
          <span class="api-stat-label">Protected</span>
        </div>
        <div class="api-stat-card">
          <span class="api-stat-icon">🌐</span>
          <span class="api-stat-value">${publicCount}</span>
          <span class="api-stat-label">Public</span>
        </div>
        <div class="api-stat-card">
          <span class="api-stat-icon">🗃️</span>
          <span class="api-stat-value">${API_ENDPOINTS.length}</span>
          <span class="api-stat-label">Kategori</span>
        </div>
      </div>

      <div class="api-info-banner">
        <div class="api-info-left">
          <h3>🏦 Base URL</h3>
          <code class="api-base-url">http://localhost:8080</code>
        </div>
        <div class="api-info-right">
          <div class="api-info-item">
            <span class="api-info-label">Framework</span>
            <span class="api-info-value">Python Flask</span>
          </div>
          <div class="api-info-item">
            <span class="api-info-label">Database</span>
            <span class="api-info-value">MySQL (XAMPP)</span>
          </div>
          <div class="api-info-item">
            <span class="api-info-label">Auth</span>
            <span class="api-info-value">JWT Bearer Token</span>
          </div>
          <div class="api-info-item">
            <span class="api-info-label">Mode</span>
            <span class="api-info-value">READ-ONLY</span>
          </div>
        </div>
      </div>

      ${API_ENDPOINTS.map(
        (cat, catIdx) => `
        <div class="api-category" id="api-cat-${catIdx}">
          <div class="api-category-header">
            <div class="api-category-title">
              <span class="api-category-icon">${cat.icon}</span>
              <div>
                <h3>${escapeHtml(cat.category)}</h3>
                <p>${escapeHtml(cat.description)}</p>
              </div>
            </div>
            <span class="api-category-count">${cat.endpoints.length} endpoint${cat.endpoints.length > 1 ? 's' : ''}</span>
          </div>
          <div class="api-endpoint-list">
            ${cat.endpoints.map((ep, epIdx) => renderEndpointCard(ep, catIdx, epIdx)).join('')}
          </div>
        </div>
      `,
      ).join('')}
    </section>
  `
}

export function attachApiDocsEvents() {
  // Toggle endpoint details
  document.querySelectorAll('[data-toggle]').forEach((header) => {
    header.addEventListener('click', () => {
      const detailsId = header.dataset.toggle
      const details = document.getElementById(detailsId)
      const icon = header.querySelector('.api-toggle-icon')
      if (details) {
        const isOpen = details.style.display !== 'none'
        details.style.display = isOpen ? 'none' : 'block'
        if (icon) icon.textContent = isOpen ? '▼' : '▲'
        if (!isOpen) {
          details.classList.add('api-slide-in')
          setTimeout(() => details.classList.remove('api-slide-in'), 400)
        }
      }
    })
  })

  // Test endpoint buttons
  document.querySelectorAll('.api-test-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const method = btn.dataset.method
      const path = btn.dataset.path
      const bodyData = btn.dataset.body || null
      const resultId = btn.dataset.result
      const resultEl = document.getElementById(resultId)
      const statusEl = document.getElementById(resultId.replace('-result', '-status'))
      const timeEl = document.getElementById(resultId.replace('-result', '-time'))
      const bodyEl = document.getElementById(resultId.replace('-result', '-body'))

      if (!resultEl) return

      btn.disabled = true
      btn.textContent = '⏳ Mengirim...'
      resultEl.style.display = 'block'
      bodyEl.textContent = 'Loading...'
      statusEl.textContent = ''
      timeEl.textContent = ''

      const token = localStorage.getItem('umkm_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const startTime = performance.now()

      try {
        const options = { method, headers }
        if (method === 'POST' && bodyData) {
          options.body = bodyData
        }

        const response = await fetch(path, options)
        const endTime = performance.now()
        const duration = (endTime - startTime).toFixed(0)

        let data
        try {
          data = await response.json()
        } catch {
          data = { raw: await response.text() }
        }

        statusEl.textContent = `${response.status} ${response.statusText}`
        statusEl.className = `api-test-status ${response.ok ? 'api-status-ok' : 'api-status-error'}`
        timeEl.textContent = `${duration}ms`
        bodyEl.textContent = JSON.stringify(data, null, 2)
      } catch (err) {
        const endTime = performance.now()
        const duration = (endTime - startTime).toFixed(0)
        statusEl.textContent = 'ERROR'
        statusEl.className = 'api-test-status api-status-error'
        timeEl.textContent = `${duration}ms`
        bodyEl.textContent = `Error: ${err.message}\n\nPastikan backend Python berjalan di http://localhost:8080`
      } finally {
        btn.disabled = false
        btn.textContent = '⚡ Test Endpoint'
      }
    })
  })
}
