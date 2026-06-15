import { apiGet, apiPost, apiPut, escapeHtml } from '../utils.js'

export function renderUserManagementPage(isAdmin) {
  return `
    <section class="content-section">
      <div class="section-header">
        <h2>Kelola User</h2>
        <p>Cari user, lihat detail profil, reset password, dan ${isAdmin ? 'ubah role user.' : 'bantu troubleshooting.'}</p>
      </div>

      <div class="ticket-create-card">
        <h3>Cari User</h3>
        <div class="chat-input-area">
          <input type="text" id="user-search-input" class="form-group-input" placeholder="Ketik nama UMKM atau email user..." style="flex:1; padding:14px 16px; border:1px solid var(--glass-border); border-radius:var(--radius-sm); font-size:15px; font-family:inherit; background:#f8fafc; outline:none;" />
          <button class="pricing-btn" id="user-search-btn" style="width:auto; padding:14px 24px;">Cari</button>
        </div>
      </div>

      <div id="user-search-results">
        <div class="loading-mini">Memuat daftar user...</div>
      </div>

      <!-- User Detail Modal -->
      <div id="user-detail-modal"></div>
    </section>
  `
}

export function attachUserManagementEvents(isAdmin) {
  loadUserList()

  const searchBtn = document.getElementById('user-search-btn')
  const searchInput = document.getElementById('user-search-input')
  if (searchBtn) {
    searchBtn.addEventListener('click', () => loadUserList(searchInput?.value || ''))
  }
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadUserList(searchInput.value || '')
    })
  }
}

async function loadUserList(query = '') {
  const container = document.getElementById('user-search-results')
  if (!container) return
  container.innerHTML = '<div class="loading-mini">Memuat...</div>'

  try {
    const res = await apiGet('/api/admin/users')
    let users = res.data || []

    if (query.trim()) {
      const q = query.toLowerCase()
      users = users.filter(
        (u) => u.nama_umkm.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    }

    if (users.length === 0) {
      container.innerHTML = '<div class="empty-state"><span>🔍</span><p>Tidak ada user ditemukan.</p></div>'
      return
    }

    container.innerHTML = `
      <div class="ticket-list-section">
        <h3>📋 Daftar User (${users.length})</h3>
        <div class="ticket-list">
          ${users
            .map(
              (u) => `
              <div class="ticket-item" data-user-id="${u.id}" style="cursor:pointer; border-left-color: ${u.role === 'admin' ? '#f59e0b' : u.role === 'operator' ? '#8b5cf6' : '#3b82f6'};">
                <div class="ticket-item-header">
                  <span class="ticket-item-subject">${escapeHtml(u.nama_umkm)}</span>
                  <span class="role-badge role-${u.role}">${escapeHtml(u.role)}</span>
                </div>
                <div class="ticket-item-meta">
                  <span>📧 ${escapeHtml(u.email)}</span>
                  <span>📦 ${escapeHtml(u.subscription?.package_name || 'free')}</span>
                  <span>🆔 ${escapeHtml(u.umkm_id || '-')}</span>
                </div>
              </div>
            `,
            )
            .join('')}
        </div>
      </div>
    `

    // Attach click events to open detail
    container.querySelectorAll('[data-user-id]').forEach((el) => {
      el.addEventListener('click', () => openUserDetail(el.dataset.userId))
    })
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><span>⚠️</span><p>Gagal memuat data user.</p></div>'
  }
}

async function openUserDetail(userId) {
  const modal = document.getElementById('user-detail-modal')
  if (!modal) return

  modal.innerHTML = `
    <div class="ticket-modal" id="user-modal-overlay">
      <div class="ticket-modal-content ticket-modal-wide">
        <div class="ticket-modal-header">
          <h3>Detail User</h3>
          <button class="ticket-modal-close" id="close-user-modal">✕</button>
        </div>
        <div id="user-modal-body" style="padding:24px 28px;">
          <div class="loading-mini">Memuat detail user...</div>
        </div>
      </div>
    </div>
  `

  document.getElementById('close-user-modal')?.addEventListener('click', () => {
    modal.innerHTML = ''
  })
  document.getElementById('user-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'user-modal-overlay') modal.innerHTML = ''
  })

  try {
    const res = await apiGet(`/api/admin/users/${userId}`)
    const u = res.user
    const profile = u.profile || {}
    const sub = u.subscription || {}
    const tickets = res.recent_tickets || []
    const activities = res.recent_activities || []

    const body = document.getElementById('user-modal-body')
    if (!body) return

    body.innerHTML = `
      <div class="ticket-detail-info" style="grid-template-columns: 1fr 1fr 1fr;">
        <div class="ticket-detail-row"><strong>Nama UMKM</strong>${escapeHtml(u.nama_umkm)}</div>
        <div class="ticket-detail-row"><strong>Email</strong>${escapeHtml(u.email)}</div>
        <div class="ticket-detail-row"><strong>Role</strong><span class="role-badge role-${u.role}">${escapeHtml(u.role)}</span></div>
        <div class="ticket-detail-row"><strong>UMKM ID</strong>${escapeHtml(u.umkm_id || '-')}</div>
        <div class="ticket-detail-row"><strong>Kategori</strong>${escapeHtml(profile.kategori_icon || '📦')} ${escapeHtml(profile.kategori || '-')}</div>
        <div class="ticket-detail-row"><strong>NPWP</strong>${escapeHtml(profile.npwp || '-')}</div>
        <div class="ticket-detail-row"><strong>No. Telp</strong>${escapeHtml(profile.no_telp || '-')}</div>
        <div class="ticket-detail-row"><strong>Alamat</strong>${escapeHtml(profile.alamat || '-')}</div>
        <div class="ticket-detail-row"><strong>Health Score</strong>${profile.health_score ?? 0}/100</div>
        <div class="ticket-detail-row"><strong>Paket</strong>${escapeHtml(sub.package_name || 'free')}</div>
        <div class="ticket-detail-row"><strong>Status Langganan</strong>${escapeHtml(sub.status || '-')}</div>
        <div class="ticket-detail-row"><strong>Expired</strong>${sub.expired ? new Date(sub.expired).toLocaleDateString('id-ID') : '-'}</div>
      </div>

      ${profile.deskripsi_usaha ? `<div class="ticket-detail-desc"><strong>Deskripsi Usaha</strong><p>${escapeHtml(profile.deskripsi_usaha)}</p></div>` : ''}

      <hr style="border:none; border-top:1px solid var(--glass-border); margin: 20px 0;" />

      <h4 style="margin-bottom:12px;">Tiket Terbaru</h4>
      ${
        tickets.length
          ? `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
              ${tickets.map((t) => `<div class="activity-item"><span class="activity-action">${escapeHtml(t.status)}</span><span class="activity-detail">${escapeHtml(t.subject)}</span><span class="activity-time">${new Date(t.created_at).toLocaleDateString('id-ID')}</span></div>`).join('')}
            </div>`
          : '<p class="text-muted" style="margin-bottom:20px;">Belum ada tiket.</p>'
      }

      <h4 style="margin-bottom:12px;">Aktivitas Terbaru</h4>
      ${
        activities.length
          ? `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
              ${activities.map((a) => `<div class="activity-item"><span class="activity-action">${escapeHtml(a.action)}</span><span class="activity-detail">${escapeHtml(a.detail || '-')}</span><span class="activity-time">${new Date(a.created_at).toLocaleString('id-ID')}</span></div>`).join('')}
            </div>`
          : '<p class="text-muted" style="margin-bottom:20px;">Belum ada aktivitas.</p>'
      }

      <hr style="border:none; border-top:1px solid var(--glass-border); margin: 20px 0;" />

      <h4 style="margin-bottom:12px;">Aksi</h4>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div class="form-group" style="flex:1;min-width:200px;">
          <label>Reset Password</label>
          <input type="password" id="new-pw-input" placeholder="Password baru (min 6 karakter)" style="padding:12px 16px;border:1px solid var(--glass-border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:#f8fafc;outline:none;width:100%;" />
        </div>
        <button class="pricing-btn op-action-btn" id="btn-reset-pw" data-uid="${u.id}" style="height:48px;">🔑 Reset</button>
      </div>
      <div id="reset-pw-result" style="margin-top:8px;"></div>

      <div id="role-section" style="margin-top:20px; display:${document.querySelector('[data-admin-flag]') || true ? 'block' : 'none'};">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div class="form-group" style="flex:1;min-width:200px;">
            <label>Ubah Role (Admin Only)</label>
            <select id="new-role-select" style="padding:12px 16px;border:1px solid var(--glass-border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:#f8fafc;outline:none;width:100%;">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>User (UMKM)</option>
              <option value="operator" ${u.role === 'operator' ? 'selected' : ''}>Operator</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <button class="pricing-btn op-action-btn btn-dark" id="btn-change-role" data-uid="${u.id}" style="height:48px;">Ubah Role</button>
        </div>
        <div id="change-role-result" style="margin-top:8px;"></div>
      </div>
    `

    // Attach reset password
    document.getElementById('btn-reset-pw')?.addEventListener('click', async () => {
      const pw = document.getElementById('new-pw-input')?.value || ''
      const resultEl = document.getElementById('reset-pw-result')
      if (pw.length < 6) {
        resultEl.innerHTML = '<div class="auth-error">Password minimal 6 karakter</div>'
        return
      }
      try {
        const r = await apiPost(`/api/admin/users/${userId}/reset-password`, { new_password: pw })
        resultEl.innerHTML = `<div class="auth-success">✅ ${escapeHtml(r.message)}</div>`
      } catch (e) {
        resultEl.innerHTML = `<div class="auth-error">❌ ${escapeHtml(e.response?.data?.message || 'Gagal reset password')}</div>`
      }
    })

    // Attach change role
    document.getElementById('btn-change-role')?.addEventListener('click', async () => {
      const role = document.getElementById('new-role-select')?.value
      const resultEl = document.getElementById('change-role-result')
      try {
        const r = await apiPut(`/api/admin/users/${userId}/role`, { role })
        resultEl.innerHTML = `<div class="auth-success">✅ ${escapeHtml(r.message)}</div>`
        // Reload user list
        loadUserList()
      } catch (e) {
        resultEl.innerHTML = `<div class="auth-error">❌ ${escapeHtml(e.response?.data?.message || 'Gagal ubah role')}</div>`
      }
    })
  } catch (err) {
    const body = document.getElementById('user-modal-body')
    if (body) body.innerHTML = '<div class="empty-state"><span>⚠️</span><p>Gagal memuat detail user.</p></div>'
  }
}
