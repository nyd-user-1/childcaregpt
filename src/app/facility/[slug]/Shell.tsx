'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight, MessageCircle, Phone, ArrowRight, Sparkles, MapPin } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'

const ChildcareDotMap = dynamic(() => import('@/components/ChildcareDotMap'), { ssr: false })

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const PROGRAM_TYPE_CFG: Record<string, { label: string; color: string }> = {
  DCC:  { label: 'Day Care Center',         color: '#3f6184' },
  FDC:  { label: 'Family Day Care',         color: '#b5734e' },
  GFDC: { label: 'Group Family Day Care',   color: '#2f6d6a' },
  SACC: { label: 'School-Age Child Care',   color: '#c9a15e' },
  SDCC: { label: 'Small Day Care Center',   color: '#8a6d9c' },
}

function toMonthly(weekly: number | null | undefined): number | null {
  const w = Number(weekly)
  return Number.isFinite(w) && w > 0 ? Math.round((w * 52) / 12) : null
}
function money(n: number | null): string {
  return n == null ? '—' : `$${n.toLocaleString()}`
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isFinite(dt.getTime())
    ? dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'
}
function yearOf(d: string | null): number | null {
  if (!d) return null
  const y = new Date(d).getFullYear()
  return Number.isFinite(y) && y > 1950 ? y : null
}
function fmtPhone(p: string | null): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  return d.length === 10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : p
}
function fmtNum(n: number): string {
  return n.toLocaleString()
}

export type FacilityData = {
  facility_id: number
  facility_name: string
  program_type: string
  county: string
  facility_status: string
  provider_name: string | null
  street_number: string | null
  street_name: string | null
  city: string
  zip_code: string
  phone_number: string | null
  total_capacity: number
  infant_capacity: number
  toddler_capacity: number
  preschool_capacity: number
  school_age_capacity: number
  facility_opened_date: string | null
  license_issue_date: string | null
  license_expiration_date: string | null
}

export type CountyCostShare = {
  mcinfant: number | null
  mfccinfant: number | null
} | null

export type SiblingFacility = {
  facility_id: number
  facility_name: string
  program_type: string
  total_capacity: number
  city: string
  slug: string
}

const AGE_COLS: { key: keyof FacilityData; label: string }[] = [
  { key: 'infant_capacity',     label: 'Infants'     },
  { key: 'toddler_capacity',    label: 'Toddlers'    },
  { key: 'preschool_capacity',  label: 'Preschool'   },
  { key: 'school_age_capacity', label: 'School-age'  },
]

export function FacilityShell({
  facility,
  countyCosts,
  prevSlug,
  nextSlug,
  countyFacilities,
}: {
  facility: FacilityData
  countyCosts: CountyCostShare
  prevSlug: string
  nextSlug: string
  countyFacilities: SiblingFacility[]
}) {
  const cfg = PROGRAM_TYPE_CFG[facility.program_type] ?? { label: facility.program_type, color: 'var(--paper-accent)' }
  const fullName = facility.facility_name.replace(/^"|"$/g, '')
  const street = [facility.street_number, facility.street_name].filter(Boolean).join(' ').trim()
  const addressLine2 = `${facility.city}, NY ${facility.zip_code}`
  const sinceYear = yearOf(facility.license_issue_date) ?? yearOf(facility.facility_opened_date)

  const centerInfant = toMonthly(countyCosts?.mcinfant)
  const familyInfant = toMonthly(countyCosts?.mfccinfant)
  const hasCost = centerInfant != null || familyInfant != null
  // For family-based programs, the family-care cost is the more honest comparator.
  const homeBased = ['FDC', 'GFDC', 'SDCC'].includes(facility.program_type)

  const askHref = `/?q=${encodeURIComponent(`Tell me about ${fullName} in ${facility.city}`)}`
  // Scope the map to the ZIP — tight enough to be useful, with enough siblings to compare.
  const mapUrl = `/api/facilities-dot-map?zip=${encodeURIComponent(facility.zip_code)}`
  const phoneHref = facility.phone_number ? `tel:${facility.phone_number.replace(/\D/g, '')}` : null
  const citySlug = facility.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const countySlug = facility.county.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const roundBtn = 'inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors'

  const snapshotRows: { label: string; value: string }[] = []
  if (facility.provider_name)            snapshotRows.push({ label: 'Provider',          value: facility.provider_name })
  snapshotRows.push({ label: 'Program type',       value: cfg.label })
  snapshotRows.push({ label: 'Status',             value: facility.facility_status })
  if (facility.total_capacity > 0)       snapshotRows.push({ label: 'Total capacity',     value: fmtNum(facility.total_capacity) })
  snapshotRows.push({ label: 'License issued',     value: fmtDate(facility.license_issue_date) })
  snapshotRows.push({ label: 'License expires',    value: fmtDate(facility.license_expiration_date) })
  if (facility.facility_opened_date)     snapshotRows.push({ label: 'Facility opened',    value: fmtDate(facility.facility_opened_date) })

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-5 sm:pt-14 pb-16">

          {/* ── Masthead ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="paper-rise text-[11px] uppercase tracking-[0.28em]" style={{ ...SANS, color: cfg.color, fontWeight: 600, animationDelay: '0ms' }}>
                ChildcareGPT · {cfg.label}
              </p>
              <h1 className="paper-rise mt-3 leading-[1.04]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(1.7rem, 4.4vw, 2.8rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                {fullName}<span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>.</span>
              </h1>
              <p className="paper-rise mt-2 flex items-center gap-1.5 text-[13.5px] text-[var(--paper-muted)]" style={{ ...SANS, animationDelay: '90ms' }}>
                <MapPin className="h-3.5 w-3.5 text-[var(--paper-faint)]" />
                {[street, addressLine2].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <Link href={`/facility/${prevSlug}`} aria-label="Previous provider" className={roundBtn}><ChevronLeft className="h-4 w-4" /></Link>
              <Link href={`/facility/${nextSlug}`} aria-label="Next provider" className={roundBtn}><ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* ── The answer: capacity + inherited county cost ── */}
          <p className="paper-rise mt-5 sm:mt-7 max-w-[54ch] text-[var(--paper-text)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.25rem, 2.4vw, 1.6rem)', lineHeight: 1.5 }}>
            {fullName} is a{cfg.label[0].match(/[aeiou]/i) ? 'n' : ''}{' '}
            <strong style={{ fontWeight: 600, color: cfg.color }}>{cfg.label}</strong>
            {facility.total_capacity > 0 && <> with capacity for <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{fmtNum(facility.total_capacity)} children</strong></>}
            {' '}in {facility.city}.
            {hasCost && (
              <span className="max-sm:hidden">
                {' '}In {facility.county} County, infant care typically runs{' '}
                <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>
                  {money(homeBased ? familyInfant ?? centerInfant : centerInfant ?? familyInfant)}/month
                </strong>.
              </span>
            )}
          </p>

          {/* ── Capacity by age ── */}
          {facility.total_capacity > 0 && (
            <div className="paper-rise mt-6 sm:mt-9" style={{ animationDelay: '180ms' }}>
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
                Capacity by age
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {AGE_COLS.map(c => {
                  const n = Number(facility[c.key] ?? 0)
                  const muted = n === 0
                  return (
                    <div key={c.key} className="rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-5 py-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--paper-faint)]" style={SANS}>{c.label}</p>
                      <p className="mt-2 leading-none" style={{ ...SERIF, fontSize: '1.75rem', fontWeight: 500, color: muted ? 'var(--paper-faint)' : 'var(--paper-text)' }}>
                        {n > 0 ? fmtNum(n) : '—'}
                      </p>
                      <p className="mt-1.5 text-[12px] text-[var(--paper-muted)]" style={SANS}>{n === 1 ? 'seat' : 'seats'}</p>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] text-[var(--paper-faint)]" style={SANS}>
                Licensed capacity, not current openings — always call to confirm availability.
              </p>
            </div>
          )}

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

          {/* ── Contact / Ask ── */}
          <div className="paper-rise mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ animationDelay: '300ms' }}>
            {phoneHref ? (
              <a href={phoneHref} className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                  <Phone className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Call {fullName}</h3>
                <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>
                  {fmtPhone(facility.phone_number)}
                  {sinceYear && <> · Open since {sinceYear}</>}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                  Tap to call <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
                </span>
              </a>
            ) : (
              <div className="rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                  <Phone className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Phone not on file</h3>
                <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>
                  Try the OCFS provider profile, or use the chat to ask about contact.
                </p>
              </div>
            )}
            <Link href={askHref} className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                <MessageCircle className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Ask about this provider</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Hours, openings, age fit — answered in plain language.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                Start a chat <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* ── Map: this ZIP ── */}
          <div className="paper-rise mt-11" style={{ animationDelay: '360ms' }}>
            <h2 className="border-b border-[var(--paper-rule)] pb-3 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>
              Providers near {facility.zip_code}
            </h2>
            <div className="mt-4 h-[380px] rounded-2xl border border-[var(--paper-rule)] overflow-hidden" style={{ background: 'var(--paper-2)' }}>
              <ChildcareDotMap key={mapUrl} apiUrl={mapUrl} fitToData countLabel="providers" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]" style={SANS}>
              <Link href={`/city/${citySlug}`} className="rounded-full border border-[var(--paper-rule)] px-3 py-1 text-[var(--paper-muted)] hover:border-[var(--paper-accent)] hover:text-[var(--paper-accent)] transition-colors">
                More in {facility.city}
              </Link>
              <Link href={`/county/${countySlug}`} className="rounded-full border border-[var(--paper-rule)] px-3 py-1 text-[var(--paper-muted)] hover:border-[var(--paper-accent)] hover:text-[var(--paper-accent)] transition-colors">
                {facility.county} County profile
              </Link>
              <Link href={`/zip/${facility.zip_code}`} className="rounded-full border border-[var(--paper-rule)] px-3 py-1 text-[var(--paper-muted)] hover:border-[var(--paper-accent)] hover:text-[var(--paper-accent)] transition-colors">
                ZIP {facility.zip_code} profile
              </Link>
            </div>
          </div>

          {/* ── Other providers in this county ── */}
          {countyFacilities.length > 0 && (
            <div className="paper-rise mt-11" style={{ animationDelay: '420ms' }}>
              <h2 className="border-b border-[var(--paper-rule)] pb-3 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>
                Other providers in {facility.county} County
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {countyFacilities.slice(0, 6).map(f => {
                  const sib = PROGRAM_TYPE_CFG[f.program_type] ?? { label: f.program_type, color: 'var(--paper-accent)' }
                  return (
                    <Link key={f.facility_id} href={`/facility/${f.slug}`}
                      className="group/s relative rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-5 py-4 pl-6 transition-colors hover:border-[var(--paper-accent)]">
                      <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: sib.color }} />
                      <p className="text-[10.5px] uppercase tracking-[0.16em]" style={{ ...SANS, color: sib.color, fontWeight: 600 }}>{f.program_type}</p>
                      <p className="mt-1.5 truncate text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>{f.facility_name.replace(/^"|"$/g, '')}</p>
                      <p className="mt-0.5 text-[12.5px] text-[var(--paper-muted)]" style={SANS}>
                        {f.city}{f.total_capacity > 0 && <> · {fmtNum(f.total_capacity)} seats</>}
                      </p>
                    </Link>
                  )
                })}
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
                  <dd className="shrink-0 text-right text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.1rem', fontWeight: 500 }}>{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-[11px] leading-relaxed text-[var(--paper-faint)]" style={SANS}>
              Sources: NY OCFS licensed-provider data{hasCost && <> · U.S. Dept. of Labor (county cost, 2022)</>}.
            </p>
          </section>

        </div>
      </div>
    </AppLayout>
  )
}
