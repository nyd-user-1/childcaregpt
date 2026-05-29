'use client'

/* STANDALONE MOCKUP — county detail, parent-first. Warm + clear, in the app shell.
   Hardcoded Suffolk sample data; does not touch the real /county/[slug] route.
   Audience: a parent deciding about care. Arc: cost → help → where. */

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUpRight, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// ── Sample data (Suffolk County, representative) ──────────────────────
const COUNTY    = 'Suffolk'
const PROVIDERS = 278
const SEATS     = 8340
const AGE = [
  { label: 'Infant',     n: 510,  color: '#2f6d6a' },
  { label: 'Toddler',    n: 1160, color: '#5a9b8f' },
  { label: 'Preschool',  n: 4230, color: '#c9a15e' },
  { label: 'School-age', n: 2440, color: '#c08457' },
]
const CENTER = { infant: 385, toddler: 360, preschool: 335 } // weekly, center-based
const FAMILY = { infant: 300, toddler: 285, preschool: 270 } // weekly, family child care
const NY_MEDIAN_INFANT = 330 // weekly
const ZIPS = [
  { zip: '11701', city: 'Copiague',      providers: 42 },
  { zip: '11702', city: 'West Babylon',  providers: 38 },
  { zip: '11703', city: 'North Babylon', providers: 34 },
  { zip: '11704', city: 'West Islip',    providers: 30 },
  { zip: '11746', city: 'Dix Hills',     providers: 26 },
]

type Period = 'weekly' | 'monthly' | 'yearly'
const PERIODS: { key: Period; label: string; suffix: string }[] = [
  { key: 'weekly',  label: 'Weekly',  suffix: '/wk' },
  { key: 'monthly', label: 'Monthly', suffix: '/mo' },
  { key: 'yearly',  label: 'Yearly',  suffix: '/yr' },
]
const convert = (weekly: number, p: Period) =>
  p === 'monthly' ? Math.round(weekly * 52 / 12) : p === 'yearly' ? Math.round(weekly * 52) : weekly
const money = (n: number) => `$${n.toLocaleString()}`

function Eyebrow({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className="mb-9 flex items-baseline gap-3 border-b border-[var(--paper-rule)] pb-4">
      <span className="shrink-0 italic leading-none" style={{ ...SERIF, color: 'var(--paper-accent)', fontSize: '1.5rem', fontWeight: 300 }}>{num}</span>
      <h2 className="text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.3rem, 2.3vw, 1.7rem)', fontWeight: 500, letterSpacing: '-0.01em' }}>{children}</h2>
    </div>
  )
}

export default function CountyDetailMockup() {
  const [period, setPeriod] = useState<Period>('monthly')
  const suffix = PERIODS.find(p => p.key === period)!.suffix
  const pctAbove = Math.round((CENTER.infant - NY_MEDIAN_INFANT) / NY_MEDIAN_INFANT * 100)
  const heroVal = convert(CENTER.infant, period)
  const nyVal = convert(NY_MEDIAN_INFANT, period)
  const scarce = AGE[0].n + AGE[1].n

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-3xl px-6 sm:px-10">

          {/* ── Utility bar ── */}
          <div className="flex items-center justify-between py-6 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
            <Link href="/county" className="inline-flex items-center gap-1.5 hover:text-[var(--paper-text)] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> All counties
            </Link>
            <span className="rounded-full border border-[var(--paper-rule)] px-2.5 py-1 text-[10px]">Mockup</span>
          </div>

          {/* ── Masthead + lede ── */}
          <header className="pt-6 pb-4">
            <p className="paper-rise text-[11px] uppercase tracking-[0.3em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
              County Brief · New York
            </p>
            <h1 className="paper-rise mt-4 leading-[0.98]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2.75rem, 7.5vw, 4.75rem)', fontWeight: 400, letterSpacing: '-0.025em' }}>
              {COUNTY} <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>County.</span>
            </h1>
            <p className="paper-rise mt-7 max-w-[52ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.2rem, 1.9vw, 1.45rem)', lineHeight: 1.58 }}>
              {COUNTY} County has <strong className="font-semibold text-[var(--paper-text)]">{PROVIDERS} licensed providers</strong> with
              about <strong className="font-semibold text-[var(--paper-text)]">{SEATS.toLocaleString()} spots</strong>. Here&rsquo;s
              what care costs, the help you may be owed, and where to start looking.
            </p>
          </header>

          {/* ── I. What it costs ── */}
          <section className="paper-rise pt-16" style={{ animationDelay: '180ms' }}>
            <Eyebrow num="I.">What care costs here</Eyebrow>

            <div className="mb-8 inline-flex rounded-full border border-[var(--paper-rule)] bg-[var(--paper-2)] p-0.5" style={SANS}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.12em] transition-colors ${period === p.key ? 'bg-[var(--paper)] text-[var(--paper-text)] shadow-sm' : 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid gap-x-12 gap-y-8 sm:grid-cols-[1fr_minmax(200px,260px)] sm:items-center">
              <div>
                <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={SANS}>Infant care · center-based</p>
                <p className="mt-2 leading-[0.9] tabular-nums text-[var(--paper-accent)]" style={{ ...SERIF, fontSize: 'clamp(2.75rem, 7vw, 4.25rem)', fontWeight: 500, letterSpacing: '-0.03em' }}>
                  {money(heroVal)}<span className="italic text-[var(--paper-faint)]" style={{ fontSize: '0.32em' }}> {suffix}</span>
                </p>
              </div>
              <div className="space-y-3.5" style={SANS}>
                <div>
                  <div className="mb-1.5 flex justify-between text-[10.5px] uppercase tracking-[0.14em]">
                    <span className="text-[var(--paper-text)]">{COUNTY}</span>
                    <span className="tabular-nums text-[var(--paper-muted)]">{money(heroVal)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--paper-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '100%', background: 'var(--paper-accent)' }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-[10.5px] uppercase tracking-[0.14em]">
                    <span className="text-[var(--paper-muted)]">NY median</span>
                    <span className="tabular-nums text-[var(--paper-faint)]">{money(nyVal)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--paper-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(NY_MEDIAN_INFANT / CENTER.infant * 100)}%`, background: 'var(--paper-faint)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* three age columns — hairline-separated, on paper (no slab) */}
            <div className="mt-12 grid grid-cols-1 divide-y divide-[var(--paper-rule-soft)] sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
              {([['Infant', CENTER.infant, FAMILY.infant], ['Toddler', CENTER.toddler, FAMILY.toddler], ['Preschool', CENTER.preschool, FAMILY.preschool]] as const).map(([label, center, family], i) => (
                <div key={label} className={`py-5 ${i === 0 ? 'sm:pr-7' : i === 1 ? 'sm:px-7' : 'sm:pl-7'}`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={SANS}>{label}</p>
                  <p className="mt-2 tabular-nums text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.85rem', fontWeight: 500, letterSpacing: '-0.02em' }}>
                    {money(convert(center, period))}<span className="italic text-[var(--paper-faint)] text-[0.5em]"> {suffix}</span>
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-[var(--paper-muted)]" style={SANS}>Family care {money(convert(family, period))}{suffix}</p>
                </div>
              ))}
            </div>

            {/* reassurance bridge — relief arrives immediately */}
            <a href="#help" className="group/bridge mt-10 flex items-center gap-2 text-[15px] text-[var(--paper-muted)] hover:text-[var(--paper-text)] transition-colors" style={SERIF}>
              <span>But most {COUNTY} families don&rsquo;t pay the full amount.</span>
              <ArrowDown className="h-4 w-4 text-[var(--paper-accent)] transition-transform group-hover/bridge:translate-y-0.5" />
            </a>
          </section>

          {/* ── II. Help paying for it ── */}
          <section id="help" className="paper-rise scroll-mt-6 pt-16" style={{ animationDelay: '240ms' }}>
            <Eyebrow num="II.">Help paying for it</Eyebrow>
            <div className="rounded-2xl border border-[rgba(47,109,106,0.25)] p-7 sm:p-9" style={{ background: 'var(--paper-accent-soft)' }}>
              <p className="max-w-[46ch] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 'clamp(1.25rem, 2.1vw, 1.55rem)', lineHeight: 1.5, fontWeight: 400 }}>
                {`Most ${COUNTY} families don’t pay full price. The `}
                <span className="italic" style={{ color: 'var(--paper-accent)' }}>Child Care Assistance Program</span>
                {' can cover most of the cost — sometimes all of it — for families who qualify.'}
              </p>
              <Link href="/eligibility"
                className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90"
                style={{ ...SANS, background: 'var(--paper-accent)' }}>
                Check if you qualify <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3.5 text-[12px] text-[var(--paper-muted)]" style={SANS}>About 2 minutes · no account, nothing saved</p>
            </div>
          </section>

          {/* ── III. Where to look ── */}
          <section className="paper-rise pt-16 pb-4" style={{ animationDelay: '300ms' }}>
            <Eyebrow num="III.">Where to start looking</Eyebrow>

            <div className="flex flex-wrap gap-y-6">
              {[['Licensed providers', PROVIDERS.toLocaleString()], ['Total spots', SEATS.toLocaleString()]].map(([label, val], i) => (
                <div key={label} className={`flex-1 min-w-[160px] ${i > 0 ? 'sm:border-l sm:border-[var(--paper-rule)] sm:pl-8' : ''}`}>
                  <p className="tabular-nums leading-none text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '2.75rem', fontWeight: 500, letterSpacing: '-0.02em' }}>{val}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}>{label}</p>
                </div>
              ))}
            </div>

            {/* age availability — framed for a parent, not an analyst */}
            <div className="mt-12">
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {AGE.map(a => <div key={a.label} style={{ width: `${(a.n / SEATS) * 100}%`, background: a.color }} title={`${a.label}: ${a.n}`} />)}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2" style={SANS}>
                {AGE.map(a => (
                  <div key={a.label} className="flex items-center gap-1.5 text-[12.5px]">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: a.color }} />
                    <span className="text-[var(--paper-text)]">{a.label}</span>
                    <span className="tabular-nums text-[var(--paper-faint)]">{a.n.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 max-w-[52ch] text-[14.5px] text-[var(--paper-muted)]" style={SERIF}>
                Infant and toddler spots are the scarcest — only about {scarce.toLocaleString()} of {SEATS.toLocaleString()}. If your child is under three, start your search early.
              </p>
            </div>

            {/* ZIP ranked list */}
            <div className="mt-12">
              <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={SANS}>Towns with the most providers</p>
              {ZIPS.map((z, i) => (
                <Link key={z.zip} href={`/zip/${z.zip}`}
                  className="group/zip -mx-3 flex items-baseline gap-4 rounded-lg border-t border-[var(--paper-rule-soft)] px-3 py-4 transition-colors hover:bg-[var(--paper-2)]">
                  <span className="w-7 shrink-0 italic tabular-nums text-[var(--paper-faint)]" style={{ ...SERIF, fontSize: '1.1rem' }}>{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.2rem', fontWeight: 500 }}>{z.city}</p>
                    <p className="text-[12px] tabular-nums text-[var(--paper-faint)]" style={SANS}>{z.zip}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-[14px] font-medium text-[var(--paper-accent)]" style={SANS}>{z.providers} providers</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--paper-faint)] opacity-0 transition-opacity group-hover/zip:opacity-100" />
                </Link>
              ))}
            </div>
          </section>

          {/* ── Ask + colophon ── */}
          <section className="paper-rise pt-14 pb-24" style={{ animationDelay: '360ms' }}>
            <Link href="/" className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.14em] text-[var(--paper-accent)] hover:underline underline-offset-4" style={SANS}>
              <Sparkles className="h-4 w-4" /> Ask ChildcareGPT about {COUNTY}
            </Link>
            <p className="mt-7 max-w-[60ch] border-t border-[var(--paper-rule)] pt-6 text-[12.5px] leading-[1.75] text-[var(--paper-faint)]" style={{ ...SERIF, fontStyle: 'italic' }}>
              Provider counts from New York OCFS; costs from the U.S. Department of Labor&rsquo;s National
              Database of Childcare Prices (2022 medians). Costs are typical figures, not quotes, and a
              spot count is a licensed maximum, not a promise of an opening. For an official assistance
              decision, contact your local Department of Social Services.
            </p>
          </section>

        </div>
      </div>
    </AppLayout>
  )
}
