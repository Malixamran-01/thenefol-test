import type { CSSProperties } from 'react'

export function formatCommunityTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const DEPTH_BORDER_COLORS = [
  '',
  '#4B97C9',
  '#64B5D9',
  '#90CAE8',
  '#B8DCF0',
  '#D6EAF8',
  '#D6EAF8',
] as const

export const DEPTH_MARGIN = [0, 20, 40, 60, 76, 88, 88] as const

export function depthStyles(depth: number, isMobile = false): CSSProperties {
  const d = Math.min(Math.max(depth, 0), 6)
  const scale = isMobile ? 0.7 : 1
  if (d === 0) return {}
  return {
    marginLeft: `${Math.round(DEPTH_MARGIN[d] * scale)}px`,
    borderLeft: `2px solid ${DEPTH_BORDER_COLORS[d]}`,
    paddingLeft: '12px',
  }
}
