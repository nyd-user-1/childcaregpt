'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, BarChart3, Map, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SIDEBAR_NAV_TOP, SIDEBAR_NAV_BOTTOM, SIDEBAR_MAP_ITEMS,
} from '@/lib/app-config'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

interface SidebarProps {
  activeLabel?: string
  dark?: boolean
  onToggleTheme?: (e: React.MouseEvent) => void
}

export function Sidebar({ activeLabel = 'Chat', dark, onToggleTheme }: SidebarProps) {
  const [mapOpen, setMapOpen] = useState(false)

  const navItem = (active: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
      active
        ? 'bg-[var(--paper-2)] text-[var(--paper-accent)]'
        : 'text-[var(--paper-text)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-accent)]',
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

      {/* Masthead */}
      <Link href="/" className="block px-4 pt-5 pb-5">
        <div
          style={SERIF}
          className="text-[22px] italic leading-none text-[var(--paper-accent)] transition-opacity hover:opacity-80"
        >
          ChildcareGPT
        </div>
      </Link>

      <div className="mx-4 border-t border-[var(--paper-rule)]" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pt-3 space-y-0.5">

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
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-[var(--paper-text)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-accent)] transition-colors"
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

      {/* Footer — theme toggle (mobile only; desktop toggles from the header) */}
      {onToggleTheme && (
        <div className="p-3">
          <button
            onClick={onToggleTheme}
            className="sm:hidden w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-[var(--paper-text)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-accent)] transition-colors"
          >
            {dark
              ? <Sun className="h-[18px] w-[18px] flex-shrink-0 fill-amber-400 text-amber-400" />
              : <Moon className="h-[18px] w-[18px] flex-shrink-0" />}
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      )}

    </aside>
  )
}
