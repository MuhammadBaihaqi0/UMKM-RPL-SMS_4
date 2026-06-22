export function renderLoginPage() {
  return `
    <div class="auth-split-page">
      <div class="auth-split-left">
        <div class="auth-content">
          <div class="auth-header">
            <span class="auth-logo"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary)"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></span>
            <h1 class="auth-title">Selamat Datang Kembali</h1>
            <p class="auth-subtitle">Masuk untuk melihat wawasan analitik UMKM Anda.</p>
          </div>
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="login-email">Email</label>
              <input type="email" id="login-email" placeholder="contoh@umkm.local" required autocomplete="email" />
            </div>
            <div class="form-group password-group">
              <label for="login-password">Password</label>
              <div class="password-input-wrapper">
                <input type="password" id="login-password" placeholder="Masukkan password" required autocomplete="current-password" />
                <button type="button" class="password-toggle" id="toggle-password" aria-label="Toggle password visibility">
                  <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div class="forgot-password" style="margin-top: 8px; text-align: right;">
                <a href="#" id="go-forgot-password" class="auth-link" style="font-size: 13px;">Lupa password?</a>
              </div>
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
        </div>
      </div>
      <div class="auth-split-right">
        <div class="auth-promo">
          <h2>Tingkatkan Bisnis UMKM Anda</h2>
          <p>Dapatkan insight berharga dari setiap transaksi dengan integrasi otomatis ke SmartBank.</p>
          <div class="promo-features">
            <div class="promo-feature">
              <div class="promo-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>Analisis Penjualan Real-time</span>
            </div>
            <div class="promo-feature">
              <div class="promo-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>Prediksi Arus Kas</span>
            </div>
            <div class="promo-feature">
              <div class="promo-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span>Sinkronisasi SmartBank 100% Aman</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

export function attachLoginEvents(onLogin, onGoRegister) {
  const form = document.getElementById('login-form')
  const goRegister = document.getElementById('go-register')
  const goForgotPassword = document.getElementById('go-forgot-password')
  const togglePasswordBtn = document.getElementById('toggle-password')
  const passwordInput = document.getElementById('login-password')

  if (goForgotPassword) {
    goForgotPassword.addEventListener('click', (e) => {
      e.preventDefault()
      onGoRegister('forgot_password')
    })
  }

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
      passwordInput.setAttribute('type', type)
      // Optional: Update icon depending on state
    })
  }

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
      onGoRegister('register')
    })
  }
}
