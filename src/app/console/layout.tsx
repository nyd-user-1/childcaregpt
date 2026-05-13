import { AppLayout } from '@/components/AppLayout'

export default function ConsoleLayout({
  children,
  detail,
}: {
  children: React.ReactNode
  detail: React.ReactNode
}) {
  return (
    <AppLayout showNavArrows>
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left slot — county table */}
        {children}
        {/* Right slot — map + facility detail */}
        <div className="flex-1 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {detail}
        </div>
      </div>
    </AppLayout>
  )
}
