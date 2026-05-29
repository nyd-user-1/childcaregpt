'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, MessageCircle, MapPin, ArrowRight, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const PROGRAM_TYPES: Record<string, string> = {
  DCC:  'Day Care Center',
  FDC:  'Family Day Care',
  GFDC: 'Group Family Day Care',
  SACC: 'School Age Child Care',
  SDCC: 'Small Day Care Center',
}

const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))

export type ZipStats = {
  zip_code: string
  city: string
  county: string
  provider_count: number
  total_capacity: number
  infant_capacity: number
  toddler_capacity: number
  preschool_capacity: number
  school_age_capacity: number
}

export type ZipFacility = {
  facility_id: number
  facility_name: string
  program_type: string
  total_capacity: number
  slug: string
}

export function ZipShell({
  stats,
  facilities,
  familiesPerSeat,
  population,
  childrenUnder6,
  oneParentUnder6,
  birthsPastYear,
  under5PovertyRate,
  prevSlug,
  nextSlug,
}: {
  stats: ZipStats
  facilities: ZipFacility[]
  familiesPerSeat?: number | null
  population?: number | null
  childrenUnder6?: number | null
  oneParentUnder6?: number | null
  birthsPastYear?: number | null
  under5PovertyRate?: number | null
  prevSlug: string
  nextSlug: string
}) {
  const askHref = `/?q=${encodeURIComponent(`Find licensed child care in ${stats.city}, ${stats.zip_code}`)}`
  const roundBtn = 'inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors'

  // Snapshot table rows, ordered people → care → need. ZIP-level Census + OCFS
  // only — cost/income figures are published at county level, not by ZIP.
  const snapshotRows: { label: string; value: string }[] = []
  if (population != null)      snapshotRows.push({ label: 'Population',                   value: population.toLocaleString() })
  if (childrenUnder6 != null)  snapshotRows.push({ label: 'Children under 6',             value: childrenUnder6.toLocaleString() })
  if (birthsPastYear != null)  snapshotRows.push({ label: 'Babies born last year',        value: birthsPastYear.toLocaleString() })
  if (oneParentUnder6 != null) snapshotRows.push({ label: 'Single-parent homes, under 6', value: oneParentUnder6.toLocaleString() })
  snapshotRows.push({ label: 'Licensed providers',  value: stats.provider_count.toLocaleString() })
  snapshotRows.push({ label: 'Total licensed seats', value: stats.total_capacity.toLocaleString() })
  if (under5PovertyRate != null) snapshotRows.push({ label: 'Under-5 poverty rate', value: `${under5PovertyRate.toFixed(1)}%` })

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-10 sm:pt-14 pb-16">

          {/* ── Masthead ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
                ChildcareGPT · ZIP Code
              </p>
              <h1 className="paper-rise mt-3 leading-[1.04]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2.1rem, 5vw, 3.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                <span className="tabular-nums">{stats.zip_code}</span>{' '}
                <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>{stats.city}.</span>
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <Link href={`/zip/${prevSlug}`} aria-label="Previous ZIP code" className={roundBtn}><ChevronLeft className="h-4 w-4" /></Link>
              <Link href={`/zip/${nextSlug}`} aria-label="Next ZIP code" className={roundBtn}><ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* ── The answer: what's here ── */}
          <p className="paper-rise mt-7 max-w-[54ch] text-[var(--paper-text)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.2rem, 2.3vw, 1.55rem)', lineHeight: 1.5 }}>
            ZIP {stats.zip_code} sits in {stats.city}, {stats.county} County — with{' '}
            <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{stats.provider_count} licensed {stats.provider_count === 1 ? 'provider' : 'providers'}</strong>{' '}
            and about <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{stats.total_capacity.toLocaleString()} child care seats</strong>.
          </p>

          {familiesPerSeat != null && (
            <p className="paper-rise mt-3.5 max-w-[54ch] text-[15px] leading-relaxed text-[var(--paper-muted)]" style={{ ...SANS, animationDelay: '150ms' }}>
              That&rsquo;s about{' '}
              <strong className="font-semibold tabular-nums text-[var(--paper-text)]">{familiesPerSeat.toFixed(1)} working families</strong>{' '}
              with a child under 6 for every licensed seat in this ZIP.
            </p>
          )}

          {/* ── Help paying (eligibility route) ── */}
          <div className="paper-rise mt-9 rounded-2xl border border-[var(--paper-accent)] p-6" style={{ background: 'var(--paper-accent-soft)', animationDelay: '180ms' }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent)', color: '#fff' }}>
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[19px] leading-snug text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>
                  Worried about the cost?
                </h2>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>
                  New York’s Child Care Assistance Program (CCAP) can cover most or all
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

          {/* ── Find care (chat + zip map routes) ── */}
          <div className="paper-rise mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ animationDelay: '240ms' }}>
            <Link href={askHref} className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                <MessageCircle className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Ask about {stats.city}</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Get providers, costs, and answers in plain language.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                Start a chat <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
              </span>
            </Link>
            <Link href="/maps/zip-code" className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                <MapPin className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Find care near you</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Map every licensed provider in your neighborhood.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                Open the ZIP map <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* ── Providers in this ZIP ── */}
          {facilities.length > 0 && (
            <div className="paper-rise mt-11" style={{ animationDelay: '300ms' }}>
              <h2 className="border-b border-[var(--paper-rule)] pb-3 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>
                Providers in {stats.zip_code}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {facilities.map(f => (
                  <Link key={f.facility_id} href={`/facility/${f.slug}`}
                    className="rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-4 py-3.5 transition-colors hover:border-[var(--paper-accent)]">
                    <p className="truncate text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.02rem', fontWeight: 500 }}>{f.facility_name}</p>
                    <div className="mt-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[12.5px] text-[var(--paper-muted)]" style={SANS}>{PROGRAM_TYPES[f.program_type] ?? f.program_type}</span>
                      <span className="shrink-0 text-[12.5px] font-medium tabular-nums" style={{ color: 'var(--paper-accent)' }}>{fmtNum(f.total_capacity)} seats</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Snapshot ── */}
          <section className="paper-rise mt-11" style={{ animationDelay: '360ms' }}>
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
              Sources: U.S. Census Bureau (ACS 2022, ZCTA) · NY OCFS licensed-provider data.
            </p>
          </section>

        </div>
      </div>
    </AppLayout>
  )
}
