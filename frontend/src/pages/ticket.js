import { escapeHtml, formatDate, apiGet, apiPost, apiPut } from '../utils.js'

// =============================================
// Customer Service Page (User / UMKM)
// =============================================

export function renderTicketPage() {
  return `
    <section class="content-section">
      <div class="section-header">
        <h2>🎧 Pusat Bantuan</h2>
        <p>Kirim keluhan atau pertanyaan Anda. Tim operator kami siap membantu.</p>
      </div>

      <div class="ticket-create-card">
        <h3>📝 Buat Tiket Baru</h3>
        <form id="ticket-form" class="ticket-form">
          <div class="form-row">
            <div class="form-group">
              <label for="ticket-subject">Subjek</label>
              <input type="text" id="ticket-subject" placeholder="Ringkasan masalah Anda" required />
            </div>
            <div class="form-group">
              <label for="ticket-kategori">Kategori</label>
              <select id="ticket-kategori" class="filter-select">
                <option value="umum">Umum</option>
                <option value="teknis">Teknis</option>
                <option value="pembayaran">Pembayaran</option>
                <option value="akun">Akun</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="ticket-desc">Deskripsi</label>
            <textarea id="ticket-desc" rows="4" placeholder="Jelaskan masalah Anda secara detail..." required></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="ticket-prioritas">Prioritas</label>
              <select id="ticket-prioritas" class="filter-select">
                <option value="rendah">🟢 Rendah</option>
                <option value="sedang" selected>🟡 Sedang</option>
                <option value="tinggi">🔴 Tinggi</option>
              </select>
            </div>
            <div class="form-group" style="display:flex; align-items:flex-end;">
              <button type="submit" class="pricing-btn" id="ticket-submit-btn" style="width:100%">📩 Kirim Tiket</button>
            </div>
          </div>
          <div id="ticket-result" class="hidden"></div>
        </form>
      </div>

      <div class="ticket-list-section">
        <h3>📋 Tiket Saya</h3>
        <div id="my-tickets-list" class="ticket-list">
          <div class="loading-mini">Memuat tiket...</div>
        </div>
      </div>

      <div id="ticket-detail-modal" class="ticket-modal hidden">
        <div class="ticket-modal-content">
          <div class="ticket-modal-header">
            <h3 id="modal-ticket-subject"></h3>
            <button class="ticket-modal-close" id="close-ticket-modal">✕</button>
          </div>
          <div id="modal-ticket-body"></div>
        </div>
      </div>
    </section>
  `
}

export function attachTicketEvents() {
  loadMyTickets()

  const form = document.getElementById('ticket-form')
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const subject = document.getElementById('ticket-subject').value.trim()
      const description = document.getElementById('ticket-desc').value.trim()
      const kategori = document.getElementById('ticket-kategori').value
      const prioritas = document.getElementById('ticket-prioritas').value
      const resultEl = document.getElementById('ticket-result')
      const btn = document.getElementById('ticket-submit-btn')

      btn.disabled = true
      btn.textContent = 'Mengirim...'
      resultEl.classList.add('hidden')

      try {
        await apiPost('/api/tickets/', { subject, description, kategori, prioritas })
        resultEl.innerHTML = '<div class="payment-success"><span class="payment-success-icon">✅</span><h3>Tiket Berhasil Dikirim!</h3><p>Operator kami akan segera merespons.</p></div>'
        resultEl.classList.remove('hidden')
        form.reset()
        loadMyTickets()
      } catch (err) {
        resultEl.innerHTML = `<div class="payment-error"><span class="payment-error-icon">❌</span><h3>Gagal Mengirim Tiket</h3><p>${escapeHtml(err.message || 'Terjadi kesalahan')}</p></div>`
        resultEl.classList.remove('hidden')
      } finally {
        btn.disabled = false
        btn.textContent = '📩 Kirim Tiket'
      }
    })
  }

  const closeModal = document.getElementById('close-ticket-modal')
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      document.getElementById('ticket-detail-modal')?.classList.add('hidden')
    })
  }
}

async function loadMyTickets() {
  const container = document.getElementById('my-tickets-list')
  if (!container) return

  try {
    const res = await apiGet('/api/tickets/my')
    const tickets = res.data || []

    if (tickets.length === 0) {
      container.innerHTML = '<div class="empty-state"><span>📭</span><p>Belum ada tiket. Buat tiket baru jika Anda butuh bantuan.</p></div>'
      return
    }

    container.innerHTML = tickets
      .map(
        (t) => `
          <div class="ticket-item ticket-status-${escapeHtml(t.status)}" data-ticket-id="${escapeHtml(t.id)}">
            <div class="ticket-item-header">
              <span class="ticket-item-subject">${escapeHtml(t.subject)}</span>
              <span class="ticket-status-badge status-${escapeHtml(t.status)}">${statusLabel(t.status)}</span>
            </div>
            <div class="ticket-item-meta">
              <span>📁 ${escapeHtml(t.kategori)}</span>
              <span>🕐 ${formatDate(t.created_at)}</span>
              ${t.operator_name ? `<span>👤 ${escapeHtml(t.operator_name)}</span>` : ''}
            </div>
          </div>
        `,
      )
      .join('')

    // Attach click events
    container.querySelectorAll('.ticket-item').forEach((el) => {
      el.addEventListener('click', () => openTicketDetail(el.dataset.ticketId))
    })
  } catch {
    container.innerHTML = '<div class="empty-state"><span>⚠️</span><p>Gagal memuat tiket.</p></div>'
  }
}

async function openTicketDetail(ticketId) {
  const modal = document.getElementById('ticket-detail-modal')
  const subjectEl = document.getElementById('modal-ticket-subject')
  const bodyEl = document.getElementById('modal-ticket-body')
  if (!modal || !bodyEl) return

  modal.classList.remove('hidden')
  bodyEl.innerHTML = '<div class="loading-mini">Memuat detail tiket...</div>'

  try {
    const res = await apiGet(`/api/tickets/${ticketId}`)
    const ticket = res.ticket
    const replies = res.replies || []

    subjectEl.textContent = ticket.subject

    bodyEl.innerHTML = `
      <div class="ticket-detail-info">
        <div class="ticket-detail-row"><strong>Status:</strong> <span class="ticket-status-badge status-${escapeHtml(ticket.status)}">${statusLabel(ticket.status)}</span></div>
        <div class="ticket-detail-row"><strong>Kategori:</strong> ${escapeHtml(ticket.kategori)}</div>
        <div class="ticket-detail-row"><strong>Prioritas:</strong> ${prioritasLabel(ticket.prioritas)}</div>
        <div class="ticket-detail-row"><strong>Dibuat:</strong> ${formatDate(ticket.created_at)}</div>
        ${ticket.operator_name ? `<div class="ticket-detail-row"><strong>Operator:</strong> ${escapeHtml(ticket.operator_name)}</div>` : ''}
      </div>
      <div class="ticket-detail-desc">
        <strong>Deskripsi:</strong>
        <p>${escapeHtml(ticket.description)}</p>
      </div>
      <div class="ticket-chat">
        <h4>💬 Percakapan</h4>
        <div class="chat-messages" id="chat-messages">
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
          ticket.status !== 'closed' && ticket.status !== 'resolved'
            ? `
              <div class="chat-input-area">
                <textarea id="reply-message" rows="2" placeholder="Tulis balasan..."></textarea>
                <button class="pricing-btn" id="send-reply-btn" data-ticket-id="${escapeHtml(ticketId)}">Kirim</button>
              </div>
            `
            : '<p class="text-muted" style="text-align:center; padding:0.5rem;">Tiket sudah ditutup.</p>'
        }
      </div>
    `

    // Reply event
    const sendBtn = document.getElementById('send-reply-btn')
    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        const msg = document.getElementById('reply-message')?.value?.trim()
        if (!msg) return
        sendBtn.disabled = true
        sendBtn.textContent = 'Mengirim...'
        try {
          await apiPost(`/api/tickets/${ticketId}/reply`, { message: msg })
          openTicketDetail(ticketId) // Refresh
        } catch {
          alert('Gagal mengirim balasan')
        } finally {
          sendBtn.disabled = false
          sendBtn.textContent = 'Kirim'
        }
      })
    }
  } catch {
    bodyEl.innerHTML = '<p class="text-muted">Gagal memuat detail tiket.</p>'
  }
}

function statusLabel(status) {
  const labels = {
    open: '🟡 Open',
    in_progress: '🔵 Diproses',
    resolved: '🟢 Selesai',
    closed: '⚫ Ditutup',
  }
  return labels[status] || status
}

function prioritasLabel(p) {
  const labels = { rendah: '🟢 Rendah', sedang: '🟡 Sedang', tinggi: '🔴 Tinggi' }
  return labels[p] || p
}
