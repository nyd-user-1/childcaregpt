import { AppLayout } from '@/components/AppLayout'

export const metadata = {
  title: 'Console · ChildcareGPT',
  description: 'Where child care is scarcest in New York — counties ranked by working families per licensed seat, with a live provider map.',
}

export default function ConsoleLayout({
  children,
  detail,
}: {
  children: React.ReactNode
  detail: React.ReactNode
}) {
  return (
    <AppLayout showNavArrows>
      <div className="flex flex-1 gap-4 overflow-hidden p-4 max-sm:flex-col max-sm:gap-0 max-sm:p-0" style={{ background: 'var(--paper)' }}>
        {/* Left slot — county supply-vs-need ranking (a chip rail on mobile) */}
        {children}
        {/* Right slot — provider map + facility detail (the hero on mobile) */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] max-sm:rounded-none max-sm:border-0">
          {detail}
        </div>
      </div>
    </AppLayout>
  )
}
