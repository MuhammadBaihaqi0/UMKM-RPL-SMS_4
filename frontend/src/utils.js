export const USER_ID = 'UMKM001'

export function formatRupiah(num) {
  if (num === undefined || num === null) return 'Rp 0'

  const abs = Math.abs(num)
  return `${num < 0 ? '-' : ''}Rp ${abs.toLocaleString('id-ID')}`
}

export function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function sectionTitle(section) {
  return section.charAt(0).toUpperCase() + section.slice(1)
}
