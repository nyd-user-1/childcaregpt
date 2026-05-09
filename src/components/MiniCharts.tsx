'use client'

/* ── Helpers ──────────────────────────────────────────────────────── */

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  const d: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = ((x0 + x1) / 2).toFixed(1)
    d.push(`C ${cx} ${y0.toFixed(1)} ${cx} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`)
  }
  return d.join(' ')
}

function polarToCart(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

/* ── Area Chart ───────────────────────────────────────────────────── */

interface AreaProps { color: string; data: number[]; id: string }

export function MiniAreaChart({ color, data, id }: AreaProps) {
  const W = 200, H = 80, pad = 6
  const max = Math.max(...data)
  const pts: [number, number][] = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    H - pad - ((v / max) * (H - pad * 2)),
  ])
  const line = smoothPath(pts)
  const last = pts[pts.length - 1]
  const fill = `${line} L ${last[0].toFixed(1)} ${H} L ${pts[0][0].toFixed(1)} ${H} Z`
  const gid = `ag-${id}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Bar Chart ────────────────────────────────────────────────────── */

interface BarProps { color: string; data: number[] }

export function MiniBarChart({ color, data }: BarProps) {
  const W = 200, H = 80, pad = 4
  const max = Math.max(...data)
  const slot = (W - pad * 2) / data.length
  const barW = slot * 0.62

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = ((v / max) * (H - pad * 2))
        const x = pad + i * slot + (slot - barW) / 2
        return (
          <rect
            key={i}
            x={x.toFixed(1)}
            y={(H - pad - h).toFixed(1)}
            width={barW.toFixed(1)}
            height={h.toFixed(1)}
            fill={color}
            rx="2"
          />
        )
      })}
    </svg>
  )
}

/* ── Line Chart ───────────────────────────────────────────────────── */

interface LineProps { color: string; data: number[] }

export function MiniLineChart({ color, data }: LineProps) {
  const W = 200, H = 80, pad = 6
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts: [number, number][] = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    H - pad - (((v - min) / range) * (H - pad * 2)),
  ])
  const line = smoothPath(pts)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Pie Chart ────────────────────────────────────────────────────── */

interface PieProps { colors: string[]; data: number[] }

export function MiniPieChart({ colors, data }: PieProps) {
  const S = 80, cx = 40, cy = 40, r = 32
  const total = data.reduce((a, b) => a + b, 0)
  let angle = 0

  const slices = data.map((v, i) => {
    const sweep = (v / total) * 360
    const [sx, sy] = polarToCart(cx, cy, r, angle)
    const [ex, ey] = polarToCart(cx, cy, r, angle + sweep)
    const large = sweep > 180 ? 1 : 0
    const d = `M ${cx} ${cy} L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`
    angle += sweep
    return { d, color: colors[i % colors.length] }
  })

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      className="h-full"
      style={{ maxWidth: `${S}px`, margin: '0 auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="1" />
      ))}
    </svg>
  )
}
