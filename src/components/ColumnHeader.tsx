'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, Info, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

/**
 * Sortable table column label with a hover tooltip + "Learn more" link.
 * Shared across all index-page DataTables.
 *
 * The tooltip closes on a short delay (and stays open while hovered) so the
 * cursor can travel from the header into the tooltip without it vanishing.
 */
export function ColumnHeader({
  label,
  tooltip,
  active,
  dir,
  onSort,
  align = 'right',
  learnMoreHref = '/glossary',
}: {
  label: string
  tooltip: string
  active: boolean
  dir: 'asc' | 'desc'
  onSort: () => void
  align?: 'left' | 'right'
  learnMoreHref?: string
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 160) }

  return (
    <th className={cn('px-3 py-3.5 bg-[var(--paper)] border-b border-[var(--paper-rule)] whitespace-nowrap', align === 'right' ? 'text-right' : 'text-left')}>
      <div className="group/col relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
        <button
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-text)]',
            active ? 'text-[var(--paper-text)]' : 'text-[var(--paper-faint)]',
          )}
          style={SANS}
        >
          {label}
          {active
            ? dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            : <ChevronUp className="h-3 w-3 opacity-0 group-hover/col:opacity-40" />}
        </button>
        {open && (
          <div
            onMouseEnter={show}
            onMouseLeave={hide}
            className={cn('absolute top-full z-50 mt-2 w-64 rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-xl text-left overflow-hidden normal-case tracking-normal whitespace-normal', align === 'right' ? 'right-0' : 'left-0')}
          >
            <div className="px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--paper-text)] mb-1.5" style={SANS}>{label}</p>
              <p className="text-[12px] text-[var(--paper-muted)] leading-relaxed font-normal">{tooltip}</p>
            </div>
            <Link href={learnMoreHref} onClick={e => e.stopPropagation()}
              className="flex items-center justify-between gap-2 border-t border-[var(--paper-rule)] px-3.5 py-2.5 text-[11px] font-medium text-[var(--paper-accent)] hover:bg-[var(--paper-2)] transition-colors" style={SANS}>
              <span className="inline-flex items-center gap-1.5"><Info className="h-3 w-3" />Learn more</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </th>
  )
}
