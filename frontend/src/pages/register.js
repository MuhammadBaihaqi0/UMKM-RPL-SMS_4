import { apiGet } from '../utils.js'

let kategoriFetched = false
let kategoriList = []

async function fetchKategori() {
  if (kategoriFetched) return kategoriList
  try {
    const res = await apiGet('/api/insight/kategori')
    kategoriList = res.data || []
    kategoriFetched = true
  } catch {
    kategoriList = []
  }
  return kategoriList
}

export function renderRegisterPage(kategoriOptions = []) {
  const options = kategoriOptions
    .map((k) => `<option value="${k.id}">${k.nama_kategori}</option>`)
    .join('')

  return `
    <div class="auth-split-page reverse-layout">
      <div class="auth-split-left">
        <div class="auth-content" style="max-width: 500px;">
          <div class="auth-header">
            <span class="auth-logo"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary)"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></span>
            <h1 class="auth-title">Daftar Akun Baru</h1>
            <p class="auth-subtitle">Bergabung di ekosistem UMKM Insight</p>
          </div>
          <form id="register-form" class="auth-form">
            <div class="form-row" style="display: flex; gap: 16px;">
              <div class="form-group" style="flex: 1;">
                <label for="reg-nama">Nama UMKM</label>
                <input type="text" id="reg-nama" placeholder="Contoh: Warung Berkah Jaya" required />
              </div>
              <div class="form-group" style="flex: 1;">
                <label for="reg-email">Email</label>
                <input type="email" id="reg-email" placeholder="contoh@umkm.local" required autocomplete="email" />
              </div>
            </div>
            <div class="form-row" style="display: flex; gap: 16px;">
              <div class="form-group password-group" style="flex: 1;">
                <label for="reg-password">Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="reg-password" placeholder="Minimal 6 karakter" required minlength="6" autocomplete="new-password" />
                  <button type="button" class="password-toggle toggle-reg-pass" data-target="reg-password" aria-label="Toggle password visibility">
                    <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div class="form-group password-group" style="flex: 1;">
                <label for="reg-confirm">Konfirmasi Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="reg-confirm" placeholder="Ulangi password" required minlength="6" autocomplete="new-password" />
                  <button type="button" class="password-toggle toggle-reg-pass" data-target="reg-confirm" aria-label="Toggle password visibility">
                    <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="auth-divider" style="margin: 24px 0;"><span>Data UMKM (Opsional)</span></div>
            <div class="form-row" style="display: flex; gap: 16px;">
              <div class="form-group" style="flex: 1;">
                <label for="reg-npwp">NPWP</label>
                <input type="text" id="reg-npwp" placeholder="XX.XXX.XXX.X-XXX.XXX" maxlength="30" />
              </div>
              <div class="form-group" style="flex: 1;">
                <label for="reg-kategori">Kategori Usaha</label>
                <select id="reg-kategori" class="filter-select">
                  <option value="">— Pilih Kategori —</option>
                  ${options}
                </select>
              </div>
            </div>
            <div id="register-error" class="auth-error hidden"></div>
            <div id="register-success" class="auth-success hidden"></div>
            <button type="submit" class="auth-btn" id="register-btn" style="margin-top: 16px;">
              <span class="auth-btn-text">Daftar Sekarang</span>
            </button>
          </form>
          <div class="auth-divider"><span>ATAU</span></div>
          <p class="auth-footer-text">
            Sudah punya akun? <a href="#" id="go-login" class="auth-link">Login di sini</a>
          </p>
        </div>
      </div>
      <div class="auth-split-right">
        <div class="auth-promo">
          <h2>Mulai Transformasi Digital</h2>
          <p>Daftarkan UMKM Anda dan hubungkan dengan SmartBank untuk melihat insight bisnis yang tak terbatas.</p>
          <div class="promo-features">
            <div class="promo-feature">
              <div class="promo-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>Integrasi Cepat & Mudah</span>
            </div>
            <div class="promo-feature">
              <div class="promo-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>Data Terenkripsi Aman</span>
            </div>
            <div class="promo-feature">
              <div class="promo-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>Dukungan Bantuan 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

export function attachRegisterEvents(onRegister, onGoLogin) {
  const form = document.getElementById('register-form')
  const goLogin = document.getElementById('go-login')

  document.querySelectorAll('.toggle-reg-pass').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.currentTarget.getAttribute('data-target')
      const input = document.getElementById(targetId)
      if (input) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password'
        input.setAttribute('type', type)
      }
    })
  })

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const nama = document.getElementById('reg-nama').value.trim()
      const email = document.getElementById('reg-email').value.trim()
      const password = document.getElementById('reg-password').value
      const confirm = document.getElementById('reg-confirm').value
      const npwp = document.getElementById('reg-npwp')?.value?.trim() || ''
      const kategori_id = document.getElementById('reg-kategori')?.value || null
      const errorEl = document.getElementById('register-error')
      const successEl = document.getElementById('register-success')
      const btn = document.getElementById('register-btn')

      errorEl.classList.add('hidden')
      successEl.classList.add('hidden')

      if (password !== confirm) {
        errorEl.textContent = 'Password dan konfirmasi tidak cocok'
        errorEl.classList.remove('hidden')
        return
      }

      btn.disabled = true
      btn.querySelector('.auth-btn-text').textContent = 'Memproses...'

      try {
        await onRegister(nama, email, password, npwp, kategori_id)
        successEl.textContent = 'Registrasi berhasil! Mengalihkan ke login...'
        successEl.classList.remove('hidden')
        setTimeout(() => onGoLogin(), 1500)
      } catch (err) {
        errorEl.textContent = err.message || 'Registrasi gagal'
        errorEl.classList.remove('hidden')
      } finally {
        btn.disabled = false
        btn.querySelector('.auth-btn-text').textContent = 'Daftar Sekarang'
      }
    })
  }

  if (goLogin) {
    goLogin.addEventListener('click', (e) => {
      e.preventDefault()
      onGoLogin()
    })
  }
}

export { fetchKategori }
