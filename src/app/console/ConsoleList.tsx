'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { CountySupplyNeed } from '@/lib/queries/console'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

// Severity tiers — warm clay (tightest) → teal (best supplied).
function tier(fps: number): { color: string; label: string } {
  if (fps >= 2.0) return { color: '#b5734e', label: 'Tightest' }
  if (fps >= 1.5) return { color: '#c9a15e', label: 'Tight' }
  if (fps >= 1.2) return { color: 'var(--paper-muted)', label: 'Moderate' }
  return { color: 'var(--paper-accent)', label: 'Adequate' }
}

export function ConsoleList({ rows }: { rows: CountySupplyNeed[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const activeSlug = pathname.startsWith('/console/') ? pathname.split('/console/')[1].split('?')[0] : null

  const { maxFps, stateAvg } = useMemo(() => {
    const totalNeed = rows.reduce((s, r) => s + r.needHh, 0)
    const totalSeats = rows.reduce((s, r) => s + r.seats, 0)
    return {
      maxFps: rows.reduce((m, r) => Math.max(m, r.familiesPerSeat), 0) || 1,
      stateAvg: totalSeats ? totalNeed / totalSeats : 0,
    }
  }, [rows])

  return (
    <div className="w-[44%] min-w-0 shrink-0 flex flex-col overflow-hidden rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)]" style={{ color: 'var(--paper-text)' }}>

      {/* ── Panel header ── */}
      <div className="shrink-0 border-b border-[var(--paper-rule)] px-6 pt-8 pb-7">
        <p className="text-[10.5px] uppercase tracking-[0.26em] text-[var(--paper-faint)]" style={SANS}>Supply vs Need · NY Counties</p>
        <h1 className="mt-4 leading-[1.08] text-[var(--paper-text)]" style={{ ...SERIF, fontSize: '1.85rem', fontWeight: 500, letterSpacing: '-0.015em' }}>
          Where care is <span className="italic" style={{ color: 'var(--paper-accent)' }}>scarcest</span>
        </h1>
        <p className="mt-4 text-[13px] leading-[1.65] text-[var(--paper-muted)]" style={SANS}>
          Working families with a child under 6, per licensed seat. Statewide average{' '}
          <span className="font-semibold tabular-nums text-[var(--paper-text)]">{stateAvg.toFixed(1)}</span> — higher means tighter.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10.5px] uppercase tracking-[0.12em]" style={SANS}>
          {[['#b5734e', 'Tightest'], ['#c9a15e', 'Tight'], ['var(--paper-accent)', 'Adequate']].map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5 text-[var(--paper-faint)]">
              <span className="h-2 w-2 rounded-sm" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* ── Ranked list ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {rows.map((r, i) => {
          const t = tier(r.familiesPerSeat)
          const isActive = r.slug === activeSlug
          return (
            <div
              key={r.slug}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/console/${r.slug}`, { scroll: false })}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/console/${r.slug}`, { scroll: false }) } }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 border-b border-[var(--paper-rule-soft)] px-6 py-3.5 text-left transition-colors',
                isActive ? 'bg-[var(--paper-2)]' : 'hover:bg-[var(--paper-2)]',
              )}
              style={isActive ? { boxShadow: 'inset 2px 0 0 var(--paper-accent)' } : undefined}
            >
              <span className="w-6 shrink-0 text-right italic tabular-nums text-[var(--paper-faint)]" style={{ ...SERIF, fontSize: '0.95rem' }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/console/${r.slug}?panel=providers`, { scroll: false }) }}
                  className="block max-w-full truncate text-left text-[var(--paper-text)] underline-offset-2 transition-colors hover:text-[var(--paper-accent)] hover:underline"
                  style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500 }}
                  title={`See ${r.county} providers`}
                >
                  {r.county}
                </button>
                <p className="mt-0.5 text-[11px] tabular-nums text-[var(--paper-faint)]" style={SANS}>{r.providers} providers · {fmt(r.seats)} seats</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--paper-2)]">
                  <div className="h-full rounded-full" style={{ width: `${(r.familiesPerSeat / maxFps) * 100}%`, background: t.color }} />
                </div>
                <span className="w-8 text-right tabular-nums" style={{ ...SERIF, fontSize: '1.05rem', fontWeight: 500, color: t.color }}>{r.familiesPerSeat.toFixed(1)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
