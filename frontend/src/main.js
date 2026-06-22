import './App.css'
import { destroyCharts, renderCharts } from './charts.js'
import { renderAdminPage } from './pages/admin.js'
import { attachApiDocsEvents } from './pages/api_docs.js'
import { attachLoginEvents, renderLoginPage } from './pages/login.js'
import { attachForgotPasswordEvents, renderForgotPasswordPage } from './pages/forgot_password.js'
import { attachOperatorEvents } from './pages/operator.js'
import { attachRegisterEvents, fetchKategori, renderRegisterPage } from './pages/register.js'
import { attachSubscriptionEvents } from './pages/subscription.js'
import { attachTicketEvents } from './pages/ticket.js'
import { attachUserManagementEvents } from './pages/user_management.js'
import { renderApp, renderAppSkeleton, renderError, renderLoading, updateTransactionTable } from './render.js'
import { apiGet, apiPost, getToken, removeToken, setToken, showToast } from './utils.js'

window.showToast = showToast

const root = document.getElementById('root')

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light'
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme')
}

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
  monthFilter: '',
  availablePackages: [],
  adminData: null,
}

async function handleLogin(email, password) {
  const response = await apiPost('/api/auth/login', { email, password })
  setToken(response.token)
  state.user = response.user
  state.page = 'app'

  // Set default section based on role
  if (state.user.role === 'admin') {
    state.activeSection = 'admin'
  } else if (state.user.role === 'operator') {
    state.activeSection = 'operator_panel'
  } else {
    state.activeSection = 'dashboard'
  }

  await loadDashboardData()
  window.showToast('Login berhasil', 'success')
}

async function handleRegister(nama_umkm, email, password, npwp, kategori_id) {
  await apiPost('/api/auth/register', { nama_umkm, email, password, role: 'user', npwp: npwp || null, kategori_id: kategori_id || null })
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
  window.showToast('Anda telah logout', 'info')
}

async function loadDashboardData() {
  const umkmId = state.user?.umkm_id || 'UMKM001'

  if (state.activeSection === 'dashboard' || state.activeSection === 'analisis') {
    renderAppSkeleton(root, state)
  }

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
  if (state.monthFilter) {
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item.date)
      const itemMonthStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
      return itemMonthStr === state.monthFilter
    })
  }
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
      if (section === 'user_management') {
        state.activeSection = 'user_management'
        state.sidebarOpen = window.innerWidth <= 768 ? false : state.sidebarOpen
        render()
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

  const themeToggleBtn = document.getElementById('theme-toggle')
  if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
      document.body.classList.toggle('dark-theme')
      const isDark = document.body.classList.contains('dark-theme')
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    }
  }

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (event) => {
      event.preventDefault()
      handleLogout()
    })
  }

  const overlay = document.getElementById('sidebar-overlay')
  if (overlay) {
    overlay.addEventListener('click', () => {
      state.sidebarOpen = false
      render()
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

  const monthFilter = document.getElementById('month-filter')
  if (monthFilter) {
    monthFilter.value = state.monthFilter
    monthFilter.addEventListener('change', (event) => {
      state.monthFilter = event.target.value
      applyTransactionFilters()
      updateTransactionTable(state.filteredTransactions)
    })
  }

  if (state.activeSection === 'subscription') {
    attachSubscriptionEvents(handleUpgrade)
  }

  if (state.activeSection === 'api_docs') {
    attachApiDocsEvents()
  }

  if (state.activeSection === 'bantuan') {
    attachTicketEvents()
  }

  if (state.activeSection === 'operator_panel') {
    attachOperatorEvents()
  }

  if (state.activeSection === 'user_management') {
    const isAdmin = state.user?.role === 'admin'
    attachUserManagementEvents(isAdmin)
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
    console.error('Failed to load admin data:', error)
    showToast('Gagal memuat admin panel. Pastikan akun Anda admin atau operator.', 'error')
    state.activeSection = 'dashboard'
    render()
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

async function renderPage() {
  let kategoriList = null
  if (state.page === 'register') {
    kategoriList = await fetchKategori()
  }

  const performUpdate = () => {
    switch (state.page) {
      case 'login':
        root.innerHTML = renderLoginPage()
        attachLoginEvents(handleLogin, (nextPage) => {
          state.page = nextPage
          renderPage()
        })
        break
      case 'forgot_password':
        root.innerHTML = renderForgotPasswordPage('request')
        attachForgotPasswordEvents((nextPage) => {
          state.page = nextPage
          renderPage()
        })
        break
      case 'reset_password_form':
        root.innerHTML = renderForgotPasswordPage('reset')
        attachForgotPasswordEvents((nextPage) => {
          state.page = nextPage
          renderPage()
        })
        break
      case 'register':
        root.innerHTML = renderRegisterPage(kategoriList)
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

  if (document.startViewTransition) {
    document.startViewTransition(() => {
      performUpdate()
    })
  } else {
    performUpdate()
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

    // Set default section based on role
    if (state.user.role === 'admin') {
      state.activeSection = 'admin'
    } else if (state.user.role === 'operator') {
      state.activeSection = 'operator_panel'
    } else {
      state.activeSection = 'dashboard'
    }

    await loadDashboardData()
  } catch (error) {
    console.error('Token validation failed:', error)
    removeToken()
    state.page = 'login'
    setTimeout(() => renderPage(), 600)
  }
}

init()
