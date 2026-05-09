'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChartSpline, MapPlus, MessageCircle, Map } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { PanelChart } from '@/components/PanelChart'
import { PanelMap } from '@/components/PanelMap'
import { PanelChat } from '@/components/PanelChat'
import { getCountyBySlug, NY_COUNTIES } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'

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
  const btn = 'inline-flex items-center justify-center h-8 w-8 border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--txt)] hover:bg-[var(--inp-bg)] transition-colors'
  const active = 'text-[var(--txt)] bg-[var(--inp-bg)]'

  return (
    <div className="hidden sm:flex items-center shrink-0">
      <div className="inline-flex -space-x-px">
        {/* ButtonPrevious — always active, circular */}
        <Link href={`/counties/${prevSlug}`} className={`${btn} rounded-l-full`}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        {/* ButtonChart */}
        <button onClick={onCharts} className={`${btn} ${chartsOpen ? active : ''}`} title="Charts">
          <ChartSpline className="h-4 w-4" />
        </button>
        {/* ButtonMap */}
        <button onClick={onMaps} className={`${btn} ${mapsOpen ? active : ''}`} title="Maps">
          <MapPlus className="h-4 w-4" />
        </button>
        {/* ButtonChat */}
        <button onClick={onChat} className={`${btn} ${chatOpen ? active : ''}`} title={`Ask about ${countyName}`}>
          <MessageCircle className="h-4 w-4" />
        </button>
        {/* ButtonNext — always active, circular */}
        <Link href={`/counties/${nextSlug}`} className={`${btn} rounded-r-full`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */

const DEFAULT_ROWS = 2

export default function DetailPageCounty({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const county = getCountyBySlug(slug)
  if (!county) notFound()

  const idx = NY_COUNTIES.findIndex(c => c.slug === slug)
  const total = NY_COUNTIES.length
  // Circular navigation — wrap around
  const prevSlug = NY_COUNTIES[(idx - 1 + total) % total].slug
  const nextSlug = NY_COUNTIES[(idx + 1) % total].slug

  const [profileOpen, setProfileOpen] = useState(true)
  const [allRowsShown, setAllRowsShown] = useState(false)
  const [chartsOpen, setChartsOpen] = useState(false)
  const [mapsOpen, setMapsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const zipScrollRef = useRef<HTMLDivElement>(null)

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  const profileRows = [
    { label: 'Licensed Providers',    value: String(county.providers),           highlight: false },
    { label: 'Total Licensed Seats',  value: fmtNum(county.seats),               highlight: false },
    { label: 'Seats Filled',          value: `${fmtNum(county.filled)} (${Math.round(county.filled / county.seats * 100)}%)`, highlight: false },
    { label: 'Seats Open',            value: fmtNum(county.open),                highlight: true  },
    { label: 'Net Change (+/-)',       value: county.diff >= 0 ? `+${county.diff}` : String(county.diff), highlight: false },
    { label: 'Avg Weekly Cost',        value: `$${county.avgCost}`,              highlight: false },
    { label: 'Avg Waitlist',           value: `${county.waitlistMonths} months`, highlight: false },
    { label: 'Compliance Rate',        value: `${county.compliance}%`,           highlight: false },
  ]

  const visibleRows = profileRows.slice(0, allRowsShown ? 999 : DEFAULT_ROWS)

  return (
    <>
      <AppLayout>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="mx-auto max-w-4xl px-5 py-8">

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

            {/* ── Map placeholder ── */}
            <div className="mb-8 h-64 sm:h-96 w-full rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col items-center justify-center gap-3"
              style={{ background: 'linear-gradient(135deg,#e8f4fb 0%,#d0eaf7 100%)' }}>
              <Map className="h-14 w-14 text-[var(--muted)]" />
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--txt2)]">{county.county} County, NY</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">County Map · Coming Soon</p>
              </div>
            </div>

            {/* ── Profiles ── */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--txt)]">Profiles</h2>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--inp-bg)] transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--inp-bg)] transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
                {/* Accordion header */}
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-[var(--surface)] hover:bg-[var(--inp-bg)] transition-colors"
                >
                  <span className="text-sm font-semibold text-[var(--txt)]">County Profile</span>
                  <ChevronDown className={cn('h-4 w-4 text-[var(--muted)] transition-transform duration-200', profileOpen && 'rotate-180')} />
                </button>

                {/* Rows — default 2 visible */}
                {profileOpen && visibleRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2.5 border-t border-[var(--border)]">
                    <span className="text-sm text-[var(--muted)]">{row.label}</span>
                    <span className={cn('text-sm text-right', row.highlight ? 'font-bold text-sky-500' : 'text-[var(--txt)]')}>
                      {row.value}
                    </span>
                  </div>
                ))}

                {/* Expand / collapse trigger */}
                {profileOpen && profileRows.length > DEFAULT_ROWS && (
                  <button
                    onClick={() => setAllRowsShown(v => !v)}
                    className="w-full text-xs text-[var(--muted)] hover:text-[var(--txt)] py-2.5 border-t border-[var(--border)] transition-colors"
                  >
                    {allRowsShown ? 'Show less' : `Show ${profileRows.length - DEFAULT_ROWS} more`}
                  </button>
                )}
              </div>
            </div>

            {/* ── ZIP Codes carousel ── */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--txt)]">ZIP Codes</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => zipScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--inp-bg)] transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => zipScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--inp-bg)] transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div ref={zipScrollRef} className="overflow-x-auto no-scrollbar">
                <div className="flex gap-3 pb-1">
                  {county.zips.map(z => (
                    <div key={z.zip}
                      className="shrink-0 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:bg-[var(--inp-bg)] hover:border-transparent transition-all cursor-pointer">
                      <p className="text-base font-bold text-[var(--txt)]">{z.zip}</p>
                      <p className="text-xs font-medium text-[var(--txt2)] mt-0.5">{z.city}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-[var(--muted)]">{z.providers} providers</span>
                        <span className="text-xs font-bold text-sky-500">{fmtNum(z.seats)} seats</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </AppLayout>

      {/* Panels — portaled into #chat-panel-root, push from right */}
      <PanelChart open={chartsOpen} onClose={() => setChartsOpen(false)} />
      <PanelMap   open={mapsOpen}   onClose={() => setMapsOpen(false)}   />
      <PanelChat  open={chatOpen}   onClose={() => setChatOpen(false)}   countyName={county.county} />
    </>
  )
}
