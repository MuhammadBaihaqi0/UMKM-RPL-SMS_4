import axios from 'axios'

// ============================================
// Auth Helpers
// ============================================

export function getToken() {
  return localStorage.getItem('umkm_token')
}

export function setToken(token) {
  localStorage.setItem('umkm_token', token)
}

export function removeToken() {
  localStorage.removeItem('umkm_token')
}

export function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet(url) {
  const response = await axios.get(url, { headers: authHeaders() })
  return response.data
}

export async function apiPost(url, data) {
  const response = await axios.post(url, data, { headers: authHeaders() })
  return response.data
}

export async function apiPut(url, data) {
  const response = await axios.put(url, data, { headers: authHeaders() })
  return response.data
}

// ============================================
// Format Helpers
// ============================================

export function formatRupiah(num) {
  if (num === undefined || num === null) return 'Rp 0'
  const abs = Math.abs(num)
  return `${num < 0 ? '-' : ''}Rp ${abs.toLocaleString('id-ID')}`
}

export function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function sectionTitle(section) {
  const titles = {
    dashboard: 'Dashboard',
    analisis: 'Analisis',
    transaksi: 'Data Transaksi',
    insights: 'Insights',
    subscription: 'Langganan',
    api_docs: 'API Documentation',
    admin: 'Admin Panel',
    bantuan: 'Pusat Bantuan',
    operator_panel: 'Dashboard Operator',
    notifikasi: 'Notifikasi',
    user_management: 'Kelola User',
  }
  return titles[section] || section.charAt(0).toUpperCase() + section.slice(1)
}

export function packageLabel(packageName) {
  const labels = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise',
  }
  return labels[packageName] || packageName
}

export function durationLabel(duration) {
  const labels = {
    mingguan: 'Mingguan',
    bulanan: 'Bulanan',
    tahunan: 'Tahunan',
  }
  return labels[duration] || '-'
}

// ============================================
// UI Helpers
// ============================================

export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `

  container.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('toast-show')
  })

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('toast-show')
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, 3000)
}
