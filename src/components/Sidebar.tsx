'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, User, BarChart3, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SIDEBAR_NAV_TOP, SIDEBAR_NAV_BOTTOM,
  SIDEBAR_MAP_ITEMS, SIDEBAR_FOOTER_LABEL,
} from '@/lib/app-config'

const SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

interface SidebarProps {
  activeLabel?: string
}

export function Sidebar({ activeLabel = 'Chat' }: SidebarProps) {
  const [mapOpen, setMapOpen] = useState(false)

  const navItem = (active: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
      active
        ? 'bg-[var(--paper-2)] text-[var(--paper-accent)]'
        : 'text-[var(--paper-text)] hover:bg-[var(--paper-2)]',
    )
  const subItem = (active: boolean) =>
    cn(
      'flex items-center rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
      active
        ? 'bg-[var(--paper-2)] text-[var(--paper-accent)]'
        : 'text-[var(--paper-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)]',
    )

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-[var(--paper)]" style={{ ...SANS, color: 'var(--paper-text)' }}>

      {/* Header — Log In */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--paper-rule)] px-3 py-2.5 transition-colors hover:bg-[var(--paper-2)]">
          <User className="h-[18px] w-[18px] flex-shrink-0 text-[var(--paper-text)]" />
          <span className="text-[15px] font-medium text-[var(--paper-text)]">Log In</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-0.5">

        {SIDEBAR_NAV_TOP.map(({ label, icon: Icon, href }) => (
          <Link key={label} href={href} className={navItem(activeLabel === label)}>
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            {label}
          </Link>
        ))}

        <Link href="/data" className={navItem(activeLabel === 'Data')}>
          <BarChart3 className="h-[18px] w-[18px] flex-shrink-0" />
          Data
        </Link>

        {SIDEBAR_MAP_ITEMS.length > 0 && (
          <>
            <button
              onClick={() => setMapOpen(v => !v)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-[var(--paper-text)] hover:bg-[var(--paper-2)] transition-colors"
            >
              <Map className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="flex-1 text-left">Map</span>
              <ChevronDown className={cn('h-4 w-4 text-[var(--paper-faint)] transition-transform duration-200', mapOpen && 'rotate-180')} />
            </button>
            {mapOpen && (
              <div className="ml-[30px] border-l border-[var(--paper-rule)] pl-3 space-y-0.5">
                {SIDEBAR_MAP_ITEMS.map(({ label, href }) => (
                  <Link key={label} href={href} className={subItem(activeLabel === label)}>
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {SIDEBAR_NAV_BOTTOM.map(({ label, icon: Icon, href }) => (
          <Link key={label} href={href} className={navItem(activeLabel === label)}>
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3">
        <Link
          href="/glossary"
          className={cn(
            'flex items-center rounded-lg border border-[var(--paper-rule)] px-3 py-2.5 text-[15px] font-medium transition-colors',
            activeLabel === SIDEBAR_FOOTER_LABEL
              ? 'bg-[var(--paper-2)] text-[var(--paper-accent)]'
              : 'text-[var(--paper-text)] hover:bg-[var(--paper-2)]',
          )}
        >
          {SIDEBAR_FOOTER_LABEL}
        </Link>
      </div>

    </aside>
  )
}
