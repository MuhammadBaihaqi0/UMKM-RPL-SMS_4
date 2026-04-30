import './App.css'
import { destroyCharts, renderCharts } from './charts.js'
import { renderAdminPage } from './pages/admin.js'
import { attachLoginEvents, renderLoginPage } from './pages/login.js'
import { attachRegisterEvents, renderRegisterPage } from './pages/register.js'
import { attachSubscriptionEvents } from './pages/subscription.js'
import { renderApp, renderError, renderLoading, updateTransactionTable } from './render.js'
import { apiGet, apiPost, getToken, removeToken, setToken } from './utils.js'

const root = document.getElementById('root')
const chartStore = {}

const state = {
  page: 'loading',
  user: null,
  data: null,
  allTransactions: [],
  filteredTransactions: [],
  activeSection: 'dashboard',
  sidebarOpen: window.innerWidth > 768,
  sourceFilter: 'all',
  typeFilter: 'all',
  availablePackages: [],
  adminData: null,
}

async function handleLogin(email, password) {
  const response = await apiPost('/api/auth/login', { email, password })
  setToken(response.token)
  state.user = response.user
  state.page = 'app'
  await loadDashboardData()
}

async function handleRegister(nama_umkm, email, password) {
  await apiPost('/api/auth/register', { nama_umkm, email, password, role: 'user' })
}

async function handleUpgrade(packageName, duration) {
  return apiGet(`/api/smartbank/pay?user_id=${state.user?.umkm_id || ''}&package=${packageName}&duration=${duration}`)
}

async function handleReportToSmartbank() {
  const reporting = state.data?.analisis?.reporting
  if (!reporting?.can_report_decline) {
    throw new Error(reporting?.reason || 'Pelaporan ke SmartBank belum tersedia')
  }

  return apiPost('/api/smartbank/report-decline', {
    umkm_id: state.user?.umkm_id,
    title: reporting.title,
    detail: reporting.detail,
    metric_snapshot: reporting.metric_snapshot,
  })
}

function handleLogout() {
  removeToken()
  state.user = null
  state.data = null
  state.adminData = null
  state.page = 'login'
  state.activeSection = 'dashboard'
  renderPage()
}

async function loadDashboardData() {
  const umkmId = state.user?.umkm_id || 'UMKM001'

  try {
    const [dashboardResponse, transactionResponse, packageResponse] = await Promise.allSettled([
      apiGet(`/api/umkm_insight/dashboard?user_id=${umkmId}`),
      apiGet(`/api/umkm_insight/ambil_data_transaksi?user_id=${umkmId}`),
      apiGet('/api/subscriptions/packages'),
    ])

    if (dashboardResponse.status !== 'fulfilled') {
      throw dashboardResponse.reason
    }

    state.data = dashboardResponse.value
    state.allTransactions = transactionResponse.status === 'fulfilled' ? transactionResponse.value.data ?? [] : []
    state.availablePackages =
      packageResponse.status === 'fulfilled'
        ? packageResponse.value.packages ?? []
        : dashboardResponse.value.available_packages ?? []
    state.data.user.subscription = dashboardResponse.value.user.subscription
    applyTransactionFilters()
    render()
  } catch (error) {
    console.error('Error loading data:', error)
    renderError(root)
  }
}

function applyTransactionFilters() {
  let filtered = [...state.allTransactions]
  if (state.sourceFilter !== 'all') filtered = filtered.filter((item) => item.source_app === state.sourceFilter)
  if (state.typeFilter !== 'all') filtered = filtered.filter((item) => item.type === state.typeFilter)
  filtered.sort((left, right) => new Date(right.date) - new Date(left.date))
  state.filteredTransactions = filtered
}

function attachEvents() {
  document.querySelectorAll('[data-nav]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault()
      const section = element.dataset.nav
      if (section === 'admin') {
        loadAdminData()
        return
      }
      state.activeSection = section
      state.sidebarOpen = window.innerWidth <= 768 ? false : state.sidebarOpen
      render()
    })
  })

  const menuToggle = document.getElementById('menu-toggle')
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      state.sidebarOpen = !state.sidebarOpen
      render()
    })
  }

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (event) => {
      event.preventDefault()
      handleLogout()
    })
  }

  const sourceFilter = document.getElementById('source-filter')
  if (sourceFilter) {
    sourceFilter.value = state.sourceFilter
    sourceFilter.addEventListener('change', (event) => {
      state.sourceFilter = event.target.value
      applyTransactionFilters()
      updateTransactionTable(state.filteredTransactions)
    })
  }

  const typeFilter = document.getElementById('type-filter')
  if (typeFilter) {
    typeFilter.value = state.typeFilter
    typeFilter.addEventListener('change', (event) => {
      state.typeFilter = event.target.value
      applyTransactionFilters()
      updateTransactionTable(state.filteredTransactions)
    })
  }

  if (state.activeSection === 'subscription') {
    attachSubscriptionEvents(handleUpgrade)
  }

  const reportButton = document.getElementById('report-smartbank-btn')
  if (reportButton) {
    reportButton.addEventListener('click', async () => {
      const resultEl = document.getElementById('report-result')
      reportButton.disabled = true
      reportButton.textContent = 'Mengirim...'
      try {
        const result = await handleReportToSmartbank()
        resultEl.innerHTML = `
          <div class="payment-success">
            <span class="payment-success-icon">✅</span>
            <h3>Laporan Terkirim</h3>
            <p>Ref SmartBank: ${result.smartbank_response?.ref || '-'}</p>
          </div>
        `
        resultEl.classList.remove('hidden')
      } catch (error) {
        resultEl.innerHTML = `
          <div class="payment-error">
            <span class="payment-error-icon">❌</span>
            <h3>Gagal Mengirim Laporan</h3>
            <p>${error.message || 'Terjadi kesalahan'}</p>
          </div>
        `
        resultEl.classList.remove('hidden')
        reportButton.disabled = false
        reportButton.textContent = 'Laporkan ke SmartBank'
      }
    })
  }
}

async function loadAdminData() {
  try {
    const [usersData, statsData] = await Promise.all([apiGet('/api/admin/users'), apiGet('/api/admin/stats')])
    state.adminData = { usersData, statsData }
    state.activeSection = 'admin'
    renderAdmin()
  } catch (error) {
    console.error('Error loading admin data:', error)
    alert('Gagal memuat admin panel. Pastikan akun Anda admin atau operator.')
  }
}

function renderAdmin() {
  if (!state.data || !state.adminData) return
  renderApp(root, state)
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    const header = mainContent.querySelector('.top-header')
    const footer = mainContent.querySelector('.main-footer')
    const headerHtml = header ? header.outerHTML : ''
    const footerHtml = footer ? footer.outerHTML : ''
    mainContent.innerHTML = headerHtml + renderAdminPage(state.adminData.usersData, state.adminData.statsData) + footerHtml
  }
  attachEvents()
}

function render() {
  if (!state.data) return
  applyTransactionFilters()
  renderApp(root, state)
  attachEvents()

  if (state.activeSection === 'dashboard' || state.activeSection === 'analisis') {
    renderCharts(state.data.analisis, chartStore)
  } else {
    destroyCharts(chartStore)
  }
}

function renderPage() {
  switch (state.page) {
    case 'login':
      root.innerHTML = renderLoginPage()
      attachLoginEvents(handleLogin, () => {
        state.page = 'register'
        renderPage()
      })
      break
    case 'register':
      root.innerHTML = renderRegisterPage()
      attachRegisterEvents(handleRegister, () => {
        state.page = 'login'
        renderPage()
      })
      break
    case 'app':
      render()
      break
    default:
      renderLoading(root)
  }
}

async function init() {
  renderLoading(root)
  const token = getToken()
  if (!token) {
    state.page = 'login'
    setTimeout(() => renderPage(), 600)
    return
  }

  try {
    const response = await apiGet('/api/auth/me')
    state.user = response.user
    state.page = 'app'
    await loadDashboardData()
  } catch (error) {
    console.error('Token validation failed:', error)
    removeToken()
    state.page = 'login'
    setTimeout(() => renderPage(), 600)
  }
}

init()
