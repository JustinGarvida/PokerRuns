const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

// 12550 -> "$125.50"
export function formatCents(cents) {
  return dollars.format(Math.abs(cents) / 100)
}

// 12550 -> "+$125.50", -4000 -> "−$40", 0 -> "$0"
export function formatPnl(cents) {
  if (cents > 0) return `+${formatCents(cents)}`
  if (cents < 0) return `−${formatCents(cents)}`
  return formatCents(0)
}

// "$1,250.5" -> 125050. Returns null when the text is not a valid amount.
export function parseDollars(text) {
  const cleaned = String(text).replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(parseFloat(cleaned) * 100)
}

// 12550 -> "125.50", 4000 -> "40" (for pre-filling form inputs)
export function centsToInput(cents) {
  return (cents / 100).toFixed(2).replace(/\.00$/, '')
}

// "2026-10-01" -> "Thu, Oct 1, 2026", without a timezone shift
export function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function todayIso() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
