'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight, MessageCircle, MapPin, ArrowRight, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'

const ChildcareDotMap = dynamic(() => import('@/components/ChildcareDotMap'), { ssr: false })

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// DOL prices are weekly medians — convert to a monthly figure parents budget against.
function toMonthly(weekly: number | null | undefined): number | null {
  const w = Number(weekly)
  return Number.isFinite(w) && w > 0 ? Math.round((w * 52) / 12) : null
}
function money(n: number | null): string {
  return n == null ? '—' : `$${n.toLocaleString()}`
}
function fmtNum(n: number): string {
  return n.toLocaleString()
}

export type CityStats = {
  city: string
  county: string
  provider_count: number
  total_capacity: number
  infant_capacity: number
  toddler_capacity: number
  preschool_capacity: number
  school_age_capacity: number
}

export type CountyCostShare = {
  mcinfant: number | null      // center, weekly
  mfccinfant: number | null    // family, weekly
} | null

export type ZipEntry = {
  zip_code: string
  providers: number
  seats: number
}

// Shared program-type vocabulary — same colors as the dot map and launchpad table.
const TYPE_COLS: { key: 'DCC' | 'FDC' | 'GFDC' | 'SACC' | 'SDCC'; label: string; color: string }[] = [
  { key: 'DCC',  label: 'Day Care',         color: '#3f6184' },
  { key: 'FDC',  label: 'Family Day Care',  color: '#b5734e' },
  { key: 'GFDC', label: 'Group Family',     color: '#2f6d6a' },
  { key: 'SACC', label: 'School-Age',       color: '#c9a15e' },
  { key: 'SDCC', label: 'Small Day Care',   color: '#8a6d9c' },
]

export function CityShell({
  stats,
  countyCosts,
  typeCounts,
  zips,
  prevSlug,
  nextSlug,
}: {
  stats: CityStats
  countyCosts: CountyCostShare
  typeCounts: Record<string, number>
  zips: ZipEntry[]
  prevSlug: string
  nextSlug: string
}) {
  // Raw city values can be lowercased/uppercased — titlecase for display.
  const city = stats.city.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  const { county, provider_count, total_capacity } = stats

  const centerInfant = toMonthly(countyCosts?.mcinfant)
  const familyInfant = toMonthly(countyCosts?.mfccinfant)
  const hasCost = centerInfant != null || familyInfant != null

  const askHref = `/?q=${encodeURIComponent(`Find licensed child care in ${city}, ${county} County`)}`
  const mapUrl = `/api/facilities-dot-map?city=${encodeURIComponent(city)}`

  const roundBtn = 'inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors'

  const snapshotRows: { label: string; value: string }[] = [
    { label: 'County',                value: `${county} County` },
    { label: 'Licensed providers',    value: fmtNum(provider_count) },
    { label: 'Total licensed seats',  value: fmtNum(total_capacity) },
    { label: 'Infant capacity',       value: fmtNum(stats.infant_capacity) },
    { label: 'Toddler capacity',      value: fmtNum(stats.toddler_capacity) },
    { label: 'Preschool capacity',    value: fmtNum(stats.preschool_capacity) },
    { label: 'School-age capacity',   value: fmtNum(stats.school_age_capacity) },
  ]

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-5 sm:pt-14 pb-16">

          {/* ── Masthead ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
                ChildcareGPT · City
              </p>
              <h1 className="paper-rise mt-3 leading-[1.04]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(1.9rem, 5vw, 3.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                {city}<span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>, NY.</span>
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <Link href={`/city/${prevSlug}`} aria-label="Previous city" className={roundBtn}><ChevronLeft className="h-4 w-4" /></Link>
              <Link href={`/city/${nextSlug}`} aria-label="Next city" className={roundBtn}><ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* ── The answer: providers + inherited county cost ── */}
          <p className="paper-rise mt-5 sm:mt-7 max-w-[54ch] text-[var(--paper-text)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.25rem, 2.4vw, 1.6rem)', lineHeight: 1.5 }}>
            {city} has{' '}
            <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{fmtNum(provider_count)} licensed providers</strong>
            {total_capacity > 0 && <> offering ~<strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{fmtNum(total_capacity)} seats</strong></>}
            {' '}across {county} County.
            {hasCost && (
              <span className="max-sm:hidden">
                {' '}In {county} County, infant care typically runs{' '}
                <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{money(centerInfant)}/month</strong>
                {familyInfant != null && <> at a center, {money(familyInfant)} in family care</>}.
              </span>
            )}
          </p>

          {/* ── Provider mix ── */}
          <div className="paper-rise mt-6 sm:mt-9" style={{ animationDelay: '180ms' }}>
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
              Provider mix
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {TYPE_COLS.map(t => (
                <div key={t.key} className="relative rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-4 py-4 pl-5">
                  <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: t.color }} />
                  <p className="text-[10.5px] uppercase tracking-[0.14em]" style={{ ...SANS, color: t.color, fontWeight: 600 }}>{t.key}</p>
                  <p className="mt-1.5 leading-none text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.5rem', fontWeight: 500 }}>
                    {fmtNum(typeCounts[t.key] ?? 0)}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-[var(--paper-muted)]" style={SANS}>{t.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Help paying ── */}
          <div className="paper-rise mt-9 rounded-2xl border border-[var(--paper-accent)] p-6" style={{ background: 'var(--paper-accent-soft)', animationDelay: '240ms' }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent)', color: '#fff' }}>
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[19px] leading-snug text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>
                  Worried about the cost?
                </h2>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>
                  New York&apos;s Child Care Assistance Program (CCAP) can cover most or all
                  of it for families who qualify. A few quick questions will tell you for sure.
                </p>
                <Link
                  href="/eligibility"
                  className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                  style={{ ...SANS, background: 'var(--paper-accent)' }}
                >
                  Check if you qualify <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Find care ── */}
          <div className="paper-rise mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ animationDelay: '300ms' }}>
            <Link href={askHref} className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                <MessageCircle className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Ask about {city}</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Get providers, costs, and answers in plain language.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                Start a chat <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
              </span>
            </Link>
            <Link href={`/county/${county.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                <MapPin className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>See {county} County</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Typical costs, more cities, and the full county profile.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                Open county page <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* ── Map: providers in this city ── */}
          <div className="paper-rise mt-11" style={{ animationDelay: '360ms' }}>
            <h2 className="border-b border-[var(--paper-rule)] pb-3 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>
              Providers in {city}
            </h2>
            <div className="mt-4 h-[380px] rounded-2xl border border-[var(--paper-rule)] overflow-hidden" style={{ background: 'var(--paper-2)' }}>
              <ChildcareDotMap key={mapUrl} apiUrl={mapUrl} fitToData countLabel="providers" />
            </div>
          </div>

          {/* ── ZIPs in this city ── */}
          {zips.length > 0 && (
            <div className="paper-rise mt-11" style={{ animationDelay: '420ms' }}>
              <h2 className="border-b border-[var(--paper-rule)] pb-3 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>
                ZIPs in {city}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {zips.slice(0, 9).map(z => (
                  <Link key={z.zip_code} href={`/zip/${z.zip_code}`}
                    className="rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-4 py-3 transition-colors hover:border-[var(--paper-accent)]">
                    <p className="tabular-nums text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>{z.zip_code}</p>
                    <p className="mt-1.5 text-[12px] font-medium tabular-nums" style={{ color: 'var(--paper-accent)' }}>{fmtNum(z.providers)} providers</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Snapshot ── */}
          <section className="paper-rise mt-11" style={{ animationDelay: '480ms' }}>
            <h2 className="text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>Snapshot</h2>
            <dl className="mt-5 grid grid-cols-1 gap-x-12 sm:grid-cols-2">
              {snapshotRows.map(r => (
                <div key={r.label} className="flex items-baseline justify-between gap-4 border-t border-[var(--paper-rule-soft)] py-3">
                  <dt className="text-[13.5px] leading-snug text-[var(--paper-muted)]" style={SANS}>{r.label}</dt>
                  <dd className="shrink-0 tabular-nums text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.15rem', fontWeight: 500 }}>{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-[11px] leading-relaxed text-[var(--paper-faint)]" style={SANS}>
              Sources: NY OCFS licensed-provider data {hasCost && <>· U.S. Dept. of Labor (county cost, 2022)</>}.
            </p>
          </section>

        </div>
      </div>
    </AppLayout>
  )
}
