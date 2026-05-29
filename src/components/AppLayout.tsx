'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PanelLeftOpen, PanelLeftClose, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import { Sidebar } from '@/components/Sidebar'
import {
  APP_NAME, ACCENT_COLOR, CHART_NAV_EVENT,
  NAV_CYCLE, PATH_NAV, PATH_TITLE,
} from '@/lib/app-config'

type ChartNavDetail = {
  prevHref: string
  nextHref: string
  color: string
  kpi: string
  kpiLabel: string
} | null

export function AppLayout({ children }: { children: React.ReactNode; showNavArrows?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chartNav, setChartNav] = useState<ChartNavDetail>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handle = (e: Event) => setChartNav((e as CustomEvent<ChartNavDetail>).detail)
    window.addEventListener(CHART_NAV_EVENT, handle)
    return () => window.removeEventListener(CHART_NAV_EVENT, handle)
  }, [])

  useEffect(() => {
    if (!pathname.startsWith('/chart/')) setChartNav(null)
  }, [pathname])

  const activeNav = PATH_NAV[pathname] ?? (
    pathname.startsWith('/county')    ? 'Counties'  :
    pathname.startsWith('/facility')  ? 'Facilities':
    pathname.startsWith('/zip-code')  ? 'Zip Codes' :
    pathname.startsWith('/zip/')      ? 'Zip Codes' :
    pathname.startsWith('/city')      ? 'Cities'    :
    pathname.startsWith('/launchpad') ? 'Launchpad' :
    pathname.startsWith('/console')   ? 'Console'   :
    pathname.startsWith('/chart/')    ? 'Charts'    : undefined
  )
  const title = PATH_TITLE[pathname] ?? (
    pathname.startsWith('/launchpad') ? 'Launchpad' :
    pathname.startsWith('/console')   ? 'Console'   :
    pathname.startsWith('/chart/')    ? 'Charts'    : undefined
  )

  // For sub-routes (e.g. /console/suffolk, /launchpad/albany), find the parent NAV_CYCLE entry
  const navIdx = NAV_CYCLE.indexOf(pathname) !== -1
    ? NAV_CYCLE.indexOf(pathname)
    : NAV_CYCLE.findIndex(p => p !== '/' && pathname.startsWith(p + '/'))
  const n       = NAV_CYCLE.length
  const prevNav = navIdx >= 0 ? NAV_CYCLE[(navIdx - 1 + n) % n] : null
  const nextNav = navIdx >= 0 ? NAV_CYCLE[(navIdx + 1) % n]     : null

  const navBtnCls = 'flex h-8 w-8 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors'

  return (
    <div className="flex h-dvh overflow-hidden p-0 sm:p-[18px]" style={{ background: 'var(--paper-ground)' }}>

      <div className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-full sm:w-[240px] sm:mr-[18px]' : 'w-0'}`}>
        <div className="w-[240px] h-full rounded-none sm:rounded-2xl overflow-hidden">
          <Sidebar activeLabel={activeNav} />
        </div>
      </div>

      <div className="flex flex-1 flex-col min-w-0 rounded-none sm:rounded-2xl bg-[var(--paper)] overflow-hidden shadow-[0_4px_24px_rgba(31,29,26,0.06)] border border-[var(--paper-rule)]">

        <div className="flex items-center px-5 pt-5 pb-3">

          <button onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border-0 outline-none transition-colors hover:bg-[var(--paper-2)]">
            {sidebarOpen
              ? <PanelLeftClose className="h-5 w-5 text-[var(--paper-text)]" />
              : <PanelLeftOpen  className="h-5 w-5 text-[var(--paper-text)]" />
            }
          </button>

          {title && (
            <div className="ml-4 flex items-center gap-2 text-[var(--paper-text)]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
              <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xl font-semibold hover:bg-[var(--paper-2)] transition-colors">
                <AppLogo className="h-5 w-5 shrink-0" />
                {APP_NAME}
              </Link>
              <span className="text-[var(--paper-faint)] text-xl select-none">|</span>
              <span className="text-xl font-medium">{title}</span>
            </div>
          )}

          <div className="flex-1" />

          {chartNav ? (
            <div className="flex flex-col items-end gap-0.5">
              <div className="hidden sm:flex items-center gap-1.5">
                <button onClick={() => router.push(chartNav.prevHref)} className={navBtnCls}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => router.push(chartNav.nextHref)} className={navBtnCls}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <div className="tabular-nums font-bold text-3xl leading-tight" style={{ color: chartNav.color }}>
                  {chartNav.kpi}
                </div>
                <div className="text-xs text-[var(--paper-muted)] mt-0.5">{chartNav.kpiLabel}</div>
              </div>
            </div>
          ) : navIdx >= 0 ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <button onClick={() => prevNav && router.push(prevNav)} className={navBtnCls}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => nextNav && router.push(nextNav)} className={navBtnCls}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

        </div>

        {children}

      </div>

      <div id="chat-panel-root" className="flex shrink-0 h-full" />
    </div>
  )
}
