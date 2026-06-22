import { apiPost } from '../utils.js'

export function renderForgotPasswordPage(step = 'request') {
  if (step === 'request') {
    return `
      <div class="auth-split-page">
        <div class="auth-split-left">
          <div class="auth-content" style="max-width: 400px;">
            <div class="auth-header">
              <span class="auth-logo"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary)"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></span>
              <h1 class="auth-title">Lupa Password?</h1>
              <p class="auth-subtitle">Masukkan email Anda untuk menerima instruksi reset password.</p>
            </div>
            <form id="forgot-form" class="auth-form">
              <div class="form-group">
                <label for="forgot-email">Email Terdaftar</label>
                <input type="email" id="forgot-email" placeholder="nama@umkm.local" required autocomplete="email" />
              </div>
              <div id="forgot-error" class="auth-error hidden"></div>
              <div id="forgot-success" class="auth-success hidden" style="margin-bottom: 16px;"></div>
              <button type="submit" class="auth-btn" id="forgot-btn" style="margin-top: 8px;">
                <span class="auth-btn-text">Kirim Instruksi</span>
              </button>
            </form>
            <div class="auth-divider"><span>ATAU</span></div>
            <p class="auth-footer-text">
              <a href="#" id="go-login" class="auth-link">Kembali ke Login</a>
            </p>
          </div>
        </div>
        <div class="auth-split-right">
          <div class="auth-promo">
            <h2>Keamanan Data Terjamin</h2>
            <p>Kami memastikan akun UMKM Anda tetap aman. Jangan pernah membagikan password atau token Anda kepada siapa pun.</p>
            <div class="promo-features">
              <div class="promo-feature">
                <div class="promo-feature-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span>Enkripsi AES-256</span>
              </div>
              <div class="promo-feature">
                <div class="promo-feature-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span>Token Sekali Pakai</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  } else {
    return `
      <div class="auth-split-page">
        <div class="auth-split-left">
          <div class="auth-content" style="max-width: 400px;">
            <div class="auth-header">
              <span class="auth-logo"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary)"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></span>
              <h1 class="auth-title">Reset Password</h1>
              <p class="auth-subtitle">Masukkan token yang Anda terima dan password baru Anda.</p>
            </div>
            <form id="reset-form" class="auth-form">
              <div class="form-group">
                <label for="reset-token">Token Reset (6 Karakter)</label>
                <input type="text" id="reset-token" placeholder="Contoh: A1B2C3" required autocomplete="off" maxlength="6" style="text-transform: uppercase;" />
              </div>
              <div class="form-group password-group">
                <label for="reset-password">Password Baru</label>
                <div class="password-input-wrapper">
                  <input type="password" id="reset-password" placeholder="Minimal 6 karakter" required minlength="6" autocomplete="new-password" />
                  <button type="button" class="password-toggle toggle-reset-pass" data-target="reset-password" aria-label="Toggle password visibility">
                    <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div id="reset-error" class="auth-error hidden"></div>
              <button type="submit" class="auth-btn" id="reset-btn" style="margin-top: 16px;">
                <span class="auth-btn-text">Ubah Password</span>
              </button>
            </form>
            <div class="auth-divider"><span>ATAU</span></div>
            <p class="auth-footer-text">
              <a href="#" id="go-login" class="auth-link">Kembali ke Login</a>
            </p>
          </div>
        </div>
        <div class="auth-split-right">
          <div class="auth-promo">
            <h2>Keamanan Data Terjamin</h2>
            <p>Kami memastikan akun UMKM Anda tetap aman. Jangan pernah membagikan password atau token Anda kepada siapa pun.</p>
            <div class="promo-features">
              <div class="promo-feature">
                <div class="promo-feature-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span>Enkripsi AES-256</span>
              </div>
              <div class="promo-feature">
                <div class="promo-feature-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span>Token Sekali Pakai</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }
}

export function attachForgotPasswordEvents(handleStateChange) {
  const goLoginBtns = document.querySelectorAll('#go-login')
  goLoginBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      handleStateChange('login')
    })
  })

  // Handle Request Form
  const forgotForm = document.getElementById('forgot-form')
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = document.getElementById('forgot-email').value
      const btn = document.getElementById('forgot-btn')
      const errorDiv = document.getElementById('forgot-error')
      const successDiv = document.getElementById('forgot-success')

      btn.disabled = true
      btn.innerHTML = '<span class="spinner"></span> Mengirim...'
      errorDiv.classList.add('hidden')
      successDiv.classList.add('hidden')

      try {
        const response = await apiPost('/api/auth/forgot-password', { email })
        successDiv.textContent = response.message
        successDiv.classList.remove('hidden')
        
        // Wait a bit, then show the reset form
        setTimeout(() => {
           handleStateChange('reset_password_form')
        }, 5000)
      } catch (err) {
        errorDiv.textContent = err.response?.data?.message || 'Gagal mengirim instruksi reset.'
        errorDiv.classList.remove('hidden')
        btn.disabled = false
        btn.innerHTML = '<span class="auth-btn-text">Kirim Instruksi</span>'
      }
    })
  }

  // Handle Reset Form
  const resetForm = document.getElementById('reset-form')
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const token = document.getElementById('reset-token').value
      const new_password = document.getElementById('reset-password').value
      const btn = document.getElementById('reset-btn')
      const errorDiv = document.getElementById('reset-error')

      btn.disabled = true
      btn.innerHTML = '<span class="spinner"></span> Memproses...'
      errorDiv.classList.add('hidden')

      try {
        const response = await apiPost('/api/auth/reset-password', { token, new_password })
        if (window.showToast) {
          window.showToast(response.message, 'success')
        } else {
          alert(response.message)
        }
        handleStateChange('login')
      } catch (err) {
        errorDiv.textContent = err.response?.data?.message || 'Gagal mereset password.'
        errorDiv.classList.remove('hidden')
        btn.disabled = false
        btn.innerHTML = '<span class="auth-btn-text">Ubah Password</span>'
      }
    })
  }

  // Password toggle
  document.querySelectorAll('.toggle-reset-pass').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target')
      const input = document.getElementById(targetId)
      if (input.type === 'password') {
        input.type = 'text'
        btn.innerHTML = '<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      } else {
        input.type = 'password'
        btn.innerHTML = '<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      }
    })
  })
}
