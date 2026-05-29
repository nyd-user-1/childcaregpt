import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { Map as MapIcon, Building2, Landmark, Vote, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Maps · ChildcareGPT',
  description: 'Explore New York child care by county, ZIP code, and state legislative district — providers, costs, and coverage mapped across the state.',
}

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

type MapCard = {
  href: string
  kicker: string
  title: string
  body: string
  stat: string
  icon: React.ReactNode
  ready: boolean
}

const MAPS: MapCard[] = [
  {
    href: '/maps/county',
    kicker: 'I',
    title: 'By County',
    body: 'Provider coverage, infant-care cost, and the mix of program types across all 62 New York counties.',
    stat: '62 counties · cost + coverage',
    icon: <Building2 className="h-5 w-5" />,
    ready: true,
  },
  {
    href: '/maps/senate',
    kicker: 'II',
    title: 'By State Senate District',
    body: 'Licensed providers in each of the 63 State Senate districts — and the senator who represents it.',
    stat: '63 districts · provider count',
    icon: <Landmark className="h-5 w-5" />,
    ready: true,
  },
  {
    href: '/maps/assembly',
    kicker: 'III',
    title: 'By State Assembly District',
    body: 'Licensed providers across all 150 Assembly districts, with the member for each.',
    stat: '150 districts · provider count',
    icon: <Vote className="h-5 w-5" />,
    ready: true,
  },
  {
    href: '/maps/zip-code',
    kicker: 'IV',
    title: 'By ZIP Code',
    body: 'Enter your ZIP or address to map every licensed provider in your immediate neighborhood, closest first.',
    stat: 'Neighborhood search',
    icon: <MapIcon className="h-5 w-5" />,
    ready: true,
  },
]

export default function MapsPage() {
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-5xl px-6 sm:px-10 md:px-14 pt-12 sm:pt-16 pb-16">

          {/* Masthead */}
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · Maps
          </p>
          <h1
            className="paper-rise mt-4 leading-[1.04]"
            style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2.5rem, 6vw, 4.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Child care,
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>mapped</span> across New York.
          </h1>
          <p className="paper-rise mt-6 max-w-[56ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.05rem, 1.6vw, 1.2rem)', lineHeight: 1.6 }}>
            Pick a way to see the state. Each map loads on its own so it stays fast —
            real OCFS providers and Department of Labor costs, drawn where you live.
          </p>

          {/* Map cards */}
          <div className="paper-rise mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ animationDelay: '180ms' }}>
            {MAPS.map(m => {
              const inner = (
                <>
                  <div className="flex items-start justify-between">
                    <span className="text-[12px] tracking-[0.2em] text-[var(--paper-faint)]" style={SERIF}>{m.kicker}</span>
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}
                    >
                      {m.icon}
                    </span>
                  </div>
                  <h2 className="mt-5 text-[22px] leading-tight" style={{ ...SERIF, fontWeight: 500 }}>{m.title}</h2>
                  <p className="mt-2 text-[14.5px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{m.body}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}>{m.stat}</span>
                    {m.ready && <ArrowRight className="h-4 w-4 text-[var(--paper-accent)] transition-transform group-hover/map:translate-x-1" />}
                  </div>
                </>
              )
              const cls = 'group/map block rounded-2xl border p-6 transition-colors'
              return m.ready ? (
                <Link key={m.href} href={m.href} className={`${cls} border-[var(--paper-rule)] bg-[var(--paper-2)] hover:border-[var(--paper-accent)]`}>
                  {inner}
                </Link>
              ) : (
                <div key={m.href} className={`${cls} border-dashed border-[var(--paper-rule)] bg-transparent opacity-70`}>
                  {inner}
                </div>
              )
            })}
          </div>

          <p className="paper-rise mt-10 text-[10px] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '240ms' }}>
            Provider data from NY OCFS · costs from the U.S. Department of Labor · district boundaries from the NYS Legislature
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
