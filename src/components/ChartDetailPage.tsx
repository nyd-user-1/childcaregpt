'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis,
  Tooltip as RechartsTip, CartesianGrid, Cell,
} from 'recharts'
import { AppLayout } from '@/components/AppLayout'
import { ChartsDrawer } from '@/components/ChartsDrawer'
import { cn } from '@/lib/utils'
import {
  type ChartConfig, type Period,
  applyPeriod, fmtPeriodLabel,
} from '@/lib/chart-configs'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Paper-voice chart palette: teal accent + ochre for the second series.
const ACCENT = '#2f6d6a'
const ACCENT_2 = '#c9a15e'
const SERIES_COLORS = [ACCENT, ACCENT_2]
const AXIS_TICK = { fontSize: 10, fill: '#a8a29a' }
const GRID = 'var(--paper-rule)'

/* ── Formatting ──────────────────────────────────────────────────── */
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function fmtVal(v: number, config: ChartConfig, period?: Period): string {
  const slug = config.slug
  const isUsd = slug.includes('cost') || slug.includes('income')
  if (isUsd) {
    const label = period ? fmtPeriodLabel(period) : ''
    return `$${fmtNum(v)}${label}`
  }
  if (slug === 'lfpr-by-county') return `${v.toFixed(1)}%`
  return fmtNum(v)
}

function fmtKpi(v: number, config: ChartConfig, period?: Period): string {
  const slug = config.slug
  const isUsd = slug.includes('cost') || slug.includes('income')
  if (isUsd) {
    const label = period ? fmtPeriodLabel(period) : ''
    return `$${Math.round(v).toLocaleString()}${label}`
  }
  if (slug === 'lfpr-by-county') return `${v.toFixed(1)}%`
  return Math.round(v).toLocaleString()
}

/* ── Props ───────────────────────────────────────────────────────── */
export type StdRow = { name: string; value: number }
export type MultiRow = Record<string, string | number>
export type ScatterRow = { name: string; x: number; y: number }

interface Props {
  config: ChartConfig
  prevHref: string
  nextHref: string
  kpiValue: number
  tableRows?: StdRow[]
  chartPoints?: StdRow[]
  multiPoints?: MultiRow[]
  scatterPoints?: ScatterRow[]
}

/* ── Component ───────────────────────────────────────────────────── */
export function ChartDetailPage({
  config, prevHref, nextHref, kpiValue,
  tableRows = [], chartPoints = [], multiPoints = [], scatterPoints = [],
}: Props) {
  const [period, setPeriod]   = useState<Period>('weekly')
  const [filter, setFilter]   = useState(config.filters?.[0]?.key ?? '')

  const base = config.periodBase ?? 'weekly'

  const scaledKpi = config.periodToggle ? applyPeriod(kpiValue, base, period) : kpiValue

  /* Broadcast nav + KPI to AppLayout header */
  useEffect(() => {
    const detail = {
      prevHref,
      nextHref,
      color: ACCENT,
      kpi: fmtKpi(scaledKpi, config, config.periodToggle ? period : undefined),
      kpiLabel: config.kpiLabel,
    }
    window.dispatchEvent(new CustomEvent('childcaregpt:chart-nav', { detail }))
    return () => {
      window.dispatchEvent(new CustomEvent('childcaregpt:chart-nav', { detail: null }))
    }
  }, [prevHref, nextHref, config, scaledKpi, period])

  const scaledChart: StdRow[] = useMemo(() => {
    if (!config.periodToggle) return chartPoints
    return chartPoints.map(r => ({ ...r, value: applyPeriod(r.value, base, period) }))
  }, [chartPoints, config.periodToggle, base, period])

  const scaledMulti: MultiRow[] = useMemo(() => {
    if (!config.periodToggle || !config.series) return multiPoints
    return multiPoints.map(row => {
      const out: MultiRow = { name: row.name as string }
      config.series!.forEach(s => {
        out[s.key] = typeof row[s.key] === 'number'
          ? applyPeriod(row[s.key] as number, base, period)
          : row[s.key] as number
      })
      return out
    })
  }, [multiPoints, config.periodToggle, config.series, base, period])

  const scaledTable: StdRow[] = useMemo(() => {
    if (!config.periodToggle) return tableRows
    return tableRows.map(r => ({ ...r, value: applyPeriod(r.value, base, period) }))
  }, [tableRows, config.periodToggle, base, period])

  const scaledScatter: ScatterRow[] = scatterPoints

  const total = scaledTable.reduce((s, r) => s + r.value, 0) || scaledKpi
  const sorted = [...scaledTable].sort((a, b) => b.value - a.value)

  const tipStyle = {
    backgroundColor: 'var(--paper)',
    border: '1px solid var(--paper-rule)',
    borderRadius: '10px',
    fontSize: '12px',
    color: 'var(--paper-text)',
  }

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

        {/* ── Header band ── */}
        <div className="shrink-0 border-b border-[var(--paper-rule)] bg-[var(--paper)] px-6 pt-5 pb-0">

          {/* Title */}
          <div className="pb-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--paper-faint)]" style={SANS}>Charts · New York</p>
            <h1 className="mt-1.5 leading-tight text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)', fontWeight: 500, letterSpacing: '-0.01em' }}>
              {config.title}
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--paper-muted)]" style={SANS}>{config.description}</p>
          </div>

          {/* Chart */}
          <div className="-mx-1 mb-3 h-40 md:h-52">
            <ResponsiveContainer width="100%" height="100%">
              {config.chartType === 'area' ? (
                <AreaChart data={scaledChart} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id={`g-${config.slug}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={1.75}
                    fill={`url(#g-${config.slug})`} dot={false} animationDuration={400} />
                  <XAxis dataKey="name" hide />
                  <RechartsTip contentStyle={tipStyle}
                    formatter={(v) => [fmtVal(Number(v), config, config.periodToggle ? period : undefined), config.title]}
                    labelFormatter={(l) => String(l)} />
                </AreaChart>
              ) : config.chartType === 'line' ? (
                <LineChart data={scaledMulti} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  {config.series?.map((s, i) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeWidth={1.75} dot={false} animationDuration={400} name={s.label} />
                  ))}
                  <RechartsTip contentStyle={tipStyle}
                    formatter={(v, name) => [fmtVal(Number(v), config, config.periodToggle ? period : undefined), name]} />
                </LineChart>
              ) : config.chartType === 'scatter' ? (
                <ScatterChart margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
                  <CartesianGrid stroke={GRID} />
                  <XAxis dataKey="x" type="number" name="Annual Income" tick={AXIS_TICK} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `$${Math.round(v / 1000)}K`} />
                  <YAxis dataKey="y" type="number" name="Annual Care Cost" tick={AXIS_TICK} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `$${Math.round(v / 1000)}K`} width={48} />
                  <Scatter data={scaledScatter} fill={ACCENT} fillOpacity={0.7} />
                  <RechartsTip contentStyle={tipStyle}
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(v, name) => [`$${Math.round(Number(v)).toLocaleString()}`, name]} />
                </ScatterChart>
              ) : (
                <BarChart data={scaledChart} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <Bar dataKey="value" radius={[2, 2, 0, 0]} animationDuration={400}>
                    {scaledChart.map((_, i) => (
                      <Cell key={i} fill={ACCENT} opacity={Math.max(0.35, 1 - i * 0.015)} />
                    ))}
                  </Bar>
                  <XAxis dataKey="name" hide />
                  <RechartsTip contentStyle={tipStyle}
                    formatter={(v) => [fmtVal(Number(v), config, config.periodToggle ? period : undefined), config.title]}
                    labelFormatter={(l) => String(l)} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Tab row: Charts drawer + filter tabs + period toggle */}
          <div className="flex flex-wrap items-center gap-1.5 pb-3">
            <ChartsDrawer />
            <div className="mx-0.5 h-4 w-px bg-[var(--paper-rule)]" />
            {config.filters?.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === f.key
                    ? 'border border-[var(--paper-rule)] bg-[var(--paper-2)] text-[var(--paper-text)]'
                    : 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]',
                )} style={SANS}>{f.label}</button>
            ))}
            {config.periodToggle && config.filters && (
              <div className="mx-0.5 h-4 w-px bg-[var(--paper-rule)]" />
            )}
            {config.periodToggle && (['weekly', 'monthly', 'annual'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  period === p
                    ? 'border border-[var(--paper-accent)] bg-[var(--paper-2)] text-[var(--paper-text)]'
                    : 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]',
                )} style={SANS}>{p}</button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {config.chartType === 'scatter' ? (
            <div className="divide-y divide-[var(--paper-rule-soft)]">
              <div className="sticky top-0 z-10 grid grid-cols-[1fr_110px_110px_80px] gap-3 border-b border-[var(--paper-rule)] bg-[var(--paper)] px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--paper-faint)]" style={SANS}>
                <span>County</span>
                <span className="text-right">Ann. Income</span>
                <span className="text-right">Ann. Care Cost</span>
                <span className="text-right">% of Income</span>
              </div>
              {[...scaledScatter].sort((a, b) => (b.y / b.x) - (a.y / a.x)).map(row => (
                <div key={row.name}
                  className="grid cursor-default grid-cols-[1fr_110px_110px_80px] items-center gap-3 px-6 py-3.5 transition-colors hover:bg-[var(--paper-2)]">
                  <span className="truncate text-sm font-medium text-[var(--paper-text)]" style={SERIF}>{row.name}</span>
                  <span className="text-right text-sm tabular-nums text-[var(--paper-muted)]">${Math.round(row.x).toLocaleString()}</span>
                  <span className="text-right text-sm tabular-nums text-[var(--paper-muted)]">${Math.round(row.y).toLocaleString()}</span>
                  <span className="text-right text-sm tabular-nums text-[var(--paper-text)]">{((row.y / row.x) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ) : config.series ? (
            <div className="divide-y divide-[var(--paper-rule-soft)]">
              <div className="sticky top-0 z-10 grid gap-3 border-b border-[var(--paper-rule)] bg-[var(--paper)] px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--paper-faint)]"
                style={{ ...SANS, gridTemplateColumns: `1fr repeat(${config.series.length}, 110px)` }}>
                <span>Year</span>
                {config.series.map(s => <span key={s.key} className="text-right">{s.label}</span>)}
              </div>
              {scaledMulti.map((row, i) => (
                <div key={i}
                  className="grid items-center gap-3 px-6 py-3.5 transition-colors hover:bg-[var(--paper-2)]"
                  style={{ gridTemplateColumns: `1fr repeat(${config.series!.length}, 110px)` }}>
                  <span className="text-sm font-medium text-[var(--paper-text)]" style={SERIF}>{row.name}</span>
                  {config.series!.map(s => (
                    <span key={s.key} className="text-right text-sm tabular-nums text-[var(--paper-muted)]">
                      {fmtVal(Number(row[s.key] ?? 0), config, config.periodToggle ? period : undefined)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[var(--paper-rule-soft)]">
              <div className="sticky top-0 z-10 grid grid-cols-[1fr_120px_90px] gap-3 border-b border-[var(--paper-rule)] bg-[var(--paper)] px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--paper-faint)]" style={SANS}>
                <span>Name</span>
                <span className="text-right">Value</span>
                <span className="text-right">Share</span>
              </div>
              {sorted.map(row => {
                const pct = total > 0 ? (row.value / total) * 100 : 0
                return (
                  <div key={row.name}
                    className="grid cursor-default grid-cols-[1fr_120px_90px] items-center gap-3 px-6 py-3.5 transition-colors hover:bg-[var(--paper-2)]">
                    <span className="truncate text-sm font-medium text-[var(--paper-text)]" style={SERIF}>{row.name}</span>
                    <span className="text-right text-sm tabular-nums text-[var(--paper-text)]">
                      {fmtVal(row.value, config, config.periodToggle ? period : undefined)}
                    </span>
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--paper-2)]">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: ACCENT }} />
                      </div>
                      <span className="w-7 text-right text-xs tabular-nums text-[var(--paper-faint)]">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
              <div className="grid grid-cols-[1fr_120px_90px] gap-3 bg-[var(--paper)] px-6 py-4 font-semibold text-[var(--paper-text)]">
                <span style={SERIF}>Total</span>
                <span className="text-right tabular-nums">{fmtVal(total, config, config.periodToggle ? period : undefined)}</span>
                <span className="text-right text-[var(--paper-muted)]">100%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
