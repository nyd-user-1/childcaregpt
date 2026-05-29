'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Hash, Building2, BarChart3, ArrowRight, CornerDownLeft, Clock } from 'lucide-react'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

type IconKey = 'pin' | 'hash' | 'building' | 'chart' | 'search' | 'recent'
const ICONS: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  pin: MapPin, hash: Hash, building: Building2, chart: BarChart3, search: Search, recent: Clock,
}

type Item = { href: string; primary: string; secondary: string; icon: IconKey; group: string }

const PROGRAM_LABELS: Record<string, string> = {
  DCC: 'Day Care Center', FDC: 'Family Day Care', GFDC: 'Group Family Day Care',
  SACC: 'School-Age Care', SDCC: 'Small Day Care Center',
}

const NAV: Item[] = [
  { href: '/county',    primary: 'Counties',  secondary: 'All 62 NY counties',     icon: 'pin',      group: 'Go to' },
  { href: '/city',      primary: 'Cities',    secondary: 'Cities & towns',         icon: 'pin',      group: 'Go to' },
  { href: '/zip-code',  primary: 'ZIP Codes', secondary: 'Browse by ZIP',          icon: 'hash',     group: 'Go to' },
  { href: '/facility',  primary: 'Providers', secondary: 'Licensed facilities',    icon: 'building', group: 'Go to' },
  { href: '/console',   primary: 'Console',   secondary: 'Where care is scarcest', icon: 'chart',    group: 'Go to' },
  { href: '/launchpad', primary: 'Launchpad', secondary: 'Find a provider',        icon: 'building', group: 'Go to' },
  { href: '/data',      primary: 'Data',      secondary: 'Browse the data',        icon: 'chart',    group: 'Go to' },
]

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const RECENT_KEY = 'cc-cmdk-recent'

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Item[]>(NAV)
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<Item[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Global ⌘K / Ctrl+K to toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // On open: reset, focus, load recents.
  useEffect(() => {
    if (!open) return
    setQ('')
    setActive(0)
    try {
      const r = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
      setRecent(Array.isArray(r) ? r.slice(0, 5) : [])
    } catch { setRecent([]) }
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  // Debounced live search; empty query falls back to recents + nav.
  useEffect(() => {
    if (!open) return
    const query = q.trim()
    if (query.length < 2) {
      setItems([...recent, ...NAV])
      setActive(0)
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        const d = await r.json()
        const next: Item[] = []
        for (const c of d.counties ?? []) next.push({ href: `/county/${c.slug}`, primary: `${c.name} County`, secondary: 'County profile', icon: 'pin', group: 'Counties' })
        for (const c of d.cities ?? []) next.push({ href: `/city/${c.slug}`, primary: c.name, secondary: `${c.county} County`, icon: 'pin', group: 'Cities' })
        for (const z of d.zips ?? []) next.push({ href: `/zip/${z.zip}`, primary: z.zip, secondary: z.city, icon: 'hash', group: 'ZIP Codes' })
        for (const f of d.facilities ?? []) next.push({ href: `/facility/${toSlug(f.name)}`, primary: f.name, secondary: `${f.city} · ${PROGRAM_LABELS[f.programType] ?? f.programType}`, icon: 'building', group: 'Providers' })
        for (const c of d.charts ?? []) next.push({ href: `/chart/${c.slug}`, primary: c.title, secondary: c.description, icon: 'chart', group: 'Charts' })
        next.push({ href: `/search?q=${encodeURIComponent(query)}`, primary: `Search for "${query}"`, secondary: 'See all results', icon: 'search', group: 'Everything' })
        setItems(next)
        setActive(0)
      } catch { /* aborted */ }
    }, 170)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, open, recent])

  const go = useCallback((item: Item) => {
    try {
      const prev: Item[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
      const recentItem: Item = { ...item, group: 'Recent', icon: 'recent' }
      const deduped = [recentItem, ...prev.filter((p: Item) => p.href !== item.href)].slice(0, 5)
      localStorage.setItem(RECENT_KEY, JSON.stringify(deduped))
    } catch { /* ignore */ }
    setOpen(false)
    router.push(item.href)
  }, [router])

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) go(items[active]) }
  }

  // Keep the active row in view.
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]" style={SANS}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[var(--paper-rule)] px-4">
          <Search className="h-[18px] w-[18px] shrink-0 text-[var(--paper-faint)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search counties, cities, ZIPs, providers…"
            className="w-full bg-transparent py-4 text-[16px] text-[var(--paper-text)] placeholder:text-[var(--paper-faint)] outline-none"
          />
          <kbd className="shrink-0 rounded border border-[var(--paper-rule)] px-1.5 py-0.5 text-[11px] text-[var(--paper-faint)]">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[56vh] overflow-y-auto no-scrollbar py-2">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-[var(--paper-muted)]" style={SERIF}>No matches.</p>
          ) : (
            items.map((item, i) => {
              const Icon = ICONS[item.icon]
              const header = item.group && item.group !== lastGroup ? item.group : null
              lastGroup = item.group
              return (
                <div key={`${item.href}-${i}`}>
                  {header && (
                    <p className="px-4 pb-1.5 pt-3 text-[10.5px] uppercase tracking-[0.16em] text-[var(--paper-faint)]">{header}</p>
                  )}
                  <button
                    data-idx={i}
                    onClick={() => go(item)}
                    onMouseMove={() => setActive(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-[var(--paper-2)]' : ''}`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--paper-faint)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] text-[var(--paper-text)]" style={SERIF}>{item.primary}</span>
                      <span className="block truncate text-[12px] text-[var(--paper-muted)]">{item.secondary}</span>
                    </span>
                    {i === active && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--paper-accent)]" />}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-[var(--paper-rule)] px-4 py-2.5 text-[11px] text-[var(--paper-faint)]">
          <span className="inline-flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> select</span>
          <span>↑↓ navigate</span>
          <span className="ml-auto inline-flex items-center gap-1"><kbd className="rounded border border-[var(--paper-rule)] px-1 py-0.5">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  )
}
