'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, List, LayoutGrid, ChevronUp, ChevronDown, ArrowUpRight, Info } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { ColumnHeader } from '@/components/ColumnHeader'
import { cn } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const STATUS_COLOR: Record<string, string> = {
  'License':                       'text-[var(--paper-accent)]',
  'Registration':                  'text-[var(--paper-accent)]',
  'Pending Revocation':            'text-amber-600',
  'Pending Revocation and Denial': 'text-amber-600',
  'Pending Denial':                'text-amber-500',
  'Suspended':                     'text-red-600',
}

const TYPE_LABEL: Record<string, string> = {
  DCC:  'Day Care Ctr',
  FDC:  'Family Day Care',
  GFDC: 'Group Family DC',
  SACC: 'School Age CC',
  SDCC: 'Small Day Care',
}

function fmt(n: number | null) {
  if (n == null || n === 0) return '—'
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export type FacilityRow = {
  facility_id: number
  facility_name: string
  county: string
  city: string
  program_type: string
  facility_status: string
  total_capacity: number
  infant_capacity: number
  toddler_capacity: number
  preschool_capacity: number
  school_age_capacity: number
  provider_name: string | null
  license_expiration_date: string | null
}

type ColKey = 'county' | 'city' | 'type' | 'status' | 'total'
            | 'infant' | 'toddler' | 'preschool' | 'schoolAge'
            | 'director' | 'licExp'

interface ColDef { key: ColKey; header: string; tooltip: string; num?: boolean }

const COLS: ColDef[] = [
  { key: 'county',    header: 'COUNTY',      tooltip: 'The NY county in which the facility is located.' },
  { key: 'city',      header: 'CITY',        tooltip: 'The city or town in which the facility is located.' },
  { key: 'type',      header: 'TYPE',        tooltip: 'OCFS program type: Day Care Center (DCC), Group Family Day Care (GFDC), Family Day Care (FDC), School Age Child Care (SACC), or Small Day Care Center (SDCC).' },
  { key: 'status',    header: 'STATUS',      tooltip: 'Current licensing status: License or Registration (active), Pending Revocation (enforcement action pending), Suspended (license suspended).' },
  { key: 'total',     header: 'TOTAL',       tooltip: 'Total licensed capacity — the maximum number of children this facility is approved to serve at one time.', num: true },
  { key: 'infant',    header: 'INFANT',      tooltip: 'Licensed capacity for infants (typically birth to 18 months). Only applies to Day Care Centers (DCC).', num: true },
  { key: 'toddler',   header: 'TODDLER',     tooltip: 'Licensed capacity for toddlers (typically 18 months to 3 years). Only applies to Day Care Centers (DCC).', num: true },
  { key: 'preschool', header: 'PRESCHOOL',   tooltip: 'Licensed capacity for preschool-age children (3 years to kindergarten). Only applies to Day Care Centers (DCC).', num: true },
  { key: 'schoolAge', header: 'SCHOOL AGE',  tooltip: 'Licensed capacity for school-age children (kindergarten and above).', num: true },
  { key: 'director',  header: 'DIRECTOR',    tooltip: 'Name of the approved on-site Director or Provider. Shown as "There is no approved Director/On-Site Provider" if no approved director is on file.' },
  { key: 'licExp',    header: 'LIC. EXP',    tooltip: 'License or registration expiration date. Facilities must renew before this date to maintain active status.' },
]

function getVal(row: FacilityRow, key: ColKey): number | string {
  switch (key) {
    case 'county':    return row.county
    case 'city':      return row.city
    case 'type':      return row.program_type
    case 'status':    return row.facility_status
    case 'total':     return row.total_capacity
    case 'infant':    return row.infant_capacity
    case 'toddler':   return row.toddler_capacity
    case 'preschool': return row.preschool_capacity
    case 'schoolAge': return row.school_age_capacity
    case 'director':  return row.provider_name ?? ''
    case 'licExp':    return row.license_expiration_date ?? ''
  }
}

export default function FacilityTable({
  facilities: initialFacilities,
  total: initialTotal,
}: {
  facilities: FacilityRow[]
  total: number
}) {
  const router = useRouter()
  const [view, setView]       = useState<'list' | 'grid'>('list')
  const [search, setSearch]   = useState('')
  const [sortCol, setSortCol] = useState<'name' | ColKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [facilities, setFacilities] = useState(initialFacilities)
  const [total, setTotal]           = useState(initialTotal)
  const [loading, setLoading]       = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const fullTotal = initialTotal

  const fetchFacilities = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (q) params.set('search', q)
      const res = await fetch(`/api/facilities?${params}`)
      const json = await res.json()
      setFacilities(json.data)
      setTotal(json.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchFacilities(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, fetchFacilities])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) setSearch('')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSort(col: 'name' | ColKey) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = useMemo(() => [...facilities].sort((a, b) => {
    const av = sortCol === 'name' ? a.facility_name : getVal(a, sortCol)
    const bv = sortCol === 'name' ? b.facility_name : getVal(b, sortCol)
    if (typeof av === 'string') {
      const cmp = av.localeCompare(bv as string)
      return sortDir === 'asc' ? cmp : -cmp
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  }), [facilities, sortCol, sortDir])

  const iconBtn  = 'h-8 w-8 flex items-center justify-center rounded-lg transition-colors'
  const activeBtn = 'bg-[var(--paper-2)] text-[var(--paper-text)]'
  const mutedBtn  = 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]'
  const tdNum = 'px-4 py-3 border-b border-[var(--paper-rule-soft)] text-right tabular-nums text-[var(--paper-text)]'
  const tdStrMuted  = 'px-4 py-3 border-b border-[var(--paper-rule-soft)] text-left text-[var(--paper-muted)]'
  const tdStrStrong = 'px-4 py-3 border-b border-[var(--paper-rule-soft)] text-left text-[var(--paper-text)]'

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

        {/* ── Masthead ───────────────────────────────────────────── */}
        <div className="shrink-0 px-6 sm:px-10 pt-9 pb-5">
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · <span className="tabular-nums">{fullTotal.toLocaleString()}</span> facilities
          </p>
          <h1 className="paper-rise mt-3 leading-[1.05]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Every licensed provider in{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>New York.</span>
          </h1>
          <div className="paper-rise mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '120ms' }}>
            <span>OCFS-regulated</span>
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
              placeholder="Search facilities, counties, cities…"
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
              <table className="text-sm whitespace-nowrap" style={{ minWidth: '1800px', width: '100%', borderSpacing: 0 }}>
                <thead className="sticky top-0 z-20 bg-[var(--paper)]">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      style={{ willChange: 'transform' }}
                      className="px-4 py-3.5 text-left sticky left-0 z-30 bg-[var(--paper)] border-b border-[var(--paper-rule)] cursor-pointer select-none min-w-[220px]"
                    >
                      <div className="relative group/col inline-block">
                        <button className={cn(
                          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-text)]',
                          sortCol === 'name' ? 'text-[var(--paper-text)]' : 'text-[var(--paper-faint)]',
                        )} style={SANS}>
                          FACILITY
                          {sortCol === 'name'
                            ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            : <ChevronUp className="h-3 w-3 opacity-40" />}
                        </button>
                        <div className="pointer-events-none group-hover/col:pointer-events-auto absolute top-full left-0 z-50 mt-2 hidden group-hover/col:block w-64 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-xl text-left overflow-hidden normal-case tracking-normal whitespace-normal">
                          <div className="px-3.5 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--paper-text)] mb-1.5" style={SANS}>FACILITY</p>
                            <p className="text-[12px] text-[var(--paper-muted)] leading-relaxed font-normal">Legal name of the OCFS-regulated childcare program. Click a row to view the facility detail page.</p>
                          </div>
                          <Link href="/glossary" onClick={e => e.stopPropagation()}
                            className="flex items-center justify-between gap-2 border-t border-[var(--paper-rule)] px-3.5 py-2.5 text-[11px] font-medium text-[var(--paper-accent)] hover:bg-[var(--paper-2)] transition-colors" style={SANS}>
                            <span className="inline-flex items-center gap-1.5"><Info className="h-3 w-3" />Learn more</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </th>
                    {COLS.map(col => (
                      <ColumnHeader key={col.key} label={col.header} tooltip={col.tooltip} align={col.num ? 'right' : 'left'} active={sortCol === col.key} dir={sortDir} onSort={() => handleSort(col.key)} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(f => (
                    <tr
                      key={f.facility_id}
                      onClick={() => router.push(`/facility/${toSlug(f.facility_name)}`)}
                      className="group/row cursor-pointer hover:bg-[var(--paper-2)] transition-colors"
                    >
                      <td style={{ ...SERIF, willChange: 'transform' }} className="px-4 py-3 border-b border-[var(--paper-rule-soft)] sticky left-0 z-[1] bg-[var(--paper)] group-hover/row:bg-[var(--paper-2)] text-[15px] font-medium text-[var(--paper-text)] transition-colors max-w-[220px] truncate">
                        {f.facility_name}
                      </td>
                      <td className={tdStrMuted}>{f.county}</td>
                      <td className={tdStrMuted}>{f.city}</td>
                      <td className={tdStrStrong}>{TYPE_LABEL[f.program_type] ?? f.program_type}</td>
                      <td className={cn('px-4 py-3 border-b border-[var(--paper-rule-soft)] text-left font-medium', STATUS_COLOR[f.facility_status] ?? 'text-[var(--paper-text)]')}>
                        {f.facility_status}
                      </td>
                      <td className={tdNum}>{fmt(f.total_capacity)}</td>
                      <td className={tdNum}>{fmt(f.infant_capacity)}</td>
                      <td className={tdNum}>{fmt(f.toddler_capacity)}</td>
                      <td className={tdNum}>{fmt(f.preschool_capacity)}</td>
                      <td className={tdNum}>{fmt(f.school_age_capacity)}</td>
                      <td className={cn(tdStrMuted, 'max-w-[160px] truncate')}>{f.provider_name ?? '—'}</td>
                      <td className={tdStrStrong}>{fmtDate(f.license_expiration_date)}</td>
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
              {sorted.map(f => (
                <Link
                  key={f.facility_id}
                  href={`/facility/${toSlug(f.facility_name)}`}
                  className="group/card flex flex-col justify-between rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-4 transition-colors hover:border-[var(--paper-accent)]"
                  style={{ aspectRatio: '3 / 4' }}
                >
                  <div className="min-w-0">
                    <p className="leading-tight text-[var(--paper-text)] line-clamp-2" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>{f.facility_name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)] truncate" style={SANS}>{f.city} · {TYPE_LABEL[f.program_type] ?? f.program_type}</p>
                  </div>
                  <div>
                    <p className="tabular-nums leading-none text-[var(--paper-accent)]" style={{ ...SERIF, fontSize: '1.6rem', fontWeight: 500 }}>{fmt(f.total_capacity)}</p>
                    <p className={cn('mt-1 text-[12px] font-medium', STATUS_COLOR[f.facility_status] ?? 'text-[var(--paper-muted)]')} style={SANS}>{f.facility_status}</p>
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
