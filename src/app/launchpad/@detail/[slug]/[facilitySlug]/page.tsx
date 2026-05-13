import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { sql } from '@/lib/db'
import { cn } from '@/lib/utils'

const PROGRAM_LABELS: Record<string, string> = {
  FDC:  'Family Day Care',
  GFDC: 'Group Family Day Care',
  SACC: 'School Age Child Care',
  SDCC: 'Small Day Care Center',
  DCC:  'Day Care Center',
}

export default async function FacilityDetailSlot({
  params,
}: {
  params: Promise<{ slug: string; facilitySlug: string }>
}) {
  const { slug, facilitySlug } = await params

  const rows = await sql`
    SELECT
      facility_id, facility_name, county, city,
      program_type, facility_status, total_capacity,
      infant_capacity, toddler_capacity, preschool_capacity,
      school_age_capacity, provider_name, license_expiration_date,
      profile_url, phone_number
    FROM facilities
    WHERE profile_url = ${facilitySlug}
    LIMIT 1
  `

  const f = rows[0]
  if (!f) notFound()

  const countyLabel = slug.charAt(0).toUpperCase() + slug.slice(1)
  const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))

  const profileRows = [
    { label: 'Provider',        value: f.provider_name,                                         highlight: false },
    { label: 'City',            value: f.city,                                                   highlight: false },
    { label: 'Status',          value: f.facility_status,                                        highlight: false },
    { label: 'Total Capacity',  value: String(f.total_capacity),                                 highlight: true  },
    { label: 'Infant',          value: String(f.infant_capacity),                                highlight: false },
    { label: 'Toddler',         value: String(f.toddler_capacity),                               highlight: false },
    { label: 'Preschool',       value: String(f.preschool_capacity),                             highlight: false },
    { label: 'School Age',      value: String(f.school_age_capacity),                            highlight: false },
    { label: 'License Expires', value: f.license_expiration_date?.toISOString?.()?.slice(0,10) ?? String(f.license_expiration_date ?? '—'), highlight: false },
    { label: 'Phone',           value: f.phone_number ?? '—',                                    highlight: false },
  ]

  const capacityCards = [
    { label: 'Infant',     n: Number(f.infant_capacity)     },
    { label: 'Toddler',    n: Number(f.toddler_capacity)    },
    { label: 'Preschool',  n: Number(f.preschool_capacity)  },
    { label: 'School Age', n: Number(f.school_age_capacity) },
  ].filter(c => c.n > 0)

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="px-5 py-8">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--txt)] leading-tight">{f.facility_name}</h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              {PROGRAM_LABELS[f.program_type] ?? f.program_type} · {f.city}
            </p>
          </div>
          <Link
            href={`/launchpad/${slug}`}
            scroll={false}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] hover:text-sky-500 hover:border-sky-200 transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="h-3 w-3" />
            {countyLabel} County
          </Link>
        </div>

        {/* ── Facility Profile ── */}
        <div className="mb-4 rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="flex items-center px-4 py-3 bg-[var(--surface)]">
            <span className="text-sm font-semibold text-[var(--txt)]">Facility Profile</span>
          </div>
          {profileRows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2.5 border-t border-[var(--border)]">
              <span className="text-sm text-[var(--muted)]">{row.label}</span>
              <span className={cn('text-sm text-right', row.highlight ? 'font-bold text-sky-500' : 'text-[var(--txt)]')}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Capacity mini-cards ── */}
        {capacityCards.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {capacityCards.map(c => (
              <div key={c.label} className="flex-1 min-w-[80px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="text-base font-bold text-[var(--txt)]">{fmtNum(c.n)}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{c.label}</p>
                <p className="text-xs font-bold text-sky-500 mt-1">{c.n} seats</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
