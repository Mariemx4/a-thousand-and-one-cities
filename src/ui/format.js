export const toRoman = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n)

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const formatDate = (iso) => (iso ? DATE.format(new Date(iso)) : '')
export const formatDateTime = (iso) => (iso ? DATE_TIME.format(new Date(iso)) : '')

export function timeAgo(iso) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d < 14 ? `${d} d ago` : formatDate(iso)
}

/** "A123" style reference for a record id, shown in confirmations. */
export const reference = (id) => id.replace(/^[a-z]+_/, '').slice(-6).toUpperCase()
