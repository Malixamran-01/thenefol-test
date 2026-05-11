import { getApiBase } from '../../../utils/apiBase'

/** iOS Safari: `Intl.NumberFormat({ notation: 'compact' })` can throw — safe fallback. */
export function fmtCompact(n: number): string {
  try {
    return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    if (!Number.isFinite(n)) return '0'
    const abs = Math.abs(n)
    if (abs >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
    return String(Math.round(n))
  }
}

export function timeAgo(d: string): string {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function resolveImg(src?: string | null): string | null {
  if (!src) return null
  return src.startsWith('/uploads/') ? `${getApiBase()}${src}` : src
}

/** Pad to `months` trailing months so charts are never a flat empty line. */
export function padMonths<T extends { month: string; month_date: string }>(
  data: T[],
  getValue: (d: T) => number,
  months = 6
): { month: string; value: number }[] {
  const result: { month: string; value: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', " '")
    const key = d.toISOString().slice(0, 7)
    const found = data.find((r) => r.month_date.slice(0, 7) === key)
    result.push({ month: label, value: found ? getValue(found) : 0 })
  }
  return result
}
