import { durationLabel, escapeHtml, formatRupiah, packageLabel } from '../utils.js'

export function renderSubscriptionPage(user, packages = []) {
  const subscription = user?.subscription || {}
  const currentPackage = subscription.package_name || 'free'
  const currentDuration = subscription.duration || 'mingguan'
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
        <h2>💳 Paket Langganan</h2>
        <p>Pilih paket SaaS UMKM Insight. Pembayaran tetap diproses oleh SmartBank.</p>
      </div>

      <div class="sub-current-card ${subscription.status === 'active' ? 'sub-premium' : 'sub-free'}">
        <div class="sub-current-icon">${currentPackage === 'free' ? '🆓' : '⭐'}</div>
        <div class="sub-current-info">
          <h3>${packageLabel(currentPackage)} • ${subscription.status === 'active' ? 'Aktif' : 'Inactive'}</h3>
          <p>Durasi: <strong>${durationLabel(currentDuration)}</strong></p>
          <p>Berlaku sampai: <strong>${expiredAt}</strong></p>
        </div>
      </div>

      <div class="pricing-grid">
        ${packages
          .map((pkg) => {
            const isCurrent = currentPackage === pkg.code
            const weekly = formatRupiah(pkg.prices.mingguan)
            const monthly = formatRupiah(pkg.prices.bulanan)
            const yearly = formatRupiah(pkg.prices.tahunan)

            return `
              <div class="pricing-card ${pkg.code === 'pro' ? 'pricing-featured' : ''} ${isCurrent ? 'pricing-active' : ''}">
                ${pkg.code === 'pro' ? '<div class="pricing-ribbon">RECOMMENDED</div>' : ''}
                <div class="pricing-header">
                  <h3>${escapeHtml(pkg.label)}</h3>
                  <div class="pricing-price">${weekly}</div>
                  <p class="pricing-period">Mulai dari mingguan</p>
                </div>
                <p class="pricing-description">${escapeHtml(pkg.description)}</p>
                <div class="duration-switcher">
                  <label><input type="radio" name="duration-${pkg.code}" value="mingguan" ${currentDuration === 'mingguan' ? 'checked' : ''}> Mingguan</label>
                  <label><input type="radio" name="duration-${pkg.code}" value="bulanan" ${currentDuration === 'bulanan' ? 'checked' : ''}> Bulanan</label>
                  <label><input type="radio" name="duration-${pkg.code}" value="tahunan" ${currentDuration === 'tahunan' ? 'checked' : ''}> Tahunan</label>
                </div>
                <div class="pricing-rates">
                  <span>Mingguan: <strong>${weekly}</strong></span>
                  <span>Bulanan: <strong>${monthly}</strong></span>
                  <span>Tahunan: <strong>${yearly}</strong></span>
                </div>
                <ul class="pricing-features">
                  ${pkg.features.map((feature) => `<li>✅ ${escapeHtml(feature)}</li>`).join('')}
                </ul>
                ${
                  isCurrent
                    ? '<div class="pricing-badge">Paket Saat Ini</div>'
                    : pkg.code === 'free'
                      ? '<div class="pricing-badge">Paket Default</div>'
                      : `<button class="pricing-btn" data-package="${pkg.code}">Pilih Paket</button>`
                }
              </div>
            `
          })
          .join('')}
      </div>

      <div class="sub-info-note">
        <p>🔒 <strong>Aturan Read-Only:</strong> UMKM Insight tidak memproses uang, tidak menyimpan saldo, dan tidak memiliki payment system internal.</p>
        <p>🏦 Flow resmi: User → UMKM Insight → SmartBank → Response → Update status langganan.</p>
      </div>

      <div id="payment-result" class="hidden"></div>
    </section>
  `
}

export function attachSubscriptionEvents(onUpgrade) {
  document.querySelectorAll('[data-package]').forEach((button) => {
    button.addEventListener('click', async () => {
      const packageName = button.dataset.package
      const selectedDuration = document.querySelector(`input[name="duration-${packageName}"]:checked`)?.value || 'mingguan'
      const resultEl = document.getElementById('payment-result')

      button.disabled = true
      button.textContent = '⏳ Menghubungkan ke SmartBank...'

      try {
        const result = await onUpgrade(packageName, selectedDuration)
        resultEl.innerHTML = `
          <div class="payment-success">
            <span class="payment-success-icon">✅</span>
            <h3>Pembayaran SmartBank Berhasil</h3>
            <p>Ref: ${escapeHtml(result.smartbank_response?.ref || '-')}</p>
            <p>Paket aktif: <strong>${escapeHtml(result.subscription?.package_label || packageLabel(result.subscription?.package_name || packageName))}</strong></p>
            <p>Durasi: <strong>${escapeHtml(durationLabel(result.subscription?.duration || selectedDuration))}</strong></p>
            <p>Dashboard akan dimuat ulang...</p>
          </div>
        `
        resultEl.classList.remove('hidden')
        setTimeout(() => window.location.reload(), 1800)
      } catch (err) {
        resultEl.innerHTML = `
          <div class="payment-error">
            <span class="payment-error-icon">❌</span>
            <h3>Permintaan ke SmartBank Gagal</h3>
            <p>${escapeHtml(err.message || 'Terjadi kesalahan')}</p>
          </div>
        `
        resultEl.classList.remove('hidden')
        button.disabled = false
        button.textContent = 'Pilih Paket'
      }
    })
  })
}
