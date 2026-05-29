'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, MapPin, Users, Phone } from 'lucide-react'
import { AppPanel } from '@/components/AppPanel'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const TYPE_LABELS: Record<string, string> = {
  DCC: 'Day Care Center', FDC: 'Family Day Care', GFDC: 'Group Family Day Care',
  SACC: 'School Age Child Care', SDCC: 'Small Day Care Center',
}

export type PanelFacility = {
  facility_id: string
  facility_name: string
  city: string
  program_type: string
  total_capacity: number
  facility_status: string
  provider_name: string | null
}

type View = { type: 'explainer' } | { type: 'list' } | { type: 'provider'; facility: PanelFacility }

const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-8 pb-2.5">
      <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)]" style={SANS}>{children}</span>
    </div>
  )
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="border-b border-[var(--paper-rule)] px-4 py-2.5">
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)]"
        style={SANS}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
    </div>
  )
}

// ── Explainer view ──────────────────────────────────────────────────
function ExplainerView({ county, count, onViewAll }: { county: string; count: number; onViewAll: () => void }) {
  return (
    <div className="pb-6">
      <div className="px-5 pt-6">
        <p className="text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.3rem', lineHeight: 1.4, fontWeight: 500 }}>
          A map of where child care is hardest to find in New York —{' '}
          <span className="italic" style={{ color: 'var(--paper-accent)' }}>county by county.</span>
        </p>
      </div>

      <SectionLabel>What we compare</SectionLabel>
      <div className="space-y-4 px-5 pt-1">
        <div>
          <p className="text-[14px] font-semibold text-[var(--paper-text)]" style={SANS}>Supply — licensed seats</p>
          <p className="mt-1 text-[14px] leading-[1.6] text-[var(--paper-muted)]" style={SERIF}>
            Every spot across the county&rsquo;s OCFS-regulated providers (real data from the state).
          </p>
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[var(--paper-text)]" style={SANS}>Need — working families with a child under 6</p>
          <p className="mt-1 text-[14px] leading-[1.6] text-[var(--paper-muted)]" style={SERIF}>
            From the U.S. Department of Labor&rsquo;s childcare database (built on Census figures): households
            where all parents work, plus working single mothers — the families most likely to need paid care.
          </p>
        </div>
      </div>

      <SectionLabel>The number</SectionLabel>
      <div className="px-5 pt-1">
        <p className="text-[14px] leading-[1.65] text-[var(--paper-muted)]" style={SERIF}>
          Need divided by supply gives <strong className="font-semibold text-[var(--paper-text)]">families per seat</strong>.
          Herkimer&rsquo;s <strong className="font-semibold text-[var(--paper-accent)]">3.1</strong> means roughly three of those
          families for every licensed seat — among the tightest anywhere. Below 1 (like Jefferson) is comparatively
          well-supplied. The statewide average is about 1.2.
        </p>
      </div>

      <SectionLabel>Honest limits</SectionLabel>
      <ul className="space-y-2.5 px-5 pt-1 text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SERIF}>
        <li>It&rsquo;s a relative index for comparing counties — not an exact shortage count.</li>
        <li>Supply counts seats for all ages, but need is only under-6 — so it&rsquo;s a coverage proxy, generous on the supply side.</li>
        <li>&ldquo;Working families&rdquo; is our plain-English name for those two combined columns.</li>
        <li>A licensed seat is a maximum, not a guaranteed opening — always call to confirm.</li>
      </ul>

      <div className="px-5 pt-7">
        <button onClick={onViewAll}
          className="group/all inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90"
          style={{ ...SANS, background: 'var(--paper-accent)' }}>
          See all {count} providers on the map
          <ArrowRight className="h-4 w-4 transition-transform group-hover/all:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

// ── Provider list view ──────────────────────────────────────────────
function ListView({ facilities, loading, onSelect }: { facilities: PanelFacility[]; loading?: boolean; onSelect: (f: PanelFacility) => void }) {
  if (loading && !facilities.length) return (
    <div className="space-y-2 px-5 py-6">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 rounded bg-[var(--paper-2)] animate-pulse" />)}
    </div>
  )
  if (!facilities.length) return (
    <p className="px-5 py-12 text-center text-sm text-[var(--paper-muted)]" style={{ ...SERIF, fontStyle: 'italic' }}>
      No mapped providers for this view.
    </p>
  )
  return (
    <ol className="flex flex-col">
      <SectionLabel>{facilities.length} providers on the map</SectionLabel>
      {facilities.map((f, i) => (
        <li key={f.facility_id} className={i > 0 ? 'border-t border-[var(--paper-rule-soft)]' : ''}>
          <button onClick={() => onSelect(f)}
            className="group/row flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--paper-2)]">
            <span className="w-5 shrink-0 text-right tabular-nums text-[var(--paper-faint)]" style={{ ...SERIF, fontSize: '0.85rem' }}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1rem', fontWeight: 500 }}>{f.facility_name}</p>
              <p className="mt-0.5 truncate text-[12px] text-[var(--paper-muted)]" style={SANS}>
                {f.city} · {TYPE_LABELS[f.program_type] ?? f.program_type}
              </p>
            </div>
            <span className="shrink-0 tabular-nums text-[13px] text-[var(--paper-accent)]" style={SANS}>{f.total_capacity}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--paper-faint)] transition-colors group-hover/row:text-[var(--paper-text)]" />
          </button>
        </li>
      ))}
    </ol>
  )
}

// ── Provider detail view ────────────────────────────────────────────
type FacilityDetail = {
  address_omitted: boolean | null
  street_number: string | null
  street_name: string | null
  additional_address: string | null
  floor: string | null
  apartment: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  phone_number: string | null
  phone_number_omitted: boolean | null
  phone_extension: string | null
  facility_opened_date: string | null
  license_expiration_date: string | null
}

function fmtZip(z: string | null): string | null {
  if (!z) return null
  const d = z.replace(/\D/g, '')
  if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`
  return d.slice(0, 5) || null
}
function fmtDate(s: string | null): string | null {
  if (!s) return null
  const dt = new Date(s)
  return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
function addressLines(d: FacilityDetail): { street: string; cityLine: string } | null {
  if (d.address_omitted) return null
  const street = [d.street_number, d.street_name].filter(Boolean).join(' ').trim()
  const extras = [d.additional_address, d.floor ? `Fl ${d.floor}` : null, d.apartment ? `Apt ${d.apartment}` : null].filter(Boolean).join(', ')
  const streetFull = [street, extras].filter(Boolean).join(', ')
  const zip = fmtZip(d.zip_code)
  const cityLine = [[d.city, d.state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ')
  if (!streetFull && !d.city) return null
  return { street: streetFull, cityLine }
}
function fmtPhone(d: FacilityDetail): string | null {
  if (d.phone_number_omitted || !d.phone_number) return null
  const base = d.phone_number.replace(')', ') ')
  return d.phone_extension ? `${base} ext. ${d.phone_extension}` : base
}

function SkeletonLines({ n }: { n: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="h-4 rounded bg-[var(--paper-2)] animate-pulse" style={{ width: `${85 - i * 20}%` }} />)}
    </div>
  )
}

function ProviderView({ facility }: { facility: PanelFacility }) {
  const [detail, setDetail] = useState<FacilityDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setDetail(null)
    fetch(`/api/facilities?facility_id=${facility.facility_id}`)
      .then(r => r.json())
      .then(d => { setDetail(d.data?.[0] ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [facility.facility_id])

  const addr   = detail ? addressLines(detail) : null
  const phone  = detail ? fmtPhone(detail) : null
  const licExp = detail ? fmtDate(detail.license_expiration_date) : null
  const opened = detail ? fmtDate(detail.facility_opened_date) : null

  return (
    <div className="pb-6">
      <div className="px-5 pt-6">
        <h3 className="leading-snug text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.4rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
          {facility.facility_name}
        </h3>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-[var(--paper-muted)]" style={SANS}>
          <MapPin className="h-3.5 w-3.5" /> {facility.city} · {TYPE_LABELS[facility.program_type] ?? facility.program_type}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 px-5" style={SANS}>
        <div className="rounded-xl bg-[var(--paper-2)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--paper-faint)]">Capacity</p>
          <p className="mt-1 inline-flex items-center gap-1 tabular-nums text-[1.15rem] font-semibold text-[var(--paper-accent)]">
            <Users className="h-3.5 w-3.5" />{facility.total_capacity}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--paper-2)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--paper-faint)]">Status</p>
          <p className="mt-1 text-[13px] font-medium text-[var(--paper-text)]">{facility.facility_status}</p>
        </div>
        <div className="rounded-xl bg-[var(--paper-2)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--paper-faint)]">Provider</p>
          <p className="mt-1 truncate text-[13px] font-medium text-[var(--paper-text)]">{facility.provider_name ?? '—'}</p>
        </div>
      </div>

      {/* Contact & location */}
      <SectionLabel>Contact &amp; location</SectionLabel>
      <div className="space-y-3.5 px-5 pt-1">
        {loading ? <SkeletonLines n={2} /> : (
          <>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--paper-faint)]" />
              {addr ? (
                <div className="text-[14px] leading-snug" style={SANS}>
                  {addr.street && <p className="text-[var(--paper-text)]">{addr.street}</p>}
                  <p className="text-[var(--paper-muted)]">{addr.cityLine}</p>
                </div>
              ) : (
                <p className="text-[14px] text-[var(--paper-muted)]" style={SANS}>Address not published</p>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-[var(--paper-faint)]" />
              {phone ? (
                <a href={`tel:${detail!.phone_number}`} className="text-[14px] text-[var(--paper-accent)] hover:underline" style={SANS}>{phone}</a>
              ) : (
                <p className="text-[14px] text-[var(--paper-muted)]" style={SANS}>Phone not published</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Licensing */}
      <SectionLabel>Licensing</SectionLabel>
      <dl className="px-5 pt-1 text-[13.5px]" style={SANS}>
        {loading ? <SkeletonLines n={2} /> : (
          <>
            <div className="flex items-baseline justify-between gap-3 border-b border-[var(--paper-rule-soft)] py-2.5">
              <dt className="text-[var(--paper-muted)]">License valid through</dt>
              <dd className="font-medium text-[var(--paper-text)]">{licExp ?? '—'}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-[var(--paper-muted)]">Opened</dt>
              <dd className="font-medium text-[var(--paper-text)]">{opened ?? '—'}</dd>
            </div>
          </>
        )}
      </dl>

      <div className="mt-6 border-t border-[var(--paper-rule)] px-5 pt-6">
        <Link href={`/facility/${toSlug(facility.facility_name)}`}
          className="group/link inline-flex items-center gap-1.5 text-[14px] text-[var(--paper-accent)] transition-opacity hover:opacity-80"
          style={{ ...SERIF, fontStyle: 'italic' }}>
          View full facility page
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────
export function ConsoleExplainerPanel({
  open, onClose, county, facilities, initialView = 'explainer', loading = false,
}: {
  open: boolean
  onClose: () => void
  county: string
  facilities: PanelFacility[]
  initialView?: 'explainer' | 'list'
  loading?: boolean
}) {
  const [stack, setStack] = useState<View[]>([{ type: 'explainer' }])

  useEffect(() => {
    if (open) setStack(initialView === 'list' ? [{ type: 'explainer' }, { type: 'list' }] : [{ type: 'explainer' }])
  }, [open, initialView, county])

  const view = stack[stack.length - 1]
  const push = (v: View) => setStack(s => [...s, v])
  const pop = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s))

  const title =
    view.type === 'explainer' ? 'How this works'
    : view.type === 'list'     ? `${county} County`
    : view.facility.facility_name

  const footerLabel =
    view.type === 'explainer' ? 'Explainer Panel'
    : view.type === 'list'     ? 'All Providers'
    : 'Provider'

  const footer = (
    <div className="px-5 py-3.5" style={{ background: 'var(--paper)' }}>
      <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)]" style={SANS}>{footerLabel}</span>
    </div>
  )

  return (
    <AppPanel open={open} onClose={onClose} title={title} footer={footer}>
      <div className="min-h-full" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        {view.type !== 'explainer' && <BackBar onBack={pop} />}
        {view.type === 'explainer' && <ExplainerView county={county} count={facilities.length} onViewAll={() => push({ type: 'list' })} />}
        {view.type === 'list' && <ListView facilities={facilities} loading={loading} onSelect={f => push({ type: 'provider', facility: f })} />}
        {view.type === 'provider' && <ProviderView facility={view.facility} />}
      </div>
    </AppPanel>
  )
}
