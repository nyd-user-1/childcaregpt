'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, List, LayoutGrid, Plus, ChartColumn } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { NY_COUNTIES } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'

/* ── Gradient palette for grid cards ────────────────────────────── */
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
  'A+': 'text-yellow-400',
  'A':  'text-amber-400',
  'B':  'text-orange-400',
  'C':  'text-orange-500',
  'D':  'text-red-500',
}

/* ── Number formatting ───────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function CountyPage() {
  const [view, setView]       = useState<'list' | 'grid'>('list')
  const [search, setSearch]   = useState('')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return NY_COUNTIES
      .filter(c => !q || c.county.toLowerCase().includes(q))
      .sort((a, b) =>
        sortAsc ? a.county.localeCompare(b.county) : b.county.localeCompare(a.county)
      )
  }, [search, sortAsc])

  const iconBtn = 'h-8 w-8 flex items-center justify-center rounded-lg transition-colors'
  const active  = 'bg-[var(--inp-bg)] text-[var(--txt)]'
  const muted   = 'text-[var(--muted)] hover:text-[var(--txt)]'

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 pt-4 pb-8 flex flex-col gap-3">

          {/* ── Search ── */}
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--inp-bg)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--muted)] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search counties..."
              className="flex-1 bg-transparent text-sm text-[var(--txt)] placeholder:text-[var(--muted)] outline-none"
            />
          </div>

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setView('list')}  className={cn(iconBtn, view === 'list' ? active : muted)}><List         className="h-4 w-4" /></button>
            <button onClick={() => setView('grid')}  className={cn(iconBtn, view === 'grid' ? active : muted)}><LayoutGrid   className="h-4 w-4" /></button>
            <button className={cn(iconBtn, muted)}><Plus         className="h-4 w-4" /></button>
            <button className={cn(iconBtn, muted)}><ChartColumn  className="h-4 w-4" /></button>
            <div className="flex-1" />
            <span className="text-xs text-[var(--muted)]">{filtered.length} of {NY_COUNTIES.length}</span>
          </div>

          {/* ── List view ── */}
          {view === 'list' && (
            <div className="overflow-x-auto no-scrollbar rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                    <th
                      onClick={() => setSortAsc(v => !v)}
                      className="text-left px-4 py-2.5 text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase cursor-pointer hover:text-[var(--txt)] select-none"
                    >
                      COUNTY {sortAsc ? '^' : 'v'}
                    </th>
                    {['STATE','GRADE','PROVIDERS','SEATS','FILLED','OPEN','AVG COST','WAITLIST','COMPLIANCE'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const grade = getGrade(c.compliance)
                    return (
                      <tr key={c.slug} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--inp-bg)] transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-[var(--txt)]">
                          <Link href={`/county/${c.slug}`} className="hover:text-sky-500 transition-colors">
                            {c.county} County
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--muted)]">NY</td>
                        <td className={cn('px-4 py-2.5 font-semibold', GRADE_COLOR[grade])}>{grade}</td>
                        <td className="px-4 py-2.5 text-[var(--txt)]">{c.providers}</td>
                        <td className="px-4 py-2.5 text-[var(--txt)]">{fmt(c.seats)}</td>
                        <td className="px-4 py-2.5 text-[var(--txt)]">{fmt(c.filled)}</td>
                        <td className="px-4 py-2.5 font-bold text-sky-500">{fmt(c.open)}</td>
                        <td className="px-4 py-2.5 text-[var(--txt)]">${c.avgCost}/wk</td>
                        <td className="px-4 py-2.5 text-[var(--txt)]">{c.waitlistMonths} mo</td>
                        <td className="px-4 py-2.5 text-[var(--txt)]">{c.compliance}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Grid view ── */}
          {view === 'grid' && (
            <div className="grid grid-cols-5 gap-3">
              {filtered.map((c, i) => {
                const annual = c.seats * c.avgCost * 52
                return (
                  <Link
                    key={c.slug}
                    href={`/county/${c.slug}`}
                    className="relative rounded-2xl overflow-hidden block"
                    style={{ background: GRADIENTS[i % GRADIENTS.length], aspectRatio: '3 / 4' }}
                  >
                    {/* Value badge */}
                    <div className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                      ${fmt(annual)}
                    </div>
                    {/* County label */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/30 to-transparent">
                      <p className="text-sm font-bold text-white leading-tight">{c.county} County</p>
                      <p className="text-xs text-white/70 mt-0.5">NY</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  )
}
