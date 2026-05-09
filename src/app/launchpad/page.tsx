'use client'

import { useState } from 'react'
import { Map } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { cn } from '@/lib/utils'

/* ── Dummy data ───────────────────────────────────────────────────── */

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

/* Gradient pairs — light → dark, matching SolarGPT's GEA color scheme */
const CARD_GRADIENTS = [
  ['#fca5a5', '#dc2626'],  // red
  ['#22d3ee', '#0e7490'],  // cyan
  ['#4ade80', '#15803d'],  // green
  ['#fde047', '#b45309'],  // yellow
  ['#34d399', '#065f46'],  // emerald
  ['#60a5fa', '#1d4ed8'],  // blue
  ['#2dd4bf', '#0f766e'],  // teal
  ['#c084fc', '#7e22ce'],  // purple
  ['#fb923c', '#c2410c'],  // orange
  ['#f472b6', '#be185d'],  // pink
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
      {/* Exact SolarGPT grid layout: overflow-y-auto, p-4, flex flex-col gap-5 */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-4 flex flex-col gap-5">

          {/* ── Top section: table (52%) + map (flex-1), h-[380px] ── */}
          <div className="h-[380px] flex flex-col shrink-0">
            <div className="flex-1 min-h-0 flex gap-4">

              {/* County data table — w-[52%] matching SolarGPT */}
              <div className="w-[52%] min-w-0 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
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
                        <tr key={row.county} className={cn('border-b border-[var(--border2)]', i % 2 !== 0 && 'bg-[var(--inp-bg)]')}>
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

              {/* Map placeholder — flex-1 matching SolarGPT map proportion */}
              <div className="flex-1 min-w-0 rounded-xl border border-[var(--border)] overflow-hidden flex flex-col items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#e8f4fb 0%,#d0eaf7 100%)' }}>
                <Map className="h-12 w-12 text-[var(--muted)]" />
                <p className="text-sm font-medium text-[var(--txt2)]">New York State</p>
                <p className="text-xs text-[var(--muted)]">County Map</p>
              </div>

            </div>
          </div>

          {/* ── Bottom: sticky tab bar + landscape card grid ── */}
          <div>

            {/* Sticky tab bar — exact SolarGPT pattern, blue accent instead of amber */}
            <div className="sticky top-0 z-10 bg-[var(--surface)] -mx-4 px-4 flex items-center gap-1 border-b border-[var(--border)] mb-4">
              {PROVIDER_TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                    activeTab === i
                      ? 'border-blue-500 text-[var(--txt)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--txt)]'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Landscape card grid — exact SolarGPT: grid-cols-4, aspect-[4/3], gradient */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
              {NY_COUNTIES.map((county, i) => {
                const [light, dark] = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                return (
                  <div
                    key={county.county}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${light}, ${dark})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    {/* Badge — top right */}
                    <div className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur-sm px-2 py-1">
                      <span className="text-xs font-bold text-white">{county.providers}</span>
                    </div>
                    {/* Name + state — bottom left */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                      <p className="text-sm font-bold text-white leading-snug">{county.county} County</p>
                      <p className="text-[10px] text-white/70">NY</p>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
