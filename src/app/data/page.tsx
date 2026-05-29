import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { Building2, MapPin, Home, Hash, Landmark, Vote, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Data · ChildcareGPT',
  description: 'Browse New York child care data — by county, city, facility, ZIP code, and the elected officials who represent each district.',
}

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

type DataCard = {
  href: string
  kicker: string
  title: string
  body: string
  stat: string
  icon: React.ReactNode
}

const CARDS: DataCard[] = [
  {
    href: '/county',
    kicker: 'I',
    title: 'County',
    body: 'Providers, capacity, and typical infant-to-school-age costs across all 62 New York counties.',
    stat: '62 counties · cost + coverage',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    href: '/city',
    kicker: 'II',
    title: 'City',
    body: 'Licensed providers and seats in every city and town with regulated child care.',
    stat: '1,100+ cities',
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: '/facility',
    kicker: 'III',
    title: 'Provider',
    body: 'Every OCFS-regulated provider in the state — capacity by age group, status, and contact.',
    stat: '16,800 providers',
    icon: <MapPin className="h-5 w-5" />,
  },
  {
    href: '/zip-code',
    kicker: 'IV',
    title: 'Zip Code',
    body: 'Child care rolled up by ZIP — the tightest geography for finding care near home.',
    stat: 'Statewide by ZIP',
    icon: <Hash className="h-5 w-5" />,
  },
  {
    href: '/officials?chamber=senate',
    kicker: 'V',
    title: 'NYS Senate',
    body: 'The State Senator for each district, the licensed providers they represent, and how to reach them.',
    stat: '63 districts · contact each office',
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    href: '/officials?chamber=assembly',
    kicker: 'VI',
    title: 'NYS Assembly',
    body: 'The Assemblymember for each district, the licensed providers they represent, and how to reach them.',
    stat: '150 districts · contact each office',
    icon: <Vote className="h-5 w-5" />,
  },
]

export default function DataPage() {
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-5xl px-6 sm:px-10 md:px-14 pt-6 sm:pt-16 pb-16">

          {/* Masthead */}
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · Data
          </p>
          <h1
            className="paper-rise mt-4 leading-[1.04]"
            style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(1.9rem, 6vw, 4.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            New York child care,
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>by the numbers.</span>
          </h1>
          <p className="paper-rise mt-6 max-w-[56ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.05rem, 1.6vw, 1.2rem)', lineHeight: 1.6 }}>
            Browse the data behind ChildcareGPT — pick a way to slice the state, then
            drill into any county, city, provider, or representative.
          </p>

          {/* Cards */}
          <div className="paper-rise mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ animationDelay: '180ms' }}>
            {CARDS.map(c => (
              <Link
                key={c.href}
                href={c.href}
                className="group/data block rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-6 transition-colors hover:border-[var(--paper-accent)]"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[12px] tracking-[0.2em] text-[var(--paper-faint)]" style={SERIF}>{c.kicker}</span>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: 'var(--paper-accent-soft)', color: 'var(--paper-accent)' }}
                  >
                    {c.icon}
                  </span>
                </div>
                <h2 className="mt-5 text-[22px] leading-tight" style={{ ...SERIF, fontWeight: 500 }}>{c.title}</h2>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{c.body}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}>{c.stat}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--paper-accent)] transition-transform group-hover/data:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>

          <p className="paper-rise mt-10 text-[10px] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '240ms' }}>
            Provider data from NY OCFS · costs from the U.S. Department of Labor · district boundaries from the NYS Legislature
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
