'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, MessageCircle, MapPin, ArrowRight, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// DOL National Database of Childcare Prices stores WEEKLY medians. Convert to a
// monthly figure parents can budget against — the same math the chat uses, so
// both surfaces give one answer.
function toMonthly(weekly: number | null | undefined): number | null {
  const w = Number(weekly)
  return Number.isFinite(w) && w > 0 ? Math.round((w * 52) / 12) : null
}
function money(n: number | null): string {
  return n == null ? '—' : `$${n.toLocaleString()}`
}
function fmtNum(n: number) {
  return n.toLocaleString()
}

export type CountyStats = {
  county_name: string
  provider_count: number
  total_capacity: number
  infant_capacity: number
  toddler_capacity: number
  preschool_capacity: number
  school_age_capacity: number
}

export type CountyCosts = {
  mcinfant: number | null
  mctoddler: number | null
  mcpreschool: number | null
  mfccinfant: number | null
  mfcctoddler: number | null
  mfccpreschool: number | null
  mhi: number | null
  flfpr_20to64_under6: number | null
  pr_f: number | null
} | null

export type ZipEntry = {
  zip_code: string
  city: string
  providers: number
  seats: number
}

export function CountyShell({
  stats,
  costs,
  zips,
  population,
  childrenUnder6,
  prevSlug,
  nextSlug,
}: {
  stats: CountyStats
  costs: CountyCosts
  zips: ZipEntry[]
  population?: number | null
  childrenUnder6?: number | null
  prevSlug: string
  nextSlug: string
}) {
  const county = stats.county_name

  // Monthly costs (center = day care center, family = family child care).
  const centerInfant = toMonthly(costs?.mcinfant)
  const familyInfant = toMonthly(costs?.mfccinfant)
  const ages = [
    { label: 'Infant',    center: toMonthly(costs?.mcinfant),    family: toMonthly(costs?.mfccinfant) },
    { label: 'Toddler',   center: toMonthly(costs?.mctoddler),   family: toMonthly(costs?.mfcctoddler) },
    { label: 'Preschool', center: toMonthly(costs?.mcpreschool), family: toMonthly(costs?.mfccpreschool) },
  ]
  const hasCost = ages.some(a => a.center != null || a.family != null)

  // Infant care as a share of median household income (weekly median × 52 ÷ MHI).
  const costInfantPct = costs?.mcinfant != null && costs.mhi
    ? Math.round((costs.mcinfant * 52 / costs.mhi) * 100)
    : null

  const askHref = `/?q=${encodeURIComponent(`Find licensed child care in ${county} County`)}`

  const roundBtn = 'inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors'

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-10 sm:pt-14 pb-16">

          {/* ── Masthead ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
                ChildcareGPT · County
              </p>
              <h1 className="paper-rise mt-3 leading-[1.04]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2.1rem, 5vw, 3.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                {county} <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>County.</span>
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <Link href={`/county/${prevSlug}`} aria-label="Previous county" className={roundBtn}><ChevronLeft className="h-4 w-4" /></Link>
              <Link href={`/county/${nextSlug}`} aria-label="Next county" className={roundBtn}><ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* ── The answer: cost ── */}
          {hasCost ? (
            <p className="paper-rise mt-7 max-w-[54ch] text-[var(--paper-text)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.25rem, 2.4vw, 1.6rem)', lineHeight: 1.5 }}>
              In {county} County, infant care typically runs{' '}
              <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{money(centerInfant)}/month</strong>{' '}
              at a day care center{familyInfant != null && <> — or <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{money(familyInfant)}/month</strong> in family child care</>}.
              Care costs less as children get older.
            </p>
          ) : (
            <p className="paper-rise mt-7 max-w-[54ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: '1.2rem', lineHeight: 1.6 }}>
              We don’t have published cost figures for {county} County yet — but you
              can still find licensed providers below.
            </p>
          )}

          {/* ── Cost by age ── */}
          {hasCost && (
            <div className="paper-rise mt-9" style={{ animationDelay: '180ms' }}>
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
                Typical cost per month
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {ages.map(a => (
                  <div key={a.label} className="rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-5 py-4">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--paper-faint)]" style={SANS}>{a.label}</p>
                    <p className="mt-2 leading-none text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.75rem', fontWeight: 500 }}>
                      {a.center != null ? `${money(a.center)}` : '—'}
                    </p>
                    <p className="mt-1.5 text-[12px] text-[var(--paper-muted)]" style={SANS}>
                      center{a.family != null && <> · {money(a.family)} family care</>}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--paper-faint)]" style={SANS}>
                Median prices, U.S. Dept. of Labor (2022), converted to monthly. Costs are an estimate, not a quote — always call to confirm.
              </p>
            </div>
          )}

          {/* ── Help paying (eligibility route) ── */}
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
          <div className="paper-rise mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ animationDelay: '300ms' }}>
            <Link href={askHref} className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                <MessageCircle className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Ask about {county} County</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Get providers, costs, and answers in plain language.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                Start a chat <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
              </span>
            </Link>
            <Link href="/maps/zip-code" className="group/c rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 transition-colors hover:border-[var(--paper-accent)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                <MapPin className="h-4.5 w-4.5" />
              </span>
              <h3 className="mt-4 text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Find care near you</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>Map every licensed provider in your neighborhood.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--paper-accent)' }}>
                Open the ZIP map <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/c:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* ── Where the care is (zips) ── */}
          {zips.length > 0 && (
            <div className="paper-rise mt-11" style={{ animationDelay: '360ms' }}>
              <h2 className="border-b border-[var(--paper-rule)] pb-3 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>
                Where the care is
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {zips.slice(0, 9).map(z => (
                  <Link key={z.zip_code} href={`/zip/${z.zip_code}`}
                    className="rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] px-4 py-3 transition-colors hover:border-[var(--paper-accent)]">
                    <p className="tabular-nums text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>{z.zip_code}</p>
                    <p className="truncate text-[12px] text-[var(--paper-muted)]" style={SANS}>{z.city}</p>
                    <p className="mt-1.5 text-[12px] font-medium tabular-nums" style={{ color: 'var(--paper-accent)' }}>{fmtNum(z.providers)} providers</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Snapshot ── */}
          <section className="paper-rise mt-11" style={{ animationDelay: '420ms' }}>
            <h2 className="border-b border-[var(--paper-rule)] pb-3 text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', fontWeight: 500 }}>Snapshot</h2>
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
              {population != null && <Stat label="Population" value={population.toLocaleString()} />}
              {childrenUnder6 != null && <Stat label="Children under 6" value={childrenUnder6.toLocaleString()} />}
              <Stat label="Licensed providers" value={fmtNum(stats.provider_count)} />
              <Stat label="Total licensed seats" value={fmtNum(stats.total_capacity)} />
              {costs?.mhi != null && <Stat label="Median household income" value={`$${Math.round(costs.mhi).toLocaleString()}`} />}
              {costInfantPct != null && <Stat label="Infant care, % of income" value={`${costInfantPct}%`} />}
              {costs?.flfpr_20to64_under6 != null && <Stat label="Moms working (kids under 6)" value={`${Math.round(costs.flfpr_20to64_under6)}%`} />}
              {costs?.pr_f != null && <Stat label="Female poverty rate" value={`${costs.pr_f.toFixed(1)}%`} />}
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-[var(--paper-faint)]" style={SANS}>
              Sources: U.S. Census Bureau (ACS 2022) · NY OCFS licensed-provider data · U.S. Dept. of Labor.
            </p>
          </section>

        </div>
      </div>
    </AppLayout>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--paper-faint)]" style={SANS}>{label}</p>
      <p className="mt-1 tabular-nums text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.4rem', fontWeight: 500 }}>{value}</p>
    </div>
  )
}
