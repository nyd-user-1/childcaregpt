'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PanelLeftOpen, PanelLeftClose,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { BottleBaby } from '@/components/BottleBaby'
import { Sidebar } from '@/components/Sidebar'
import { CHART_CONFIGS } from '@/lib/chart-configs'

/* ── Full nav cycle: chart pages sandwich between /charts and /maps ── */
const NAV_CYCLE = [
  '/charts',
  ...CHART_CONFIGS.map(c => `/chart/${c.slug}`),
  '/maps',
  '/county',
  '/facility',
  '/zip-code',
  '/city',
  '/launchpad',
]

const PATH_NAV: Record<string, string> = {
  '/':          'Chat',
  '/charts':    'Charts',
  '/maps':      'Maps',
  '/county':    'County',
  '/facility':  'Facility',
  '/zip-code':  'Zip Code',
  '/city':      'City',
  '/launchpad': 'Launchpad',
  '/report':    'Report',
  '/glossary':  'Glossary',
}

const PATH_TITLE: Record<string, string> = {
  '/charts':    'Charts',
  '/maps':      'Maps',
  '/county':    'County',
  '/facility':  'Facilities',
  '/zip-code':  'ZIP Codes',
  '/city':      'Cities',
  '/launchpad': 'Launchpad',
  '/report':    'Report',
  '/glossary':  'Glossary',
}

type ChartNavDetail = {
  prevHref: string
  nextHref: string
  color: string
  kpi: string
  kpiLabel: string
} | null

interface AppLayoutProps {
  children: React.ReactNode
  showNavArrows?: boolean
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chartNav, setChartNav] = useState<ChartNavDetail>(null)
  const pathname = usePathname()
  const router = useRouter()

  /* Listen for chart detail pages broadcasting their nav state */
  useEffect(() => {
    const handle = (e: Event) => setChartNav((e as CustomEvent<ChartNavDetail>).detail)
    window.addEventListener('childcaregpt:chart-nav', handle)
    return () => window.removeEventListener('childcaregpt:chart-nav', handle)
  }, [])

  /* Clear chart nav when leaving a chart detail page */
  useEffect(() => {
    if (!pathname.startsWith('/chart/')) setChartNav(null)
  }, [pathname])

  const activeNav = PATH_NAV[pathname] ?? (
    pathname.startsWith('/county')    ? 'County'    :
    pathname.startsWith('/facility')  ? 'Facility'  :
    pathname.startsWith('/zip-code')  ? 'Zip Code'  :
    pathname.startsWith('/zip/')      ? 'Zip Code'  :
    pathname.startsWith('/city')      ? 'City'      :
    pathname.startsWith('/launchpad') ? 'Launchpad' :
    pathname.startsWith('/chart/')    ? 'Charts'    : undefined
  )
  const title = PATH_TITLE[pathname] ?? (
    pathname.startsWith('/launchpad') ? 'Launchpad' :
    pathname.startsWith('/chart/')    ? 'Charts'    : undefined
  )

  /* NAV_CYCLE prev/next for non-chart-detail pages */
  const navIdx  = NAV_CYCLE.indexOf(pathname)
  const n       = NAV_CYCLE.length
  const prevNav = navIdx >= 0 ? NAV_CYCLE[(navIdx - 1 + n) % n] : null
  const nextNav = navIdx >= 0 ? NAV_CYCLE[(navIdx + 1) % n]     : null

  const navBtnCls = 'flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-sky-500 hover:bg-[var(--inp-bg)] transition-colors'

  return (
    <div className="flex h-dvh overflow-hidden p-0 sm:p-[18px]" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-full sm:w-[240px] sm:mr-[18px]' : 'w-0'}`}>
        <div className="w-[240px] h-full rounded-none sm:rounded-2xl overflow-hidden">
          <Sidebar activeLabel={activeNav} />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 rounded-none sm:rounded-2xl bg-[var(--surface)] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-[var(--border)]">

        {/* Top bar */}
        <div className="flex items-center px-5 pt-5 pb-3">

          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border-0 outline-none transition-colors hover:bg-[var(--inp-bg)]">
            {sidebarOpen
              ? <PanelLeftClose className="h-5 w-5 text-[var(--txt)]" />
              : <PanelLeftOpen  className="h-5 w-5 text-[var(--txt)]" />
            }
          </button>

          {/* Logo + page title */}
          {title && (
            <div className="ml-4 flex items-center gap-2 text-[var(--txt)]">
              <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xl font-bold hover:bg-[var(--inp-bg)] transition-colors">
                <BottleBaby className="h-5 w-5 shrink-0" style={{ stroke: '#38bdf8', fill: 'rgba(56,189,248,0.15)' }} />
                ChildcareGPT
              </Link>
              <span className="text-[var(--muted)] text-xl select-none">|</span>
              <span className="text-xl font-medium">{title}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Chart detail — KPI + prev/next cycling through all charts */}
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
                <div className="text-xs text-[var(--muted)] mt-0.5">{chartNav.kpiLabel}</div>
              </div>
            </div>
          ) : navIdx >= 0 ? (
            /* All other NAV_CYCLE pages (/charts, /maps, /county, etc.) */
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

        {/* Page children */}
        {children}

      </div>

      <div id="chat-panel-root" className="flex shrink-0 h-full" />
    </div>
  )
}
