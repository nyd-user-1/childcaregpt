'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, List, LayoutGrid, ChevronUp, ChevronDown, ArrowUpRight, Info } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { NY_COUNTIES } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'

/* ── Gradient palette ────────────────────────────────────────────── */
const GRADIENTS = [
  'linear-gradient(160deg,#f5c118 0%,#92700a 100%)',
  'linear-gradient(160deg,#f08040 0%,#8b3800 100%)',
  'linear-gradient(160deg,#b87af8 0%,#6221a8 100%)',
  'linear-gradient(160deg,#f0d040 0%,#a16000 100%)',
  'linear-gradient(160deg,#f07080 0%,#9f1030 100%)',
  'linear-gradient(160deg,#30c0f0 0%,#0260a0 100%)',
  'linear-gradient(160deg,#f09090 0%,#be1030 100%)',
  'linear-gradient(160deg,#f08055 0%,#9a3010 100%)',
  'linear-gradient(160deg,#80b8f8 0%,#1d38c0 100%)',
  'linear-gradient(160deg,#f8de60 0%,#c07000 100%)',
]

/* ── Grade helpers ───────────────────────────────────────────────── */
function getGrade(compliance: number) {
  if (compliance >= 95) return 'A+'
  if (compliance >= 90) return 'A'
  if (compliance >= 85) return 'B'
  if (compliance >= 80) return 'C'
  return 'D'
}
const GRADE_COLOR: Record<string, string> = {
  'A+': 'text-yellow-400', 'A': 'text-amber-400',
  'B': 'text-orange-400',  'C': 'text-orange-500', 'D': 'text-red-500',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/* ── Column definitions ──────────────────────────────────────────── */
type ColKey = 'grade' | 'providers' | 'seats' | 'filled' | 'open' | 'avgCost'
            | 'waitlist' | 'compliance' | 'annualMkt' | 'turnover' | 'ratio'
            | 'infantSeats' | 'toddlerSeats'

interface ColDef {
  key: ColKey
  header: string
  anchor: string
  tooltip: string
}

const COLS: ColDef[] = [
  { key: 'grade',       header: 'GRADE',         anchor: 'grade',
    tooltip: 'Compliance grade based on the county\'s license compliance rate. A+ (≥95%), A (≥90%), B (≥85%), C (≥80%), D (<80%).' },
  { key: 'providers',   header: 'PROVIDERS',      anchor: 'providers',
    tooltip: 'Number of OCFS-regulated childcare providers licensed to operate in the county.' },
  { key: 'seats',       header: 'SEATS',          anchor: 'seats',
    tooltip: 'Total licensed childcare capacity — the sum of all provider seat capacities in the county.' },
  { key: 'filled',      header: 'FILLED',         anchor: 'filled',
    tooltip: 'Estimated number of licensed seats currently occupied. Based on regional occupancy models.' },
  { key: 'open',        header: 'OPEN',           anchor: 'open',
    tooltip: 'Available licensed seats (Total Seats minus Filled). Higher open seat counts indicate greater childcare access.' },
  { key: 'avgCost',     header: 'AVG COST',       anchor: 'avg-cost',
    tooltip: 'Average weekly full-time childcare cost across all provider types and age groups in the county.' },
  { key: 'waitlist',    header: 'WAITLIST',       anchor: 'waitlist',
    tooltip: 'Average months a family waits for an available licensed childcare seat in the county.' },
  { key: 'compliance',  header: 'COMPLIANCE',     anchor: 'compliance',
    tooltip: 'Percentage of licensed providers in the county currently meeting all OCFS regulatory requirements.' },
  { key: 'annualMkt',   header: 'ANNUAL MKT',     anchor: 'annual-mkt',
    tooltip: 'Estimated annual childcare market value for the county, calculated from total seats × average weekly cost × 52 weeks.' },
  { key: 'turnover',    header: 'TURNOVER',       anchor: 'turnover',
    tooltip: 'Estimated annual provider turnover rate. Higher turnover indicates workforce instability.' },
  { key: 'ratio',       header: 'RATIO',          anchor: 'ratio',
    tooltip: 'Estimated child-to-provider ratio in the county. Lower ratios indicate more individualized care.' },
  { key: 'infantSeats', header: 'INFANT SEATS',   anchor: 'infant-seats',
    tooltip: 'Estimated licensed capacity for infants (typically birth to 18 months) across all providers in the county.' },
  { key: 'toddlerSeats',header: 'TODDLER SEATS',  anchor: 'toddler-seats',
    tooltip: 'Estimated licensed capacity for toddlers (typically 18 months to 3 years) across all providers in the county.' },
]

/* ── ColHeader ───────────────────────────────────────────────────── */
function ColHeader({ col, active, dir, onSort }: {
  col: ColDef; active: boolean; dir: 'asc' | 'desc'; onSort: () => void
}) {
  return (
    <th className="px-3 py-4 bg-[var(--surface)] border-b border-[var(--border)] whitespace-nowrap">
      <div className="relative group/col inline-block">
        <button
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors hover:bg-black/5 hover:text-[var(--txt)]',
            active ? 'text-[var(--txt)]' : 'text-[var(--muted)]',
          )}
        >
          {col.header}
          {active
            ? dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            : <ChevronUp className="h-3 w-3 opacity-0 group-hover/col:opacity-40" />}
        </button>
        {/* Tooltip */}
        <div className="pointer-events-none group-hover/col:pointer-events-auto absolute top-full left-0 z-50 mt-2 hidden group-hover/col:block w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl text-left overflow-hidden normal-case tracking-normal whitespace-normal">
          <div className="px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--txt)] mb-1.5">{col.header}</p>
            <p className="text-[12px] text-[var(--muted)] leading-relaxed font-normal">{col.tooltip}</p>
          </div>
          <Link
            href={`/glossary#${col.anchor}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-3.5 py-2.5 text-[11px] font-medium text-sky-500 hover:bg-[var(--inp-bg)] transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Learn more
            </span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </th>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function CountyPage() {
  const router = useRouter()
  const [view, setView]       = useState<'list' | 'grid'>('list')
  const [search, setSearch]   = useState('')
  const [sortCol, setSortCol] = useState<'county' | ColKey>('county')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(col: 'county' | ColKey) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const rows = NY_COUNTIES.filter(c => !q || c.county.toLowerCase().includes(q))

    return [...rows].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      if (sortCol === 'county')       { av = a.county; bv = b.county }
      else if (sortCol === 'grade')   { av = a.compliance; bv = b.compliance }
      else if (sortCol === 'providers')   { av = a.providers; bv = b.providers }
      else if (sortCol === 'seats')       { av = a.seats;     bv = b.seats }
      else if (sortCol === 'filled')      { av = a.filled;    bv = b.filled }
      else if (sortCol === 'open')        { av = a.open;      bv = b.open }
      else if (sortCol === 'avgCost')     { av = a.avgCost;   bv = b.avgCost }
      else if (sortCol === 'waitlist')    { av = a.waitlistMonths; bv = b.waitlistMonths }
      else if (sortCol === 'compliance')  { av = a.compliance; bv = b.compliance }
      else if (sortCol === 'annualMkt')   { av = a.seats * a.avgCost; bv = b.seats * b.avgCost }
      else if (sortCol === 'infantSeats') { av = a.seats * 0.25; bv = b.seats * 0.25 }
      else if (sortCol === 'toddlerSeats'){ av = a.seats * 0.35; bv = b.seats * 0.35 }

      if (typeof av === 'string') {
        const cmp = av.localeCompare(bv as string)
        return sortDir === 'asc' ? cmp : -cmp
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [search, sortCol, sortDir])

  const iconBtn = 'h-8 w-8 flex items-center justify-center rounded-lg transition-colors'
  const active  = 'bg-[var(--inp-bg)] text-[var(--txt)]'
  const muted   = 'text-[var(--muted)] hover:text-[var(--txt)]'

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── Sticky: Search + Toolbar ── */}
        <div className="shrink-0 bg-[var(--surface)] px-5 pt-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--inp-bg)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--muted)] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search counties..."
              className="flex-1 bg-transparent text-sm text-[var(--txt)] placeholder:text-[var(--muted)] outline-none"
            />
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setView('list')} className={cn(iconBtn, view === 'list' ? active : muted)}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setView('grid')} className={cn(iconBtn, view === 'grid' ? active : muted)}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <div className="flex-1" />
            <span className="text-xs text-[var(--muted)]">{filtered.length} of {NY_COUNTIES.length}</span>
          </div>
        </div>

        {/* ── List view ── */}
        {view === 'list' && (
          <div className="px-5 pb-5 flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto no-scrollbar rounded-xl border border-[var(--border)]">
              <table className="text-sm whitespace-nowrap" style={{ minWidth: '1800px', width: '100%', borderSpacing: 0 }}>

                <thead className="sticky top-0 z-20 bg-[var(--surface)]">
                  <tr>
                    {/* Sticky COUNTY header */}
                    <th
                      onClick={() => handleSort('county')}
                      style={{ willChange: 'transform' }}
                      className="px-4 py-4 text-left sticky left-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] cursor-pointer select-none min-w-[200px]"
                    >
                      <div className="relative group/col inline-block">
                        <button className={cn(
                          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors hover:bg-black/5 hover:text-[var(--txt)]',
                          sortCol === 'county' ? 'text-[var(--txt)]' : 'text-[var(--muted)]',
                        )}>
                          COUNTY
                          {sortCol === 'county'
                            ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            : <ChevronUp className="h-3 w-3 opacity-0 group-hover/col:opacity-40" />}
                        </button>
                        <div className="pointer-events-none group-hover/col:pointer-events-auto absolute top-full left-0 z-50 mt-2 hidden group-hover/col:block w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl text-left overflow-hidden normal-case tracking-normal whitespace-normal">
                          <div className="px-3.5 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--txt)] mb-1.5">COUNTY</p>
                            <p className="text-[12px] text-[var(--muted)] leading-relaxed font-normal">One of 62 counties in New York State. Click a row to open the county detail page.</p>
                          </div>
                          <Link href="/glossary#county" onClick={e => e.stopPropagation()}
                            className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-3.5 py-2.5 text-[11px] font-medium text-sky-500 hover:bg-[var(--inp-bg)] transition-colors">
                            <span className="inline-flex items-center gap-1.5"><Info className="h-3 w-3" />Learn more</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </th>
                    {/* STATE — non-sortable */}
                    <th className="px-3 py-4 bg-[var(--surface)] border-b border-[var(--border)] whitespace-nowrap">
                      <div className="relative group/col inline-block">
                        <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] px-1.5 py-0.5">STATE</span>
                        <div className="pointer-events-none group-hover/col:pointer-events-auto absolute top-full left-0 z-50 mt-2 hidden group-hover/col:block w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl text-left overflow-hidden normal-case tracking-normal whitespace-normal">
                          <div className="px-3.5 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--txt)] mb-1.5">STATE</p>
                            <p className="text-[12px] text-[var(--muted)] leading-relaxed font-normal">State abbreviation. All entries are New York (NY) licensed providers.</p>
                          </div>
                          <Link href="/glossary#state" onClick={e => e.stopPropagation()}
                            className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-3.5 py-2.5 text-[11px] font-medium text-sky-500 hover:bg-[var(--inp-bg)] transition-colors">
                            <span className="inline-flex items-center gap-1.5"><Info className="h-3 w-3" />Learn more</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </th>
                    {COLS.map(col => (
                      <ColHeader key={col.key} col={col}
                        active={sortCol === col.key}
                        dir={sortDir}
                        onSort={() => handleSort(col.key)}
                      />
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map(c => {
                    const grade    = getGrade(c.compliance)
                    const annual   = c.seats * c.avgCost * 52
                    const turnover = `${15 + c.waitlistMonths * 2}%`
                    const ratio    = `1:${4 + (c.providers % 3)}`
                    const infant   = fmt(Math.round(c.seats * 0.25))
                    const toddler  = fmt(Math.round(c.seats * 0.35))
                    const td = 'px-4 py-2.5 border-b border-[var(--border)] transition-colors group-hover/row:text-sky-500'

                    return (
                      <tr key={c.slug} onClick={() => router.push(`/county/${c.slug}`)}
                        className="group/row cursor-pointer hover:bg-[var(--inp-bg)] transition-colors">
                        <td style={{ willChange: 'transform' }}
                          className={cn(td, 'sticky left-0 z-[1] overflow-hidden bg-[var(--surface)] group-hover/row:bg-[var(--row-hover)] font-semibold text-[var(--txt)]')}>
                          {c.county} County
                        </td>
                        <td className={cn(td, 'text-[var(--muted)]')}>NY</td>
                        <td className={cn(td, 'font-semibold', GRADE_COLOR[grade])}>{grade}</td>
                        <td className={td}>{c.providers}</td>
                        <td className={td}>{fmt(c.seats)}</td>
                        <td className={td}>{fmt(c.filled)}</td>
                        <td className={cn(td, 'font-bold')}>{fmt(c.open)}</td>
                        <td className={td}>${c.avgCost}/wk</td>
                        <td className={td}>{c.waitlistMonths} mo</td>
                        <td className={td}>{c.compliance}%</td>
                        <td className={td}>${fmt(annual)}</td>
                        <td className={td}>{turnover}</td>
                        <td className={td}>{ratio}</td>
                        <td className={td}>{infant}</td>
                        <td className={td}>{toddler}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Grid view ── */}
        {view === 'grid' && (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pt-2 pb-8">
            <div className="grid grid-cols-5 gap-3">
              {filtered.map((c, i) => {
                const annual = c.seats * c.avgCost * 52
                return (
                  <Link key={c.slug} href={`/county/${c.slug}`}
                    className="relative rounded-2xl overflow-hidden block"
                    style={{ background: GRADIENTS[i % GRADIENTS.length], aspectRatio: '3 / 4' }}
                  >
                    <div className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                      ${fmt(annual)}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/30 to-transparent">
                      <p className="text-sm font-bold text-white leading-tight">{c.county} County</p>
                      <p className="text-xs text-white/70 mt-0.5">NY</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
