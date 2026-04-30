import { escapeHtml, formatRupiah } from '../utils.js'

export function renderSubscriptionPage(user) {
  const subscription = user?.subscription || {}
  const isPremium = subscription.status === 'premium'
  const expiredAt = subscription.expired_at
    ? new Date(subscription.expired_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '-'

  return `
    <section class="content-section">
      <div class="section-header">
        <h2>💳 Langganan & Paket</h2>
        <p>Kelola paket langganan UMKM Insight Anda</p>
      </div>

      ${
        isPremium
          ? `
            <div class="sub-current-card sub-premium">
              <div class="sub-current-icon">⭐</div>
              <div class="sub-current-info">
                <h3>Status: Premium</h3>
                <p>Aktif sampai: <strong>${expiredAt}</strong></p>
              </div>
            </div>
          `
          : `
            <div class="sub-current-card sub-free">
              <div class="sub-current-icon">🆓</div>
              <div class="sub-current-info">
                <h3>Status: Free</h3>
                <p>Upgrade ke Premium untuk fitur lengkap</p>
              </div>
            </div>
          `
      }

      <div class="pricing-grid">
        <div class="pricing-card ${!isPremium ? 'pricing-active' : ''}">
          <div class="pricing-header">
            <h3>Free</h3>
            <div class="pricing-price">Rp 0</div>
            <p class="pricing-period">Selamanya</p>
          </div>
          <ul class="pricing-features">
            <li>✅ Dashboard ringkasan</li>
            <li>✅ 4 kartu ringkasan</li>
            <li>❌ Grafik detail</li>
            <li>❌ Insight bisnis otomatis</li>
            <li>❌ Breakdown fee & pajak</li>
            <li>❌ Data transaksi lengkap</li>
          </ul>
          ${!isPremium ? '<div class="pricing-badge">Paket Saat Ini</div>' : ''}
        </div>

        <div class="pricing-card pricing-featured ${isPremium ? 'pricing-active' : ''}">
          <div class="pricing-ribbon">RECOMMENDED</div>
          <div class="pricing-header">
            <h3>Premium</h3>
            <div class="pricing-price">Rp 10.000</div>
            <p class="pricing-period">per minggu</p>
          </div>
          <ul class="pricing-features">
            <li>✅ Dashboard lengkap</li>
            <li>✅ Semua grafik & chart</li>
            <li>✅ Insight bisnis otomatis</li>
            <li>✅ Breakdown fee & pajak</li>
            <li>✅ Data transaksi lengkap</li>
            <li>✅ Analisis tren detail</li>
          </ul>
          ${
            isPremium
              ? '<div class="pricing-badge">Paket Saat Ini</div>'
              : '<button class="pricing-btn" id="upgrade-btn">⚡ Upgrade Sekarang</button>'
          }
        </div>
      </div>

      <div class="sub-info-note">
        <p>🔒 <strong>Catatan Keamanan:</strong> Pembayaran diproses sepenuhnya oleh SmartBank. 
        UMKM Insight tidak menyimpan data kartu atau memproses uang secara langsung.</p>
        <p>📋 Flow: User → UMKM Insight → SmartBank → Response → UMKM Insight</p>
      </div>

      <div id="payment-result" class="hidden"></div>
    </section>
  `
}

export function attachSubscriptionEvents(onUpgrade) {
  const upgradeBtn = document.getElementById('upgrade-btn')
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', async () => {
      const resultEl = document.getElementById('payment-result')
      upgradeBtn.disabled = true
      upgradeBtn.textContent = '⏳ Memproses pembayaran...'

      try {
        const result = await onUpgrade()
        resultEl.innerHTML = `
          <div class="payment-success">
            <span class="payment-success-icon">✅</span>
            <h3>Pembayaran Berhasil!</h3>
            <p>Ref: ${escapeHtml(result.smartbank_response?.ref || '-')}</p>
            <p>Status langganan berhasil diupgrade ke <strong>Premium</strong>.</p>
            <p>Halaman akan dimuat ulang...</p>
          </div>
        `
        resultEl.classList.remove('hidden')
        setTimeout(() => window.location.reload(), 2000)
      } catch (err) {
        resultEl.innerHTML = `
          <div class="payment-error">
            <span class="payment-error-icon">❌</span>
            <h3>Pembayaran Gagal</h3>
            <p>${escapeHtml(err.message || 'Terjadi kesalahan')}</p>
          </div>
        `
        resultEl.classList.remove('hidden')
        upgradeBtn.disabled = false
        upgradeBtn.textContent = '⚡ Upgrade Sekarang'
      }
    })
  }
}
