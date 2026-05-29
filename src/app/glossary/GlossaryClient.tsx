'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, ArrowUpRight, Link2 } from 'lucide-react'
import {
  GLOSSARY_TERMS, GLOSSARY_CATEGORIES, GLOSSARY_UPDATED,
  type GlossaryTerm, type GlossaryCategory,
} from '@/lib/glossary-terms'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

function slugifyCat(cat: string) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function GlossaryClient() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(slugifyCat(GLOSSARY_CATEGORIES[0].name))
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const searchRef = useRef<HTMLInputElement>(null)

  // Group filtered terms by category, preserving category order.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<GlossaryCategory, GlossaryTerm[]>()
    for (const c of GLOSSARY_CATEGORIES) map.set(c.name, [])
    for (const t of GLOSSARY_TERMS) {
      if (q) {
        const hay = `${t.name} ${t.abbr ?? ''} ${t.plain} ${t.body ?? ''} ${t.whereSeen ?? ''}`.toLowerCase()
        if (!hay.includes(q)) continue
      }
      map.get(t.category)?.push(t)
    }
    return map
  }, [query])

  const totalVisible = useMemo(() => {
    let n = 0
    filtered.forEach(arr => { n += arr.length })
    return n
  }, [filtered])

  // Scroll-spy: highlight the category currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (!visible.length) return
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        setActive(visible[0].target.id)
      },
      { rootMargin: '-12% 0px -72% 0px', threshold: [0, 0.4] },
    )
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [filtered])

  // ⌘K / focus search; Esc clears.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); searchRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

      {/* ── Masthead ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 sm:px-10 md:px-14 pt-12 sm:pt-16 pb-8">
        <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
          ChildcareGPT · Plain-Language Guide
        </p>
        <h1
          className="paper-rise mt-4 leading-[1.04]"
          style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2.5rem, 6vw, 4.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
        >
          The words around
          <br />
          <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>child care,</span> explained.
        </h1>
        <p
          className="paper-rise mt-6 max-w-[58ch] text-[var(--paper-muted)]"
          style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.05rem, 1.6vw, 1.25rem)', lineHeight: 1.6 }}
        >
          Acronyms, costs, programs, the fine print on a form — in plain English,
          written for a parent who needs an answer, not a regulation.
        </p>
        <div className="paper-rise mt-7 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '180ms' }}>
          <span className="tabular-nums">{GLOSSARY_TERMS.length} terms</span>
          <span className="h-3 w-px bg-[var(--paper-rule)]" />
          <span>Updated {GLOSSARY_UPDATED}</span>
          <span className="h-3 w-px bg-[var(--paper-rule)]" />
          <span>New York State</span>
        </div>
      </div>

      {/* ── Sticky search ─────────────────────────────────────────── */}
      <div className="paper-rise sticky top-0 z-10 border-y border-[var(--paper-rule)] bg-[var(--paper)]/92 backdrop-blur-sm" style={{ animationDelay: '220ms' }}>
        <div className="mx-auto max-w-5xl px-6 sm:px-10 md:px-14 py-3.5 flex items-center gap-4">
          <label className="group/field relative flex-1 flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--paper-faint)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search the guide…"
              className="w-full rounded-full border border-[var(--paper-rule)] bg-[var(--paper-2)] pl-9 pr-9 py-2 text-[15px] text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none focus:border-[var(--paper-accent)] transition-colors"
              style={SANS}
            />
            {query && (
              <button onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="Clear search"
                className="absolute right-3 text-[var(--paper-faint)] hover:text-[var(--paper-text)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <span className="hidden md:block text-[11px] uppercase tracking-[0.18em] text-[var(--paper-faint)] tabular-nums shrink-0" style={SANS}>
            {query ? `${totalVisible} / ${GLOSSARY_TERMS.length}` : `${GLOSSARY_TERMS.length} terms`}
          </span>
        </div>
      </div>

      {/* ── Body: contents nav + content ──────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 sm:px-10 md:px-14 pt-12 grid grid-cols-1 md:grid-cols-[170px_1fr] gap-x-12 lg:gap-x-16 pb-28">

        {/* Contents nav (sticky) */}
        <nav className="hidden md:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={SANS}>Contents</p>
            <div className="flex flex-col">
              {GLOSSARY_CATEGORIES.map(c => {
                const slug = slugifyCat(c.name)
                const count = filtered.get(c.name)?.length ?? 0
                const isActive = active === slug
                return (
                  <a key={slug} href={`#${slug}`}
                    className="group/nav flex items-baseline gap-2 py-1.5 transition-colors"
                    style={{ ...SANS, color: isActive ? 'var(--paper-accent)' : 'var(--paper-muted)' }}>
                    <span className="text-[13px] leading-snug flex-1 group-hover/nav:text-[var(--paper-text)] transition-colors">{c.name}</span>
                    <span className="text-[11px] tabular-nums text-[var(--paper-faint)]">{count}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Content column */}
        <main className="min-w-0">
          {GLOSSARY_CATEGORIES.map((c, ci) => {
            const terms = filtered.get(c.name) ?? []
            if (!terms.length) return null
            const slug = slugifyCat(c.name)
            return (
              <section
                key={slug}
                id={slug}
                ref={(el: HTMLElement | null) => { sectionRefs.current[slug] = el }}
                className="mb-20 scroll-mt-24 first:mt-0"
              >
                {/* Chapter head */}
                <div className="mb-9 flex items-end gap-5 border-b border-[var(--paper-rule)] pb-5">
                  <span
                    className="shrink-0 leading-none italic"
                    style={{ ...SERIF, color: 'var(--paper-accent)', fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 300, letterSpacing: '-0.02em' }}
                  >
                    {ROMAN[ci]}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--paper-faint)]" style={SANS}>
                      Chapter {ci + 1}
                    </span>
                    <h2
                      className="mt-1.5 leading-tight text-[var(--paper-text)]"
                      style={{ ...SERIF, fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', fontWeight: 500, letterSpacing: '-0.01em' }}
                    >
                      {c.name}
                    </h2>
                    <p className="mt-1 text-[var(--paper-muted)] text-sm sm:text-[15px]" style={{ ...SERIF, fontStyle: 'italic' }}>
                      {c.blurb}
                    </p>
                  </div>
                  <span className="hidden sm:block pb-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--paper-faint)] tabular-nums shrink-0" style={SANS}>
                    {terms.length} {terms.length === 1 ? 'term' : 'terms'}
                  </span>
                </div>

                {/* Terms */}
                <div className="flex flex-col">
                  {terms.map((t, ti) => (
                    <article key={t.id} id={t.id} className={`group/term scroll-mt-24 py-8 ${ti > 0 ? 'border-t border-[var(--paper-rule-soft)]' : ''}`}>
                      <header className="flex items-baseline gap-3 mb-3">
                        <h3
                          className="flex-1 leading-[1.12] text-[var(--paper-text)]"
                          style={{ ...SERIF, fontSize: 'clamp(1.35rem, 2.2vw, 1.7rem)', fontWeight: 500, letterSpacing: '-0.01em' }}
                        >
                          {t.name}
                          {t.abbr && (
                            <span className="ml-2.5 align-middle inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold tracking-wide" style={{ ...SANS, background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}>
                              {t.abbr}
                            </span>
                          )}
                        </h3>
                        <a href={`#${t.id}`} aria-label={`Link to ${t.name}`}
                          className="shrink-0 text-[var(--paper-faint)] hover:text-[var(--paper-accent)] opacity-0 group-hover/term:opacity-100 focus:opacity-100 transition-opacity">
                          <Link2 className="h-4 w-4" />
                        </a>
                      </header>

                      {/* Plain-English first — the parent-facing definition */}
                      <p className="max-w-[64ch] text-[16px] leading-[1.7] text-[var(--paper-text)]">
                        {t.plain}
                      </p>

                      {t.body && (
                        <p className="mt-3.5 max-w-[64ch] text-[15px] leading-[1.7] text-[var(--paper-muted)]">
                          {t.body}
                        </p>
                      )}

                      {(t.whereSeen || t.link) && (
                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                          {t.whereSeen && (
                            <span className="text-[12px] text-[var(--paper-faint)]" style={SANS}>
                              <span className="uppercase tracking-[0.16em] mr-2">Where</span>
                              {t.whereSeen}
                            </span>
                          )}
                          {t.link && (
                            <a href={t.link.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] uppercase tracking-[0.16em] hover:underline underline-offset-4"
                              style={{ ...SANS, color: 'var(--paper-accent)' }}>
                              {t.link.label}
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )
          })}

          {totalVisible === 0 && (
            <div className="py-24 text-center">
              <p className="text-[var(--paper-muted)] text-lg" style={{ ...SERIF, fontStyle: 'italic' }}>
                Nothing in the guide matches &ldquo;{query}&rdquo;.
              </p>
              <button onClick={() => setQuery('')}
                className="mt-4 text-xs uppercase tracking-[0.2em] hover:underline underline-offset-4" style={{ ...SANS, color: 'var(--paper-accent)' }}>
                Clear search
              </button>
            </div>
          )}

          {/* Colophon */}
          <div className="mt-10 pt-7 border-t border-[var(--paper-rule)] max-w-[64ch]">
            <p className="text-[12.5px] leading-[1.75] text-[var(--paper-faint)]" style={{ ...SERIF, fontStyle: 'italic' }}>
              Compiled from New York OCFS regulated-provider data and the U.S.
              Department of Labor’s National Database of Childcare Prices.
              Definitions are written for clarity — for official determinations,
              contact your local Department of Social Services.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
