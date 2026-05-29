'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight, Phone, Mail, MapPin, ArrowRight, Building2 } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import type { DistrictDetail } from '@/lib/district-data'

// Client-only: pulls Google Maps + district GeoJSON, so keep it out of SSR.
const DistrictMiniMap = dynamic(() => import('@/components/DistrictMiniMap'), { ssr: false })

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

function telHref(raw: string): string {
  const d = raw.replace(/\D/g, '')
  return `tel:+1${d.replace(/^1/, '')}`
}
function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return raw
}
function fmtNum(n: number) {
  return n.toLocaleString()
}

// Republican / Democrat get a faint party tint; everything else stays neutral.
function partyTint(party: string | null): string {
  if (!party) return 'var(--paper-faint)'
  const p = party.toLowerCase()
  if (p.includes('republican')) return '#a8443b'
  if (p.includes('democrat')) return '#2f5d8a'
  return 'var(--paper-accent)'
}

export function DistrictShell({
  detail,
  prevDistrict,
  nextDistrict,
}: {
  detail: DistrictDetail
  prevDistrict: number
  nextDistrict: number
}) {
  const { chamber, district, name, party, phone, dist_phone, email, address, address2, city, state, zip } = detail
  const chamberLabel = chamber === 'senate' ? 'Senate' : 'Assembly'
  const repTitle = chamber === 'senate' ? 'State Senator' : 'Assemblymember'
  const repName = name?.trim() || `${chamberLabel} District ${district}`

  const officeLine = [address, address2].filter(Boolean).join(', ')
  // "Riverhead, NY 11901" — comma after city, space before zip.
  const cityLine = [[city, state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ')

  // A parent isn't writing a policy brief — give them a warm, ready-to-send note.
  const emailSubject = 'Child care in our district'
  const emailBody = `Dear ${repTitle} ${name ?? ''},\n\nI'm a constituent in ${chamberLabel} District ${district}. Affordable, accessible child care matters to my family, and I'd like to know what you're doing to support it.\n\nThank you for your time.`
  const mailtoHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : null

  const roundBtn = 'inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors'

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-10 sm:pt-14 pb-16">

          {/* ── Masthead ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
                ChildcareGPT · {chamberLabel} District {district}
              </p>
              <h1 className="paper-rise mt-3 leading-[1.04]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 4.6vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                {repName}
              </h1>
              <p className="paper-rise mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px]" style={{ ...SANS, animationDelay: '90ms' }}>
                <span className="text-[var(--paper-muted)]">{repTitle}</span>
                {party && (
                  <>
                    <span className="text-[var(--paper-faint)]">·</span>
                    <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: partyTint(party) }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: partyTint(party) }} />
                      {party}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <Link href={`/district/${chamber}/${prevDistrict}`} aria-label="Previous district" className={roundBtn}><ChevronLeft className="h-4 w-4" /></Link>
              <Link href={`/district/${chamber}/${nextDistrict}`} aria-label="Next district" className={roundBtn}><ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* ── Why this matters ── */}
          <p className="paper-rise mt-7 max-w-[56ch] text-[var(--paper-text)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.2rem, 2.3vw, 1.5rem)', lineHeight: 1.5 }}>
            This is the person who represents your family in Albany. There{' '}
            {detail.provider_count === 1 ? 'is' : 'are'}{' '}
            <strong style={{ fontWeight: 600, color: 'var(--paper-accent)' }}>{fmtNum(detail.provider_count)}</strong>{' '}
            licensed child care {detail.provider_count === 1 ? 'provider' : 'providers'} in this district — if access or cost is a struggle, they should hear about it.
          </p>

          {/* ── District map ── */}
          <div className="paper-rise mt-9" style={{ animationDelay: '150ms' }}>
            <DistrictMiniMap chamber={chamber} district={district} />
            <p className="mt-2 text-[11px] text-[var(--paper-faint)]" style={SANS}>
              {chamberLabel} District {district} · boundary from the NYS Legislature
            </p>
          </div>

          {/* ── Contact card ── */}
          <div className="paper-rise mt-9 rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-6 sm:p-7" style={{ animationDelay: '180ms' }}>
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
              Reach your representative
            </p>

            <div className="flex flex-col gap-3">
              {dist_phone && (
                <a href={telHref(dist_phone)} className="group/r flex items-center gap-3 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 transition-colors hover:border-[var(--paper-accent)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-wide text-[var(--paper-faint)]" style={SANS}>District office</span>
                    <span className="block text-[15.5px] font-medium text-[var(--paper-text)]" style={SANS}>{fmtPhone(dist_phone)}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-[var(--paper-faint)] transition-transform group-hover/r:translate-x-0.5" />
                </a>
              )}

              {phone && phone !== dist_phone && (
                <a href={telHref(phone)} className="group/r flex items-center gap-3 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 transition-colors hover:border-[var(--paper-accent)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-wide text-[var(--paper-faint)]" style={SANS}>Albany office</span>
                    <span className="block text-[15.5px] font-medium text-[var(--paper-text)]" style={SANS}>{fmtPhone(phone)}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-[var(--paper-faint)] transition-transform group-hover/r:translate-x-0.5" />
                </a>
              )}

              {mailtoHref && (
                <a href={mailtoHref} className="group/r flex items-center gap-3 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] px-4 py-3 transition-colors hover:border-[var(--paper-accent)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-wide text-[var(--paper-faint)]" style={SANS}>Email — opens a ready-to-send note</span>
                    <span className="block truncate text-[15.5px] font-medium text-[var(--paper-text)]" style={SANS}>{email}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-[var(--paper-faint)] transition-transform group-hover/r:translate-x-0.5" />
                </a>
              )}
            </div>

            {officeLine && (
              <div className="mt-4 flex items-start gap-2.5 border-t border-[var(--paper-rule-soft)] pt-4 text-[13.5px] text-[var(--paper-muted)]" style={SANS}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--paper-faint)]" />
                <span>
                  {officeLine}{cityLine && <>, {cityLine}</>}
                </span>
              </div>
            )}
          </div>

          {/* ── Find care (chat route) ── */}
          <Link
            href={`/?q=${encodeURIComponent(`What licensed child care is in NY ${chamberLabel} District ${district}?`)}`}
            className="paper-rise group/c mt-5 flex items-center gap-4 rounded-2xl border border-[var(--paper-accent)] p-5 transition-colors"
            style={{ background: 'var(--paper-accent-soft)', animationDelay: '240ms' }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent)', color: '#fff' }}>
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] text-[var(--paper-text)]" style={{ ...SERIF, fontWeight: 500 }}>Find child care near you</span>
              <span className="block text-[13.5px] leading-[1.55] text-[var(--paper-muted)]" style={SANS}>See licensed providers in this district and what care costs.</span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 transition-transform group-hover/c:translate-x-0.5" style={{ color: 'var(--paper-accent)' }} />
          </Link>

          {/* ── Provenance ── */}
          <p className="paper-rise mt-8 text-[11px] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '300ms' }}>
            Representative contact information from the New York State {chamberLabel}. Provider counts from NY OCFS, matched to district boundaries.
          </p>

        </div>
      </div>
    </AppLayout>
  )
}
