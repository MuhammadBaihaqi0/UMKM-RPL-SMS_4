export function renderLoginPage() {
  return `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <span class="auth-logo">📊</span>
          <h1 class="auth-title">UMKM Insight</h1>
          <p class="auth-subtitle">Dashboard Analitik Read-Only untuk Ekosistem UMKM Digital</p>
        </div>
        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" placeholder="contoh@umkm.local" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" placeholder="Masukkan password" required autocomplete="current-password" />
          </div>
          <div id="login-error" class="auth-error hidden"></div>
          <button type="submit" class="auth-btn" id="login-btn">
            <span class="auth-btn-text">Login ke Dashboard</span>
          </button>
        </form>
        <div class="auth-divider"><span>ATAU</span></div>
        <p class="auth-footer-text">
          Belum punya akun? <a href="#" id="go-register" class="auth-link">Daftar Sekarang</a>
        </p>
        <div class="auth-info">
          <p>🔒 Sistem Read-Only — Data dari SmartBank via API Gateway</p>
        </div>
      </div>
    </div>
  `
}

export function attachLoginEvents(onLogin, onGoRegister) {
  const form = document.getElementById('login-form')
  const goRegister = document.getElementById('go-register')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = document.getElementById('login-email').value.trim()
      const password = document.getElementById('login-password').value
      const errorEl = document.getElementById('login-error')
      const btn = document.getElementById('login-btn')

      errorEl.classList.add('hidden')
      btn.disabled = true
      btn.querySelector('.auth-btn-text').textContent = 'Memproses...'

      try {
        await onLogin(email, password)
      } catch (err) {
        errorEl.textContent = err.message || 'Login gagal'
        errorEl.classList.remove('hidden')
      } finally {
        btn.disabled = false
        btn.querySelector('.auth-btn-text').textContent = 'Login ke Dashboard'
      }
    })
  }

  if (goRegister) {
    goRegister.addEventListener('click', (e) => {
      e.preventDefault()
      onGoRegister()
    })
  }
}
