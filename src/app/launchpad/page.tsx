'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, Info, MapPin } from 'lucide-react'

// Client-only: pulls Google Maps + the dot dataset.
const ChildcareDotMap = dynamic(() => import('@/components/ChildcareDotMap'), { ssr: false })

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Shared program-type vocabulary with the dot map.
const TYPE_CFG: Record<string, { color: string; label: string }> = {
  DCC:  { color: '#3f6184', label: 'Day Care Center' },
  FDC:  { color: '#b5734e', label: 'Family Day Care' },
  GFDC: { color: '#2f6d6a', label: 'Group Family Day Care' },
  SACC: { color: '#c9a15e', label: 'School-Age Child Care' },
  SDCC: { color: '#8a6d9c', label: 'Small Day Care Center' },
}
const TYPE_TABS = ['DCC', 'FDC', 'GFDC', 'SACC', 'SDCC'] as const

const GEO_TABS = [
  { key: 'district', label: 'District', unit: 'District' },
  { key: 'county',   label: 'County',   unit: 'County' },
  { key: 'city',     label: 'City',     unit: 'City' },
  { key: 'zip',      label: 'Zip Code', unit: 'ZIP' },
] as const
type GeoLevel = (typeof GEO_TABS)[number]['key']

type GeoRow = {
  name: string; county?: string | null; chamber?: string | null
  party?: string | null; code?: string | null; num?: number
  slug: string; providers: number; capacity: number
  dcc?: number; fdc?: number; gfdc?: number; sacc?: number; sdcc?: number
  fps?: number | string | null
}

// Short type columns, in the canonical order, with their colors.
const TYPE_COLS: { key: 'dcc' | 'fdc' | 'gfdc' | 'sacc' | 'sdcc'; label: string; color: string }[] = [
  { key: 'dcc',  label: 'DCC',  color: '#3f6184' },
  { key: 'fdc',  label: 'FDC',  color: '#b5734e' },
  { key: 'gfdc', label: 'GFDC', color: '#2f6d6a' },
  { key: 'sacc', label: 'SACC', color: '#c9a15e' },
  { key: 'sdcc', label: 'SDCC', color: '#8a6d9c' },
]
type Card = {
  id: string; slug: string; name: string; county: string | null; city: string | null
  type: string; seats: number; infant: number; toddler: number; preschool: number; school_age: number
  since: string | null
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

// Translate a selected geo row into the query params the dot-map + cards APIs
// expect. District slugs look like "senate-32" / "assembly-86".
function scopeParams(params: URLSearchParams, level: GeoLevel, row: GeoRow) {
  if (level === 'county') params.set('county', row.county ?? row.name)
  else if (level === 'city') params.set('city', row.name)
  else if (level === 'zip') params.set('zip', row.name)
  else if (level === 'district') {
    const [chamber, num] = row.slug.split('-')
    params.set(chamber === 'assembly' ? 'assembly_district' : 'senate_district', num)
  }
}

function ageMix(c: Card): string {
  const parts: string[] = []
  if (c.infant > 0) parts.push('infants')
  if (c.toddler > 0) parts.push('toddlers')
  if (c.preschool > 0) parts.push('preschool')
  if (c.school_age > 0) parts.push('school-age')
  if (parts.length === 0) return 'All ages'
  if (parts.length === 1) return `${parts[0][0].toUpperCase()}${parts[0].slice(1)}`
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`
}

function licensedSince(c: Card): string | null {
  if (!c.since) return null
  const y = new Date(c.since).getFullYear()
  return Number.isFinite(y) && y > 1950 ? `Open since ${y}` : null
}

/* ── Tooltip (hover) ────────────────────────────────────────────── */
function Tip({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="group/tip relative inline-flex cursor-help items-center gap-1">
      {label}
      <span
        className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-60 rounded-lg border border-[var(--paper-rule)] bg-[var(--paper)] p-3 text-left text-[11.5px] font-normal normal-case tracking-normal leading-[1.5] text-[var(--paper-muted)] opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:pointer-events-auto group-hover/tip:opacity-100"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {children}
      </span>
    </span>
  )
}

/* ── Provider card ──────────────────────────────────────────────── */
function ProviderCard({ c }: { c: Card }) {
  const cfg = TYPE_CFG[c.type] ?? { color: 'var(--paper-accent)', label: c.type }
  const since = licensedSince(c)
  return (
    <Link
      href={`/facility/${c.slug}`}
      className="group/card relative flex flex-col rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-5 pl-6 transition-colors hover:border-[var(--paper-accent)] max-sm:aspect-square max-sm:p-4 max-sm:pl-5"
    >
      <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: cfg.color }} />
      <span className="text-[10.5px] uppercase tracking-[0.18em]" style={{ ...SANS, color: cfg.color, fontWeight: 600 }}>
        {cfg.label}
      </span>
      <h3 className="mt-3 text-[17px] leading-snug max-sm:mt-2 max-sm:text-[15px] max-sm:line-clamp-3" style={{ ...SERIF, fontWeight: 500 }}>{c.name}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--paper-muted)] min-w-0" style={SANS}>
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--paper-faint)]" />
        <span className="truncate">{[c.city, c.county && `${c.county} County`].filter(Boolean).join(' · ')}</span>
      </p>
      <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--paper-muted)] max-sm:hidden" style={SANS}>
        {ageMix(c)}
        {since && <span className="text-[var(--paper-faint)]"> · {since}</span>}
      </p>
      <div className="mt-4 flex items-center gap-1 text-[12px] text-[var(--paper-accent)] max-sm:hidden" style={SANS}>
        <span className="font-medium">View provider</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/card:translate-x-1" />
      </div>
    </Link>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function LaunchpadPage() {
  const [level, setLevel] = useState<GeoLevel>('district')
  const [geoRows, setGeoRows] = useState<GeoRow[]>([])
  const [geoLoading, setGeoLoading] = useState(true)
  const [selected, setSelected] = useState<GeoRow | null>(null)

  const [type, setType] = useState<(typeof TYPE_TABS)[number]>('DCC')
  const [cards, setCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const cardReq = useRef(0)

  // Geo table — refetch whenever the level changes; clear the current selection.
  useEffect(() => {
    let cancelled = false
    setGeoLoading(true)
    setSelected(null)
    fetch(`/api/launchpad-geo?level=${level}`)
      .then(r => r.json())
      .then((d: GeoRow[]) => { if (!cancelled) setGeoRows(Array.isArray(d) ? d : []) })
      .catch(() => { if (!cancelled) setGeoRows([]) })
      .finally(() => { if (!cancelled) setGeoLoading(false) })
    return () => { cancelled = true }
  }, [level])

  // Provider cards — scoped to the selected geo + program type (statewide when none).
  useEffect(() => {
    const id = ++cardReq.current
    setCardsLoading(true)
    const params = new URLSearchParams({ program_type: type, limit: '60' })
    if (selected) scopeParams(params, level, selected)
    fetch(`/api/launchpad-cards?${params.toString()}`)
      .then(r => r.json())
      .then((d: Card[]) => { if (id === cardReq.current) setCards(Array.isArray(d) ? d : []) })
      .catch(() => { if (id === cardReq.current) setCards([]) })
      .finally(() => { if (id === cardReq.current) setCardsLoading(false) })
  }, [selected, level, type])

  // Map scope follows the selection.
  const mapUrl = useMemo(() => {
    if (!selected) return '/api/facilities-dot-map'
    const params = new URLSearchParams()
    scopeParams(params, level, selected)
    return `/api/facilities-dot-map?${params.toString()}`
  }, [selected, level])


  const unit = GEO_TABS.find(g => g.key === level)!.unit
  const hasFps = level === 'county' || level === 'zip'
  // name + 5 type cols + capacity, plus FPS (county/zip) or chamber+district (district)
  const colSpan = 6 + (hasFps ? 1 : 0) + (level === 'district' ? 2 : 0)
  const selectGeo = useCallback((row: GeoRow) => {
    setSelected(prev => (prev && prev.slug === row.slug ? null : row))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
      <div className="px-5 sm:px-7 pt-5 sm:pt-8 pb-16 flex flex-col gap-5">

        {/* Masthead */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={SANS}>
            ChildcareGPT · Launchpad
          </p>
          <h1 className="mt-3 leading-[1.05]" style={{ ...SERIF, fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Find a provider <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>that fits.</span>
          </h1>
        </div>

        {/* Geo tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--paper-rule-soft)]">
          {GEO_TABS.map(g => {
            const on = level === g.key
            return (
              <button
                key={g.key}
                onClick={() => setLevel(g.key)}
                className="relative -mb-px px-4 py-2.5 text-[13.5px] transition-colors"
                style={{
                  ...SANS,
                  color: on ? 'var(--paper-accent)' : 'var(--paper-muted)',
                  fontWeight: on ? 600 : 400,
                  borderBottom: on ? '2px solid var(--paper-accent)' : '2px solid transparent',
                }}
              >
                {g.label}
              </button>
            )
          })}
        </div>

        {/* Two-slot top row: table + dot map */}
        <div className="h-[320px] max-sm:h-auto shrink-0 flex flex-col lg:flex-row gap-4">

          {/* Mobile: scrollable geo chip rail — replaces the table; the map below is the hero */}
          <div className="sm:hidden -mx-5 flex gap-2 overflow-x-auto no-scrollbar px-5">
            {geoLoading ? (
              <span className="px-1 py-2 text-[13px] text-[var(--paper-muted)]" style={SANS}>Loading…</span>
            ) : geoRows.map(row => {
              const on = selected?.slug === row.slug
              const fps = row.fps != null ? Number(row.fps) : null
              return (
                <button
                  key={row.slug}
                  onClick={() => selectGeo(row)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 transition-colors ${on ? 'border-[var(--paper-accent)] bg-[var(--paper-accent-soft)]' : 'border-[var(--paper-rule)] bg-[var(--paper-2)] active:bg-[var(--paper-rule-soft)]'}`}
                >
                  <span className="text-[13.5px] font-medium" style={{ ...SERIF, color: on ? 'var(--paper-accent)' : 'var(--paper-text)' }}>{row.name}</span>
                  <span className="text-[12px] tabular-nums text-[var(--paper-muted)]">{fps != null ? `${fps.toFixed(1)} FPS` : `${fmt(row.capacity)} seats`}</span>
                </button>
              )
            })}
          </div>

          {/* Table — tablet + desktop only */}
          <div className="max-sm:hidden w-full lg:w-[52%] min-w-0 shrink-0 rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] overflow-hidden flex flex-col">
            <div className="overflow-auto no-scrollbar flex-1">
              <table className="w-full text-[13px]" style={SANS}>
                <thead className="sticky top-0 z-[1] bg-[var(--paper-2)]">
                  <tr className="border-b border-[var(--paper-rule)]">
                    {hasFps && (
                      <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)] pl-4 pr-2 py-3.5 whitespace-nowrap">
                        <Tip label={<>FPS <Info className="inline h-3 w-3 -mt-px" /></>}>
                          <strong>Families Per Seat</strong> — working-parent families with a young child per licensed seat. Higher means tighter.{' '}
                          <a href="/glossary#families-per-seat" className="underline" onClick={e => e.stopPropagation()}>Full definition →</a>
                        </Tip>
                      </th>
                    )}
                    <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)] px-3 py-3.5 whitespace-nowrap">
                      {level === 'district' ? 'Representative' : unit}
                    </th>
                    {level === 'district' && (
                      <>
                        <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)] px-3 py-3.5 whitespace-nowrap">Chamber</th>
                        <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)] px-3 py-3.5 whitespace-nowrap">District</th>
                      </>
                    )}
                    {TYPE_COLS.map(c => (
                      <th key={c.key} className="text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-3.5 whitespace-nowrap" style={{ color: c.color }}>
                        {c.label}
                      </th>
                    ))}
                    <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--paper-faint)] px-3 py-3.5 whitespace-nowrap">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {geoLoading ? (
                    <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-[var(--paper-muted)]" style={SERIF}>Loading…</td></tr>
                  ) : geoRows.length === 0 ? (
                    <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-[var(--paper-muted)]" style={SERIF}>No matches.</td></tr>
                  ) : (
                    geoRows.map(row => {
                      const on = selected?.slug === row.slug
                      const fps = row.fps != null ? Number(row.fps) : null
                      return (
                        <tr
                          key={row.slug}
                          onClick={() => selectGeo(row)}
                          className={`cursor-pointer border-b border-[var(--paper-rule-soft)] transition-colors ${on ? '' : 'hover:bg-[var(--paper-rule-soft)]'}`}
                          style={{ background: on ? 'var(--paper-accent-soft)' : undefined }}
                        >
                          {hasFps && (
                            <td className="pl-4 pr-2 py-2.5 text-right tabular-nums font-medium" style={{ color: on ? 'var(--paper-accent)' : 'var(--paper-text)' }}>
                              {fps != null ? fps.toFixed(1) : '—'}
                            </td>
                          )}
                          <td className="px-3 py-2.5">
                            {level === 'district' ? (
                              <Link
                                href={`/district/${(row.chamber ?? '').toLowerCase()}/${row.num}`}
                                onClick={e => e.stopPropagation()}
                                className="font-medium text-[var(--paper-text)] hover:text-[var(--paper-accent)] hover:underline underline-offset-2 transition-colors whitespace-nowrap"
                              >
                                {row.name}
                              </Link>
                            ) : (
                              <span className="font-medium whitespace-nowrap" style={{ color: on ? 'var(--paper-accent)' : 'var(--paper-text)' }}>{row.name}</span>
                            )}
                          </td>
                          {level === 'district' && (
                            <>
                              <td className="px-3 py-2.5 text-[var(--paper-muted)]">{row.chamber}</td>
                              <td className="px-3 py-2.5 tabular-nums" style={{ color: on ? 'var(--paper-accent)' : 'var(--paper-muted)' }}>{row.code}</td>
                            </>
                          )}
                          {TYPE_COLS.map(c => (
                            <td key={c.key} className="px-2 py-2.5 text-right tabular-nums text-[var(--paper-muted)]">
                              {(row[c.key] ?? 0).toLocaleString()}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-right tabular-nums text-[var(--paper-muted)]">{fmt(row.capacity)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dot map — the hero on mobile */}
          <div className="flex-1 min-w-0 rounded-2xl border border-[var(--paper-rule)] overflow-hidden max-sm:flex-none max-sm:h-[52vh]" style={{ background: 'var(--paper-2)' }}>
            <ChildcareDotMap
              key={mapUrl}
              apiUrl={mapUrl}
              fitToData={!!selected}
              countLabel="providers"
            />
          </div>
        </div>

        {/* Section header — mobile only — reads the providers list as its own section */}
        <div className="sm:hidden mt-1 border-t border-[var(--paper-rule)] pt-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>Providers</p>
        </div>

        {/* Program-type tabs — sticky as cards scroll underneath */}
        <div className="sticky top-0 z-20 mt-3 -mx-5 sm:-mx-7 px-5 sm:px-7 bg-[var(--paper)] flex items-center gap-1 border-b border-[var(--paper-rule-soft)] sm:flex-wrap max-sm:overflow-x-auto max-sm:no-scrollbar">
          {TYPE_TABS.map(t => {
            const on = type === t
            const cfg = TYPE_CFG[t]
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className="relative -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[13px] transition-colors"
                style={{
                  ...SANS,
                  color: on ? cfg.color : 'var(--paper-muted)',
                  fontWeight: on ? 600 : 400,
                  borderBottom: on ? `2px solid ${cfg.color}` : '2px solid transparent',
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: cfg.color }} />
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Cards */}
        {!cardsLoading && cards.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-[var(--paper-muted)]" style={SERIF}>
            No {TYPE_CFG[type].label} providers match{selected ? ` in ${selected.name}` : ''}.
          </p>
        ) : (
          <div
            className="grid gap-3 sm:gap-4 transition-opacity grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]"
            style={{ opacity: cardsLoading ? 0.5 : 1 }}
          >
            {cards.map(c => <ProviderCard key={c.id} c={c} />)}
          </div>
        )}

        <p className="mt-4 text-[10px] text-[var(--paper-faint)]" style={SANS}>
          Provider data from NY OCFS · capacity and licensing dates as reported · pick a {unit.toLowerCase()} to scope the map and cards
        </p>
      </div>
    </div>
  )
}
