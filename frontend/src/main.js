import axios from 'axios'
import './App.css'
import { destroyCharts, renderCharts } from './charts.js'
import { renderApp, renderError, renderLoading, updateTransactionTable } from './render.js'
import { USER_ID } from './utils.js'

const root = document.getElementById('root')
const chartStore = {}

const state = {
  data: null,
  allTransactions: [],
  filteredTransactions: [],
  activeSection: 'dashboard',
  sidebarOpen: false,
  sourceFilter: 'all',
  typeFilter: 'all',
}

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

function attachEvents() {
  document.querySelectorAll('[data-nav]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault()
      state.activeSection = element.dataset.nav
      state.sidebarOpen = false
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
}

function render() {
  if (!state.data) return

  applyTransactionFilters()
  renderApp(root, state)
  attachEvents()

  if (state.activeSection === 'dashboard') {
    renderCharts(state.data.analisis, chartStore)
  } else {
    destroyCharts(chartStore)
  }
}

async function loadData() {
  renderLoading(root)

  try {
    const [dashboardResponse, transactionResponse] = await Promise.all([
      axios.get(`/api/umkm_insight/dashboard?user_id=${USER_ID}`),
      axios.get(`/api/umkm_insight/ambil_data_transaksi?user_id=${USER_ID}`),
    ])

    state.data = dashboardResponse.data
    state.allTransactions = transactionResponse.data.data ?? []
    applyTransactionFilters()

    window.setTimeout(() => {
      render()
    }, 1500)
  } catch (error) {
    console.error('Error:', error)
    window.setTimeout(() => {
      renderError(root)
    }, 2000)
  }
}

loadData()
