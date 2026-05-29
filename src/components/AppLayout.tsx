'use client'

import { useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { usePathname } from 'next/navigation'
import { PanelLeftOpen, PanelLeftClose, Sun, Moon } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import {
  CHART_NAV_EVENT,
  PATH_NAV,
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
  const [dark, setDark] = useState(false)
  const pathname = usePathname()

  // Theme defaults to light (paper voice is light-first); honor a saved choice.
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggleTheme(e: React.MouseEvent) {
    const x = e.clientX
    const y = e.clientY
    const next = !dark
    const apply = () => {
      setDark(next)
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
    }
    if (!document.startViewTransition) { apply(); return }
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const transition = document.startViewTransition(() => { flushSync(apply) })
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(.76,.32,.29,.99)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

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
  const themeBtnCls = 'flex h-9 w-9 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] hover:bg-[var(--paper-2)] hover:text-[var(--paper-text)] transition-colors'

  return (
    <div className="flex h-dvh overflow-hidden p-0 sm:p-[18px]" style={{ background: 'var(--paper-ground)' }}>

      <div className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-full sm:w-[240px] sm:mr-[18px]' : 'w-0'}`}>
        <div className="w-[240px] h-full rounded-none sm:rounded-2xl overflow-hidden">
          <Sidebar activeLabel={activeNav} />
        </div>
      </div>

      <div className="flex flex-1 flex-col min-w-0 rounded-none sm:rounded-2xl bg-[var(--paper)] overflow-hidden shadow-[0_4px_24px_rgba(31,29,26,0.06)] border border-[var(--paper-rule)]">

        <div className="flex items-center px-5 pt-2 pb-2 sm:pt-5 sm:pb-3">

          <button onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle sidebar"
            className="order-last sm:order-first flex h-9 w-9 items-center justify-center rounded-xl border-0 outline-none transition-colors hover:bg-[var(--paper-2)]">
            {sidebarOpen
              ? <PanelLeftClose className="h-5 w-5 text-[var(--paper-text)]" />
              : <PanelLeftOpen  className="h-5 w-5 text-[var(--paper-text)]" />
            }
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {chartNav && (
              <div className="text-right">
                <div className="tabular-nums font-bold text-3xl leading-tight" style={{ color: chartNav.color }}>
                  {chartNav.kpi}
                </div>
                <div className="text-xs text-[var(--paper-muted)] mt-0.5">{chartNav.kpiLabel}</div>
              </div>
            )}
            <button onClick={toggleTheme} aria-label="Toggle dark mode" className={themeBtnCls}>
              {dark
                ? <Sun  className="h-[18px] w-[18px] fill-amber-400 text-amber-400" />
                : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </div>

        </div>

        {children}

      </div>

      <div id="chat-panel-root" className="flex shrink-0 h-full" />
    </div>
  )
}
