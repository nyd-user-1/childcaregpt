'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, List, LayoutGrid } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn } from '@/lib/utils'

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

const STATUS_COLOR: Record<string, string> = {
  'License':                         'text-sky-500',
  'Registration':                    'text-sky-500',
  'Pending Revocation':              'text-amber-500',
  'Pending Revocation and Denial':   'text-amber-500',
  'Pending Denial':                  'text-amber-400',
  'Suspended':                       'text-red-500',
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

const EXTRA_HEADERS = [
  'COUNTY', 'CITY', 'TYPE', 'STATUS',
  'TOTAL', 'INFANT', 'TODDLER', 'PRESCHOOL', 'SCHOOL AGE',
  'DIRECTOR', 'LIC. EXP',
]

export default function FacilityTable({
  facilities,
  total,
}: {
  facilities: FacilityRow[]
  total: number
}) {
  const router = useRouter()
  const [view, setView]     = useState<'list' | 'grid'>('list')
  const [search, setSearch] = useState('')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return facilities
      .filter(f => !q ||
        f.facility_name.toLowerCase().includes(q) ||
        f.county.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q)
      )
      .sort((a, b) => sortAsc
        ? a.facility_name.localeCompare(b.facility_name)
        : b.facility_name.localeCompare(a.facility_name)
      )
  }, [search, sortAsc, facilities])

  const iconBtn = 'h-8 w-8 flex items-center justify-center rounded-lg transition-colors'
  const active  = 'bg-[var(--inp-bg)] text-[var(--txt)]'
  const muted   = 'text-[var(--muted)] hover:text-[var(--txt)]'
  const thCls   = 'px-4 py-4 text-left text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase'
  const td      = 'px-4 py-2.5 border-b border-[var(--border)]'

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        <div className="shrink-0 bg-[var(--surface)] px-5 pt-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--inp-bg)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--muted)] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search facilities..."
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
            <span className="text-xs text-[var(--muted)]">
              {filtered.length} of {total.toLocaleString()}
            </span>
          </div>
        </div>

        {view === 'list' && (
          <div className="px-5 pb-5 flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto no-scrollbar rounded-xl border border-[var(--border)]">
              <table className="text-sm whitespace-nowrap" style={{ minWidth: '1800px', width: '100%', borderSpacing: 0 }}>
                <thead className="sticky top-0 z-20 bg-[var(--surface)]">
                  <tr>
                    <th
                      onClick={() => setSortAsc(v => !v)}
                      style={{ willChange: 'transform' }}
                      className={cn(thCls, 'sticky left-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] cursor-pointer hover:text-[var(--txt)] select-none min-w-[220px]')}
                    >
                      FACILITY {sortAsc ? '^' : 'v'}
                    </th>
                    {EXTRA_HEADERS.map(h => (
                      <th key={h} className={cn(thCls, 'border-b border-[var(--border)]')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr
                      key={f.facility_id}
                      onClick={() => router.push(`/facility/${toSlug(f.facility_name)}`)}
                      className="group cursor-pointer hover:bg-[var(--inp-bg)] transition-colors"
                    >
                      <td style={{ willChange: 'transform' }} className={cn(td, 'sticky left-0 z-[1] overflow-hidden bg-[var(--surface)] group-hover:bg-[var(--row-hover)] font-semibold text-[var(--txt)] transition-colors max-w-[220px] truncate')}>
                        {f.facility_name}
                      </td>
                      <td className={cn(td, 'text-[var(--muted)]')}>{f.county}</td>
                      <td className={cn(td, 'text-[var(--muted)]')}>{f.city}</td>
                      <td className={cn(td, 'text-[var(--txt)]')}>{TYPE_LABEL[f.program_type] ?? f.program_type}</td>
                      <td className={cn(td, 'font-semibold', STATUS_COLOR[f.facility_status] ?? 'text-[var(--txt)]')}>
                        {f.facility_status}
                      </td>
                      <td className={cn(td, 'text-[var(--txt)]')}>{fmt(f.total_capacity)}</td>
                      <td className={cn(td, 'text-[var(--txt)]')}>{fmt(f.infant_capacity)}</td>
                      <td className={cn(td, 'text-[var(--txt)]')}>{fmt(f.toddler_capacity)}</td>
                      <td className={cn(td, 'text-[var(--txt)]')}>{fmt(f.preschool_capacity)}</td>
                      <td className={cn(td, 'text-[var(--txt)]')}>{fmt(f.school_age_capacity)}</td>
                      <td className={cn(td, 'text-[var(--muted)] max-w-[160px] truncate')}>{f.provider_name ?? '—'}</td>
                      <td className={cn(td, 'text-[var(--txt)]')}>{fmtDate(f.license_expiration_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'grid' && (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pt-2 pb-8">
            <div className="grid grid-cols-5 gap-3">
              {filtered.map((f, i) => (
                <Link
                  key={f.facility_id}
                  href={`/facility/${toSlug(f.facility_name)}`}
                  className="relative rounded-2xl overflow-hidden block"
                  style={{ background: GRADIENTS[i % GRADIENTS.length], aspectRatio: '3 / 4' }}
                >
                  <div className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                    {fmt(f.total_capacity)} seats
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/30 to-transparent">
                    <p className="text-sm font-bold text-white leading-tight">{f.facility_name}</p>
                    <p className="text-xs text-white/70 mt-0.5">{f.city}, NY</p>
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
