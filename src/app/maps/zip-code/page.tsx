import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'ZIP Code Map · ChildcareGPT' }

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS:  React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

export default function ZipMapPage() {
  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 sm:px-10 py-16">
          <Link href="/maps" className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.16em] text-[var(--paper-faint)] hover:text-[var(--paper-muted)] transition-colors mb-8" style={SANS}>
            <ArrowLeft className="h-3.5 w-3.5" /> All maps
          </Link>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={SANS}>Coming soon</p>
          <h1 className="mt-4 leading-[1.05]" style={{ ...SERIF, fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Care by <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>ZIP code.</span>
          </h1>
          <p className="mt-5 max-w-[52ch] text-[var(--paper-muted)]" style={{ ...SERIF, fontSize: '1.15rem', lineHeight: 1.6 }}>
            Block-level detail is in progress — New York has roughly 2,200 ZIP areas,
            so we’re building this one carefully so it loads fast. In the meantime,
            the home-page chat already finds providers within a few miles of any
            address you give it.
          </p>
          <div className="mt-8">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90" style={{ ...SANS, background: 'var(--paper-accent)' }}>
              Find care near an address →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
