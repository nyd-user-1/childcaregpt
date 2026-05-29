'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, List, LayoutGrid, ChevronUp, ChevronDown, ArrowUpRight, Info } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

function fmt(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtCost(n: number | null) {
  if (n == null) return '—'
  return `$${Math.round(n)}/wk`
}

function fmtCostMo(n: number | null) {
  if (n == null) return '—'
  return `$${Math.round(n * 4.33).toLocaleString()}/mo`
}

function fmtCostYr(n: number | null) {
  if (n == null) return '—'
  const yr = Math.round(n * 52)
  return yr >= 1000 ? `$${(yr / 1000).toFixed(1)}K/yr` : `$${yr}/yr`
}

function fmtIncome(n: number | null) {
  if (n == null) return '—'
  return `$${Math.round(n / 1000)}K`
}

function toSlug(county: string) {
  return county.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export type CountyRow = {
  county: string
  provider_count: number
  total_capacity: number
  infant_capacity: number
  toddler_capacity: number
  preschool_capacity: number
  school_age_capacity: number
  mcinfant: number | null
  mctoddler: number | null
  mcpreschool: number | null
  mhi: number | null
}

type ColKey = 'providers' | 'total' | 'infant' | 'toddler' | 'preschool'
            | 'schoolAge' | 'seatsPerProvider'
            | 'mcinfant' | 'mcinfantMo' | 'mcinfantYr'
            | 'mctoddler' | 'mcpreschool' | 'mhi'

interface ColDef { key: ColKey; header: string; tooltip: string; cost?: boolean }

const COLS: ColDef[] = [
  { key: 'providers',        header: 'PROVIDERS',      tooltip: 'Number of OCFS-regulated childcare facilities in the county.' },
  { key: 'total',            header: 'TOTAL SEATS',    tooltip: 'Sum of all licensed childcare capacity across facilities.' },
  { key: 'infant',           header: 'INFANT',         tooltip: 'Sum of licensed infant capacity (birth–18 months) across facilities.' },
  { key: 'toddler',          header: 'TODDLER',        tooltip: 'Sum of licensed toddler capacity (18 months–3 years) across facilities.' },
  { key: 'preschool',        header: 'PRESCHOOL',      tooltip: 'Sum of licensed preschool capacity across facilities.' },
  { key: 'schoolAge',        header: 'SCHOOL AGE',     tooltip: 'Sum of licensed school-age capacity across facilities.' },
  { key: 'seatsPerProvider', header: 'SEATS/PROVIDER', tooltip: 'Average seats per licensed facility (total seats ÷ providers). High values indicate large centers; low values indicate small home-based programs.' },
  { key: 'mcinfant',         header: 'MED. INFANT/WK', tooltip: 'Median weekly center-based infant care cost (DOL NDCP, 2022).', cost: true },
  { key: 'mcinfantMo',       header: 'MED. INFANT/MO', tooltip: 'Median monthly center-based infant care cost (weekly × 4.33, DOL NDCP, 2022).', cost: true },
  { key: 'mcinfantYr',       header: 'MED. INFANT/YR', tooltip: 'Median annual center-based infant care cost (weekly × 52, DOL NDCP, 2022).', cost: true },
  { key: 'mctoddler',        header: 'MED. TODDLER',   tooltip: 'Median weekly center-based toddler care cost (DOL NDCP, 2022).', cost: true },
  { key: 'mcpreschool',      header: 'MED. PRESCHOOL', tooltip: 'Median weekly center-based preschool cost (DOL NDCP, 2022).', cost: true },
  { key: 'mhi',              header: 'MED. INCOME',    tooltip: 'Median household income (DOL NDCP, 2022).' },
]

function ColHeader({ col, active, dir, onSort }: {
  col: ColDef; active: boolean; dir: 'asc' | 'desc'; onSort: () => void
}) {
  return (
    <th className="px-3 py-3.5 bg-[var(--paper)] border-b border-[var(--paper-rule)] whitespace-nowrap text-right">
      <div className="relative group/col inline-block">
        <button
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-text)]',
            active ? 'text-[var(--paper-text)]' : 'text-[var(--paper-faint)]',
          )}
          style={SANS}
        >
          {col.header}
          {active
            ? dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            : <ChevronUp className="h-3 w-3 opacity-0 group-hover/col:opacity-40" />}
        </button>
        <div className="pointer-events-none group-hover/col:pointer-events-auto absolute top-full right-0 z-50 mt-2 hidden group-hover/col:block w-64 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-xl text-left overflow-hidden normal-case tracking-normal whitespace-normal">
          <div className="px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--paper-text)] mb-1.5" style={SANS}>{col.header}</p>
            <p className="text-[12px] text-[var(--paper-muted)] leading-relaxed font-normal">{col.tooltip}</p>
          </div>
          <Link href="/glossary" onClick={e => e.stopPropagation()}
            className="flex items-center justify-between gap-2 border-t border-[var(--paper-rule)] px-3.5 py-2.5 text-[11px] font-medium text-[var(--paper-accent)] hover:bg-[var(--paper-2)] transition-colors" style={SANS}>
            <span className="inline-flex items-center gap-1.5"><Info className="h-3 w-3" />Learn more</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </th>
  )
}

function getVal(row: CountyRow, key: ColKey): number {
  switch (key) {
    case 'providers':        return row.provider_count
    case 'total':            return row.total_capacity
    case 'infant':           return row.infant_capacity
    case 'toddler':          return row.toddler_capacity
    case 'preschool':        return row.preschool_capacity
    case 'schoolAge':        return row.school_age_capacity
    case 'seatsPerProvider': return row.provider_count > 0 ? row.total_capacity / row.provider_count : 0
    case 'mcinfant':         return row.mcinfant ?? 0
    case 'mcinfantMo':       return row.mcinfant != null ? row.mcinfant * 4.33 : 0
    case 'mcinfantYr':       return row.mcinfant != null ? row.mcinfant * 52 : 0
    case 'mctoddler':        return row.mctoddler ?? 0
    case 'mcpreschool':      return row.mcpreschool ?? 0
    case 'mhi':              return row.mhi ?? 0
  }
}

function cellVal(c: CountyRow, key: ColKey): string {
  switch (key) {
    case 'providers':        return fmt(c.provider_count)
    case 'total':            return fmt(c.total_capacity)
    case 'infant':           return fmt(c.infant_capacity)
    case 'toddler':          return fmt(c.toddler_capacity)
    case 'preschool':        return fmt(c.preschool_capacity)
    case 'schoolAge':        return fmt(c.school_age_capacity)
    case 'seatsPerProvider': return c.provider_count > 0 ? String(Math.round(c.total_capacity / c.provider_count)) : '—'
    case 'mcinfant':         return fmtCost(c.mcinfant)
    case 'mcinfantMo':       return fmtCostMo(c.mcinfant)
    case 'mcinfantYr':       return fmtCostYr(c.mcinfant)
    case 'mctoddler':        return fmtCost(c.mctoddler)
    case 'mcpreschool':      return fmtCost(c.mcpreschool)
    case 'mhi':              return fmtIncome(c.mhi)
  }
}

export default function CountyTable({ counties }: { counties: CountyRow[] }) {
  const router = useRouter()
  const [view, setView]       = useState<'list' | 'grid'>('list')
  const [search, setSearch]   = useState('')
  const [sortCol, setSortCol] = useState<'county' | ColKey>('county')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K focuses search; Esc clears it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) setSearch('')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSort(col: 'county' | ColKey) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const rows = counties.filter(c => !q || c.county.toLowerCase().includes(q))
    return [...rows].sort((a, b) => {
      if (sortCol === 'county') {
        const cmp = a.county.localeCompare(b.county)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const av = getVal(a, sortCol), bv = getVal(b, sortCol)
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [search, sortCol, sortDir, counties])

  const iconBtn   = 'h-8 w-8 flex items-center justify-center rounded-lg transition-colors'
  const activeBtn = 'bg-[var(--paper-2)] text-[var(--paper-text)]'
  const mutedBtn  = 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]'
  const td        = 'px-4 py-3 border-b border-[var(--paper-rule-soft)] text-right tabular-nums'

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

        {/* ── Masthead ───────────────────────────────────────────── */}
        <div className="shrink-0 px-6 sm:px-10 pt-9 pb-5">
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · <span className="tabular-nums">{counties.length}</span> counties
          </p>
          <h1
            className="paper-rise mt-3 leading-[1.05]"
            style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Child care in New York,{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>county by county.</span>
          </h1>
          <div className="paper-rise mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '120ms' }}>
            <span>OCFS providers · DOL costs</span>
            <span className="h-3 w-px bg-[var(--paper-rule)]" />
            <span>2022</span>
          </div>
        </div>

        {/* ── Controls ───────────────────────────────────────────── */}
        <div className="paper-rise shrink-0 border-y border-[var(--paper-rule)] bg-[var(--paper)] px-6 sm:px-10 py-3 flex items-center gap-3 sm:gap-4" style={{ animationDelay: '180ms' }}>
          <label className="relative flex flex-1 items-center max-w-md">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--paper-faint)]" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search counties…"
              className="w-full rounded-full border border-[var(--paper-rule)] bg-[var(--paper-2)] pl-9 pr-9 py-2 text-[15px] text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[var(--paper-accent)] transition-colors"
              style={SANS}
            />
            {search && (
              <button onClick={() => { setSearch(''); searchRef.current?.focus() }} aria-label="Clear search"
                className="absolute right-3 text-[var(--paper-faint)] hover:text-[var(--paper-text)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="flex items-center gap-0.5">
            <button onClick={() => setView('list')} aria-label="List view" className={cn(iconBtn, view === 'list' ? activeBtn : mutedBtn)}><List className="h-4 w-4" /></button>
            <button onClick={() => setView('grid')} aria-label="Grid view" className={cn(iconBtn, view === 'grid' ? activeBtn : mutedBtn)}><LayoutGrid className="h-4 w-4" /></button>
          </div>

          <span className="hidden sm:block text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)] tabular-nums shrink-0" style={SANS}>
            {filtered.length} / {counties.length}
          </span>
        </div>

        {/* ── List view ──────────────────────────────────────────── */}
        {view === 'list' && (
          <div className="flex-1 min-h-0 overflow-hidden px-6 sm:px-10 py-5">
            <div className="h-full overflow-auto no-scrollbar rounded-xl border border-[var(--paper-rule)]">
              <table className="text-sm whitespace-nowrap" style={{ minWidth: '1600px', width: '100%', borderSpacing: 0 }}>
                <thead className="sticky top-0 z-20 bg-[var(--paper)]">
                  <tr>
                    <th onClick={() => handleSort('county')} style={{ willChange: 'transform' }}
                      className="px-4 py-3.5 text-left sticky left-0 z-30 bg-[var(--paper)] border-b border-[var(--paper-rule)] cursor-pointer select-none min-w-[200px]">
                      <button className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-text)]',
                        sortCol === 'county' ? 'text-[var(--paper-text)]' : 'text-[var(--paper-faint)]')} style={SANS}>
                        COUNTY
                        {sortCol === 'county'
                          ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          : <ChevronUp className="h-3 w-3 opacity-40" />}
                      </button>
                    </th>
                    <th className="px-3 py-3.5 bg-[var(--paper)] border-b border-[var(--paper-rule)] text-left">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)] px-1.5 py-0.5" style={SANS}>STATE</span>
                    </th>
                    {COLS.map(col => (
                      <ColHeader key={col.key} col={col} active={sortCol === col.key} dir={sortDir} onSort={() => handleSort(col.key)} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.county} onClick={() => router.push(`/county/${toSlug(c.county)}`)}
                      className="group/row cursor-pointer hover:bg-[var(--paper-2)] transition-colors">
                      <td style={{ ...SERIF, willChange: 'transform' }}
                        className={cn('px-4 py-3 border-b border-[var(--paper-rule-soft)] sticky left-0 z-[1] bg-[var(--paper)] group-hover/row:bg-[var(--paper-2)] text-[15px] font-medium text-[var(--paper-text)] transition-colors')}>
                        {c.county} County
                      </td>
                      <td className={cn(td, 'text-left text-[var(--paper-faint)]')}>NY</td>
                      {COLS.map(col => (
                        <td key={col.key} className={cn(td, col.cost ? 'text-[var(--paper-accent)] font-medium' : 'text-[var(--paper-text)]')}>
                          {cellVal(c, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Grid view ──────────────────────────────────────────── */}
        {view === 'grid' && (
          <div className="@container flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 sm:px-10 pt-1 pb-10">
            <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5">
              {filtered.map(c => (
                <Link key={c.county} href={`/county/${toSlug(c.county)}`}
                  className="group/card flex flex-col justify-between rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-4 transition-colors hover:border-[var(--paper-accent)]"
                  style={{ aspectRatio: '3 / 4' }}>
                  <div className="min-w-0">
                    <p className="leading-tight text-[var(--paper-text)] truncate" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>
                      {c.county}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}>New York</p>
                  </div>
                  <div>
                    <p className="tabular-nums leading-none text-[var(--paper-accent)]" style={{ ...SERIF, fontSize: '1.6rem', fontWeight: 500 }}>
                      {fmt(c.total_capacity)}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--paper-muted)]" style={SANS}>
                      seats · {fmt(c.provider_count)} providers
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
