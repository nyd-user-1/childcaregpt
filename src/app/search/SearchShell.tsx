'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, X, MapPin, Hash, Building2, BarChart3, ChevronRight } from 'lucide-react'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const TYPE_LABELS: Record<string, string> = {
  DCC: 'Day Care Center', FDC: 'Family Day Care', GFDC: 'Group Family Day Care',
  SACC: 'School Age Child Care', SDCC: 'Small Day Care Center',
}
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

type Results = {
  counties: { name: string; slug: string }[]
  cities: { name: string; county: string; slug: string }[]
  zips: { zip: string; city: string }[]
  facilities: { id: number; name: string; city: string; county: string; programType: string }[]
  charts: { slug: string; title: string; description: string }[]
}
const EMPTY: Results = { counties: [], cities: [], zips: [], facilities: [], charts: [] }

const QUICK_LINKS = [
  { href: '/county', label: 'Counties' },
  { href: '/city', label: 'Cities' },
  { href: '/zip-code', label: 'ZIP Codes' },
  { href: '/facility', label: 'Facilities' },
  { href: '/charts', label: 'Charts' },
  { href: '/maps', label: 'Maps' },
  { href: '/console', label: 'Console' },
  { href: '/glossary', label: 'Glossary' },
]

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 mt-8 flex items-baseline gap-2 first:mt-0">
      <span className="text-[10.5px] uppercase tracking-[0.24em] text-[var(--paper-faint)]" style={SANS}>{label}</span>
      <span className="text-[10.5px] tabular-nums text-[var(--paper-faint)]" style={SANS}>{count}</span>
    </div>
  )
}

function ResultRow({ href, icon, primary, secondary }: {
  href: string; icon: React.ReactNode; primary: string; secondary: string
}) {
  return (
    <Link href={href}
      className="group/row -mx-3 flex items-center gap-3 rounded-lg border-t border-[var(--paper-rule-soft)] px-3 py-3.5 transition-colors first:border-t-0 hover:bg-[var(--paper-2)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}>{primary}</p>
        <p className="truncate text-[12.5px] text-[var(--paper-muted)]" style={SANS}>{secondary}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--paper-faint)] transition-colors group-hover/row:text-[var(--paper-text)]" />
    </Link>
  )
}

export function SearchShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [results, setResults] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  useEffect(() => {
    const q = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search', { scroll: false })
      if (q.length < 2) { setResults(EMPTY); setLoading(false); return }
      setLoading(true)
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => { setResults(d); setLoading(false) })
        .catch(() => setLoading(false))
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, router])

  const total = results.counties.length + results.cities.length + results.zips.length + results.facilities.length + results.charts.length
  const trimmed = query.trim()
  const active = trimmed.length >= 2

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
      <div className="mx-auto max-w-3xl px-6 sm:px-10 pb-24">

        {/* ── Masthead ── */}
        <div className="pt-10 pb-6">
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · Search
          </p>
          <h1 className="paper-rise mt-3 leading-[1.04]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Search New York{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>child care.</span>
          </h1>
        </div>

        {/* ── Sticky search ── */}
        <div className="paper-rise sticky top-0 z-10 -mx-6 border-y border-[var(--paper-rule)] bg-[var(--paper)]/92 px-6 py-3.5 backdrop-blur-sm sm:-mx-10 sm:px-10" style={{ animationDelay: '120ms' }}>
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-[var(--paper-faint)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="County, city, ZIP, provider…"
              className="w-full rounded-full border border-[var(--paper-rule)] bg-[var(--paper-2)] py-3 pl-11 pr-11 text-[16px] text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none transition-colors focus:border-[var(--paper-accent)]"
              style={SANS}
            />
            {query && (
              <button onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="Clear search"
                className="absolute right-4 text-[var(--paper-faint)] transition-colors hover:text-[var(--paper-text)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        {/* ── Results ── */}
        <div className="pt-7">
          {!active ? (
            <div>
              <p className="text-[var(--paper-muted)]" style={{ ...SERIF, fontSize: '1.05rem', lineHeight: 1.6 }}>
                Find a county, city, ZIP code, or a specific licensed provider — or jump straight in:
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK_LINKS.map(l => (
                  <Link key={l.href} href={l.href}
                    className="rounded-full border border-[var(--paper-rule)] bg-[var(--paper-2)] px-3.5 py-1.5 text-[13px] text-[var(--paper-muted)] transition-colors hover:border-[var(--paper-accent)] hover:text-[var(--paper-text)]"
                    style={SANS}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : loading && total === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-[var(--paper-2)] animate-pulse" />)}
            </div>
          ) : total === 0 ? (
            <p className="py-16 text-center text-[var(--paper-muted)]" style={{ ...SERIF, fontStyle: 'italic', fontSize: '1.1rem' }}>
              Nothing matches &ldquo;{trimmed}&rdquo;.
            </p>
          ) : (
            <div>
              {results.counties.length > 0 && (
                <section>
                  <SectionLabel label="Counties" count={results.counties.length} />
                  {results.counties.map(c => (
                    <ResultRow key={c.slug} href={`/county/${c.slug}`} icon={<MapPin className="h-4 w-4" />} primary={`${c.name} County`} secondary="County profile · cost & providers" />
                  ))}
                </section>
              )}
              {results.cities.length > 0 && (
                <section>
                  <SectionLabel label="Cities" count={results.cities.length} />
                  {results.cities.map(c => (
                    <ResultRow key={c.slug} href={`/city/${c.slug}`} icon={<MapPin className="h-4 w-4" />} primary={c.name} secondary={`${c.county} County`} />
                  ))}
                </section>
              )}
              {results.zips.length > 0 && (
                <section>
                  <SectionLabel label="ZIP Codes" count={results.zips.length} />
                  {results.zips.map(z => (
                    <ResultRow key={z.zip} href={`/zip/${z.zip}`} icon={<Hash className="h-4 w-4" />} primary={z.zip} secondary={z.city} />
                  ))}
                </section>
              )}
              {results.facilities.length > 0 && (
                <section>
                  <SectionLabel label="Providers" count={results.facilities.length} />
                  {results.facilities.map(f => (
                    <ResultRow key={f.id} href={`/facility/${toSlug(f.name)}`} icon={<Building2 className="h-4 w-4" />} primary={f.name} secondary={`${f.city} · ${TYPE_LABELS[f.programType] ?? f.programType}`} />
                  ))}
                </section>
              )}
              {results.charts.length > 0 && (
                <section>
                  <SectionLabel label="Charts" count={results.charts.length} />
                  {results.charts.map(c => (
                    <ResultRow key={c.slug} href={`/chart/${c.slug}`} icon={<BarChart3 className="h-4 w-4" />} primary={c.title} secondary={c.description} />
                  ))}
                </section>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
