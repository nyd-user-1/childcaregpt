'use client'

import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { usePathname } from 'next/navigation'
import { PanelLeftOpen, PanelLeftClose, Sun, Moon } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { cn } from '@/lib/utils'
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

  // On mobile the sidebar is an overlay drawer — close it after navigating.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      setSidebarOpen(false)
    }
  }, [pathname])

  // Mobile floating sidebar toggle — draggable, snaps to the nearest edge on release.
  const FAB_SIZE = 48
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null)
  const [fabDragging, setFabDragging] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  const fabDrag = useRef<{ ptrX: number; ptrY: number; startX: number; startY: number; moved: boolean } | null>(null)

  const handleFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    fabDrag.current = { ptrX: e.clientX, ptrY: e.clientY, startX: rect.left, startY: rect.top, moved: false }

    const onMove = (ev: PointerEvent) => {
      const d = fabDrag.current
      if (!d) return
      ev.preventDefault()
      const dx = ev.clientX - d.ptrX
      const dy = ev.clientY - d.ptrY
      if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; setFabDragging(true) }
      if (d.moved) {
        const x = Math.max(0, Math.min(window.innerWidth - FAB_SIZE, d.startX + dx))
        const y = Math.max(0, Math.min(window.innerHeight - FAB_SIZE, d.startY + dy))
        setFabPos({ x, y })
      }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const d = fabDrag.current
      fabDrag.current = null
      if (!d) return
      if (!d.moved) { setSidebarOpen(v => !v); return }
      setFabDragging(false)
      setFabPos(prev => {
        const currX = prev?.x ?? d.startX
        const snapLeft = currX + FAB_SIZE / 2 < window.innerWidth / 2
        return { x: snapLeft ? 8 : window.innerWidth - FAB_SIZE - 8, y: prev?.y ?? d.startY }
      })
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

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
    <div className="flex h-dvh overflow-hidden p-0 sm:p-[18px] bg-[var(--paper-ground)] max-sm:bg-[var(--paper)]">

      {/* Mobile: dim + close the drawer by tapping outside it */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-hidden onClick={() => setSidebarOpen(false)} />
      )}

      <div className={cn(
        'shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
        'max-sm:fixed max-sm:inset-y-0 max-sm:left-0 max-sm:z-50 max-sm:w-[300px] max-sm:max-w-[85vw]',
        sidebarOpen
          ? 'w-[240px] sm:mr-[18px] max-sm:translate-x-0 max-sm:shadow-2xl'
          : 'w-0 max-sm:-translate-x-full',
      )}>
        <div className="h-full w-full sm:w-[240px] rounded-none sm:rounded-2xl overflow-hidden">
          <Sidebar activeLabel={activeNav} dark={dark} onToggleTheme={toggleTheme} />
        </div>
      </div>

      <div className="flex flex-1 flex-col min-w-0 rounded-none sm:rounded-2xl bg-[var(--paper)] overflow-hidden shadow-[0_4px_24px_rgba(31,29,26,0.06)] border border-[var(--paper-rule)]">

        <div className="hidden sm:flex items-center px-5 pt-5 pb-3">

          <button onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border-0 outline-none transition-colors hover:bg-[var(--paper-2)]">
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

      <div id="chat-panel-root" className="flex shrink-0 h-full max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:justify-end max-sm:pointer-events-none" />

      {/* Mobile only: floating, draggable sidebar toggle (the header bar is hidden on mobile) */}
      <button
        ref={fabRef}
        onPointerDown={handleFabPointerDown}
        aria-label="Toggle sidebar"
        style={{ touchAction: 'none', ...(fabPos ? { left: fabPos.x, top: fabPos.y } : {}) }}
        className={cn(
          'sm:hidden fixed z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] shadow-lg hover:bg-[var(--paper-2)]',
          fabPos ? '' : 'bottom-5 right-4',
          fabDragging ? '' : 'transition-[left,top] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
        )}
      >
        {sidebarOpen
          ? <PanelLeftClose className="h-5 w-5 text-[var(--paper-text)]" />
          : <PanelLeftOpen  className="h-5 w-5 text-[var(--paper-text)]" />}
      </button>
    </div>
  )
}
