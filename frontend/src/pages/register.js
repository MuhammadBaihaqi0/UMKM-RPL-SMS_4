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
    .map((k) => `<option value="${k.id}">${k.icon} ${k.nama_kategori}</option>`)
    .join('')

  return `
    <div class="auth-page">
      <div class="auth-card auth-card-wide">
        <div class="auth-header">
          <span class="auth-logo">📊</span>
          <h1 class="auth-title">Daftar Akun Baru</h1>
          <p class="auth-subtitle">Bergabung di ekosistem UMKM Insight</p>
        </div>
        <form id="register-form" class="auth-form">
          <div class="form-row">
            <div class="form-group">
              <label for="reg-nama">Nama UMKM</label>
              <input type="text" id="reg-nama" placeholder="Contoh: Warung Berkah Jaya" required />
            </div>
            <div class="form-group">
              <label for="reg-email">Email</label>
              <input type="email" id="reg-email" placeholder="contoh@umkm.local" required autocomplete="email" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="reg-password">Password</label>
              <input type="password" id="reg-password" placeholder="Minimal 6 karakter" required minlength="6" autocomplete="new-password" />
            </div>
            <div class="form-group">
              <label for="reg-confirm">Konfirmasi Password</label>
              <input type="password" id="reg-confirm" placeholder="Ulangi password" required minlength="6" autocomplete="new-password" />
            </div>
          </div>
          <div class="form-divider"><span>Data UMKM (Opsional)</span></div>
          <div class="form-row">
            <div class="form-group">
              <label for="reg-npwp">NPWP</label>
              <input type="text" id="reg-npwp" placeholder="XX.XXX.XXX.X-XXX.XXX" maxlength="30" />
            </div>
            <div class="form-group">
              <label for="reg-kategori">Kategori Usaha</label>
              <select id="reg-kategori" class="filter-select">
                <option value="">— Pilih Kategori —</option>
                ${options}
              </select>
            </div>
          </div>
          <div id="register-error" class="auth-error hidden"></div>
          <div id="register-success" class="auth-success hidden"></div>
          <button type="submit" class="auth-btn" id="register-btn">
            <span class="auth-btn-text">Daftar Sekarang</span>
          </button>
        </form>
        <div class="auth-divider"><span>ATAU</span></div>
        <p class="auth-footer-text">
          Sudah punya akun? <a href="#" id="go-login" class="auth-link">Login di sini</a>
        </p>
      </div>
    </div>
  `
}

export function attachRegisterEvents(onRegister, onGoLogin) {
  const form = document.getElementById('register-form')
  const goLogin = document.getElementById('go-login')

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
