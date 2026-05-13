'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, ChartSpline, MapPlus, MessageCircle } from 'lucide-react'
import { PanelChart } from '@/components/PanelChart'
import { PanelMap } from '@/components/PanelMap'
import { PanelChat } from '@/components/PanelChat'
import { getCountyBySlug, NY_COUNTIES } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'

const PROGRAM_LABELS: Record<string, string> = {
  FDC: 'Family Day Care', GFDC: 'Group Family Day Care',
  SACC: 'School Age Child Care', SDCC: 'Small Day Care Center', DCC: 'Day Care Center',
}

type Facility = {
  facility_id: string; facility_name: string; county: string; city: string
  program_type: string; facility_status: string; total_capacity: number
  infant_capacity: number; toddler_capacity: number; preschool_capacity: number
  school_age_capacity: number; provider_name: string; license_expiration_date: string
  profile_url: string; phone_number: string
}

function FacilityView({ facilitySlug, countySlug }: { facilitySlug: string; countySlug: string }) {
  const router = useRouter()
  const [facility, setFacility] = useState<Facility | null>(null)

  useEffect(() => {
    setFacility(null)
    fetch(`/api/facilities?facility_id=${encodeURIComponent(facilitySlug)}`)
      .then(r => r.json())
      .then(d => setFacility(d.data?.[0] ?? null))
  }, [facilitySlug])

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  if (!facility) return (
    <div className="px-5 py-8 space-y-3">
      <div className="h-7 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
      <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
      <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-100 flex justify-between">
            <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-3 w-1/5 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )

  const profileRows = [
    { label: 'Provider',        value: facility.provider_name,                    highlight: false },
    { label: 'City',            value: facility.city,                             highlight: false },
    { label: 'Status',          value: facility.facility_status,                  highlight: false },
    { label: 'Total Capacity',  value: String(facility.total_capacity),           highlight: true  },
    { label: 'Infant',          value: String(facility.infant_capacity),          highlight: false },
    { label: 'Toddler',         value: String(facility.toddler_capacity),         highlight: false },
    { label: 'Preschool',       value: String(facility.preschool_capacity),       highlight: false },
    { label: 'School Age',      value: String(facility.school_age_capacity),      highlight: false },
    { label: 'License Expires', value: String(facility.license_expiration_date ?? '—').slice(0, 10), highlight: false },
    { label: 'Phone',           value: facility.phone_number ?? '—',              highlight: false },
  ]

  const capacityCards = [
    { label: 'Infant',     n: Number(facility.infant_capacity)     },
    { label: 'Toddler',    n: Number(facility.toddler_capacity)    },
    { label: 'Preschool',  n: Number(facility.preschool_capacity)  },
    { label: 'School Age', n: Number(facility.school_age_capacity) },
  ].filter(c => c.n > 0)

  return (
    <div className="px-5 py-8">
      <div className="mb-8 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--txt)] leading-tight">{facility.facility_name}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {PROGRAM_LABELS[facility.program_type] ?? facility.program_type} · {facility.city}
          </p>
        </div>
        <button
          onClick={() => router.push(`/launchpad/${countySlug}`, { scroll: false })}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] hover:text-sky-500 hover:border-sky-200 transition-colors whitespace-nowrap"
        >
          <ChevronLeft className="h-3 w-3" />
          {countySlug.charAt(0).toUpperCase() + countySlug.slice(1)} County
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-[var(--surface)]">
          <span className="text-sm font-semibold text-[var(--txt)]">Facility Profile</span>
        </div>
        {profileRows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2.5 border-t border-[var(--border)]">
            <span className="text-sm text-[var(--muted)]">{row.label}</span>
            <span className={cn('text-sm text-right', row.highlight ? 'font-bold text-sky-500' : 'text-[var(--txt)]')}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {capacityCards.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {capacityCards.map(c => (
            <div key={c.label} className="flex-1 min-w-[80px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <p className="text-base font-bold text-[var(--txt)]">{fmtNum(c.n)}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{c.label}</p>
              <p className="text-xs font-bold text-sky-500 mt-1">{c.n} seats</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── ButtonGroup ─────────────────────────────────────────────────── */
function ButtonGroup({
  prevSlug,
  nextSlug,
  countyName,
  chartsOpen,
  mapsOpen,
  chatOpen,
  onCharts,
  onMaps,
  onChat,
}: {
  prevSlug: string
  nextSlug: string
  countyName: string
  chartsOpen: boolean
  mapsOpen: boolean
  chatOpen: boolean
  onCharts: () => void
  onMaps: () => void
  onChat: () => void
}) {
  const btn = 'inline-flex items-center justify-center h-8 w-8 border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-sky-500 hover:bg-[var(--inp-bg)] transition-colors'
  const active = 'text-sky-500 bg-[var(--inp-bg)]'
  const tip = 'absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-1 rounded bg-[var(--txt)] text-[var(--bg)] text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50'

  return (
    <div className="hidden sm:flex items-center shrink-0">
      <div className="inline-flex -space-x-px">
        <div className="relative group">
          <Link href={`/launchpad/${prevSlug}`} scroll={false} className={`${btn} rounded-l-full`}><ChevronLeft className="h-4 w-4" /></Link>
          <span className={tip}>Prev</span>
        </div>
        <div className="relative group">
          <button onClick={onCharts} className={`${btn} ${chartsOpen ? active : ''}`}><ChartSpline className="h-4 w-4" /></button>
          <span className={tip}>Charts</span>
        </div>
        <div className="relative group">
          <button onClick={onMaps} className={`${btn} ${mapsOpen ? active : ''}`}><MapPlus className="h-4 w-4" /></button>
          <span className={tip}>Maps</span>
        </div>
        <div className="relative group">
          <button onClick={onChat} className={`${btn} ${chatOpen ? active : ''}`}><MessageCircle className="h-4 w-4" /></button>
          <span className={tip}>Ask ChildcareGPT</span>
        </div>
        <div className="relative group">
          <Link href={`/launchpad/${nextSlug}`} scroll={false} className={`${btn} rounded-r-full`}><ChevronRight className="h-4 w-4" /></Link>
          <span className={tip}>Next</span>
        </div>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */

const DEFAULT_ROWS = 2

export default function DetailSlot({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const facilitySlug = searchParams.get('facility')

  const county = getCountyBySlug(slug)
  if (!county) notFound()

  if (facilitySlug) {
    return (
      <div className="h-full overflow-y-auto no-scrollbar">
        <FacilityView facilitySlug={facilitySlug} countySlug={slug} />
      </div>
    )
  }

  const idx = NY_COUNTIES.findIndex(c => c.slug === slug)
  const total = NY_COUNTIES.length
  const prevSlug = NY_COUNTIES[(idx - 1 + total) % total].slug
  const nextSlug = NY_COUNTIES[(idx + 1) % total].slug

  const [infoExpanded, setInfoExpanded] = useState(false)
  const [chartsOpen, setChartsOpen] = useState(false)
  const [mapsOpen, setMapsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const zipScrollRef = useRef<HTMLDivElement>(null)

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  const profileRows = [
    { label: 'Licensed Providers',   value: String(county.providers),           highlight: false },
    { label: 'Total Licensed Seats', value: fmtNum(county.seats),               highlight: false },
    { label: 'Seats Filled',         value: `${fmtNum(county.filled)} (${Math.round(county.filled / county.seats * 100)}%)`, highlight: false },
    { label: 'Seats Open',           value: fmtNum(county.open),                highlight: true  },
    { label: 'Net Change (+/-)',      value: county.diff >= 0 ? `+${county.diff}` : String(county.diff), highlight: false },
    { label: 'Avg Weekly Cost',       value: `$${county.avgCost}`,              highlight: false },
    { label: 'Avg Waitlist',          value: `${county.waitlistMonths} months`, highlight: false },
    { label: 'Compliance Rate',       value: `${county.compliance}%`,           highlight: false },
  ]

  const visibleRows = infoExpanded ? profileRows : profileRows.slice(0, DEFAULT_ROWS)

  return (
    <>
      <div className="h-full overflow-y-auto no-scrollbar">
        <div className="px-5 py-8">

          {/* ── Header ── */}
          <div className="mb-8 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold text-[var(--txt)]">{county.county} County</h1>
            <ButtonGroup
              prevSlug={prevSlug}
              nextSlug={nextSlug}
              countyName={county.county}
              chartsOpen={chartsOpen}
              mapsOpen={mapsOpen}
              chatOpen={chatOpen}
              onCharts={() => setChartsOpen(v => !v)}
              onMaps={() => setMapsOpen(v => !v)}
              onChat={() => setChatOpen(v => !v)}
            />
          </div>

          {/* ── InfoTableCounty ── */}
          <div className="mb-8">
            <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
              <button
                onClick={() => setInfoExpanded(v => !v)}
                className="flex items-center justify-between w-full px-4 py-3 bg-[var(--surface)] hover:bg-[var(--inp-bg)] transition-colors"
              >
                <span className="text-sm font-semibold text-[var(--txt)]">County Profile</span>
                <ChevronDown className={cn('h-4 w-4 text-[var(--muted)] transition-transform duration-200', infoExpanded && 'rotate-180')} />
              </button>

              {visibleRows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2.5 border-t border-[var(--border)]">
                  <span className="text-sm text-[var(--muted)]">{row.label}</span>
                  <span className={cn('text-sm text-right', row.highlight ? 'font-bold text-sky-500' : 'text-[var(--txt)]')}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CardLandscapeMini carousel ── */}
          <div ref={zipScrollRef} className="overflow-x-auto no-scrollbar">
            <div className="flex gap-3 pb-1">
              {county.zips.map(z => (
                <div key={z.zip}
                  className="shrink-0 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:bg-[var(--inp-bg)] hover:border-transparent transition-all cursor-pointer">
                  <p className="text-base font-bold text-[var(--txt)]">{z.zip}</p>
                  <p className="text-xs font-medium text-[var(--txt2)] mt-0.5">{z.city}</p>
                  <div className="mt-2">
                    <span className="text-xs font-bold text-sky-500">{fmtNum(z.seats)} seats</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <PanelChart open={chartsOpen} onClose={() => setChartsOpen(false)} />
      <PanelMap   open={mapsOpen}   onClose={() => setMapsOpen(false)}   />
      <PanelChat  open={chatOpen}   onClose={() => setChatOpen(false)}   countyName={county.county} />
    </>
  )
}
