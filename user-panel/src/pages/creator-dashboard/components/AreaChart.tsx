import React from 'react'

type Point = { month: string; value: number }

export function AreaChart({
  points,
  color,
  h = 150,
}: {
  points: Point[]
  color: string
  h?: number
}) {
  const W = 640
  const H = h
  const pad = { t: 12, r: 16, b: 26, l: 38 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const vals = points.map((p) => p.value)
  const max = Math.max(...vals, 1)
  const px = (i: number) =>
    pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw)
  const py = (v: number) => pad.t + ih - (v / max) * ih
  const pts = points.map((p, i) => ({ x: px(i), y: py(p.value) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area =
    pts.length < 2 ? '' : `${line} L ${pts[pts.length - 1].x} ${pad.t + ih} L ${pts[0].x} ${pad.t + ih} Z`
  const gid = `cg${color.replace(/[^a-z0-9]/gi, '')}`
  const ticks = [0, Math.ceil(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((t) => {
        const y = py(t)
        return (
          <g key={t}>
            <line
              x1={pad.l}
              y1={y}
              x2={pad.l + iw}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {t}
            </text>
          </g>
        )
      })}
      {area ? <path d={area} fill={`url(#${gid})`} /> : null}
      {pts.length > 1 ? (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2" />
      ))}
      {points.map((p, i) => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
          {p.month}
        </text>
      ))}
    </svg>
  )
}
