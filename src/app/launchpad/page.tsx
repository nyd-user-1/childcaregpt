'use client'

import { useState } from 'react'
import { Map } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn } from '@/lib/utils'

/* ── Dummy data — 20 NY counties ─────────────────────────────────── */

const NY_COUNTIES = [
  { county: 'Albany',      providers: 142, seats: 4260,  filled: 3820,  open: 440,  diff: -38 },
  { county: 'Bronx',       providers: 318, seats: 9540,  filled: 9100,  open: 440,  diff: +22 },
  { county: 'Broome',      providers:  67, seats: 2010,  filled: 1780,  open: 230,  diff: -12 },
  { county: 'Dutchess',    providers:  89, seats: 2670,  filled: 2340,  open: 330,  diff:  +8 },
  { county: 'Erie',        providers: 245, seats: 7350,  filled: 6890,  open: 460,  diff: +15 },
  { county: 'Essex',       providers:  18, seats:  540,  filled:  480,  open:  60,  diff:  -4 },
  { county: 'Hamilton',    providers:   4, seats:  120,  filled:   95,  open:  25,  diff:  +2 },
  { county: 'Kings',       providers: 425, seats: 12750, filled: 11900, open: 850,  diff: +18 },
  { county: 'Monroe',      providers: 198, seats: 5940,  filled: 5420,  open: 520,  diff:  +5 },
  { county: 'Nassau',      providers: 312, seats: 9360,  filled: 8750,  open: 610,  diff: +30 },
  { county: 'New York',    providers: 287, seats: 8610,  filled: 8200,  open: 410,  diff: -20 },
  { county: 'Niagara',     providers:  72, seats: 2160,  filled: 1940,  open: 220,  diff:  +6 },
  { county: 'Oneida',      providers:  84, seats: 2520,  filled: 2280,  open: 240,  diff: +11 },
  { county: 'Onondaga',    providers: 167, seats: 5010,  filled: 4650,  open: 360,  diff: +14 },
  { county: 'Orange',      providers: 134, seats: 4020,  filled: 3700,  open: 320,  diff:  +9 },
  { county: 'Putnam',      providers:  28, seats:  840,  filled:  760,  open:  80,  diff:  +3 },
  { county: 'Queens',      providers: 389, seats: 11670, filled: 10900, open: 770,  diff: +24 },
  { county: 'Rensselaer',  providers:  56, seats: 1680,  filled: 1520,  open: 160,  diff:  +7 },
  { county: 'Richmond',    providers:  98, seats: 2940,  filled: 2720,  open: 220,  diff: +12 },
  { county: 'Rockland',    providers: 143, seats: 4290,  filled: 3980,  open: 310,  diff: +16 },
]

const GRADIENTS = [
  'linear-gradient(135deg,#fca5a5 0%,#dc2626 100%)',
  'linear-gradient(135deg,#c4b5fd 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#fdba74 0%,#ea580c 100%)',
  'linear-gradient(135deg,#86efac 0%,#15803d 100%)',
  'linear-gradient(135deg,#67e8f9 0%,#0e7490 100%)',
  'linear-gradient(135deg,#fda4af 0%,#be185d 100%)',
]

const PROVIDER_TABS = [
  'Family Day Care',
  'Group Family Day Care',
  'School Age Child Care',
  'Small Day Care Center',
]

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function LaunchpadPage() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">

          {/* ── Top row: table + map ── */}
          <div className="flex gap-4" style={{ height: 320 }}>

            {/* County data table */}
            <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--surface)]">
                    <tr className="border-b border-[var(--border)]">
                      {['County','Providers','Seats','Seats Filled','Seats Open','Difference (+/-)'].map(h => (
                        <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NY_COUNTIES.map((row, i) => (
                      <tr key={row.county} className={cn('border-b border-[var(--border2)]', i % 2 === 0 ? '' : 'bg-[var(--inp-bg)]')}>
                        <td className="px-4 py-3 font-medium text-[var(--txt)]">{row.county}</td>
                        <td className="px-4 py-3 text-[var(--txt2)]">{row.providers}</td>
                        <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.seats)}</td>
                        <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.filled)}</td>
                        <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.open)}</td>
                        <td className={cn('px-4 py-3 font-semibold', row.diff >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {row.diff >= 0 ? `+${row.diff}` : row.diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="w-[40%] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#e8f4fb 0%,#d0eaf7 100%)' }}>
              <Map className="h-12 w-12 text-[var(--muted)]" />
              <p className="text-sm font-medium text-[var(--txt2)]">New York State</p>
              <p className="text-xs text-[var(--muted)]">County Map</p>
            </div>

          </div>

          {/* ── Provider type tab bar ── */}
          <div className="flex items-center gap-2">
            {PROVIDER_TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
                  activeTab === i
                    ? 'border border-blue-500 font-bold text-[var(--txt)]'
                    : 'text-[var(--muted)] hover:text-[var(--txt)]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── County gradient cards ── */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {NY_COUNTIES.map((c, i) => (
              <div
                key={c.county}
                className="relative shrink-0 w-44 h-64 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                style={{ background: GRADIENTS[i % GRADIENTS.length] }}
              >
                {/* Badge */}
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <span className="text-[11px] font-semibold text-white">{c.providers}</span>
                </div>
                {/* Labels */}
                <div className="absolute bottom-4 left-4">
                  <p className="text-[13px] font-semibold text-white leading-snug">{c.county} County</p>
                  <p className="text-[11px] text-white/70 mt-0.5">NY</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
