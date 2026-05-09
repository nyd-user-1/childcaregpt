'use client'

import { AppLayout } from '@/components/AppLayout'

/* ── Map placeholder component ───────────────────────────────────── */

function MapPlaceholder({ bg }: { bg: string }) {
  return (
    <div className="flex-1 min-h-0 w-full" style={{ background: bg }}>
      <div className="w-full h-full opacity-25" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.4) 0,rgba(255,255,255,.4) 1px,transparent 0,transparent 40%),repeating-linear-gradient(90deg,rgba(255,255,255,.4) 0,rgba(255,255,255,.4) 1px,transparent 0,transparent 40%)',
        backgroundSize: '28px 28px',
      }} />
    </div>
  )
}

/* ── Map definitions ──────────────────────────────────────────────── */

type MapDef = { id: string; title: string; description: string; bg: string }

const MAPS: MapDef[] = [
  /* Row 1 */
  { id: 'm1',  title: 'NY County Coverage',    description: 'Provider distribution by county · NYS 2024',     bg: 'linear-gradient(135deg,#bfdbfe,#3b82f6)' },
  { id: 'm2',  title: 'CCDF Subsidy Map',       description: 'Subsidy-eligible families by county',             bg: 'linear-gradient(135deg,#bbf7d0,#16a34a)' },
  { id: 'm3',  title: 'Compliance Overview',    description: 'Inspection pass rates by region',                 bg: 'linear-gradient(135deg,#fed7aa,#ea580c)' },
  { id: 'm4',  title: 'Waitlist Heat Map',      description: 'Average waitlist months by county',               bg: 'linear-gradient(135deg,#fecaca,#dc2626)' },

  /* Row 2 */
  { id: 'm5',  title: 'Cost Distribution',      description: 'Average weekly childcare cost by region',         bg: 'linear-gradient(135deg,#e9d5ff,#7c3aed)' },
  { id: 'm6',  title: 'Quality Ratings Map',    description: 'QRIS rating distribution across NY State',        bg: 'linear-gradient(135deg,#cffafe,#0e7490)' },
  { id: 'm7',  title: 'Seat Availability',      description: 'Open licensed seats per 1,000 children',          bg: 'linear-gradient(135deg,#d1fae5,#059669)' },
  { id: 'm8',  title: 'Provider Density',       description: 'Licensed providers per square mile by county',    bg: 'linear-gradient(135deg,#fef3c7,#d97706)' },

  /* Row 3 */
  { id: 'm9',  title: 'Staff-to-Child Ratio',   description: 'Average caregiver ratio compliance by region',    bg: 'linear-gradient(135deg,#ede9fe,#6d28d9)' },
  { id: 'm10', title: 'Enrollment Trends',      description: 'Year-over-year enrollment change by county',      bg: 'linear-gradient(135deg,#dbeafe,#1d4ed8)' },
  { id: 'm11', title: 'Income Eligibility',     description: 'CCDF income-eligible households by ZIP',          bg: 'linear-gradient(135deg,#fce7f3,#be185d)' },
  { id: 'm12', title: 'License Type Mix',       description: 'Center vs family home provider ratio by county',  bg: 'linear-gradient(135deg,#f0fdf4,#15803d)' },
]

/* ── Page ─────────────────────────────────────────────────────────── */

export default function MapsPage() {
  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-hidden p-4 pb-5">
        <div className="h-full grid grid-cols-4 grid-rows-3 gap-4">
          {MAPS.map(map => (
            <div
              key={map.id}
              className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-[var(--txt)]/20 hover:shadow-md transition-all cursor-pointer"
            >
              <MapPlaceholder bg={map.bg} />
              <div className="shrink-0 px-4 pt-2 pb-3">
                <p className="text-[13px] font-bold text-[var(--txt)] leading-snug">{map.title}</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">{map.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
