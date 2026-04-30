import { durationLabel, escapeHtml, formatRupiah, packageLabel } from '../utils.js'

export function renderAdminPage(usersData, statsData) {
  const users = usersData?.data || []
  const stats = statsData?.stats || {}
  const activities = statsData?.recent_activities || []
  const packageBreakdown = stats.package_breakdown || []

  return `
    <section class="content-section">
      <div class="section-header">
        <h2>🛡️ Admin Panel</h2>
        <p>Monitoring user, paket, masa aktif, dan aktivitas UMKM Insight.</p>
      </div>

      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <div class="admin-stat-icon">👥</div>
          <div class="admin-stat-value">${stats.total_users || 0}</div>
          <div class="admin-stat-label">Total Users</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-icon">🧑‍💼</div>
          <div class="admin-stat-value">${stats.total_admins || 0}</div>
          <div class="admin-stat-label">Admin</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-icon">🎛️</div>
          <div class="admin-stat-value">${stats.total_operators || 0}</div>
          <div class="admin-stat-label">Operator</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-icon">✅</div>
          <div class="admin-stat-value">${stats.total_active_subscriptions || 0}</div>
          <div class="admin-stat-label">Subscription Aktif</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-icon">💰</div>
          <div class="admin-stat-value">${formatRupiah(stats.total_revenue || 0)}</div>
          <div class="admin-stat-label">Revenue SmartBank</div>
        </div>
      </div>

      <div class="admin-section">
        <h3>📦 Distribusi Paket</h3>
        <div class="package-breakdown-grid">
          ${
            packageBreakdown.length
              ? packageBreakdown
                  .map(
                    (item) => `
                      <div class="package-breakdown-card">
                        <span class="package-breakdown-name">${escapeHtml(packageLabel(item.package_name))}</span>
                        <span class="package-breakdown-total">${escapeHtml(item.total)}</span>
                      </div>
                    `,
                  )
                  .join('')
              : '<p class="text-muted">Belum ada data paket.</p>'
          }
        </div>
      </div>

      <div class="admin-section">
        <h3>📋 Daftar User & Langganan</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nama UMKM</th>
                <th>Email</th>
                <th>Role</th>
                <th>UMKM ID</th>
                <th>Paket</th>
                <th>Status</th>
                <th>Durasi</th>
                <th>Expired</th>
                <th>Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody>
              ${users
                .map(
                  (user) => `
                    <tr>
                      <td><strong>${escapeHtml(user.nama_umkm)}</strong></td>
                      <td>${escapeHtml(user.email)}</td>
                      <td><span class="role-badge role-${user.role}">${escapeHtml(user.role)}</span></td>
                      <td><code>${escapeHtml(user.umkm_id || '-')}</code></td>
                      <td><span class="source-badge">${escapeHtml(packageLabel(user.subscription?.package_name || 'free'))}</span></td>
                      <td><span class="status-badge status-${user.subscription?.status || 'inactive'}">${escapeHtml(user.subscription?.status || 'inactive')}</span></td>
                      <td>${escapeHtml(durationLabel(user.subscription?.duration))}</td>
                      <td>${user.subscription?.expired_at ? new Date(user.subscription.expired_at).toLocaleDateString('id-ID') : '-'}</td>
                      <td class="activity-cell">${
                        user.last_activity
                          ? `<small>${escapeHtml(user.last_activity.action)} — ${new Date(user.last_activity.created_at).toLocaleString('id-ID')}</small>`
                          : '<small class="text-muted">Belum ada</small>'
                      }</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-section">
        <h3>📊 Aktivitas Terbaru</h3>
        <div class="activity-list">
          ${
            activities.length
              ? activities
                  .map(
                    (act) => `
                      <div class="activity-item">
                        <span class="activity-action">${escapeHtml(act.action)}</span>
                        <span class="activity-detail">${escapeHtml(act.detail || '-')}</span>
                        <span class="activity-time">${new Date(act.created_at).toLocaleString('id-ID')}</span>
                      </div>
                    `,
                  )
                  .join('')
              : '<p class="text-muted">Belum ada aktivitas.</p>'
          }
        </div>
      </div>
    </section>
  `
}
