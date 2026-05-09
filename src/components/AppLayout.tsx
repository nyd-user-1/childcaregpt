'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Blocks, PanelLeftOpen, PanelLeftClose,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'

const PATH_NAV: Record<string, string> = {
  '/':         'Chat',
  '/charts':   'Charts',
  '/explore':  'Explore',
  '/grid':     'Grid',
  '/report':   'Report',
  '/sites':    'Sites',
}

const PATH_TITLE: Record<string, string> = {
  '/charts':  'Charts',
  '/explore': 'Explore',
  '/grid':    'Grid',
  '/report':  'Report',
  '/sites':   'Sites',
}

interface AppLayoutProps {
  children: React.ReactNode
  showNavArrows?: boolean
}

export function AppLayout({ children, showNavArrows = false }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const activeNav = PATH_NAV[pathname] ?? (
    pathname.startsWith('/data/')  ? 'Data' :
    pathname.startsWith('/map/')   ? 'Map'  : undefined
  )
  const title = PATH_TITLE[pathname]

  return (
    <div className="flex h-dvh overflow-hidden p-0 sm:p-[18px]" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? 'w-full sm:w-[240px] sm:mr-[18px]' : 'w-0'
        }`}
      >
        <div className="w-[240px] h-full rounded-none sm:rounded-2xl overflow-hidden">
          <Sidebar activeLabel={activeNav} />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 rounded-none sm:rounded-2xl bg-[var(--surface)] overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center px-5 pt-5 pb-3">

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border-0 outline-none transition-colors hover:bg-[var(--inp-bg)]"
          >
            {sidebarOpen
              ? <PanelLeftClose className="h-5 w-5 text-[var(--txt)]" />
              : <PanelLeftOpen  className="h-5 w-5 text-[var(--txt)]" />
            }
          </button>

          {/* Logo + page title (only shown on inner pages) */}
          {title && (
            <div className="ml-4 flex items-center gap-2 text-[var(--txt)]">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xl font-bold hover:bg-[var(--inp-bg)] transition-colors"
              >
                <Blocks className="h-5 w-5 shrink-0" style={{ stroke: '#38bdf8', fill: 'rgba(56,189,248,0.15)' }} />
                ChildcareGPT
              </Link>
              <span className="text-[var(--muted)] text-xl select-none">|</span>
              <span className="text-xl font-medium">{title}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Nav arrows */}
          {showNavArrows && (
            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--inp-bg)] transition-colors">
                <ChevronLeft className="h-4 w-4 text-[var(--txt)]" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--inp-bg)] transition-colors">
                <ChevronRight className="h-4 w-4 text-[var(--txt)]" />
              </button>
            </div>
          )}

        </div>

        {/* Page children fill remaining space */}
        {children}

      </div>
    </div>
  )
}
