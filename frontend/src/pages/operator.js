import { escapeHtml, formatDate, apiGet, apiPost, apiPut } from '../utils.js'

// =============================================
// Operator Dashboard (Handle Tickets)
// =============================================

export function renderOperatorPage() {
  return `
    <section class="content-section">
      <div class="section-header">
        <h2>Dashboard Operator</h2>
        <p>Kelola keluhan dan tiket dari user UMKM. Pastikan semua keluhan ditangani.</p>
      </div>

      <div class="operator-filter-bar">
        <button class="filter-pill active" data-filter="all">Semua</button>
        <button class="filter-pill" data-filter="open">🟡 Open</button>
        <button class="filter-pill" data-filter="in_progress">🔵 Diproses</button>
        <button class="filter-pill" data-filter="resolved">🟢 Selesai</button>
        <button class="filter-pill" data-filter="closed">⚫ Ditutup</button>
      </div>

      <div class="operator-stats" id="operator-stats">
        <div class="op-stat"><span class="op-stat-value" id="stat-total">-</span><span class="op-stat-label">Total Tiket</span></div>
        <div class="op-stat"><span class="op-stat-value" id="stat-open">-</span><span class="op-stat-label">Open</span></div>
        <div class="op-stat"><span class="op-stat-value" id="stat-progress">-</span><span class="op-stat-label">Diproses</span></div>
        <div class="op-stat"><span class="op-stat-value" id="stat-resolved">-</span><span class="op-stat-label">Selesai</span></div>
      </div>

      <div id="operator-tickets-list" class="ticket-list">
        <div class="loading-mini">Memuat tiket...</div>
      </div>

      <div id="operator-ticket-modal" class="ticket-modal hidden">
        <div class="ticket-modal-content ticket-modal-wide">
          <div class="ticket-modal-header">
            <h3 id="op-modal-subject"></h3>
            <button class="ticket-modal-close" id="close-op-modal">✕</button>
          </div>
          <div id="op-modal-body"></div>
        </div>
      </div>
    </section>
  `
}

let allTickets = []
let currentFilter = 'all'

export function attachOperatorEvents() {
  loadAllTickets()

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'))
      pill.classList.add('active')
      currentFilter = pill.dataset.filter
      renderTicketList()
    })
  })

  const closeModal = document.getElementById('close-op-modal')
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      document.getElementById('operator-ticket-modal')?.classList.add('hidden')
    })
  }
}

async function loadAllTickets() {
  try {
    const res = await apiGet('/api/tickets/all')
    allTickets = res.data || []
    updateStats()
    renderTicketList()
  } catch {
    const container = document.getElementById('operator-tickets-list')
    if (container) container.innerHTML = '<div class="empty-state"><span>⚠️</span><p>Gagal memuat tiket.</p></div>'
  }
}

function updateStats() {
  const total = allTickets.length
  const open = allTickets.filter((t) => t.status === 'open').length
  const progress = allTickets.filter((t) => t.status === 'in_progress').length
  const resolved = allTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
  set('stat-total', total)
  set('stat-open', open)
  set('stat-progress', progress)
  set('stat-resolved', resolved)
}

function renderTicketList() {
  const container = document.getElementById('operator-tickets-list')
  if (!container) return

  let filtered = currentFilter === 'all' ? allTickets : allTickets.filter((t) => t.status === currentFilter)

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><span>📭</span><p>Tidak ada tiket di filter ini.</p></div>'
    return
  }

  container.innerHTML = filtered
    .map(
      (t) => `
        <div class="ticket-item ticket-status-${escapeHtml(t.status)} ticket-operator-item" data-ticket-id="${escapeHtml(t.id)}">
          <div class="ticket-item-header">
            <span class="ticket-item-subject">${escapeHtml(t.subject)}</span>
            <span class="ticket-status-badge status-${escapeHtml(t.status)}">${statusLabel(t.status)}</span>
          </div>
          <div class="ticket-item-meta">
            <span>👤 ${escapeHtml(t.user_name || 'User')}</span>
            <span>📧 ${escapeHtml(t.user_email || '')}</span>
            <span>📁 ${escapeHtml(t.kategori)}</span>
            <span>${prioritasIcon(t.prioritas)} ${escapeHtml(t.prioritas)}</span>
            <span>🕐 ${formatDate(t.created_at)}</span>
            ${t.operator_name ? `<span>🎛️ ${escapeHtml(t.operator_name)}</span>` : '<span class="text-warning">⚠️ Belum diambil</span>'}
          </div>
        </div>
      `,
    )
    .join('')

  container.querySelectorAll('.ticket-operator-item').forEach((el) => {
    el.addEventListener('click', () => openOperatorDetail(el.dataset.ticketId))
  })
}

async function openOperatorDetail(ticketId) {
  const modal = document.getElementById('operator-ticket-modal')
  const subjectEl = document.getElementById('op-modal-subject')
  const bodyEl = document.getElementById('op-modal-body')
  if (!modal || !bodyEl) return

  modal.classList.remove('hidden')
  bodyEl.innerHTML = '<div class="loading-mini">Memuat detail...</div>'

  try {
    const res = await apiGet(`/api/tickets/${ticketId}`)
    const ticket = res.ticket
    const replies = res.replies || []

    subjectEl.textContent = ticket.subject

    bodyEl.innerHTML = `
      <div class="ticket-detail-info operator-detail">
        <div class="ticket-detail-row"><strong>Dari:</strong> ${escapeHtml(ticket.user_name)} (${escapeHtml(ticket.user_email)})</div>
        <div class="ticket-detail-row"><strong>Status:</strong> <span class="ticket-status-badge status-${escapeHtml(ticket.status)}">${statusLabel(ticket.status)}</span></div>
        <div class="ticket-detail-row"><strong>Kategori:</strong> ${escapeHtml(ticket.kategori)}</div>
        <div class="ticket-detail-row"><strong>Prioritas:</strong> ${prioritasIcon(ticket.prioritas)} ${escapeHtml(ticket.prioritas)}</div>
        <div class="ticket-detail-row"><strong>Operator:</strong> ${ticket.operator_name ? escapeHtml(ticket.operator_name) : '<em>Belum diambil</em>'}</div>
      </div>

      <div class="ticket-detail-desc">
        <strong>Deskripsi Keluhan:</strong>
        <p>${escapeHtml(ticket.description)}</p>
      </div>

      <div class="operator-actions">
        ${!ticket.operator_id ? `<button class="pricing-btn op-action-btn" id="btn-assign" data-id="${escapeHtml(ticketId)}">🤝 Ambil Alih Tiket</button>` : ''}
        ${ticket.status === 'in_progress' ? `<button class="pricing-btn op-action-btn btn-success" id="btn-resolve" data-id="${escapeHtml(ticketId)}">✅ Selesaikan</button>` : ''}
        ${ticket.status === 'resolved' ? `<button class="pricing-btn op-action-btn btn-dark" id="btn-close" data-id="${escapeHtml(ticketId)}">🔒 Tutup Tiket</button>` : ''}
      </div>

      <div class="ticket-chat">
        <h4>Percakapan</h4>
        <div class="chat-messages" id="op-chat-messages">
          ${
            replies.length
              ? replies
                  .map(
                    (r) => `
                      <div class="chat-bubble chat-${r.sender_role === 'user' ? 'user' : 'operator'}">
                        <div class="chat-sender">${escapeHtml(r.sender_name)} (${escapeHtml(r.sender_role)})</div>
                        <div class="chat-text">${escapeHtml(r.message)}</div>
                        <div class="chat-time">${formatDate(r.created_at)}</div>
                      </div>
                    `,
                  )
                  .join('')
              : '<p class="text-muted" style="text-align:center; padding:1rem;">Belum ada percakapan.</p>'
          }
        </div>
        ${
          ticket.status !== 'closed'
            ? `
              <div class="chat-input-area">
                <textarea id="op-reply-message" rows="2" placeholder="Tulis balasan ke user..."></textarea>
                <button class="pricing-btn" id="op-send-reply" data-ticket-id="${escapeHtml(ticketId)}">Kirim</button>
              </div>
            `
            : ''
        }
      </div>
    `

    // Action buttons
    const assignBtn = document.getElementById('btn-assign')
    if (assignBtn) {
      assignBtn.addEventListener('click', async () => {
        assignBtn.disabled = true
        try {
          await apiPut(`/api/tickets/${ticketId}/assign`, {})
          openOperatorDetail(ticketId)
          loadAllTickets()
        } catch { window.showToast('Gagal mengambil alih tiket', 'error') }
      })
    }

    const resolveBtn = document.getElementById('btn-resolve')
    if (resolveBtn) {
      resolveBtn.addEventListener('click', async () => {
        resolveBtn.disabled = true
        try {
          await apiPut(`/api/tickets/${ticketId}/status`, { status: 'resolved' })
          openOperatorDetail(ticketId)
          loadAllTickets()
        } catch { window.showToast('Gagal menyelesaikan tiket', 'error') }
      })
    }

    const closeBtn = document.getElementById('btn-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', async () => {
        closeBtn.disabled = true
        try {
          await apiPut(`/api/tickets/${ticketId}/status`, { status: 'closed' })
          openOperatorDetail(ticketId)
          loadAllTickets()
        } catch { window.showToast('Gagal menutup tiket', 'error') }
      })
    }

    // Reply
    const sendBtn = document.getElementById('op-send-reply')
    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        const msg = document.getElementById('op-reply-message')?.value?.trim()
        if (!msg) return
        sendBtn.disabled = true
        sendBtn.textContent = 'Mengirim...'
        try {
          await apiPost(`/api/tickets/${ticketId}/reply`, { message: msg })
          openOperatorDetail(ticketId)
        } catch { window.showToast('Gagal mengirim balasan', 'error') }
      })
    }
  } catch {
    bodyEl.innerHTML = '<p class="text-muted">Gagal memuat detail tiket.</p>'
  }
}

function statusLabel(status) {
  const labels = { open: '🟡 Open', in_progress: '🔵 Diproses', resolved: '🟢 Selesai', closed: '⚫ Ditutup' }
  return labels[status] || status
}

function prioritasIcon(p) {
  const icons = { rendah: '🟢', sedang: '🟡', tinggi: '🔴' }
  return icons[p] || '⚪'
}
