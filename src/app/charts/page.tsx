'use client'

import { AppLayout } from '@/components/AppLayout'
import { MiniAreaChart, MiniBarChart } from '@/components/MiniCharts'

/* ── Dummy data — matching Image #24 visual patterns ─────────────── */

// Area charts: wavy data with clear peaks & valleys (like SolarGPT "Potential")
const AREA_TEAL   = [25, 48, 72, 82, 78, 62, 58, 72, 88, 86, 80, 72] // 2 humps
const AREA_GREEN  = [15, 22, 35, 32, 45, 54, 50, 62, 70, 76, 80, 86] // gentle rise
const AREA_PURPLE = [20, 50, 80, 90, 84, 62, 58, 75, 92, 88, 80, 70] // 2 humps
const AREA_CYAN   = [38, 62, 80, 70, 58, 66, 76, 72, 65, 74, 78, 73] // rolling waves

// Bar charts: various patterns matching Image #24
const BAR_BLUE_DESC   = [100, 88, 78, 68, 58, 50, 42, 35, 28, 22]              // row1 c2 — descending
const BAR_ORG_PEAK    = [32, 50, 70, 90, 100, 88, 72, 55, 38, 25]              // row1 c3 — peaked
const BAR_ORG_DESC    = [100, 80, 62, 50, 40, 32, 24, 16, 10, 6]               // row1 c4 — descending
const BAR_PURPLE_MANY = [100, 95, 88, 82, 76, 70, 64, 58, 52, 46, 40, 34, 28, 22, 16] // row2 c1 — many bars
const BAR_PINK_DESC   = [100, 88, 75, 62, 52, 42, 33, 25, 18, 12]              // row2 c2 — descending
const BAR_BLUE_MIX    = [45, 78, 55, 90, 62, 80, 48, 85, 70, 58, 82, 45, 68, 55] // row2 c3 — irregular
const BAR_RED_MIX     = [60, 85, 72, 92, 55, 82, 76, 95, 65, 88, 74, 90]      // row2 c4 — irregular
const BAR_ORG_STEEP   = [100, 72, 50, 38, 28, 20, 14, 9, 5, 3]                // row3 c2 — steep drop

/* ── Chart definitions ────────────────────────────────────────────── */

type ChartDef = { id: string; title: string; description: string; node: React.ReactNode }

const CHARTS: ChartDef[] = [
  /* Row 1 — area · bar · bar · bar */
  {
    id: 'c1',
    title: 'Provider Growth',
    description: 'Licensed childcare providers enrolled monthly',
    node: <MiniAreaChart id="c1" color="#14b8a6" data={AREA_TEAL} />,
  },
  {
    id: 'c2',
    title: 'Enrollment by State',
    description: 'Top 10 states by total childcare enrollment',
    node: <MiniBarChart color="#3b82f6" data={BAR_BLUE_DESC} />,
  },
  {
    id: 'c3',
    title: 'Waitlist Trends',
    description: 'Average months on waitlist over the past year',
    node: <MiniBarChart color="#f59e0b" data={BAR_ORG_PEAK} />,
  },
  {
    id: 'c4',
    title: 'Provider Types',
    description: 'Distribution by facility type',
    node: <MiniBarChart color="#f97316" data={BAR_ORG_DESC} />,
  },

  /* Row 2 — bar · bar · bar · bar */
  {
    id: 'c5',
    title: 'Weekly Cost by County',
    description: 'Average weekly childcare cost — top counties',
    node: <MiniBarChart color="#a855f7" data={BAR_PURPLE_MANY} />,
  },
  {
    id: 'c6',
    title: 'Age Groups Served',
    description: 'Children enrolled by developmental age group',
    node: <MiniBarChart color="#ec4899" data={BAR_PINK_DESC} />,
  },
  {
    id: 'c7',
    title: 'Subsidy Coverage',
    description: 'CCDF subsidy enrollment trend by month',
    node: <MiniBarChart color="#3b82f6" data={BAR_BLUE_MIX} />,
  },
  {
    id: 'c8',
    title: 'Compliance Rate',
    description: 'Annual facility inspection pass rate (%)',
    node: <MiniBarChart color="#ef4444" data={BAR_RED_MIX} />,
  },

  /* Row 3 — area · bar · area · area */
  {
    id: 'c9',
    title: 'License Renewals',
    description: 'Monthly license renewal applications filed',
    node: <MiniAreaChart id="c9" color="#10b981" data={AREA_GREEN} />,
  },
  {
    id: 'c10',
    title: 'Capacity Utilization',
    description: 'Occupied vs available slots — rolling quarterly',
    node: <MiniBarChart color="#f59e0b" data={BAR_ORG_STEEP} />,
  },
  {
    id: 'c11',
    title: 'Quality Ratings',
    description: 'QRIS rating distribution across providers',
    node: <MiniAreaChart id="c11" color="#a855f7" data={AREA_PURPLE} />,
  },
  {
    id: 'c12',
    title: 'Staff Turnover',
    description: 'Annual staff turnover rate by state (%)',
    node: <MiniAreaChart id="c12" color="#06b6d4" data={AREA_CYAN} />,
  },
]

/* ── Page ─────────────────────────────────────────────────────────── */

export default function ChartsPage() {
  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-hidden p-4 pb-5">
        <div className="h-full grid grid-cols-4 grid-rows-3 gap-4">
          {CHARTS.map(chart => (
            <div
              key={chart.id}
              className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-[var(--txt)]/20 hover:shadow-md transition-all cursor-pointer"
            >
              {/* Chart — no padding, fills edge-to-edge */}
              <div className="flex-1 min-h-0">
                {chart.node}
              </div>

              {/* Label */}
              <div className="shrink-0 px-4 pt-2 pb-3">
                <p className="text-[13px] font-bold text-[var(--txt)] leading-snug">{chart.title}</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">{chart.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
