import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { MiniAreaChart, MiniBarChart } from '@/components/MiniCharts'
import { CHART_CONFIGS } from '@/lib/chart-configs'

export const metadata = {
  title: 'Charts · ChildcareGPT',
  description: 'Data views of New York child care — providers, capacity, costs, and where the gaps are, across all 62 counties.',
}

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }
const ACCENT = '#2f6d6a'

/* ── Preview data keyed by slug ──────────────────────────────────── */
const PREVIEW: Record<string, number[]> = {
  'providers-by-county':  [100, 62, 58, 42, 38, 32, 28, 24, 20, 18, 14, 10, 8, 6, 4],
  'capacity-by-county':   [100, 88, 82, 70, 62, 54, 46, 38, 30, 24, 18, 14, 10, 7, 4],
  'program-types':        [100, 32, 22, 20, 1],
  'facilities-by-year':   [5, 8, 12, 18, 22, 30, 28, 32, 35, 42, 38, 36, 40, 32, 28],
  'age-group-capacity':   [18, 30, 45, 62],
  'facility-status':      [100, 44, 1],
  'license-expiration':   [55, 88, 100, 78, 60, 45, 32, 20],
  'infant-care-cost':     [100, 92, 85, 78, 72, 65, 58, 52, 46, 40, 35, 30, 26, 22, 18],
  'toddler-care-cost':    [100, 90, 82, 74, 66, 59, 52, 46, 40, 35, 30, 26, 22, 18, 14],
  'preschool-care-cost':  [100, 88, 78, 68, 60, 52, 45, 38, 32, 27, 22, 18, 14, 11, 8],
  'household-income':     [100, 95, 88, 82, 76, 70, 64, 58, 52, 46, 40, 35, 30, 25, 20],
  'cost-trend':           [42, 48, 52, 56, 60, 64, 70, 75, 80, 84, 88, 92, 96, 98, 100],
  'center-vs-family':     [40, 45, 50, 56, 62, 68, 74, 80, 85, 90, 94, 97, 99, 100, 98],
  'income-vs-cost':       [30, 55, 42, 70, 48, 65, 38, 82, 60, 45, 75, 52, 88, 35, 62],
  'lfpr-by-county':       [100, 95, 88, 82, 76, 70, 64, 58, 52, 46, 40, 35, 30, 25, 20],
}
const AREA_SLUGS = new Set(['facilities-by-year', 'cost-trend', 'center-vs-family'])

export default function ChartsPage() {
  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>

        {/* ── Masthead ── */}
        <div className="px-6 sm:px-10 pt-9 pb-6">
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · {CHART_CONFIGS.length} charts
          </p>
          <h1 className="paper-rise mt-3 leading-[1.05]" style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Child care in New York,{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>by the numbers.</span>
          </h1>
          <p className="paper-rise mt-4 max-w-[56ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.05rem, 1.6vw, 1.2rem)', lineHeight: 1.55 }}>
            Who provides care, what it costs, and where the gaps are — across all 62 counties.
          </p>
        </div>

        {/* ── Grid ── */}
        <div className="@container px-6 sm:px-10 pb-12">
          <div className="grid grid-cols-2 gap-4 @xl:grid-cols-3 @4xl:grid-cols-4">
            {CHART_CONFIGS.map(chart => {
              const data = PREVIEW[chart.slug] ?? [50, 60, 70, 80, 75, 65, 55]
              return (
                <Link key={chart.slug} href={`/chart/${chart.slug}`}
                  className="group/card flex flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] transition-colors hover:border-[var(--paper-accent)]">
                  <div className="h-28 min-h-0 flex-1 p-3 sm:h-32">
                    {AREA_SLUGS.has(chart.slug)
                      ? <MiniAreaChart id={chart.slug} color={ACCENT} data={data} />
                      : <MiniBarChart color={ACCENT} data={data} />}
                  </div>
                  <div className="shrink-0 px-4 pt-2.5 pb-3.5">
                    <p className="leading-snug text-[var(--paper-text)] transition-colors group-hover/card:text-[var(--paper-accent)]" style={{ ...SERIF, fontSize: '1rem', fontWeight: 500 }}>
                      {chart.title}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-snug text-[var(--paper-muted)]" style={SANS}>{chart.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
