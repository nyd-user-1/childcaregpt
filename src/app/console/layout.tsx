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
      <div className="flex flex-1 gap-4 overflow-hidden p-4" style={{ background: 'var(--paper)' }}>
        {/* Left slot — county supply-vs-need ranking */}
        {children}
        {/* Right slot — provider map + facility detail */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)]">
          {detail}
        </div>
      </div>
    </AppLayout>
  )
}
