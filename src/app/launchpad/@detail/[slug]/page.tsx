'use client'

import { use, useState, useRef } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getCountyBySlug, NY_COUNTIES } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'

const DEFAULT_ROWS = 2

export default function DetailSlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const county = getCountyBySlug(slug)
  if (!county) notFound()

  const router = useRouter()
  const [infoExpanded, setInfoExpanded] = useState(false)
  const zipRef = useRef<HTMLDivElement>(null)

  const idx   = NY_COUNTIES.findIndex(c => c.slug === slug)
  const total = NY_COUNTIES.length
  const prevSlug = NY_COUNTIES[(idx - 1 + total) % total].slug
  const nextSlug = NY_COUNTIES[(idx + 1) % total].slug

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  const profileRows = [
    { label: 'Licensed Providers',   value: String(county.providers),  highlight: false },
    { label: 'Total Licensed Seats', value: fmtNum(county.seats),      highlight: false },
    { label: 'Seats Filled',         value: `${fmtNum(county.filled)} (${Math.round(county.filled / county.seats * 100)}%)`, highlight: false },
    { label: 'Seats Open',           value: fmtNum(county.open),       highlight: true  },
    { label: 'Net Change (+/-)',      value: county.diff >= 0 ? `+${county.diff}` : String(county.diff), highlight: false },
    { label: 'Avg Weekly Cost',      value: `$${county.avgCost}`,      highlight: false },
    { label: 'Avg Waitlist',         value: `${county.waitlistMonths} months`, highlight: false },
    { label: 'Compliance Rate',      value: `${county.compliance}%`,   highlight: false },
  ]

  const visibleRows = infoExpanded ? profileRows : profileRows.slice(0, DEFAULT_ROWS)

  return (
    <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-y-auto no-scrollbar">
      <div className="px-4 py-4 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/launchpad/${prevSlug}`, { scroll: false })}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--txt)] hover:bg-[var(--inp-bg)] transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <h3 className="text-base font-bold text-[var(--txt)]">{county.county} County</h3>
            <button onClick={() => router.push(`/launchpad/${nextSlug}`, { scroll: false })}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--txt)] hover:bg-[var(--inp-bg)] transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={() => router.push('/launchpad', { scroll: false })}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--txt)] hover:bg-[var(--inp-bg)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* InfoTableCounty */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
          <button onClick={() => setInfoExpanded(v => !v)}
            className="flex items-center justify-between w-full px-4 py-3 bg-[var(--surface)] hover:bg-[var(--inp-bg)] transition-colors">
            <span className="text-sm font-semibold text-[var(--txt)]">County Profile</span>
            <ChevronDown className={cn('h-4 w-4 text-[var(--muted)] transition-transform duration-200', infoExpanded && 'rotate-180')} />
          </button>
          {visibleRows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--muted)]">{row.label}</span>
              <span className={cn('text-xs text-right', row.highlight ? 'font-bold text-sky-500' : 'text-[var(--txt)]')}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* ZIP Codes */}
        <div>
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">ZIP Codes</p>
          <div ref={zipRef} className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 pb-1">
              {county.zips.map(z => (
                <div key={z.zip} className="shrink-0 w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 hover:bg-[var(--inp-bg)] cursor-pointer transition-all">
                  <p className="text-sm font-bold text-[var(--txt)]">{z.zip}</p>
                  <p className="text-[10px] text-[var(--txt2)] mt-0.5">{z.city}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-[var(--muted)]">{z.providers} prov.</span>
                    <span className="text-[10px] font-bold text-sky-500">{fmtNum(z.seats)} seats</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
