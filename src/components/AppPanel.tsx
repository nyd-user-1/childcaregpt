'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Columns2, Columns3 } from 'lucide-react'

export function AppPanel({
  open,
  onClose,
  title,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const [root, setRoot] = useState<Element | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { setRoot(document.getElementById('chat-panel-root')) }, [])
  useEffect(() => { if (!open) setExpanded(false) }, [open])

  if (!root) return null

  const w = expanded ? 'sm:w-[50vw]' : 'sm:w-[423px]'

  return createPortal(
    <div className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden max-sm:pointer-events-auto ${open ? `w-full ${w} sm:ml-[18px]` : 'w-0'}`}>
      {open && (
        <div className={`relative h-full w-full ${w} rounded-none sm:rounded-2xl bg-[var(--paper)] flex flex-col overflow-hidden shadow-[0_4px_24px_rgba(31,29,26,0.07)]`}>

          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--paper-rule)] px-5 py-4 shrink-0" style={{ background: 'var(--paper)' }}>
            <span className="flex-1 text-base font-semibold text-[var(--paper-text)] truncate">{title}</span>
            {/* ButtonPanelHalf / ButtonPanelThird */}
            <button
              onClick={() => setExpanded(v => !v)}
              className="shrink-0 p-1.5 rounded-lg text-[var(--paper-muted)] hover:text-[var(--paper-text)] hover:bg-[var(--paper-2)] transition-colors"
              aria-label={expanded ? 'Collapse to third' : 'Expand to half'}
            >
              {expanded ? <Columns3 className="h-4 w-4" /> : <Columns2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-[var(--paper-muted)] hover:text-[var(--paper-text)] hover:bg-[var(--paper-2)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 border-t border-[var(--paper-rule)]">
              {footer}
            </div>
          )}

        </div>
      )}
    </div>,
    root
  )
}
