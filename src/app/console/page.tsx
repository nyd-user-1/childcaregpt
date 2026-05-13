'use client'

import { useRouter, usePathname } from 'next/navigation'
import { NY_COUNTIES } from '@/lib/ny-counties'
import { cn } from '@/lib/utils'

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

export default function ConsolePage() {
  const router = useRouter()
  const pathname = usePathname()
  const activeSlug = pathname.startsWith('/console/') ? pathname.split('/console/')[1].split('?')[0] : null

  return (
    <div className="w-[44%] min-w-0 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
      <div className="overflow-y-auto no-scrollbar flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--surface)]">
            <tr className="border-b border-[var(--border)]">
              {['County','Providers','Seats','Open','Diff'].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] px-4 py-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NY_COUNTIES.map((row, i) => (
              <tr
                key={row.county}
                onClick={() => router.push(`/console/${row.slug}`, { scroll: false })}
                className={cn(
                  'border-b border-[var(--border)] hover:bg-[var(--row-hover)] cursor-pointer transition-colors',
                  row.slug === activeSlug && 'bg-sky-50 border-l-2 border-l-sky-400',
                  i % 2 !== 0 && row.slug !== activeSlug && 'bg-[var(--inp-bg)]'
                )}
              >
                <td className="px-4 py-3 font-medium text-[var(--txt)]">{row.county}</td>
                <td className="px-4 py-3 text-[var(--txt2)]">{row.providers}</td>
                <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.seats)}</td>
                <td className="px-4 py-3 text-[var(--txt2)]">{fmt(row.open)}</td>
                <td className={cn('px-4 py-3 font-semibold', row.diff >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {row.diff >= 0 ? `+${row.diff}` : row.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
