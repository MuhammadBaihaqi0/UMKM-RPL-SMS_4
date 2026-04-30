import axios from 'axios'
import './App.css'
import { destroyCharts, renderCharts } from './charts.js'
import { renderAdminPage } from './pages/admin.js'
import { attachLoginEvents, renderLoginPage } from './pages/login.js'
import { attachRegisterEvents, renderRegisterPage } from './pages/register.js'
import { attachSubscriptionEvents, renderSubscriptionPage } from './pages/subscription.js'
import { renderApp, renderError, renderLoading, updateTransactionTable } from './render.js'
import { apiGet, apiPost, getToken, removeToken, setToken } from './utils.js'

const root = document.getElementById('root')
const chartStore = {}

const state = {
  page: 'loading', // loading, login, register, app
  user: null,
  data: null,
  allTransactions: [],
  filteredTransactions: [],
  activeSection: 'dashboard',
  sidebarOpen: window.innerWidth > 768,
  sourceFilter: 'all',
  typeFilter: 'all',
}

// ============================================
// Auth Functions
// ============================================

async function handleLogin(email, password) {
  const response = await apiPost('/api/auth/login', { email, password })
  if (response.status === 'success') {
    setToken(response.token)
    state.user = response.user
    state.page = 'app'
    await loadDashboardData()
  } else {
    throw new Error(response.message || 'Login gagal')
  }
}

async function handleRegister(nama_umkm, email, password) {
  const response = await apiPost('/api/auth/register', { nama_umkm, email, password })
  if (response.status !== 'success') {
    throw new Error(response.message || 'Registrasi gagal')
  }
}

async function handleUpgrade() {
  const response = await apiGet(`/api/smartbank/pay?user_id=${state.user?.umkm_id || ''}&amount=10000`)
  if (response.status !== 'success') {
    throw new Error(response.message || 'Pembayaran gagal')
  }
  return response
}

function handleLogout() {
  removeToken()
  state.user = null
  state.data = null
  state.page = 'login'
  state.activeSection = 'dashboard'
  renderPage()
}

// ============================================
// Data Loading
// ============================================

async function loadDashboardData() {
  const umkmId = state.user?.umkm_id || 'UMKM001'

  try {
    const [dashboardResponse, transactionResponse] = await Promise.all([
      apiGet(`/api/umkm_insight/dashboard?user_id=${umkmId}`),
      apiGet(`/api/umkm_insight/ambil_data_transaksi?user_id=${umkmId}`),
    ])

    state.data = dashboardResponse
    state.allTransactions = transactionResponse.data ?? []
    applyTransactionFilters()
    render()
  } catch (error) {
    console.error('Error loading data:', error)

    // If the user doesn't have SmartBank data, show dashboard with empty state
    if (error.response?.status === 404) {
      state.data = {
        user: { nama: state.user?.nama_umkm || 'User', subscription: { status: 'free' } },
        analisis: {
          ringkasan: { total_penjualan: 0, total_pengeluaran: 0, laba_kotor: 0, rata_rata_transaksi: 0, jumlah_transaksi: 0, jumlah_penjualan: 0 },
          tren_bulanan: [],
          performa_per_sumber: [],
          distribusi_tipe: {},
          breakdown_fee: { fee_marketplace: 0, fee_pos: 0, fee_supplier: 0, fee_logistik: 0, fee_bank: 0, fee_gateway: 0, pajak: 0, total: 0 },
          insights: [{ type: 'info', icon: '📋', message: 'Belum ada data transaksi dari SmartBank. Data akan muncul setelah UMKM ID Anda terdaftar di ekosistem.' }],
        },
        fee_structure: {},
      }
      state.allTransactions = []
      render()
    } else {
      renderError(root)
    }
  }
}

// ============================================
// Transaction Filters
// ============================================

function applyTransactionFilters() {
  let filtered = [...state.allTransactions]

  if (state.sourceFilter !== 'all') {
    filtered = filtered.filter((item) => item.source_app === state.sourceFilter)
  }
  if (state.typeFilter !== 'all') {
    filtered = filtered.filter((item) => item.type === state.typeFilter)
  }

  filtered.sort((left, right) => new Date(right.date) - new Date(left.date))
  state.filteredTransactions = filtered
}

// ============================================
// Event Handlers
// ============================================

function attachEvents() {
  // Navigation
  document.querySelectorAll('[data-nav]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault()
      const section = element.dataset.nav

      // Admin section needs admin data
      if (section === 'admin') {
        loadAdminData()
        return
      }

      state.activeSection = section
      state.sidebarOpen = window.innerWidth <= 768 ? false : state.sidebarOpen
      render()
    })
  })

  // Menu toggle
  const menuToggle = document.getElementById('menu-toggle')
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      state.sidebarOpen = !state.sidebarOpen
      render()
    })
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault()
      handleLogout()
    })
  }

  // Source filter
  const sourceFilter = document.getElementById('source-filter')
  if (sourceFilter) {
    sourceFilter.value = state.sourceFilter
    sourceFilter.addEventListener('change', (event) => {
      state.sourceFilter = event.target.value
      applyTransactionFilters()
      updateTransactionTable(state.filteredTransactions)
    })
  }

  // Type filter
  const typeFilter = document.getElementById('type-filter')
  if (typeFilter) {
    typeFilter.value = state.typeFilter
    typeFilter.addEventListener('change', (event) => {
      state.typeFilter = event.target.value
      applyTransactionFilters()
      updateTransactionTable(state.filteredTransactions)
    })
  }

  // Subscription events
  if (state.activeSection === 'subscription') {
    attachSubscriptionEvents(handleUpgrade)
  }
}

// ============================================
// Admin Data Loading
// ============================================

async function loadAdminData() {
  try {
    const [usersData, statsData] = await Promise.all([
      apiGet('/api/admin/users'),
      apiGet('/api/admin/stats'),
    ])

    state.activeSection = 'admin'
    state.sidebarOpen = window.innerWidth <= 768 ? false : state.sidebarOpen

    // Render with admin data
    if (!state.data) return
    applyTransactionFilters()
    renderApp(root, state, handleLogout)

    // Replace content section with admin panel
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      const header = mainContent.querySelector('.top-header')
      const footer = mainContent.querySelector('.main-footer')
      const headerHtml = header ? header.outerHTML : ''
      const footerHtml = footer ? footer.outerHTML : ''
      mainContent.innerHTML = headerHtml + renderAdminPage(usersData, statsData) + footerHtml
    }

    attachEvents()
  } catch (error) {
    console.error('Error loading admin data:', error)
    alert('Gagal memuat data admin. Pastikan Anda memiliki akses admin.')
  }
}

// ============================================
// Render Functions
// ============================================

function render() {
  if (!state.data) return

  applyTransactionFilters()
  renderApp(root, state, handleLogout)
  attachEvents()

  if (state.activeSection === 'dashboard') {
    renderCharts(state.data.analisis, chartStore)
  } else {
    destroyCharts(chartStore)
  }
}

function renderPage() {
  switch (state.page) {
    case 'login':
      root.innerHTML = renderLoginPage()
      attachLoginEvents(
        handleLogin,
        () => {
          state.page = 'register'
          renderPage()
        },
      )
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

// ============================================
// App Initialization
// ============================================

async function init() {
  renderLoading(root)

  const token = getToken()
  if (!token) {
    state.page = 'login'
    setTimeout(() => renderPage(), 800)
    return
  }

  // Validate token
  try {
    const response = await apiGet('/api/auth/me')
    if (response.status === 'success') {
      state.user = response.user
      state.page = 'app'
      await loadDashboardData()
    } else {
      removeToken()
      state.page = 'login'
      renderPage()
    }
  } catch (error) {
    console.error('Token validation failed:', error)
    removeToken()
    state.page = 'login'
    setTimeout(() => renderPage(), 800)
  }
}

init()
