'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, List, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

export type OfficialRow = {
  chamber: 'senate' | 'assembly'
  district: number
  name: string | null
  party: string | null
  provider_count: number
}

type ChamberFilter = 'all' | 'senate' | 'assembly'
type SortCol = 'district' | 'name' | 'party' | 'providers'

function fmt(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function partyShort(party: string | null): string {
  if (!party) return '—'
  const p = party.toLowerCase()
  if (p.includes('republican')) return 'R'
  if (p.includes('democrat')) return 'D'
  if (p.includes('conservative')) return 'C'
  if (p.includes('working')) return 'WF'
  return party
}

function partyTint(party: string | null): string {
  if (!party) return 'var(--paper-faint)'
  const p = party.toLowerCase()
  if (p.includes('republican')) return '#a8443b'
  if (p.includes('democrat')) return '#2f5d8a'
  return 'var(--paper-accent)'
}

const CHAMBER_LABEL = { senate: 'Senate', assembly: 'Assembly' } as const

export default function OfficialsTable({ officials, initialChamber = 'all' }: { officials: OfficialRow[]; initialChamber?: ChamberFilter }) {
  const router = useRouter()
  const [view, setView]       = useState<'list' | 'grid'>('list')
  const [search, setSearch]   = useState('')
  const [chamber, setChamber] = useState<ChamberFilter>(initialChamber)
  const [sortCol, setSortCol] = useState<SortCol>('district')
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

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'providers' ? 'desc' : 'asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const rows = officials.filter(o => {
      if (chamber !== 'all' && o.chamber !== chamber) return false
      if (!q) return true
      // Match rep name, district number, party, or chamber label.
      return (
        (o.name?.toLowerCase().includes(q) ?? false) ||
        String(o.district) === q ||
        String(o.district).startsWith(q) ||
        (o.party?.toLowerCase().includes(q) ?? false) ||
        CHAMBER_LABEL[o.chamber].toLowerCase().includes(q)
      )
    })
    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'district':  cmp = a.district - b.district; break
        case 'name':      cmp = (a.name ?? '').localeCompare(b.name ?? ''); break
        case 'party':     cmp = (a.party ?? '').localeCompare(b.party ?? ''); break
        case 'providers': cmp = a.provider_count - b.provider_count; break
      }
      // Keep chambers grouped when sorting by district so "1,2,3…" reads cleanly.
      if (cmp === 0 && sortCol !== 'providers') cmp = a.chamber.localeCompare(b.chamber)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [search, chamber, sortCol, sortDir, officials])

  const iconBtn   = 'h-8 w-8 flex items-center justify-center rounded-lg transition-colors'
  const activeBtn = 'bg-[var(--paper-2)] text-[var(--paper-text)]'
  const mutedBtn  = 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]'
  const td        = 'px-4 py-3 border-b border-[var(--paper-rule-soft)] text-right tabular-nums'

  const total = officials.length

  function ColBtn({ col, label, left }: { col: SortCol; label: string; left?: boolean }) {
    const active = sortCol === col
    return (
      <button
        onClick={() => handleSort(col)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-text)]',
          active ? 'text-[var(--paper-text)]' : 'text-[var(--paper-faint)]',
        )}
        style={SANS}
      >
        {!left && label}
        {active
          ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronUp className="h-3 w-3 opacity-0 group-hover/col:opacity-40" />}
        {left && label}
      </button>
    )
  }

  const CHAMBER_PILLS: { key: ChamberFilter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'senate',   label: 'Senate' },
    { key: 'assembly', label: 'Assembly' },
  ]

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

        {/* ── Masthead ───────────────────────────────────────────── */}
        <div className="shrink-0 px-6 sm:px-10 pt-9 pb-5">
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · <span className="tabular-nums">{total}</span> districts
          </p>
          <h1
            className="paper-rise mt-3 leading-[1.05]"
            style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Child care in New York,{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>district by district.</span>
          </h1>
          <div className="paper-rise mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '120ms' }}>
            <span>NY State Senate &amp; Assembly</span>
            <span className="h-3 w-px bg-[var(--paper-rule)]" />
            <span>OCFS providers per district</span>
          </div>
        </div>

        {/* ── Controls ───────────────────────────────────────────── */}
        <div className="paper-rise shrink-0 border-y border-[var(--paper-rule)] bg-[var(--paper)] px-6 sm:px-10 py-3 flex flex-wrap items-center gap-3 sm:gap-4" style={{ animationDelay: '180ms' }}>
          <label className="relative flex flex-1 items-center min-w-[200px] max-w-md">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--paper-faint)]" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or district number…"
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

          {/* Chamber filter pills */}
          <div className="flex items-center gap-1 rounded-full border border-[var(--paper-rule)] bg-[var(--paper-2)] p-0.5">
            {CHAMBER_PILLS.map(p => (
              <button
                key={p.key}
                onClick={() => setChamber(p.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  chamber === p.key ? 'bg-[var(--paper)] text-[var(--paper-text)] shadow-sm' : 'text-[var(--paper-muted)] hover:text-[var(--paper-text)]',
                )}
                style={SANS}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5">
            <button onClick={() => setView('list')} aria-label="List view" className={cn(iconBtn, view === 'list' ? activeBtn : mutedBtn)}><List className="h-4 w-4" /></button>
            <button onClick={() => setView('grid')} aria-label="Grid view" className={cn(iconBtn, view === 'grid' ? activeBtn : mutedBtn)}><LayoutGrid className="h-4 w-4" /></button>
          </div>

          <span className="hidden sm:block text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)] tabular-nums shrink-0" style={SANS}>
            {filtered.length} / {total}
          </span>
        </div>

        {/* ── List view ──────────────────────────────────────────── */}
        {view === 'list' && (
          <div className="flex-1 min-h-0 overflow-hidden px-6 sm:px-10 py-5">
            <div className="h-full overflow-auto no-scrollbar rounded-xl border border-[var(--paper-rule)]">
              <table className="text-sm whitespace-nowrap" style={{ width: '100%', borderSpacing: 0 }}>
                <thead className="sticky top-0 z-20 bg-[var(--paper)]">
                  <tr>
                    <th className="px-4 py-3.5 text-left bg-[var(--paper)] border-b border-[var(--paper-rule)] min-w-[260px] group/col">
                      <ColBtn col="name" label="REPRESENTATIVE" left />
                    </th>
                    <th className="px-3 py-3.5 text-left bg-[var(--paper)] border-b border-[var(--paper-rule)] group/col">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)] px-1.5 py-0.5" style={SANS}>CHAMBER</span>
                    </th>
                    <th className="px-3 py-3.5 text-right bg-[var(--paper)] border-b border-[var(--paper-rule)] group/col"><ColBtn col="district" label="DISTRICT" /></th>
                    <th className="px-3 py-3.5 text-right bg-[var(--paper)] border-b border-[var(--paper-rule)] group/col"><ColBtn col="party" label="PARTY" /></th>
                    <th className="px-3 py-3.5 text-right bg-[var(--paper)] border-b border-[var(--paper-rule)] group/col"><ColBtn col="providers" label="PROVIDERS" /></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={`${o.chamber}-${o.district}`} onClick={() => router.push(`/district/${o.chamber}/${o.district}`)}
                      className="group/row cursor-pointer hover:bg-[var(--paper-2)] transition-colors">
                      <td style={{ ...SERIF }}
                        className="px-4 py-3 border-b border-[var(--paper-rule-soft)] text-[15px] font-medium text-[var(--paper-text)]">
                        {o.name || `District ${o.district}`}
                      </td>
                      <td className="px-3 py-3 border-b border-[var(--paper-rule-soft)] text-left text-[var(--paper-muted)]" style={SANS}>{CHAMBER_LABEL[o.chamber]}</td>
                      <td className={cn(td, 'text-[var(--paper-text)]')}>{o.district}</td>
                      <td className="px-3 py-3 border-b border-[var(--paper-rule-soft)] text-right">
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ ...SANS, color: partyTint(o.party) }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: partyTint(o.party) }} />
                          {partyShort(o.party)}
                        </span>
                      </td>
                      <td className={cn(td, 'text-[var(--paper-accent)] font-medium')}>{fmt(o.provider_count)}</td>
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
              {filtered.map(o => (
                <Link key={`${o.chamber}-${o.district}`} href={`/district/${o.chamber}/${o.district}`}
                  className="group/card flex flex-col justify-between rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-4 transition-colors hover:border-[var(--paper-accent)]"
                  style={{ aspectRatio: '3 / 4' }}>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}>{CHAMBER_LABEL[o.chamber]} · {o.district}</p>
                    <p className="mt-1 leading-tight text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>
                      {o.name || `District ${o.district}`}
                    </p>
                    {o.party && (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ ...SANS, color: partyTint(o.party) }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: partyTint(o.party) }} />
                        {o.party}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="tabular-nums leading-none text-[var(--paper-accent)]" style={{ ...SERIF, fontSize: '1.6rem', fontWeight: 500 }}>
                      {fmt(o.provider_count)}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--paper-muted)]" style={SANS}>
                      licensed providers
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
