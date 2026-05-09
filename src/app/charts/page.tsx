'use client'

import { AppLayout } from '@/components/AppLayout'
import { MiniAreaChart, MiniBarChart, MiniLineChart, MiniPieChart } from '@/components/MiniCharts'

/* ── Dummy data ───────────────────────────────────────────────────── */

const AREA_GROWTH   = [42, 48, 45, 55, 62, 58, 68, 72, 70, 78, 82, 88]
const AREA_SUBSIDY  = [30, 35, 38, 42, 40, 48, 52, 49, 56, 60, 58, 65]
const AREA_CAPACITY = [65, 70, 68, 75, 72, 78, 80, 77, 83, 85, 84, 90]

const BAR_ENROLL   = [100, 88, 76, 65, 57, 50, 44, 38, 33, 28]
const BAR_COST     = [100, 91, 82, 73, 67, 61, 55, 50, 46, 41]
const BAR_TURNOVER = [100, 88, 78, 69, 63, 56, 50, 44, 38, 31]

const LINE_WAITLIST    = [32, 38, 35, 42, 45, 41, 48, 50, 47, 53, 51, 56]
const LINE_COMPLIANCE  = [82, 85, 88, 86, 90, 92, 89, 93, 91, 95, 92, 96]
const LINE_RENEWALS    = [45, 52, 48, 58, 62, 55, 65, 70, 67, 75, 72, 80]

const PIE_TYPES    = { data: [45, 28, 18, 9],  colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'] }
const PIE_AGES     = { data: [22, 26, 35, 17], colors: ['#ec4899', '#6366f1', '#10b981', '#f59e0b'] }
const PIE_RATINGS  = { data: [12, 22, 30, 24, 12], colors: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'] }

/* ── Chart definitions ────────────────────────────────────────────── */

type ChartDef = {
  id: string
  title: string
  description: string
  render: () => React.ReactNode
}

const CHARTS: ChartDef[] = [
  /* ── Row 1: area, bar, line, pie ── */
  {
    id: 'c1',
    title: 'Provider Growth',
    description: 'Licensed childcare providers enrolled monthly',
    render: () => <MiniAreaChart id="c1" color="#14b8a6" data={AREA_GROWTH} />,
  },
  {
    id: 'c2',
    title: 'Enrollment by State',
    description: 'Top 10 states by total childcare enrollment',
    render: () => <MiniBarChart color="#3b82f6" data={BAR_ENROLL} />,
  },
  {
    id: 'c3',
    title: 'Waitlist Trends',
    description: 'Average months on waitlist over the past year',
    render: () => <MiniLineChart color="#6366f1" data={LINE_WAITLIST} />,
  },
  {
    id: 'c4',
    title: 'Provider Types',
    description: 'Distribution by facility type',
    render: () => (
      <div className="flex items-center justify-center h-full">
        <MiniPieChart data={PIE_TYPES.data} colors={PIE_TYPES.colors} />
      </div>
    ),
  },

  /* ── Row 2: bar, pie, area, line ── */
  {
    id: 'c5',
    title: 'Weekly Cost by County',
    description: 'Average weekly childcare cost — top counties',
    render: () => <MiniBarChart color="#ec4899" data={BAR_COST} />,
  },
  {
    id: 'c6',
    title: 'Age Groups Served',
    description: 'Children enrolled by developmental age group',
    render: () => (
      <div className="flex items-center justify-center h-full">
        <MiniPieChart data={PIE_AGES.data} colors={PIE_AGES.colors} />
      </div>
    ),
  },
  {
    id: 'c7',
    title: 'Subsidy Coverage',
    description: 'CCDF subsidy enrollment trend by month',
    render: () => <MiniAreaChart id="c7" color="#10b981" data={AREA_SUBSIDY} />,
  },
  {
    id: 'c8',
    title: 'Compliance Rate',
    description: 'Annual facility inspection pass rate (%)',
    render: () => <MiniLineChart color="#ef4444" data={LINE_COMPLIANCE} />,
  },

  /* ── Row 3: line, area, pie, bar ── */
  {
    id: 'c9',
    title: 'License Renewals',
    description: 'Monthly license renewal applications filed',
    render: () => <MiniLineChart color="#f59e0b" data={LINE_RENEWALS} />,
  },
  {
    id: 'c10',
    title: 'Capacity Utilization',
    description: 'Occupied vs available slots — rolling quarterly',
    render: () => <MiniAreaChart id="c10" color="#8b5cf6" data={AREA_CAPACITY} />,
  },
  {
    id: 'c11',
    title: 'Quality Ratings',
    description: 'QRIS rating level distribution across providers',
    render: () => (
      <div className="flex items-center justify-center h-full">
        <MiniPieChart data={PIE_RATINGS.data} colors={PIE_RATINGS.colors} />
      </div>
    ),
  },
  {
    id: 'c12',
    title: 'Staff Turnover',
    description: 'Annual staff turnover rate by state (%)',
    render: () => <MiniBarChart color="#6366f1" data={BAR_TURNOVER} />,
  },
]

/* ── Page ─────────────────────────────────────────────────────────── */

export default function ChartsPage() {
  return (
    <AppLayout showNavArrows>
      {/* Grid fills all remaining height — no dead space */}
      <div className="flex-1 overflow-hidden p-4 pb-5">
        <div className="h-full grid grid-cols-4 grid-rows-3 gap-4">
          {CHARTS.map(chart => (
            <div
              key={chart.id}
              className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 pt-4 pb-3 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            >
              {/* Chart visualization — flex-1 fills available space */}
              <div className="flex-1 min-h-0">
                {chart.render()}
              </div>

              {/* Label */}
              <div className="shrink-0 pt-3">
                <p className="text-[13px] font-semibold text-[var(--txt)] leading-snug">{chart.title}</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">{chart.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
