'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, List, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { ColumnHeader } from '@/components/ColumnHeader'
import { cn } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

function fmt(n: number | null) {
  if (n == null || n === 0) return '—'
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export type ZipRow = {
  zip_code: string
  city: string
  county: string
  provider_count: number
  total_capacity: number
  infant_capacity: number
  toddler_capacity: number
  preschool_capacity: number
  school_age_capacity: number
}

type ColKey = 'city' | 'county' | 'providers' | 'total' | 'infant' | 'toddler' | 'preschool' | 'schoolAge'
interface ColDef { key: ColKey; header: string; tooltip: string; num?: boolean }

const COLS: ColDef[] = [
  { key: 'city',      header: 'CITY',       tooltip: 'Primary city associated with this ZIP code.' },
  { key: 'county',    header: 'COUNTY',     tooltip: 'County in which this ZIP code is located.' },
  { key: 'providers', header: 'PROVIDERS',  tooltip: 'Number of OCFS-regulated childcare facilities with this ZIP code.', num: true },
  { key: 'total',     header: 'TOTAL SEATS',tooltip: 'Sum of all licensed childcare capacity across facilities in this ZIP code.', num: true },
  { key: 'infant',    header: 'INFANT',     tooltip: 'Sum of licensed infant capacity (birth–18 months) across facilities in this ZIP code.', num: true },
  { key: 'toddler',   header: 'TODDLER',    tooltip: 'Sum of licensed toddler capacity (18 months–3 years) across facilities in this ZIP code.', num: true },
  { key: 'preschool', header: 'PRESCHOOL',  tooltip: 'Sum of licensed preschool capacity across facilities in this ZIP code.', num: true },
  { key: 'schoolAge', header: 'SCHOOL AGE', tooltip: 'Sum of licensed school-age capacity across facilities in this ZIP code.', num: true },
]

function getVal(row: ZipRow, key: ColKey): number | string {
  switch (key) {
    case 'city':      return row.city
    case 'county':    return row.county
    case 'providers': return row.provider_count
    case 'total':     return row.total_capacity
    case 'infant':    return row.infant_capacity
    case 'toddler':   return row.toddler_capacity
    case 'preschool': return row.preschool_capacity
    case 'schoolAge': return row.school_age_capacity
  }
}

export default function ZipTable({ zips: initial, total: initialTotal }: { zips: ZipRow[]; total: number }) {
  const router = useRouter()
  const [view, setView]     = useState<'list' | 'grid'>('list')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<'zip' | ColKey>('zip')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [zips, setZips]       = useState(initial)
  const [total, setTotal]     = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const fullTotal = initialTotal

  const fetchZips = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('search', q)
      const res  = await fetch(`/api/zips?${params}`)
      const json = await res.json()
      setZips(json.data)
      setTotal(json.total)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchZips(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, fetchZips])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) setSearch('')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSort(col: 'zip' | ColKey) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = useMemo(() => [...zips].sort((a, b) => {
    const av = sortCol === 'zip' ? a.zip_code : getVal(a, sortCol)
    const bv = sortCol === 'zip' ? b.zip_code : getVal(b, sortCol)
    if (typeof av === 'string') { const c = av.localeCompare(bv as string); return sortDir === 'asc' ? c : -c }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  }), [zips, sortCol, sortDir])

  const iconBtn = 'h-8 w-8 flex items-center justify-center rounded-lg transition-colors'
  const activeBtn = 'bg-[var(--paper-2)] text-[var(--paper-text)]'
  const mutedBtn  = 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]'
  const tdNum = 'px-4 py-3 border-b border-[var(--paper-rule-soft)] text-right tabular-nums text-[var(--paper-text)]'
  const tdStr = 'px-4 py-3 border-b border-[var(--paper-rule-soft)] text-left text-[var(--paper-muted)]'

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

        {/* ── Masthead ───────────────────────────────────────────── */}
        <div className="shrink-0 px-6 sm:px-10 pt-9 pb-5">
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · <span className="tabular-nums">{fullTotal.toLocaleString()}</span> ZIP codes
          </p>
          <h1 className="paper-rise mt-3 leading-[1.05]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Child care in New York,{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>ZIP by ZIP.</span>
          </h1>
          <div className="paper-rise mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '120ms' }}>
            <span>OCFS-regulated providers</span>
            <span className="h-3 w-px bg-[var(--paper-rule)]" />
            <span>New York</span>
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
              placeholder="Search ZIP codes, cities, counties…"
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
            {loading ? 'Searching…' : `${sorted.length.toLocaleString()} / ${total.toLocaleString()}`}
          </span>
        </div>

        {/* ── List view ──────────────────────────────────────────── */}
        {view === 'list' && (
          <div className="flex-1 min-h-0 overflow-hidden px-6 sm:px-10 py-5">
            <div className="h-full overflow-auto no-scrollbar rounded-xl border border-[var(--paper-rule)]">
              <table className="text-sm whitespace-nowrap" style={{ minWidth: '1200px', width: '100%', borderSpacing: 0 }}>
                <thead className="sticky top-0 z-20 bg-[var(--paper)]">
                  <tr>
                    <th onClick={() => handleSort('zip')} style={{ willChange: 'transform' }}
                      className="px-4 py-3.5 text-left sticky left-0 z-30 bg-[var(--paper)] border-b border-[var(--paper-rule)] cursor-pointer select-none min-w-[120px]">
                      <button className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-text)]',
                        sortCol === 'zip' ? 'text-[var(--paper-text)]' : 'text-[var(--paper-faint)]')} style={SANS}>
                        ZIP CODE
                        {sortCol === 'zip' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronUp className="h-3 w-3 opacity-40" />}
                      </button>
                    </th>
                    {COLS.map(col => <ColumnHeader key={col.key} label={col.header} tooltip={col.tooltip} align={col.num ? 'right' : 'left'} active={sortCol === col.key} dir={sortDir} onSort={() => handleSort(col.key)} />)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(z => (
                    <tr key={z.zip_code} onClick={() => router.push(`/zip/${z.zip_code}`)}
                      className="group/row cursor-pointer hover:bg-[var(--paper-2)] transition-colors">
                      <td style={{ ...SERIF, willChange: 'transform' }} className="px-4 py-3 border-b border-[var(--paper-rule-soft)] sticky left-0 z-[1] bg-[var(--paper)] group-hover/row:bg-[var(--paper-2)] text-[15px] font-medium text-[var(--paper-text)] tabular-nums transition-colors">
                        {z.zip_code}
                      </td>
                      <td className={tdStr}>{z.city}</td>
                      <td className={tdStr}>{z.county}</td>
                      <td className={tdNum}>{fmt(z.provider_count)}</td>
                      <td className={tdNum}>{fmt(z.total_capacity)}</td>
                      <td className={tdNum}>{fmt(z.infant_capacity)}</td>
                      <td className={tdNum}>{fmt(z.toddler_capacity)}</td>
                      <td className={tdNum}>{fmt(z.preschool_capacity)}</td>
                      <td className={tdNum}>{fmt(z.school_age_capacity)}</td>
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
              {sorted.map(z => (
                <Link key={z.zip_code} href={`/zip/${z.zip_code}`}
                  className="group/card flex flex-col justify-between rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-4 transition-colors hover:border-[var(--paper-accent)]"
                  style={{ aspectRatio: '3 / 4' }}>
                  <div className="min-w-0">
                    <p className="leading-tight text-[var(--paper-text)] tabular-nums" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>{z.zip_code}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)] truncate" style={SANS}>{z.city}</p>
                  </div>
                  <div>
                    <p className="tabular-nums leading-none text-[var(--paper-accent)]" style={{ ...SERIF, fontSize: '1.6rem', fontWeight: 500 }}>{fmt(z.total_capacity)}</p>
                    <p className="mt-1 text-[12px] text-[var(--paper-muted)]" style={SANS}>seats · {fmt(z.provider_count)} providers</p>
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
